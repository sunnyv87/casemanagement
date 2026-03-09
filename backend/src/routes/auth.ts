import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { authenticate, AuthUser } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { createAuditLog } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

function generateTokens(user: AuthUser) {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRY } as jwt.SignOptions);
  const refreshToken = jwt.sign({ id: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const user = await db('users').where({ email: email.toLowerCase(), status: 'active' }).first();
    if (!user) throw new AppError('Invalid credentials', 401);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      throw new AppError('Account is temporarily locked. Try again later.', 423);
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const updates: Record<string, unknown> = { failed_login_attempts: attempts };
      if (attempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60000);
        updates.status = 'locked';
      }
      await db('users').where('id', user.id).update(updates);
      throw new AppError('Invalid credentials', 401);
    }

    // Get customer assignments
    const customerAssignments = await db('user_customers').where('user_id', user.id).select('customer_id');
    const customerIds = customerAssignments.map((c: any) => c.customer_id);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      customerIds,
    };

    const tokens = generateTokens(authUser);

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 10);
    await db('refresh_tokens').insert({
      id: uuidv4(),
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60000),
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    // Reset failed attempts and update last login
    await db('users').where('id', user.id).update({
      failed_login_attempts: 0,
      locked_until: null,
      status: 'active',
      last_login_at: new Date(),
    });

    await createAuditLog({
      event_type: 'USER_LOGIN',
      actor_user_id: user.id,
      actor_role: user.role,
      target_entity_type: 'user',
      target_entity_id: user.id,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });

    res.json({
      user: { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, role: user.role, customerIds },
      ...tokens,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = await db('users').where({ id: decoded.id, status: 'active' }).first();
    if (!user) throw new AppError('Invalid refresh token', 401);

    const customerAssignments = await db('user_customers').where('user_id', user.id).select('customer_id');
    const customerIds = customerAssignments.map((c: any) => c.customer_id);

    const authUser: AuthUser = { id: user.id, email: user.email, role: user.role, customerIds };
    const tokens = generateTokens(authUser);

    res.json(tokens);
  } catch (err) { next(err); }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db('users').where('id', req.user!.id).first();
    if (!user) throw new AppError('User not found', 404);

    const customerAssignments = await db('user_customers')
      .join('customers', 'user_customers.customer_id', 'customers.id')
      .where('user_customers.user_id', user.id)
      .select('customers.*');

    res.json({
      id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
      role: user.role, mfaEnabled: user.mfa_enabled, customers: customerAssignments,
    });
  } catch (err) { next(err); }
});

// POST /api/v1/auth/change-password
router.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db('users').where('id', req.user!.id).first();
    if (!user) throw new AppError('User not found', 404);

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await db('users').where('id', user.id).update({ password_hash: newHash, updated_at: new Date() });

    await createAuditLog({
      event_type: 'PASSWORD_CHANGED', actor_user_id: user.id, actor_role: user.role,
      target_entity_type: 'user', target_entity_id: user.id,
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) { next(err); }
});

export { router as authRouter };
