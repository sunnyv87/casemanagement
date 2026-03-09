import db from '../database/connection';
import { logger } from '../utils/logger';
import { BaseConnector, Integration } from './baseConnector';
import { SecuronixConnector } from './securonixConnector';
import { SeceonConnector } from './seceonConnector';
import { SplunkConnector } from './splunkConnector';
import { FortiSOARConnector } from './fortisoarConnector';

const connectorMap: Record<string, new (integration: Integration) => BaseConnector> = {
  securonix: SecuronixConnector,
  seceon: SeceonConnector,
  splunk: SplunkConnector,
  fortisoar: FortiSOARConnector,
};

export class ConnectorManager {
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  async startAllPolling(): Promise<void> {
    const integrations = await db('integrations')
      .where({ status: 'active', ingestion_mode: 'pull' })
      .orWhere({ status: 'active', ingestion_mode: 'both' });

    logger.info(`Starting polling for ${integrations.length} active integrations`);

    for (const integration of integrations) {
      this.startPolling(integration);
    }
  }

  startPolling(integration: Integration): void {
    const intervalMs = (integration.polling_interval_seconds || 60) * 1000;

    // Clear existing interval if any
    this.stopPolling(integration.id);

    const interval = setInterval(async () => {
      try {
        const ConnectorClass = connectorMap[integration.platform];
        if (!ConnectorClass) {
          logger.error(`No connector found for platform: ${integration.platform}`);
          return;
        }

        // Refresh integration data
        const freshIntegration = await db('integrations').where('id', integration.id).first();
        if (!freshIntegration || freshIntegration.status !== 'active') {
          this.stopPolling(integration.id);
          return;
        }

        const connector = new ConnectorClass(freshIntegration);
        await connector.poll();
      } catch (error) {
        logger.error(`Polling error for integration ${integration.id}:`, error);
      }
    }, intervalMs);

    this.pollingIntervals.set(integration.id, interval);
    logger.info(`Started polling for ${integration.platform} integration ${integration.id} every ${integration.polling_interval_seconds}s`);
  }

  stopPolling(integrationId: string): void {
    const interval = this.pollingIntervals.get(integrationId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(integrationId);
      logger.info(`Stopped polling for integration ${integrationId}`);
    }
  }

  stopAll(): void {
    for (const [id] of this.pollingIntervals) {
      this.stopPolling(id);
    }
  }

  getConnector(integration: Integration): BaseConnector {
    const ConnectorClass = connectorMap[integration.platform];
    if (!ConnectorClass) {
      throw new Error(`Unsupported platform: ${integration.platform}`);
    }
    return new ConnectorClass(integration);
  }
}

export const connectorManager = new ConnectorManager();
