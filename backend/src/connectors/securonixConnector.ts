import { BaseConnector, NormalizedAlert, Integration } from './baseConnector';
import { v4 as uuidv4 } from 'uuid';

export class SecuronixConnector extends BaseConnector {
  private authToken: string = '';

  constructor(integration: Integration) {
    super(integration);
  }

  async authenticate(): Promise<void> {
    const response = await this.httpClient.get('/ws/token/generate', {
      params: {
        username: this.credentials.username,
        password: this.credentials.password,
      },
    });
    this.authToken = response.data;
    this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`;
  }

  async fetchAlerts(): Promise<NormalizedAlert[]> {
    const params: Record<string, string> = {};

    if (this.integration.last_poll_at) {
      params.from = new Date(this.integration.last_poll_at).toISOString();
    }

    const response = await this.httpClient.get('/ws/incident/get', { params });
    const incidents = response.data?.incidents || response.data || [];

    if (!Array.isArray(incidents)) return [];

    return incidents.map((incident: Record<string, unknown>) => this.mapToUnifiedSchema(incident));
  }

  mapToUnifiedSchema(raw: Record<string, unknown>): NormalizedAlert {
    return {
      alert_id: uuidv4(),
      source_platform: 'securonix',
      source_alert_id: String(raw.incidentId || raw.id),
      customer_id: this.integration.customer_id,
      alert_name: String(raw.threatname || raw.violatorText || 'Securonix Alert'),
      alert_category: raw.category as string,
      severity: this.mapSeverity(raw.riskscore as number),
      alert_status: 'new',
      source_ip: raw.sourceIp as string,
      destination_ip: raw.destinationIp as string,
      actor_entity: raw.violatorText as string,
      alert_description: raw.description as string || `Incident from Securonix: ${raw.threatname}`,
      risk_score: typeof raw.riskscore === 'number' ? Math.min(Math.max(raw.riskscore, 0), 100) : undefined,
      alert_created_at: raw.createdDate ? new Date(raw.createdDate as string) : new Date(),
      ingested_at: new Date(),
      tags: [],
      mitre_techniques: [],
      source_raw_json: raw,
    };
  }

  private mapSeverity(riskScore: number): 'critical' | 'high' | 'medium' | 'low' | 'informational' {
    if (!riskScore && riskScore !== 0) return 'medium';
    if (riskScore >= 85) return 'critical';
    if (riskScore >= 65) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'informational';
  }

  async updateIncidentStatus(incidentId: string, status: string): Promise<void> {
    await this.authenticate();
    await this.httpClient.post('/ws/incident/updateIncidentStatus', null, {
      params: { incidentId, status },
    });
  }

  async addComment(incidentId: string, comment: string): Promise<void> {
    await this.authenticate();
    await this.httpClient.post('/ws/incident/addComment', null, {
      params: { incidentId, comment },
    });
  }
}
