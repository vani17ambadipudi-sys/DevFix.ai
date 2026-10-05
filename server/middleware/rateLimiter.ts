import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

// Clean up stale buckets every 5 minutes (unref so it doesn't hold event loop open)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > 300000) {
      buckets.delete(key);
    }
  }
}, 300000).unref();

export function createRateLimiter(options: { maxRequests: number; windowMs: number; tierName: string }) {
  const { maxRequests, windowMs, tierName } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Key by user ID if authenticated, otherwise client IP
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown_ip';
    const key = `${tierName}:${req.userId || clientIp}`;

    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxRequests - 1, lastRefill: now };
      buckets.set(key, bucket);
    } else {
      // Calculate token refill based on elapsed time
      const elapsed = now - bucket.lastRefill;
      const refillAmount = Math.floor((elapsed / windowMs) * maxRequests);

      if (refillAmount > 0) {
        bucket.tokens = Math.min(maxRequests, bucket.tokens + refillAmount);
        bucket.lastRefill = now;
      }

      if (bucket.tokens <= 0) {
        const retryAfterSec = Math.ceil((windowMs - (now - bucket.lastRefill)) / 1000);
        res.setHeader('Retry-After', retryAfterSec.toString());
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', '0');

        const errMsg = `Rate limit exceeded for ${tierName}. Maximum ${maxRequests} requests per ${windowMs / 1000}s. Please wait ${retryAfterSec}s.`;
        metrics.recordError(req.id || 'rate_req', 'RATE_LIMIT_ERROR', 'RATE_LIMITER', errMsg);
        logger.warn('rate_limit_exceeded', req.id || 'no_req', errMsg, { clientIp, tier: tierName });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_ERROR',
            message: errMsg,
            retryAfterSeconds: retryAfterSec,
          },
        });
      }

      bucket.tokens -= 1;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, bucket.tokens).toString());
    next();
  };
}

export const rateLimiters = {
  general: createRateLimiter({
    maxRequests: config.rateLimits.general,
    windowMs: 60000,
    tierName: 'general_api',
  }),
  auth: createRateLimiter({
    maxRequests: config.rateLimits.auth,
    windowMs: 60000,
    tierName: 'auth',
  }),
  ai: createRateLimiter({
    maxRequests: config.rateLimits.ai,
    windowMs: 60000,
    tierName: 'ai_debug',
  }),
  execution: createRateLimiter({
    maxRequests: config.rateLimits.execution,
    windowMs: 60000,
    tierName: 'code_execution',
  }),
};
