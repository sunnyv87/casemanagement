import db from '../database/connection';
import { logger } from '../utils/logger';
import { sendNotification } from './notificationService';
import { createAuditLog } from './auditService';

export async function applySlaToCase(caseId: string, customerId: string, severity: string): Promise<void> {
  const slaPolicy = await db('sla_policies')
    .where({ customer_id: customerId, is_default: true })
    .first();

  if (!slaPolicy) {
    logger.warn(`No default SLA policy found for customer ${customerId}`);
    return;
  }

  const severityKey = severity.toLowerCase();
  const responseMinutes = slaPolicy[`${severityKey}_response_minutes`];
  const resolutionMinutes = slaPolicy[`${severityKey}_resolution_minutes`];

  if (!responseMinutes || !resolutionMinutes) return;

  const now = new Date();
  const responseDue = new Date(now.getTime() + responseMinutes * 60000);
  const resolutionDue = new Date(now.getTime() + resolutionMinutes * 60000);

  await db('cases').where('case_id', caseId).update({
    sla_policy_id: slaPolicy.id,
    sla_response_due_at: responseDue,
    sla_resolution_due_at: resolutionDue,
  });
}

export async function checkSlaBreaches(): Promise<void> {
  const now = new Date();

  // Check response SLA breaches
  const responseBreaches = await db('cases')
    .whereIn('status', ['new', 'assigned'])
    .where('sla_response_breached', false)
    .whereNotNull('sla_response_due_at')
    .where('sla_response_due_at', '<', now);

  for (const caseRecord of responseBreaches) {
    await db('cases').where('case_id', caseRecord.case_id).update({ sla_response_breached: true });
    await createAuditLog({
      event_type: 'SLA_RESPONSE_BREACHED',
      customer_id: caseRecord.customer_id,
      target_entity_type: 'case',
      target_entity_id: caseRecord.case_id,
    });

    // Notify manager
    if (caseRecord.assigned_analyst_id) {
      const analyst = await db('users').where('id', caseRecord.assigned_analyst_id).first();
      const managers = await db('users')
        .join('user_customers', 'users.id', 'user_customers.user_id')
        .where({ 'user_customers.customer_id': caseRecord.customer_id, 'users.role': 'manager' });

      for (const manager of managers) {
        await sendNotification({
          user_id: manager.id,
          title: 'SLA Response Breached',
          message: `Case ${caseRecord.case_number} has breached its response SLA. Assigned to: ${analyst?.first_name} ${analyst?.last_name}`,
          type: 'sla',
          severity: 'critical',
          link: `/cases/${caseRecord.case_id}`,
        });
      }
    }
  }

  // Check resolution SLA breaches
  const resolutionBreaches = await db('cases')
    .whereNotIn('status', ['resolved', 'closed'])
    .where('sla_resolution_breached', false)
    .whereNotNull('sla_resolution_due_at')
    .where('sla_resolution_due_at', '<', now);

  for (const caseRecord of resolutionBreaches) {
    await db('cases').where('case_id', caseRecord.case_id).update({ sla_resolution_breached: true });
    await createAuditLog({
      event_type: 'SLA_RESOLUTION_BREACHED',
      customer_id: caseRecord.customer_id,
      target_entity_type: 'case',
      target_entity_id: caseRecord.case_id,
    });
  }
}

export async function pauseSlaClock(caseId: string): Promise<void> {
  await db('cases').where('case_id', caseId).update({ sla_paused_at: new Date() });
}

export async function resumeSlaClock(caseId: string): Promise<void> {
  const caseRecord = await db('cases').where('case_id', caseId).first();
  if (!caseRecord?.sla_paused_at) return;

  const pausedDuration = Math.floor((Date.now() - new Date(caseRecord.sla_paused_at).getTime()) / 60000);
  const totalPaused = (caseRecord.sla_paused_duration_minutes || 0) + pausedDuration;

  await db('cases').where('case_id', caseId).update({
    sla_paused_at: null,
    sla_paused_duration_minutes: totalPaused,
    sla_response_due_at: caseRecord.sla_response_due_at
      ? new Date(new Date(caseRecord.sla_response_due_at).getTime() + pausedDuration * 60000)
      : null,
    sla_resolution_due_at: caseRecord.sla_resolution_due_at
      ? new Date(new Date(caseRecord.sla_resolution_due_at).getTime() + pausedDuration * 60000)
      : null,
  });
}
