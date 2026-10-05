import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { generateToken, requireAuth } from '../middleware/auth';
import { validateAuthRequest } from '../middleware/validator';
import { rateLimiters } from '../middleware/rateLimiter';
import { logger } from '../observability/logger';

const router = Router();

// Apply auth rate limiting
router.use(rateLimiters.auth);

router.post('/register', validateAuthRequest, (req: Request, res: Response) => {
  const requestId = req.id || 'auth_req';
  try {
    const { email, password, name = 'Developer' } = req.body;
    const user = db.createUser(email, password, name);
    const token = generateToken(user);

    logger.info('user_registered', requestId, { userId: user.id, email: user.email });

    return res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (err: any) {
    logger.warn('register_failed', requestId, err.message);
    return res.status(400).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: err.message },
    });
  }
});

router.post('/login', validateAuthRequest, (req: Request, res: Response) => {
  const requestId = req.id || 'auth_req';
  try {
    const { email, password } = req.body;
    const user = db.findUserByEmail(email);

    if (!user || !db.verifyPassword(user, password)) {
      logger.warn('login_invalid_credentials', requestId, `Failed login attempt for: ${email}`);
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Invalid email or password.' },
      });
    }

    const token = generateToken(user);
    logger.info('user_logged_in', requestId, { userId: user.id, email: user.email });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  }
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.userId ? db.findUserById(req.userId) : null;
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: 'User not found.' },
    });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

router.post('/logout', (req: Request, res: Response) => {
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
