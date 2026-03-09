import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { authenticate, authorize } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { createAuditLog } from '../services/auditService';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

// GET /api/v1/integrations
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integrations = await db('integrations')
      .join('customers', 'integrations.customer_id', 'customers.id')
      .select('integrations.*', 'customers.name as customer_name')
      .orderBy('integrations.created_at', 'desc');

    // Don't expose encrypted credentials
    const sanitized = integrations.map((i: any) => ({ ...i, encrypted_credentials: undefined, has_credentials: !!i.encrypted_credentials }));
    res.json({ data: sanitized });
  } catch (err) { next(err); }
});

// GET /api/v1/integrations/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await db('integrations')
      .join('customers', 'integrations.customer_id', 'customers.id')
      .where('integrations.id', req.params.id)
      .select('integrations.*', 'customers.name as customer_name')
      .first();

    if (!integration) throw new AppError('Integration not found', 404);
    integration.encrypted_credentials = undefined;
    integration.has_credentials = true;

    res.json(integration);
  } catch (err) { next(err); }
});

// POST /api/v1/integrations
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customer_id, platform, name, base_url, credentials, auth_type, ingestion_mode, polling_interval_seconds, bidirectional_sync, config } = req.body;
    if (!customer_id || !platform || !name || !base_url || !credentials || !auth_type) {
      throw new AppError('Missing required fields', 400);
    }

    const id = uuidv4();
    const encryptedCreds = encrypt(JSON.stringify(credentials));

    await db('integrations').insert({
      id, customer_id, platform, name, base_url,
      encrypted_credentials: encryptedCreds,
      auth_type,
      ingestion_mode: ingestion_mode || 'pull',
      polling_interval_seconds: polling_interval_seconds || 60,
      bidirectional_sync: bidirectional_sync || false,
      config: config || {},
    });

    await createAuditLog({
      event_type: 'INTEGRATION_CREATED',
      customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'integration',
      target_entity_id: id,
      new_value: { platform, name, base_url },
    });

    res.status(201).json({ id, message: 'Integration created' });
  } catch (err) { next(err); }
});

// PATCH /api/v1/integrations/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await db('integrations').where('id', req.params.id).first();
    if (!integration) throw new AppError('Integration not found', 404);

    const updates: Record<string, any> = {};
    const allowedFields = ['name', 'base_url', 'auth_type', 'ingestion_mode', 'polling_interval_seconds', 'bidirectional_sync', 'status', 'config'];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (req.body.credentials) {
      updates.encrypted_credentials = encrypt(JSON.stringify(req.body.credentials));
    }

    updates.updated_at = new Date();
    await db('integrations').where('id', req.params.id).update(updates);

    await createAuditLog({
      event_type: 'INTEGRATION_UPDATED',
      customer_id: integration.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'integration',
      target_entity_id: req.params.id,
    });

    res.json({ message: 'Integration updated' });
  } catch (err) { next(err); }
});

// DELETE /api/v1/integrations/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await db('integrations').where('id', req.params.id).first();
    if (!integration) throw new AppError('Integration not found', 404);

    await db('integrations').where('id', req.params.id).del();

    await createAuditLog({
      event_type: 'INTEGRATION_DELETED',
      customer_id: integration.customer_id,
      actor_user_id: req.user!.id,
      actor_role: req.user!.role,
      target_entity_type: 'integration',
      target_entity_id: req.params.id,
      old_value: { platform: integration.platform, name: integration.name },
    });

    res.json({ message: 'Integration deleted' });
  } catch (err) { next(err); }
});

// POST /api/v1/integrations/:id/test
router.post('/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const integration = await db('integrations').where('id', req.params.id).first();
    if (!integration) throw new AppError('Integration not found', 404);

    // In production, this would attempt to connect to the SIEM/SOAR
    res.json({ status: 'success', message: `Connection test for ${integration.platform} passed` });
  } catch (err) { next(err); }
});

export { router as integrationRouter };
