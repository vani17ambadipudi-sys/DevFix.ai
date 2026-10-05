import { GoogleGenAI } from '@google/genai';

export async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 3
): Promise<any> {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);
      const isTransient =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('Resource has been exhausted');

      if (isTransient && attempt < maxRetries) {
        const delayMs = 1200 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
