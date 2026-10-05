import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, FixResult, ReviewResult, TestResult } from '../types';
import { callGeminiWithRetry } from '../services/geminiClient';
import { mcpClient } from '../services/mcpClient';

export const FIXER_SYSTEM_INSTRUCTION = `You are the Fixer Agent in DevFix AI Stage 4 (Multi-Agent + MCP).

You receive:
- original source code
- programming language
- Analyzer Agent findings
- (optional) MCP documentation search guidance
- (optional) Previous Test and Reviewer Agent feedback if this is a revision cycle

Generate the smallest useful correction.
Preserve intended behavior.
Do not claim that the correction has been tested.

Return structured JSON.`;

const FIX_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    correctedCode: {
      type: Type.STRING,
      description: 'The repaired, corrected source code',
    },
    changes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Specific list of changes made and why',
    },
    explanation: {
      type: Type.STRING,
      description: 'Concise explanation of the repair strategy',
    },
  },
  required: ['correctedCode', 'changes', 'explanation'],
};

export async function runFixerAgent(
  ai: GoogleGenAI,
  language: string,
  originalCode: string,
  analysis: AnalysisResult,
  previousTest?: TestResult,
  previousReview?: ReviewResult
): Promise<FixResult> {
  // Query MCP documentation tool for error context if problems exist
  let docContext = '';
  if (analysis.problems.length > 0 || analysis.errorTypes.length > 0) {
    try {
      const topIssue = analysis.problems[0]?.title || analysis.errorTypes[0] || language;
      const searchRes = await mcpClient.searchDocumentation(
        {
          query: `${language} ${topIssue}`,
          technology: language,
        },
        'Fixer'
      );
      if (searchRes.results.length > 0) {
        docContext = `
MCP Tool Context (search_documentation):
Reference: ${searchRes.results[0].title}
Official Guidance: ${searchRes.results[0].description}
${searchRes.results[0].snippet ? `Recommended Pattern:\n${searchRes.results[0].snippet}` : ''}
`;
      }
    } catch {
      // Continue without doc snippet
    }
  }

  let prompt = `
Programming Language: ${language}

Original Source Code:
\`\`\`${language.toLowerCase()}
${originalCode}
\`\`\`

Analyzer Agent Findings:
Status: ${analysis.status}
Summary: ${analysis.summary}
Identified Problems:
${JSON.stringify(analysis.problems, null, 2)}
Recommendations:
${JSON.stringify(analysis.recommendations, null, 2)}
${docContext}
`;

  if (previousTest || previousReview) {
    prompt += `
PREVIOUS ATTEMPT FEEDBACK (Please refine and improve):
${
  previousTest
    ? `Tester Result (via MCP run_code):
Exit Code: ${previousTest.exitCode ?? 'N/A'}
Success: ${previousTest.success}
Standard Output: ${previousTest.stdout || '(None)'}
Standard Error: ${previousTest.stderr || '(None)'}`
    : ''
}

${
  previousReview
    ? `Reviewer Feedback:
Approved: ${previousReview.approved}
Summary: ${previousReview.summary}
Remaining Issues: ${JSON.stringify(previousReview.remainingIssues)}
Recommendations: ${JSON.stringify(previousReview.recommendations)}`
    : ''
}
`;
  }

  prompt += `
Generate the targeted minimal fix and return structured JSON.
`;

  const response = await callGeminiWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: FIXER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: FIX_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Fixer Agent returned an empty response.');
  }

  const parsed = JSON.parse(text);

  return {
    correctedCode: parsed.correctedCode || originalCode,
    changes: Array.isArray(parsed.changes) ? parsed.changes : ['Corrected code syntax and logic'],
    explanation: parsed.explanation || 'Applied minimal targeted repair.',
  };
}
