import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { createAuditLog } from '../services/auditService';
import { sendNotification } from '../services/notificationService';
import { applySlaToCase, pauseSlaClock, resumeSlaClock } from '../services/slaService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// Generate case number
async function generateCaseNumber(customerId: string): Promise<string> {
  const customer = await db('customers').where('id', customerId).first();
  const code = customer?.code || 'GEN';
  const count = await db('cases').where('customer_id', customerId).count('* as count').first();
  const num = parseInt((count as any)?.count || '0') + 1;
  return `${code}-${String(num).padStart(4, '0')}`;
}

// GET /api/v1/cases
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { customer_id, status, severity, priority, assigned_analyst_id, from_date, to_date, search, page = '1', limit = '50', sort_by = 'created_at', sort_order = 'desc' } = req.query;

    let query = db('cases')
      .leftJoin('users as analyst', 'cases.assigned_analyst_id', 'analyst.id')
      .leftJoin('users as escalated', 'cases.escalated_to_id', 'escalated.id')
      .leftJoin('customers', 'cases.customer_id', 'customers.id')
      .select(
        'cases.*',
        'analyst.first_name as analyst_first_name',
        'analyst.last_name as analyst_last_name',
        'escalated.first_name as escalated_first_name',
        'escalated.last_name as escalated_last_name',
        'customers.name as customer_name',
        'customers.code as customer_code'
      );

    // Tenant scoping
    if (user.role === 'customer' || user.role === 'analyst') {
      query = query.whereIn('cases.customer_id', user.customerIds);
    }

    if (customer_id) query = query.where('cases.customer_id', customer_id as string);
    if (status) query = query.where('cases.status', status as string);
    if (severity) query = query.where('cases.severity', severity as string);
    if (priority) query = query.where('cases.priority', priority as string);
    if (assigned_analyst_id) query = query.where('cases.assigned_analyst_id', assigned_analyst_id as string);
    if (from_date) query = query.where('cases.created_at', '>=', from_date as string);
    if (to_date) query = query.where('cases.created_at', '<=', to_date as string);
    if (search) {
      query = query.where(function () {
        this.where('cases.title', 'ilike', `%${search}%`)
          .orWhere('cases.case_number', 'ilike', `%${search}%`)
          .orWhere('cases.description', 'ilike', `%${search}%`);
      });
    }

    const countQuery = query.clone().clearSelect().count('cases.case_id as count').first();
    const total = await countQuery;
    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 200);

    const cases = await query
      .orderBy(`cases.${sort_by}`, sort_order as string)
      .offset((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      data: cases,
      pagination: { page: pageNum, limit: limitNum, total: parseInt((total as any)?.count || '0'), pages: Math.ceil(parseInt((total as any)?.count || '0') / limitNum) },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/cases/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseRecord = await db('cases')
      .leftJoin('users as analyst', 'cases.assigned_analyst_id', 'analyst.id')
      .leftJoin('users as escalated', 'cases.escalated_to_id', 'escalated.id')
      .leftJoin('customers', 'cases.customer_id', 'customers.id')
      .where('cases.case_id', req.params.id)
      .select('cases.*', 'analyst.first_name as analyst_first_name', 'analyst.last_name as analyst_last_name', 'escalated.first_name as escalated_first_name', 'escalated.last_name as escalated_last_name', 'customers.name as customer_name')
      .first();

    if (!caseRecord) throw new AppError('Case not found', 404);

    if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
      if (!req.user!.customerIds.includes(caseRecord.customer_id)) {
        throw new AppError('Access denied', 403);
      }
    }

    // Get linked alerts
    const alerts = caseRecord.source_alerts?.length
      ? await db('alerts').whereIn('alert_id', caseRecord.source_alerts).select('alert_id', 'alert_name', 'severity', 'alert_status', 'source_platform')
      : [];

    // Get comments (filter internal for customers)
    let commentsQuery = db('case_comments')
      .join('users', 'case_comments.user_id', 'users.id')
      .where('case_comments.case_id', req.params.id)
      .select('case_comments.*', 'users.first_name', 'users.last_name', 'users.role')
      .orderBy('case_comments.created_at', 'asc');

    if (req.user!.role === 'customer') {
      commentsQuery = commentsQuery.where('case_comments.is_internal', false);
    }
    const comments = await commentsQuery;

    // Get attachments
    const attachments = await db('attachments').where('case_id', req.params.id).select('id', 'original_filename', 'mime_type', 'file_size', 'created_at');

    // Get related cases
    const relationships = await db('case_relationships')
      .where('source_case_id', req.params.id)
      .orWhere('target_case_id', req.params.id)
      .select('*');

    res.json({ ...caseRecord, alerts, comments, attachments, relationships });
  } catch (err) { next(err); }
});

