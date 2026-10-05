import {
  AgentStep,
  DebuggingResult,
  FollowUpMessage,
  SupportedLanguage,
} from '../types';

export interface DebugRequestPayload {
  language: SupportedLanguage;
  code: string;
  description?: string;
  testExecution?: boolean;
}

export interface FollowUpRequestPayload {
  language: SupportedLanguage;
  originalCode: string;
  description?: string;
  debuggingResult: DebuggingResult;
  question: string;
  history: { role: 'user' | 'model'; content: string }[];
}

function formatErrorMessage(raw: string): string {
  if (!raw) return 'An unexpected error occurred.';
  try {
    if (raw.startsWith('{') && raw.endsWith('}')) {
      const parsed = JSON.parse(raw);
      if (parsed.error?.message) return parsed.error.message;
      if (parsed.message) return parsed.message;
    }
  } catch {
    // not json
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'The AI model is experiencing a temporary spike in demand. Please try again in a few moments.';
  }
  if (raw.includes('429') || raw.includes('Resource has been exhausted')) {
    return 'Rate limit reached. Please wait a moment before trying again.';
  }
  return raw;
}

export const geminiService = {
  async debugCode(
    payload: DebugRequestPayload,
    onTimelineUpdate?: (timeline: AgentStep[]) => void,
    onStepUpdate?: (step: string) => void,
    onMCPActivityUpdate?: (activity: any[]) => void
  ): Promise<DebuggingResult> {
    if (!payload.code || !payload.code.trim()) {
      throw new Error('Please enter some code to analyze.');
    }

    try {
      const response = await fetch('/api/devfix/debug-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          testExecution: payload.testExecution ?? true,
        }),
      });

      if (!response.ok) {
        let errMessage = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMessage);
      }

      if (!response.body) {
        throw new Error('No response stream available from server.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: DebuggingResult | null = null;
      let streamError: string | null = null;

      const processChunk = (chunkText: string) => {
        const lines = chunkText.split('\n\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'timeline' && Array.isArray(data.timeline)) {
                onTimelineUpdate?.(data.timeline);
                if (data.step?.summary) {
                  onStepUpdate?.(`${data.step.agent}: ${data.step.summary}`);
                }
                if (Array.isArray(data.mcpActivity)) {
                  onMCPActivityUpdate?.(data.mcpActivity);
                }
              } else if (data.type === 'result' && data.data) {
                finalResult = data.data;
              } else if (data.type === 'error' && data.error) {
                streamError = data.error;
              }
            } catch {
              // ignore parse errors in chunk
            }
          }
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processChunk(buffer);
            buffer = '';
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          processChunk(part);
        }
      }

      if (streamError) {
        throw new Error(formatErrorMessage(streamError));
      }

      if (!finalResult) {
        // Fallback to standard POST endpoint
        const fallbackRes = await fetch('/api/devfix/debug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!fallbackRes.ok) {
          throw new Error('Failed to retrieve analysis result from server.');
        }
        return await fallbackRes.json();
      }

      return finalResult;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to DevFix backend server.');
      }
      throw err;
    }
  },

  async askFollowUp(payload: FollowUpRequestPayload): Promise<string> {
    if (!payload.question || !payload.question.trim()) {
      throw new Error('Please enter a question for the DevFix Team.');
    }

    try {
      const response = await fetch('/api/devfix/followup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) {
            errMessage = errData.error;
          }
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      return data.reply || 'No response returned by the DevFix team.';
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error: Unable to contact DevFix team.');
      }
      throw err;
    }
  },
};
