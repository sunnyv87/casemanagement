import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/users
router.get('/', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let query = db('users').select('id', 'email', 'first_name', 'last_name', 'role', 'status', 'mfa_enabled', 'last_login_at', 'created_at');

    if (user.role === 'manager') {
      // Managers see users for their assigned customers
      query = query.whereIn('id', function () {
        this.select('user_id').from('user_customers').whereIn('customer_id', user.customerIds);
      });
    }

    if (req.query.role) query = query.where('role', req.query.role as string);
    if (req.query.status) query = query.where('status', req.query.status as string);
    if (req.query.search) {
      query = query.where(function () {
        this.where('email', 'ilike', `%${req.query.search}%`)
          .orWhere('first_name', 'ilike', `%${req.query.search}%`)
          .orWhere('last_name', 'ilike', `%${req.query.search}%`);
      });
    }

    const users = await query.orderBy('created_at', 'desc');
    res.json({ data: users });
  } catch (err) { next(err); }
});

// POST /api/v1/users
router.post('/', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, first_name, last_name, role, phone, customer_ids } = req.body;
    if (!email || !password || !first_name || !last_name || !role) throw new AppError('Required fields missing', 400);

    const existing = await db('users').where('email', email.toLowerCase()).first();
    if (existing) throw new AppError('Email already exists', 409);

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    await db('users').insert({ id, email: email.toLowerCase(), password_hash: passwordHash, first_name, last_name, role, phone });

    if (customer_ids?.length) {
      const assignments = customer_ids.map((cid: string) => ({ user_id: id, customer_id: cid }));
      await db('user_customers').insert(assignments);
    }

    await createAuditLog({
      event_type: 'USER_CREATED',
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'user',
      target_entity_id: id,
      new_value: { email, role, first_name, last_name },
    });

    res.status(201).json({ id, message: 'User created' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/:id/roles
router.patch('/:id/roles', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body;
    const user = await db('users').where('id', req.params.id).first();
    if (!user) throw new AppError('User not found', 404);

    const oldRole = user.role;
    await db('users').where('id', req.params.id).update({ role, updated_at: new Date() });

    await createAuditLog({
      event_type: 'ROLE_CHANGED',
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'user',
      target_entity_id: req.params.id,
      old_value: { role: oldRole },
      new_value: { role },
    });

    res.json({ message: 'Role updated' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/users/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (user.role !== 'admin' && user.id !== req.params.id) throw new AppError('Access denied', 403);

    const allowedFields = user.role === 'admin'
      ? ['first_name', 'last_name', 'phone', 'status', 'mfa_enabled']
      : ['first_name', 'last_name', 'phone'];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = new Date();

    await db('users').where('id', req.params.id).update(updates);
    res.json({ message: 'User updated' });
  } catch (err) { next(err); }
});

// POST /api/v1/users/:id/assign-customers
router.post('/:id/assign-customers', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer_ids } = req.body;
    if (!Array.isArray(customer_ids)) throw new AppError('customer_ids array required', 400);

    await db('user_customers').where('user_id', req.params.id).del();
    if (customer_ids.length) {
      const assignments = customer_ids.map((cid: string) => ({ user_id: req.params.id, customer_id: cid }));
      await db('user_customers').insert(assignments);
    }

    res.json({ message: 'Customer assignments updated' });
  } catch (err) { next(err); }
});

export { router as userRouter };
