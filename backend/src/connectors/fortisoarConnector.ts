import { BaseConnector, NormalizedAlert, Integration } from './baseConnector';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export class FortiSOARConnector extends BaseConnector {
  constructor(integration: Integration) {
    super(integration);
  }

  async authenticate(): Promise<void> {
    if (this.credentials.api_key) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.credentials.api_key}`;
    } else {
      // OAuth2 client credentials flow
      const response = await this.httpClient.post('/auth/token', {
        grant_type: 'client_credentials',
        client_id: this.credentials.client_id,
        client_secret: this.credentials.client_secret,
      });
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
    }
  }

  async fetchAlerts(): Promise<NormalizedAlert[]> {
    const params: Record<string, unknown> = { $limit: 500, $orderby: 'createDate desc' };

    if (this.integration.last_poll_at) {
      params.$filter = `createDate gt '${new Date(this.integration.last_poll_at).toISOString()}'`;
    }

    const response = await this.httpClient.get('/api/v3/alerts', { params });
    const alerts = response.data?.['hydra:member'] || response.data?.data || [];

    if (!Array.isArray(alerts)) return [];

    return alerts.map((alert: Record<string, unknown>) => this.mapToUnifiedSchema(alert));
  }

  mapToUnifiedSchema(raw: Record<string, unknown>): NormalizedAlert {
    const severity = raw.severity as Record<string, unknown> | undefined;
    const status = raw.status as Record<string, unknown> | undefined;
    const assignedTo = raw.assignedTo as Record<string, unknown> | undefined;

    return {
      alert_id: uuidv4(),
      source_platform: 'fortisoar',
      source_alert_id: String(raw.id || raw['@id']),
      customer_id: this.integration.customer_id,
      alert_name: String(raw.name || 'FortiSOAR Alert'),
      alert_category: raw.alertType as string,
      severity: this.mapSeverity(severity?.itemValue as string),
      alert_status: 'new',
      source_ip: raw.sourceIp as string,
      destination_ip: raw.destinationIp as string,
      actor_entity: assignedTo?.name as string,
      alert_description: raw.description as string,
      alert_created_at: raw.createDate ? new Date(raw.createDate as string) : new Date(),
      ingested_at: new Date(),
      tags: [],
      mitre_techniques: [],
      source_raw_json: raw,
    };
  }

  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'informational' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'informational'> = {
      Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low',
    };
    return map[severity] || 'medium';
  }

  // Bidirectional sync methods
  async updateAlertStatus(alertId: string, status: string): Promise<void> {
    try {
      await this.authenticate();
      await this.httpClient.patch(`/api/v3/alerts/${alertId}`, {
        status: { itemValue: status },
      });
      logger.info(`[FortiSOAR] Updated alert ${alertId} status to ${status}`);
    } catch (error) {
      logger.error(`[FortiSOAR] Failed to update alert ${alertId}:`, error);
    }
  }

  async addIncidentComment(incidentId: string, comment: string): Promise<void> {
    try {
      await this.authenticate();
      await this.httpClient.post(`/api/v3/incidents/${incidentId}/comments`, {
        content: comment,
      });
      logger.info(`[FortiSOAR] Added comment to incident ${incidentId}`);
    } catch (error) {
      logger.error(`[FortiSOAR] Failed to add comment to incident ${incidentId}:`, error);
    }
  }

  async triggerPlaybook(playbookId: string, recordId: string): Promise<void> {
    try {
      await this.authenticate();
      await this.httpClient.post('/api/v3/playbooks/trigger', {
        playbook_id: playbookId,
        record_id: recordId,
      });
      logger.info(`[FortiSOAR] Triggered playbook ${playbookId}`);
    } catch (error) {
      logger.error(`[FortiSOAR] Failed to trigger playbook:`, error);
    }
  }
}
