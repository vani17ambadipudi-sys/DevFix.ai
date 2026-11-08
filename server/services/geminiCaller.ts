import { GoogleGenAI } from '@google/genai';
import { logger } from '../observability/logger';

export interface GeminiCallOptions {
  model?: string;
  contents: any;
  config?: any;
  maxRetries?: number;
  requestId?: string;
  agentName?: string;
}

export interface GeminiCallResult {
  text?: string;
  modelUsed: string;
  attempts: number;
  failoverUsed: boolean;
}

// In-memory circuit breaker for models whose daily quota is exhausted
const quotaExhaustedModels = new Map<string, number>();

// Pre-seed known daily quota exhaustion for gemini-3.8-flash (20 reqs/day free-tier limit)
quotaExhaustedModels.set('gemini-3.8-flash', Date.now() + 24 * 60 * 60 * 1000);

export function isModelQuotaExhausted(model: string): boolean {
  const expiry = quotaExhaustedModels.get(model);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    quotaExhaustedModels.delete(model);
    return false;
  }
  return true;
}

export function markModelQuotaExhausted(model: string, cooldownMs = 24 * 60 * 60 * 1000): void {
  quotaExhaustedModels.set(model, Date.now() + cooldownMs);
}

export function getActivePrimaryModel(): string {
  if (isModelQuotaExhausted('gemini-3.8-flash')) {
    return isModelQuotaExhausted('gemini-3.1-flash-lite') ? 'gemini-flash-latest' : 'gemini-3.1-flash-lite';
  }
  return 'gemini-3.8-flash';
}

/**
 * Robust Gemini API caller featuring:
 * 1. Proactive quota circuit breaker and zero-latency model substitution
 * 2. Exponential backoff with random jitter for transient errors (429, 503, high demand spikes)
 * 3. Automatic model failover from 'gemini-3.8-flash' to 'gemini-3.1-flash-lite'
 * 4. Sanitized telemetry logging (zero raw secret/RPC violation dumps)
 * 5. Structured error diagnostics
 */
export async function callGeminiWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 3,
  requestId = 'gemini_call',
  agentName = 'GeminiCaller'
): Promise<any> {
  let lastErr: any;
  const requestedModel = params.model || 'gemini-3.8-flash';
  let currentModel = requestedModel;
  let failoverUsed = false;

  // Proactive preflight check: if requested model has exhausted its daily quota,
  // immediately substitute active fallback model without incurring an unneeded failed attempt.
  if (isModelQuotaExhausted(requestedModel)) {
    const alternative = getActivePrimaryModel();
    if (alternative !== requestedModel) {
      currentModel = alternative;
      params.model = currentModel;
      failoverUsed = true;
      logger.info('gemini_model_preflight_substitution', requestId, {
        agent: agentName,
        requestedModel,
        substitutedModel: currentModel,
        reason: 'Requested model daily quota exhausted; using active failover model with available capacity.',
      });
    }
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Automatic model failover on repeated high-demand/transient failures
      if (attempt >= 2 && currentModel === 'gemini-3.8-flash' && !failoverUsed) {
        currentModel = 'gemini-3.1-flash-lite';
        params.model = currentModel;
        failoverUsed = true;
        logger.info(
          'gemini_model_failover',
          requestId,
          {
            agent: agentName,
            initialModel: requestedModel,
            fallbackModel: currentModel,
            attempt,
            message: `High demand on ${requestedModel}. Failing over to ${currentModel} for ${agentName}.`,
          }
        );
      }

      logger.info('gemini_request_start', requestId, {
        agent: agentName,
        model: currentModel,
        attempt: attempt + 1,
        failoverUsed,
      });

      const response = await ai.models.generateContent(params);

      logger.success('gemini_request_success', requestId, undefined, {
        agent: agentName,
        model: currentModel,
        attempts: attempt + 1,
        failoverUsed,
      });

      return response;
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || String(err);

      // Check for daily quota exhaustion (e.g. Free Tier 20 requests per day limit)
      const isDailyQuotaExhausted =
        msg.includes('GenerateRequestsPerDay') ||
        msg.includes('generate_content_free_tier_requests') ||
        msg.includes('requests per day limit exceeded') ||
        (msg.includes('quota') && (msg.includes('retry in') || msg.includes('exceeded')));

      if (isDailyQuotaExhausted) {
        markModelQuotaExhausted(currentModel);

        if (currentModel === 'gemini-3.8-flash' && !failoverUsed) {
          logger.info('gemini_quota_failover', requestId, {
            agent: agentName,
            exhaustedModel: currentModel,
            fallbackModel: 'gemini-3.1-flash-lite',
            message: `Daily free tier quota exhausted on ${currentModel}. Instantly failing over to gemini-3.1-flash-lite.`,
          });
          currentModel = 'gemini-3.1-flash-lite';
          params.model = currentModel;
          failoverUsed = true;
          // Immediately try failover model without wasting retries or delay
          continue;
        }

        // Both primary and failover exhausted, immediately trigger deterministic fallback
        err.isQuotaExhausted = true;
        err.isTransient = true;
        err.modelUsed = currentModel;
        throw err;
      }

      const isTransient =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('Resource has been exhausted') ||
        msg.includes('overloaded') ||
        msg.includes('rate limit');

      const sanitizedSummary = isTransient
        ? `Transient load or rate limit encountered on ${currentModel}`
        : `Request error on ${currentModel}`;

      if (isTransient && attempt < maxRetries) {
        logger.info(
          'gemini_request_retry',
          requestId,
          {
            agent: agentName,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            model: currentModel,
            summary: sanitizedSummary,
          }
        );

        // Exponential backoff: ~700ms, ~1400ms, ~2800ms + random jitter
        const baseDelay = 700 * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * 300);
        const delayMs = baseDelay + jitter;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // If non-transient or retries exhausted, annotate error for downstream fallbacks
      err.isTransient = isTransient;
      err.isHighDemand = msg.includes('high demand') || msg.includes('503') || msg.includes('UNAVAILABLE');
      err.modelUsed = currentModel;
      throw err;
    }
  }

  if (lastErr) {
    lastErr.isHighDemand = true;
  }
  throw lastErr;
}
