import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  component?: string;
  details?: any;
}

export function errorHandler(err: AppError, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.id || 'untracked_req';
  const statusCode = err.statusCode || (err.code === 'AUTH_ERROR' ? 401 : err.code === 'VALIDATION_ERROR' ? 400 : 500);

  // Map to standard error code
  let errorCode = err.code || 'INTERNAL_ERROR';
  if (err.message?.toLowerCase().includes('timeout')) {
    errorCode = 'EXECUTION_TIMEOUT';
  } else if (err.message?.toLowerCase().includes('gemini') || err.message?.toLowerCase().includes('ai')) {
    errorCode = 'AI_ERROR';
  }

  const component = err.component || 'BACKEND_SERVER';

  // Sanitized message: never expose internal stack traces or environment variables
  let safeMessage = err.message || 'An unexpected internal error occurred.';
  if (safeMessage.includes('/home') || safeMessage.includes('/usr') || safeMessage.includes('node_modules')) {
    safeMessage = 'An internal system error occurred while processing the request.';
  }

  // Record error in metrics & structured logger
  metrics.recordError(requestId, errorCode, component, safeMessage);
  logger.error(
    'unhandled_request_error',
    requestId,
    errorCode,
    safeMessage,
    component,
    req.startTime ? Date.now() - req.startTime : undefined
  );

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: safeMessage,
      requestId,
    },
  });
}
