import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db, UserRecord } from '../database/db';
import { logger } from '../observability/logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'developer' | 'admin';
}

export function generateToken(user: Pick<UserRecord, 'id' | 'email' | 'role'>): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Enforces valid authentication token in Authorization: Bearer <token>
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    logger.warn('auth_unauthorized', req.id || 'no_req', 'Missing Bearer token in request');
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication required. Please provide a valid Bearer token.',
      },
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    logger.warn('auth_invalid_token', req.id || 'no_req', 'Invalid or expired Bearer token');
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Invalid or expired authentication token. Please log in again.',
      },
    });
  }

  req.userId = payload.userId;
  next();
}

/**
 * Extracts userId if present, but allows guest access.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.userId;
    }
  }
  next();
}
