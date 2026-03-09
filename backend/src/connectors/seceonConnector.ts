import { BaseConnector, NormalizedAlert, Integration } from './baseConnector';
import { v4 as uuidv4 } from 'uuid';

export class SeceonConnector extends BaseConnector {
  constructor(integration: Integration) {
    super(integration);
    this.httpClient.defaults.headers.common['X-API-Key'] = this.credentials.api_key;
  }

  async authenticate(): Promise<void> {
    // Seceon uses API Key - already set in constructor
  }

  async fetchAlerts(): Promise<NormalizedAlert[]> {
    const params: Record<string, string> = { limit: '500' };

    if (this.integration.last_poll_at) {
      params.since = new Date(this.integration.last_poll_at).toISOString();
    }

    const response = await this.httpClient.get('/api/v1/alerts', { params });
    const alerts = response.data?.alerts || response.data?.data || response.data || [];

    if (!Array.isArray(alerts)) return [];

    return alerts.map((alert: Record<string, unknown>) => this.mapToUnifiedSchema(alert));
  }

  mapToUnifiedSchema(raw: Record<string, unknown>): NormalizedAlert {
    return {
      alert_id: uuidv4(),
      source_platform: 'seceon',
      source_alert_id: String(raw.alertId || raw.id),
      customer_id: this.integration.customer_id,
      alert_name: String(raw.alertType || raw.name || 'Seceon Alert'),
      alert_category: raw.alertType as string || raw.category as string,
      severity: this.mapSeverity(raw.severity as string),
      alert_status: 'new',
      source_ip: raw.sourceIp as string || raw.src_ip as string,
      destination_ip: raw.destinationIp as string || raw.dest_ip as string,
      actor_entity: raw.user as string || raw.hostname as string,
      alert_description: raw.description as string,
      risk_score: raw.riskScore as number,
      alert_created_at: raw.timestamp ? new Date(raw.timestamp as string) : new Date(),
      ingested_at: new Date(),
      tags: [],
      mitre_techniques: [],
      source_raw_json: raw,
    };
  }

  private mapSeverity(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'informational' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'informational'> = {
      Critical: 'critical', critical: 'critical',
      High: 'high', high: 'high',
      Medium: 'medium', medium: 'medium',
      Low: 'low', low: 'low',
      Informational: 'informational', informational: 'informational',
    };
    return map[severity] || 'medium';
  }

  async updateAlertStatus(alertId: string, status: string): Promise<void> {
    await this.httpClient.put(`/api/v1/alerts/${alertId}/status`, { status });
  }

  async addComment(alertId: string, comment: string): Promise<void> {
    await this.httpClient.post(`/api/v1/alerts/${alertId}/comments`, { comment });
  }
}
