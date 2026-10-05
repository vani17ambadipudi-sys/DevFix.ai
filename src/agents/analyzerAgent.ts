import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, Problem } from '../types';
import { callGeminiWithRetry } from '../services/geminiClient';
import { mcpClient } from '../services/mcpClient';

export const ANALYZER_SYSTEM_INSTRUCTION = `You are the Analyzer Agent in DevFix AI Stage 4 (Multi-Agent + MCP).

Analyze the supplied code.

Identify:
- syntax problems
- runtime problems
- logical problems
- type problems
- integration problems
- configuration problems
- security issues
- performance issues
- edge cases

You may receive verified project structure context from the MCP inspect_project tool.
Do not modify the code.
Do not generate fixes.
Do not claim that the code was executed.

Return structured JSON.`;

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    status: {
      type: Type.STRING,
      enum: ['error_found', 'warning', 'no_error'],
      description: 'Overall code health status',
    },
    summary: {
      type: Type.STRING,
      description: 'Concise summary of findings without modifying code',
    },
    errorTypes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Categories of errors found',
    },
    problems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          line: { type: Type.INTEGER, description: '1-indexed line number or null' },
        },
        required: ['title', 'description', 'severity'],
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'High-level recommendations for the Fixer Agent',
    },
  },
  required: ['status', 'summary', 'errorTypes', 'problems', 'recommendations'],
};

export async function runAnalyzerAgent(
  ai: GoogleGenAI,
  language: string,
  code: string,
  description?: string,
  includeProjectContext: boolean = false
): Promise<AnalysisResult> {
  let projectContextSnippet = '';

  // Use MCP inspect_project when additional project context is requested or relevant
  if (includeProjectContext || description?.toLowerCase().includes('project') || description?.toLowerCase().includes('import')) {
    try {
      const projectSummary = await mcpClient.inspectProject({ subDirectory: 'src' }, 'Analyzer');
      projectContextSnippet = `
MCP Tool Context (inspect_project):
Project: ${projectSummary.projectName}
Known Project Files: ${projectSummary.files.slice(0, 15).join(', ')}
`;
    } catch {
      // Continue without project context if unavailable
    }
  }

  const prompt = `
Programming Language: ${language}
User Problem Description: ${description?.trim() || 'None provided'}
${projectContextSnippet}

Source Code to Analyze:
\`\`\`${language.toLowerCase()}
${code}
\`\`\`

Perform complete static code analysis and return structured JSON.
`;

  const response = await callGeminiWithRetry(ai, {
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      systemInstruction: ANALYZER_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: ANALYSIS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Analyzer Agent returned an empty response.');
  }

  const parsed = JSON.parse(text);

  return {
    status: parsed.status || 'error_found',
    summary: parsed.summary || 'Code analysis completed.',
    errorTypes: Array.isArray(parsed.errorTypes) ? parsed.errorTypes : ['Logical Error'],
    problems: Array.isArray(parsed.problems)
      ? parsed.problems.map((p: any) => ({
          title: String(p.title || 'Identified Problem'),
          description: String(p.description || ''),
          severity: ['high', 'medium', 'low'].includes(p.severity) ? p.severity : 'medium',
          line: typeof p.line === 'number' ? p.line : null,
        }))
      : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };
}
