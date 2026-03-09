import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { authenticate, authorize, AuthUser } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/v1/alerts - List alerts with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { customer_id, severity, source_platform, alert_status, assigned_to, from_date, to_date, search, page = '1', limit = '50', sort_by = 'ingested_at', sort_order = 'desc' } = req.query;

    let query = db('alerts')
      .leftJoin('users', 'alerts.assigned_to', 'users.id')
      .leftJoin('customers', 'alerts.customer_id', 'customers.id')
      .select(
        'alerts.*',
        'users.first_name as analyst_first_name',
        'users.last_name as analyst_last_name',
        'customers.name as customer_name',
        'customers.code as customer_code'
      );

    // Tenant scoping
    if (user.role === 'customer') {
      query = query.whereIn('alerts.customer_id', user.customerIds);
      // Customers can't see raw alerts, only through cases
      throw new AppError('Customers cannot access alert queue directly', 403);
    } else if (user.role === 'analyst') {
      query = query.whereIn('alerts.customer_id', user.customerIds);
    }
    // Manager and admin see all (or filtered)

    if (customer_id) query = query.where('alerts.customer_id', customer_id as string);
    if (severity) query = query.where('alerts.severity', severity as string);
    if (source_platform) query = query.where('alerts.source_platform', source_platform as string);
    if (alert_status) query = query.where('alerts.alert_status', alert_status as string);
    if (assigned_to) query = query.where('alerts.assigned_to', assigned_to as string);
    if (from_date) query = query.where('alerts.alert_created_at', '>=', from_date as string);
    if (to_date) query = query.where('alerts.alert_created_at', '<=', to_date as string);
    if (search) {
      query = query.where(function () {
        this.where('alerts.alert_name', 'ilike', `%${search}%`)
          .orWhere('alerts.alert_description', 'ilike', `%${search}%`)
          .orWhere('alerts.source_alert_id', 'ilike', `%${search}%`);
      });
    }

    const countQuery = query.clone().clearSelect().count('alerts.alert_id as count').first();
    const total = await countQuery;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 200);

    const alerts = await query
      .orderBy(`alerts.${sort_by}`, sort_order as string)
      .offset((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      data: alerts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt((total as any)?.count || '0'),
        pages: Math.ceil(parseInt((total as any)?.count || '0') / limitNum),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/alerts/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await db('alerts')
      .leftJoin('users', 'alerts.assigned_to', 'users.id')
      .leftJoin('customers', 'alerts.customer_id', 'customers.id')
      .where('alerts.alert_id', req.params.id)
      .select('alerts.*', 'users.first_name as analyst_first_name', 'users.last_name as analyst_last_name', 'customers.name as customer_name')
      .first();

    if (!alert) throw new AppError('Alert not found', 404);

    // Tenant check
    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      if (!req.user!.customerIds.includes(alert.customer_id)) {
        throw new AppError('Access denied', 403);
      }
    }

    res.json(alert);
  } catch (err) { next(err); }
});

// PATCH /api/v1/alerts/:id/assign
router.patch('/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { analyst_id } = req.body;
    const user = req.user!;

    if (user.role === 'analyst' && analyst_id !== user.id) {
      throw new AppError('Analysts can only assign alerts to themselves', 403);
    }

    const alert = await db('alerts').where('alert_id', req.params.id).first();
    if (!alert) throw new AppError('Alert not found', 404);

    const oldAssigned = alert.assigned_to;
    await db('alerts').where('alert_id', req.params.id).update({ assigned_to: analyst_id, alert_status: 'in_progress' });

    await createAuditLog({
      event_type: 'ALERT_ASSIGNED',
      customer_id: alert.customer_id,
      actor_user_id: user.id,
      actor_role: user.role,
      target_entity_type: 'alert',
      target_entity_id: alert.alert_id,
      old_value: { assigned_to: oldAssigned },
      new_value: { assigned_to: analyst_id },
    });

    res.json({ message: 'Alert assigned successfully' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/alerts/:id/status
router.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'in_progress', 'escalated', 'resolved', 'closed', 'false_positive'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

    const alert = await db('alerts').where('alert_id', req.params.id).first();
    if (!alert) throw new AppError('Alert not found', 404);

    const oldStatus = alert.alert_status;
    await db('alerts').where('alert_id', req.params.id).update({ alert_status: status });

    await createAuditLog({
      event_type: 'ALERT_STATUS_UPDATED',
      customer_id: alert.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'alert',
      target_entity_id: alert.alert_id,
      old_value: { status: oldStatus },
      new_value: { status },
    });

    res.json({ message: 'Alert status updated' });
  } catch (err) { next(err); }
});

// POST /api/v1/alerts/bulk/assign
router.post('/bulk/assign', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alert_ids, analyst_id } = req.body;
    if (!Array.isArray(alert_ids) || !analyst_id) throw new AppError('alert_ids array and analyst_id required', 400);

    await db('alerts').whereIn('alert_id', alert_ids).update({ assigned_to: analyst_id, alert_status: 'in_progress' });

    await createAuditLog({
      event_type: 'ALERTS_BULK_ASSIGNED',
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      new_value: { alert_ids, analyst_id },
    });

    res.json({ message: `${alert_ids.length} alerts assigned` });
  } catch (err) { next(err); }
});

// POST /api/v1/alerts/bulk/status
router.post('/bulk/status', authorize('manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { alert_ids, status } = req.body;
    if (!Array.isArray(alert_ids) || !status) throw new AppError('alert_ids array and status required', 400);

    await db('alerts').whereIn('alert_id', alert_ids).update({ alert_status: status });
    res.json({ message: `${alert_ids.length} alerts updated to ${status}` });
  } catch (err) { next(err); }
});

// POST /api/v1/alerts - Manually create alert
router.post('/', authorize('analyst', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer_id, alert_name, severity, alert_description, source_ip, destination_ip, actor_entity, tags, mitre_techniques } = req.body;
    if (!customer_id || !alert_name || !severity) throw new AppError('customer_id, alert_name, and severity are required', 400);

    const alertId = uuidv4();
    await db('alerts').insert({
      alert_id: alertId,
      source_platform: 'manual',
      source_alert_id: `MANUAL-${alertId.substring(0, 8)}`,
      customer_id,
      alert_name,
      alert_category: req.body.alert_category,
      severity,
      alert_status: 'new',
      source_ip,
      destination_ip,
      actor_entity,
      alert_description,
      alert_created_at: new Date(),
      ingested_at: new Date(),
      assigned_to: req.user!.id,
      tags: tags || [],
      mitre_techniques: mitre_techniques || [],
      source_raw_json: { manual: true, created_by: req.user!.id },
    });

    await createAuditLog({
      event_type: 'ALERT_CREATED',
      customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'alert',
      target_entity_id: alertId,
    });

    res.status(201).json({ alert_id: alertId, message: 'Alert created' });
  } catch (err) { next(err); }
});

// DELETE /api/v1/alerts/:id - Admin only
router.delete('/:id', authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const alert = await db('alerts').where('alert_id', req.params.id).first();
    if (!alert) throw new AppError('Alert not found', 404);

    await db('alerts').where('alert_id', req.params.id).del();

    await createAuditLog({
      event_type: 'ALERT_DELETED',
      customer_id: alert.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'alert',
      target_entity_id: req.params.id,
      old_value: { alert_name: alert.alert_name },
    });

    res.json({ message: 'Alert deleted' });
  } catch (err) { next(err); }
});

export { router as alertRouter };
