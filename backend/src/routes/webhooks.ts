import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { webhookLimiter } from '../middleware/rateLimit';
import { logger } from '../utils/logger';

const router = Router();

// Webhook receivers for SIEM/SOAR platforms
// POST /api/v1/webhooks/splunk
router.post('/splunk', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let ingested = 0;

    for (const event of events) {
      const customerId = req.headers['x-customer-id'] as string;
      if (!customerId) { logger.warn('Splunk webhook missing x-customer-id header'); continue; }

      const alertData = {
        alert_id: uuidv4(),
        source_platform: 'splunk' as const,
        source_alert_id: event.event_id || event.sid || uuidv4(),
        customer_id: customerId,
        alert_name: event.rule_name || event.search_name || 'Splunk Alert',
        alert_category: event.alert_category,
        severity: mapSplunkSeverity(event.urgency || event.severity),
        alert_status: 'new' as const,
        source_ip: event.src || event.src_ip,
        destination_ip: event.dest || event.dest_ip,
        actor_entity: event.user || event.src_user,
        alert_description: event.description || event.rule_title,
        alert_created_at: event._time ? new Date(event._time * 1000) : new Date(),
        ingested_at: new Date(),
        source_raw_json: event,
        tags: [],
        mitre_techniques: [],
      };

      try {
        await db('alerts').insert(alertData).onConflict(['source_platform', 'source_alert_id', 'customer_id']).ignore();
        ingested++;
      } catch (err) {
        logger.error('Failed to ingest Splunk alert:', err);
      }
    }

    res.json({ status: 'ok', ingested });
  } catch (err) { next(err); }
});

// POST /api/v1/webhooks/fortisoar
router.post('/fortisoar', webhookLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.body;
    const customerId = req.headers['x-customer-id'] as string;
    if (!customerId) {
      res.status(400).json({ error: 'Missing x-customer-id header' });
      return;
    }

    const alertData = {
      alert_id: uuidv4(),
      source_platform: 'fortisoar' as const,
      source_alert_id: String(event.id || event['@id'] || uuidv4()),
      customer_id: customerId,
      alert_name: event.name || 'FortiSOAR Alert',
      alert_category: event.alertType,
      severity: mapFortiSOARSeverity(event.severity?.itemValue),
      alert_status: 'new' as const,
      source_ip: event.sourceIp,
      destination_ip: event.destinationIp,
      actor_entity: event.assignedTo?.name,
      alert_description: event.description,
      alert_created_at: event.createDate ? new Date(event.createDate) : new Date(),
      ingested_at: new Date(),
      source_raw_json: event,
      tags: [],
      mitre_techniques: [],
    };

    await db('alerts').insert(alertData).onConflict(['source_platform', 'source_alert_id', 'customer_id']).ignore();
    res.json({ status: 'ok' });
  } catch (err) { next(err); }
});

function mapSplunkSeverity(urgency: string): string {
  const map: Record<string, string> = { critical: 'critical', high: 'high', medium: 'medium', low: 'low', informational: 'informational' };
  return map[urgency?.toLowerCase()] || 'medium';
}

function mapFortiSOARSeverity(severity: string): string {
  const map: Record<string, string> = { Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' };
  return map[severity] || 'medium';
}

export { router as webhookRouter };
