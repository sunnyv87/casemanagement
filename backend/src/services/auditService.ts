import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { logger } from '../utils/logger';

export interface AuditEntry {
  event_type: string;
  customer_id?: string;
  actor_user_id?: string;
  actor_role?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export async function createAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db('audit_logs').insert({
      audit_id: uuidv4(),
      ...entry,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
}

export async function queryAuditLogs(filters: {
  customer_id?: string;
  actor_user_id?: string;
  event_type?: string;
  target_entity_type?: string;
  target_entity_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 50, ...rest } = filters;
  let query = db('audit_logs').orderBy('timestamp', 'desc');

  if (rest.customer_id) query = query.where('customer_id', rest.customer_id);
  if (rest.actor_user_id) query = query.where('actor_user_id', rest.actor_user_id);
  if (rest.event_type) query = query.where('event_type', rest.event_type);
  if (rest.target_entity_type) query = query.where('target_entity_type', rest.target_entity_type);
  if (rest.target_entity_id) query = query.where('target_entity_id', rest.target_entity_id);
  if (rest.from_date) query = query.where('timestamp', '>=', rest.from_date);
  if (rest.to_date) query = query.where('timestamp', '<=', rest.to_date);

  const total = await query.clone().count('* as count').first();
  const logs = await query.offset((page - 1) * limit).limit(limit);

  return {
    data: logs,
    pagination: {
      page,
      limit,
      total: parseInt((total as any)?.count || '0'),
      pages: Math.ceil(parseInt((total as any)?.count || '0') / limit),
    },
  };
}
