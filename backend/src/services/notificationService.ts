import db from '../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface NotificationPayload {
  user_id: string;
  title: string;
  message: string;
  type: 'alert' | 'case' | 'sla' | 'system' | 'escalation';
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  link?: string;
}

export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    await db('notifications').insert({
      id: uuidv4(),
      ...payload,
      severity: payload.severity || 'info',
      read: false,
    });
    // In production: also send email/SMS via queue
    logger.info(`Notification sent to user ${payload.user_id}: ${payload.title}`);
  } catch (error) {
    logger.error('Failed to send notification:', error);
  }
}

export async function sendBulkNotifications(payloads: NotificationPayload[]): Promise<void> {
  const records = payloads.map((p) => ({
    id: uuidv4(),
    ...p,
    severity: p.severity || 'info',
    read: false,
  }));

  try {
    await db('notifications').insert(records);
  } catch (error) {
    logger.error('Failed to send bulk notifications:', error);
  }
}

export async function getUserNotifications(userId: string, unreadOnly: boolean = false, page: number = 1, limit: number = 20) {
  let query = db('notifications').where('user_id', userId).orderBy('created_at', 'desc');
  if (unreadOnly) query = query.where('read', false);

  const total = await query.clone().count('* as count').first();
  const notifications = await query.offset((page - 1) * limit).limit(limit);
  const unreadCount = await db('notifications').where({ user_id: userId, read: false }).count('* as count').first();

  return {
    data: notifications,
    unread_count: parseInt((unreadCount as any)?.count || '0'),
    pagination: { page, limit, total: parseInt((total as any)?.count || '0') },
  };
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await db('notifications').where({ id: notificationId, user_id: userId }).update({ read: true, read_at: new Date() });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db('notifications').where({ user_id: userId, read: false }).update({ read: true, read_at: new Date() });
}
