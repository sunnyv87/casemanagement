import { BaseConnector, NormalizedAlert, Integration } from './baseConnector';
import { v4 as uuidv4 } from 'uuid';

export class SplunkConnector extends BaseConnector {
  constructor(integration: Integration) {
    super(integration);
  }

  async authenticate(): Promise<void> {
    if (this.credentials.token) {
      this.httpClient.defaults.headers.common['Authorization'] = `Bearer ${this.credentials.token}`;
    } else {
      const response = await this.httpClient.post('/services/auth/login', null, {
        params: {
          username: this.credentials.username,
          password: this.credentials.password,
          output_mode: 'json',
        },
      });
      const sessionKey = response.data?.sessionKey;
      this.httpClient.defaults.headers.common['Authorization'] = `Splunk ${sessionKey}`;
    }
  }

  async fetchAlerts(): Promise<NormalizedAlert[]> {
    const timeFilter = this.integration.last_poll_at
      ? `earliest="${new Date(this.integration.last_poll_at).toISOString()}"`
      : 'earliest=-1h';

    const spl = `search index=notable ${timeFilter} | eval severity=case(urgency="critical","Critical",urgency="high","High",urgency="medium","Medium",true(),"Low") | fields event_id, rule_name, severity, src, dest, owner, status, _time, urgency, rule_title, description, user, src_ip, dest_ip | sort -_time | head 500`;

    // Create search job
    const jobResponse = await this.httpClient.post('/services/search/jobs', null, {
      params: { search: spl, output_mode: 'json', exec_mode: 'oneshot' },
    });

    const results = jobResponse.data?.results || [];
    if (!Array.isArray(results)) return [];

    return results.map((event: Record<string, unknown>) => this.mapToUnifiedSchema(event));
  }

  mapToUnifiedSchema(raw: Record<string, unknown>): NormalizedAlert {
    return {
      alert_id: uuidv4(),
      source_platform: 'splunk',
      source_alert_id: String(raw.event_id || raw.sid || raw._serial || uuidv4()),
      customer_id: this.integration.customer_id,
      alert_name: String(raw.rule_name || raw.rule_title || raw.search_name || 'Splunk Notable Event'),
      alert_category: raw.alert_category as string,
      severity: this.mapSeverity(raw.urgency as string || raw.severity as string),
      alert_status: 'new',
      source_ip: (raw.src || raw.src_ip) as string,
      destination_ip: (raw.dest || raw.dest_ip) as string,
      actor_entity: (raw.user || raw.src_user) as string,
      alert_description: raw.description as string || `Splunk ES Notable: ${raw.rule_name}`,
      alert_created_at: raw._time ? new Date(parseFloat(raw._time as string) * 1000) : new Date(),
      ingested_at: new Date(),
      tags: [],
      mitre_techniques: [],
      source_raw_json: raw,
    };
  }

  private mapSeverity(urgency: string): 'critical' | 'high' | 'medium' | 'low' | 'informational' {
    const map: Record<string, 'critical' | 'high' | 'medium' | 'low' | 'informational'> = {
      critical: 'critical', Critical: 'critical',
      high: 'high', High: 'high',
      medium: 'medium', Medium: 'medium',
      low: 'low', Low: 'low',
      informational: 'informational',
    };
    return map[urgency] || 'medium';
  }
}