// POST /api/v1/cases
router.post('/', authorize('analyst', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer_id, title, description, case_type, severity, priority, source_alert_ids, template_id } = req.body;
    if (!customer_id || !title || !severity || !priority) throw new AppError('customer_id, title, severity, and priority required', 400);

    let caseData: Record<string, any> = { customer_id, title, description, severity, priority, case_type: case_type || 'incident' };

    // Apply template if specified
    if (template_id) {
      const template = await db('case_templates').where('id', template_id).first();
      if (template) {
        caseData.tags = template.default_tags;
        caseData.mitre_mapping = template.default_mitre_techniques;
        if (!severity) caseData.severity = template.default_severity;
        if (!priority) caseData.priority = template.default_priority;
      }
    }

    const caseId = uuidv4();
    const caseNumber = await generateCaseNumber(customer_id);

    // Link alerts
    let sourcePlatforms: string[] = [];
    if (source_alert_ids?.length) {
      const alerts = await db('alerts').whereIn('alert_id', source_alert_ids).select('source_platform');
      sourcePlatforms = [...new Set(alerts.map((a: any) => a.source_platform))];
      await db('alerts').whereIn('alert_id', source_alert_ids).update({ case_id: caseId });
    }

    await db('cases').insert({
      case_id: caseId,
      case_number: caseNumber,
      ...caseData,
      status: 'new',
      source_alerts: source_alert_ids || [],
      source_platforms: sourcePlatforms,
      assigned_analyst_id: req.user!.id,
    });

    // Apply SLA
    await applySlaToCase(caseId, customer_id, severity);

    await createAuditLog({
      event_type: 'CASE_CREATED',
      customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'case',
      target_entity_id: caseId,
      new_value: { case_number: caseNumber, title, severity, priority },
    });

    res.status(201).json({ case_id: caseId, case_number: caseNumber, message: 'Case created' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/cases/:id
router.patch('/:id', authorize('analyst', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const caseRecord = await db('cases').where('case_id', req.params.id).first();
    if (!caseRecord) throw new AppError('Case not found', 404);

    const allowedFields = ['title', 'description', 'case_type', 'severity', 'priority', 'status', 'assigned_analyst_id', 'tags', 'mitre_mapping'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (updates.status) {
      // State machine validation
      const validTransitions: Record<string, string[]> = {
        new: ['assigned', 'in_progress'],
        assigned: ['in_progress', 'pending_customer', 'escalated'],
        in_progress: ['pending_customer', 'escalated', 'resolved'],
        pending_customer: ['in_progress', 'resolved'],
        escalated: ['in_progress', 'resolved'],
        resolved: ['closed', 'in_progress'],
        closed: [],
      };

      if (!validTransitions[caseRecord.status]?.includes(updates.status)) {
        throw new AppError(`Cannot transition from ${caseRecord.status} to ${updates.status}`, 400);
      }

      // SLA clock management
      if (updates.status === 'pending_customer') {
        await pauseSlaClock(req.params.id);
      } else if (caseRecord.status === 'pending_customer' && updates.status !== 'pending_customer') {
        await resumeSlaClock(req.params.id);
      }

      if (updates.status === 'resolved') {
        if (!req.body.resolution_notes) throw new AppError('Resolution notes are required', 400);
        updates.resolved_at = new Date();
        updates.resolution_notes = req.body.resolution_notes;
        updates.root_cause = req.body.root_cause;
      }

      // Track first response
      if (['assigned', 'in_progress'].includes(updates.status) && !caseRecord.first_responded_at) {
        updates.first_responded_at = new Date();
      }
    }

    updates.updated_at = new Date();
    await db('cases').where('case_id', req.params.id).update(updates);

    // Add status change comment
    if (updates.status) {
      await db('case_comments').insert({
        id: uuidv4(),
        case_id: req.params.id,
        user_id: req.user!.id,
        comment_type: 'status_change',
        content: `Status changed from ${caseRecord.status} to ${updates.status}`,
        metadata: { old_status: caseRecord.status, new_status: updates.status },
      });
    }

    await createAuditLog({
      event_type: 'CASE_UPDATED',
      customer_id: caseRecord.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'case',
      target_entity_id: req.params.id,
      old_value: { status: caseRecord.status },
      new_value: updates,
    });

    res.json({ message: 'Case updated' });
  } catch (err) { next(err); }
});

// POST /api/v1/cases/:id/comments
router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, is_internal } = req.body;
    if (!content) throw new AppError('Content is required', 400);

    const caseRecord = await db('cases').where('case_id', req.params.id).first();
    if (!caseRecord) throw new AppError('Case not found', 404);

    const commentType = req.user!.role === 'customer' ? 'customer_query' : 'comment';
    const commentId = uuidv4();

    await db('case_comments').insert({
      id: commentId,
      case_id: req.params.id,
      user_id: req.user!.id,
      comment_type: commentType,
      content,
      is_internal: req.user!.role === 'customer' ? false : (is_internal || false),
    });

    // Notify analyst if customer comments
    if (req.user!.role === 'customer' && caseRecord.assigned_analyst_id) {
      await sendNotification({
        user_id: caseRecord.assigned_analyst_id,
        title: 'Customer Query on Case',
        message: `Customer added a comment to case ${caseRecord.case_number}`,
        type: 'case',
        link: `/cases/${caseRecord.case_id}`,
      });
    }

    res.status(201).json({ id: commentId, message: 'Comment added' });
  } catch (err) { next(err); }
});

