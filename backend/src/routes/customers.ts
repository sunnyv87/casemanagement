import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    let query = db('customers').select('*').orderBy('name', 'asc');

    if (user.role === 'customer' || user.role === 'analyst') {
      query = query.whereIn('id', user.customerIds);
    }

    if (req.query.status) query = query.where('status', req.query.status as string);
    if (req.query.search) query = query.where('name', 'ilike', `%${req.query.search}%`);

    const customers = await query;
    res.json({ data: customers });
  } catch (err) { next(err); }
});

// GET /api/v1/customers/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await db('customers').where('id', req.params.id).first();
    if (!customer) throw new AppError('Customer not found', 404);

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      if (!req.user!.customerIds.includes(customer.id)) throw new AppError('Access denied', 403);
    }

    const stats = await db('cases').where('customer_id', req.params.id)
      .select(
        db.raw('count(*) as total_cases'),
        db.raw("count(*) filter (where status not in ('resolved', 'closed')) as open_cases"),
        db.raw("count(*) filter (where sla_resolution_breached = true) as sla_breaches")
      )
      .first();

    const alertCount = await db('alerts').where('customer_id', req.params.id).count('* as count').first();

    res.json({ ...customer, stats: { ...stats, total_alerts: parseInt((alertCount as any)?.count || '0') } });
  } catch (err) { next(err); }
});

// POST /api/v1/customers
router.post('/', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, industry, contact_name, contact_email, contact_phone, logo_url, primary_color } = req.body;
    if (!name || !code) throw new AppError('Name and code are required', 400);

    const existing = await db('customers').where('code', code).first();
    if (existing) throw new AppError('Customer code already exists', 409);

    const id = uuidv4();
    await db('customers').insert({ id, name, code, industry, contact_name, contact_email, contact_phone, logo_url, primary_color });

    await createAuditLog({
      event_type: 'CUSTOMER_CREATED',
      customer_id: id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'customer',
      target_entity_id: id,
      new_value: { name, code },
    });

    res.status(201).json({ id, message: 'Customer created' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/customers/:id
router.patch('/:id', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await db('customers').where('id', req.params.id).first();
    if (!customer) throw new AppError('Customer not found', 404);

    const allowedFields = ['name', 'industry', 'contact_name', 'contact_email', 'contact_phone', 'logo_url', 'primary_color', 'status', 'settings'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    updates.updated_at = new Date();

    await db('customers').where('id', req.params.id).update(updates);

    await createAuditLog({
      event_type: 'CUSTOMER_UPDATED',
      customer_id: req.params.id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'customer',
      target_entity_id: req.params.id,
      old_value: customer,
      new_value: updates,
    });

    res.json({ message: 'Customer updated' });
  } catch (err) { next(err); }
});

// GET /api/v1/customers/:id/sla-policies
router.get('/:id/sla-policies', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const policies = await db('sla_policies').where('customer_id', req.params.id);
    res.json({ data: policies });
  } catch (err) { next(err); }
});

// POST /api/v1/customers/:id/sla-policies
router.post('/:id/sla-policies', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = uuidv4();
    await db('sla_policies').insert({ id, customer_id: req.params.id, ...req.body });
    res.status(201).json({ id, message: 'SLA policy created' });
  } catch (err) { next(err); }
});

export { router as customerRouter };
