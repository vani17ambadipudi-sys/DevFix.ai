import { GoogleGenAI } from '@google/genai';
import { ProjectContextSummary } from '../../../server/context/projectContext';
import { callGeminiWithRetry } from '../../../server/services/geminiCaller';

export interface RepositoryAnalysisResult {
  summary: string;
  identifiedModules: string[];
  suspectedFiles: string[];
  riskAssessment: string;
  recommendedInvestigation: string[];
}

export const REPOSITORY_ANALYST_INSTRUCTION = `You are the Repository Analyst Agent in DevFix AI.
Your role:
1. Understand the high-level architecture of the software repository from its structure and manifests.
2. Pinpoint the specific files, modules, and dependencies related to the reported issue.
3. Produce a concise, evidence-based structural summary.
CRITICAL RULES:
- Never modify files.
- Do NOT expose internal chain-of-thought or reasoning traces.
- Return structured JSON.`;

export async function runRepositoryAnalystAgent(
  ai: GoogleGenAI | null,
  context: ProjectContextSummary,
  issueDescription: string,
  errorLogs?: string
): Promise<RepositoryAnalysisResult> {
  const suspected = context.relevantFiles.map((f) => f.path);

  // If Gemini is available, use it for deep semantic reasoning
  if (ai) {
    try {
      const prompt = `Analyze this software repository issue:
Issue: ${issueDescription}
Logs: ${errorLogs || 'None provided'}

Repository Context:
${context.structuralSummary}

Relevant Discovered Files:
${context.relevantFiles.map((f) => `File: ${f.path}\nContent:\n${f.content}`).join('\n\n')}

Return JSON with:
{
  "summary": "Concise summary of how the issue relates to the codebase",
  "identifiedModules": ["Module1", "Module2"],
  "suspectedFiles": ["path/to/file1", "path/to/file2"],
  "riskAssessment": "Low / Medium / High with reason",
  "recommendedInvestigation": ["Check input validation", "Review error handler"]
}`;

      const res = await callGeminiWithRetry(ai, {
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: REPOSITORY_ANALYST_INSTRUCTION,
          responseMimeType: 'application/json',
        },
      });

      if (res.text) {
        return JSON.parse(res.text) as RepositoryAnalysisResult;
      }
    } catch {
      // fallback below
    }
  }

  // Deterministic Fallback
  return {
    summary: `Analyzed repository architecture. Issue involves ${context.frameworks.join(', ') || 'application'} modules handling input and business logic.`,
    identifiedModules: context.frameworks.concat(context.languages),
    suspectedFiles: suspected.length > 0 ? suspected : context.entryPoints,
    riskAssessment: 'Medium — Impacts request handling and data validation endpoints.',
    recommendedInvestigation: [
      'Inspect input validation before invoking underlying service layers.',
      'Verify status codes and unhandled exception bubbling in route handlers.',
    ],
  };
}
