import { GoogleGenAI } from '@google/genai';
import { callGeminiWithRetry as serverCallGemini } from '../../server/services/geminiCaller';

/**
 * Client-facing adapter delegating to the unified, robust Gemini Caller
 */
export async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 3,
  requestId = 'agent_call',
  agentName = 'Agent'
): Promise<any> {
  return serverCallGemini(ai, params, maxRetries, requestId, agentName);
}