// POST /api/v1/cases/:id/escalate
router.post('/:id/escalate', authorize('analyst', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { escalate_to_id, reason } = req.body;
    const caseRecord = await db('cases').where('case_id', req.params.id).first();
    if (!caseRecord) throw new AppError('Case not found', 404);

    await db('cases').where('case_id', req.params.id).update({
      status: 'escalated',
      escalated_to_id: escalate_to_id,
      updated_at: new Date(),
    });

    await db('case_comments').insert({
      id: uuidv4(),
      case_id: req.params.id,
      user_id: req.user!.id,
      comment_type: 'escalation',
      content: `Case escalated. Reason: ${reason || 'Not specified'}`,
      metadata: { escalated_to: escalate_to_id },
    });

    if (escalate_to_id) {
      await sendNotification({
        user_id: escalate_to_id,
        title: 'Case Escalated to You',
        message: `Case ${caseRecord.case_number} has been escalated to you. Reason: ${reason || 'Not specified'}`,
        type: 'escalation',
        severity: 'high',
        link: `/cases/${caseRecord.case_id}`,
      });
    }

    await createAuditLog({
      event_type: 'CASE_ESCALATED',
      customer_id: caseRecord.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'case',
      target_entity_id: req.params.id,
      new_value: { escalated_to: escalate_to_id, reason },
    });

    res.json({ message: 'Case escalated' });
  } catch (err) { next(err); }
});

// POST /api/v1/cases/:id/close
router.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    if (!['customer', 'manager', 'admin'].includes(user.role)) {
      throw new AppError('Only customers, managers, or admins can close cases', 403);
    }

    const caseRecord = await db('cases').where('case_id', req.params.id).first();
    if (!caseRecord) throw new AppError('Case not found', 404);
    if (caseRecord.status !== 'resolved') throw new AppError('Case must be in resolved status before closing', 400);

    await db('cases').where('case_id', req.params.id).update({ status: 'closed', updated_at: new Date() });

    await db('case_comments').insert({
      id: uuidv4(),
      case_id: req.params.id,
      user_id: user.id,
      comment_type: 'status_change',
      content: 'Case closed',
    });

    await createAuditLog({
      event_type: 'CASE_CLOSED',
      customer_id: caseRecord.customer_id,
      actor_user_id: user.id,
      actor_role: user.role,
      target_entity_type: 'case',
      target_entity_id: req.params.id,
    });

    res.json({ message: 'Case closed' });
  } catch (err) { next(err); }
});

// POST /api/v1/cases/:id/link
router.post('/:id/link', authorize('analyst', 'manager', 'admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { target_case_id, relationship_type } = req.body;
    if (!target_case_id || !relationship_type) throw new AppError('target_case_id and relationship_type required', 400);

    await db('case_relationships').insert({
      id: uuidv4(),
      source_case_id: req.params.id,
      target_case_id,
      relationship_type,
    });

    res.status(201).json({ message: 'Cases linked' });
  } catch (err) { next(err); }
});

export { router as caseRouter };
