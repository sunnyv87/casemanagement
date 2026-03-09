import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import { logger } from '../utils/logger';
import { decrypt } from '../utils/encryption';

export interface NormalizedAlert {
  alert_id: string;
  source_platform: 'securonix' | 'seceon' | 'splunk' | 'fortisoar';
  source_alert_id: string;
  customer_id: string;
  alert_name: string;
  alert_category?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  alert_status: 'new';
  source_ip?: string;
  destination_ip?: string;
  actor_entity?: string;
  alert_description?: string;
  risk_score?: number;
  alert_created_at: Date;
  ingested_at: Date;
  tags: string[];
  mitre_techniques: string[];
  source_raw_json: Record<string, unknown>;
}

export interface Integration {
  id: string;
  customer_id: string;
  platform: string;
  name: string;
  base_url: string;
  encrypted_credentials: string;
  auth_type: string;
  ingestion_mode: string;
  polling_interval_seconds: number;
  bidirectional_sync: boolean;
  status: string;
  last_poll_at: string | null;
  last_poll_cursor: string | null;
  config: Record<string, unknown>;
}

export abstract class BaseConnector {
  protected integration: Integration;
  protected httpClient: AxiosInstance;
  protected credentials: Record<string, string>;

  constructor(integration: Integration) {
    this.integration = integration;
    this.credentials = JSON.parse(decrypt(integration.encrypted_credentials));
    this.httpClient = axios.create({
      baseURL: integration.base_url,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  abstract authenticate(): Promise<void>;
  abstract fetchAlerts(): Promise<NormalizedAlert[]>;
  abstract mapToUnifiedSchema(rawAlert: Record<string, unknown>): NormalizedAlert;

  async poll(): Promise<number> {
    try {
      await this.authenticate();
      const alerts = await this.fetchAlerts();
      let ingested = 0;

      for (const alert of alerts) {
        try {
          await db('alerts')
            .insert(alert)
            .onConflict(['source_platform', 'source_alert_id', 'customer_id'])
            .ignore();
          ingested++;
        } catch (err) {
          logger.error(`Failed to ingest alert ${alert.source_alert_id}:`, err);
        }
      }

      await db('integrations').where('id', this.integration.id).update({
        last_poll_at: new Date(),
        status: 'active',
        last_error: null,
      });

      logger.info(`[${this.integration.platform}] Polled ${alerts.length} alerts, ingested ${ingested} for customer ${this.integration.customer_id}`);
      return ingested;
    } catch (error: any) {
      logger.error(`[${this.integration.platform}] Poll failed for integration ${this.integration.id}:`, error.message);
      await db('integrations').where('id', this.integration.id).update({
        status: 'error',
        last_error: error.message,
      });
      throw error;
    }
  }
}
