import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, FixResult, ReviewResult, TestResult } from '../types';
import { callGeminiWithRetry } from '../services/geminiClient';

export const REVIEWER_SYSTEM_INSTRUCTION = `You are the Reviewer Agent in DevFix AI Stage 4 (Multi-Agent + MCP).

Review:
- original code
- Analyzer findings
- corrected code
- Tester results (produced via MCP run_code tool)

Determine whether the correction solves the identified problem.

Check for:
- remaining errors
- unintended behavior
- obvious edge cases
- correctness

Do not blindly approve a solution. If the Tester reported a failure or error traceback via MCP, or if obvious bugs remain, set approved to false. If the solution is correct, verified, and complete, set approved to true.

Return structured JSON.`;

const REVIEW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    approved: {
      type: Type.BOOLEAN,
      description: 'True if the solution solves the problem and passes review; false otherwise',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise review evaluation summary',
    },
    remainingIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Any remaining bugs, edge cases, or regressions noticed',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Guidance if rejected, or final best practice notes if approved',
    },
  },
  required: ['approved', 'summary', 'remainingIssues', 'recommendations'],
};

export async function runReviewerAgent(
  ai: GoogleGenAI,
  language: string,
  originalCode: string,
  analysis: AnalysisResult,
  fix: FixResult,
  test: TestResult
): Promise<ReviewResult> {
  const prompt = `
Programming Language: ${language}

Original Source Code:
\`\`\`${language.toLowerCase()}
${originalCode}
\`\`\`

Analyzer Agent Findings:
Status: ${analysis.status}
Summary: ${analysis.summary}
Problems: ${JSON.stringify(analysis.problems)}

Fixer Agent Correction:
\`\`\`${language.toLowerCase()}
${fix.correctedCode}
\`\`\`
Changes Made:
${JSON.stringify(fix.changes)}
Explanation:
${fix.explanation}

Tester Agent Verification Results:
Attempted Execution: ${test.attempted}
Execution Success: ${test.success}
Exit Code: ${test.exitCode ?? 'N/A'}
Standard Output: ${test.stdout || '(None)'}
Standard Error: ${test.stderr || '(None)'}
Note/Reason: ${test.reason || 'None'}

Evaluate whether the fix truly solves the problem, leaves no new bugs, and should be approved.
Return structured JSON.
`;

  const response = await callGeminiWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: REVIEWER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: REVIEW_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Reviewer Agent returned an empty response.');
  }

  const parsed = JSON.parse(text);

  // If testing was attempted and failed with a non-zero exit code or stderr, enforce rejection
  let approved = Boolean(parsed.approved);
  if (test.attempted && !test.success) {
    approved = false;
  }

  return {
    approved,
    summary: parsed.summary || (approved ? 'Solution approved.' : 'Solution requires revision.'),
    remainingIssues: Array.isArray(parsed.remainingIssues) ? parsed.remainingIssues : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };
}
