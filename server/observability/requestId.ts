import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request interface to include id and startTime
declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
      userId?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Use existing header if provided by gateway, otherwise generate unique ID
  const existingId = req.headers['x-request-id'];
  const requestId = (typeof existingId === 'string' && existingId.trim())
    ? existingId.trim()
    : `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

  req.id = requestId;
  req.startTime = Date.now();

  res.setHeader('X-Request-Id', requestId);
  next();
}
