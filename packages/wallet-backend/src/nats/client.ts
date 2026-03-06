import { connect, type NatsConnection, type JetStreamClient } from 'nats';
import { config } from '../config.js';
import { logger } from '../logger.js';

let natsConnection: NatsConnection | null = null;

export async function connectNats(): Promise<NatsConnection> {
  if (natsConnection) return natsConnection;

  natsConnection = await connect({
    servers: config.NATS_URL,
    reconnect: true,
    maxReconnectAttempts: -1, // infinite retries
    reconnectTimeWait: 2000,
    timeout: 10000,
  });

  logger.info({ url: config.NATS_URL }, 'NATS connected');

  // Log disconnects and reconnects
  (async () => {
    for await (const status of natsConnection!.status()) {
      logger.info({ type: status.type, data: status.data }, 'NATS status change');
    }
  })().catch((err) => logger.error({ err }, 'NATS status loop error'));

  return natsConnection;
}

export function getNatsClient(): NatsConnection {
  if (!natsConnection) throw new Error('NATS not connected. Call connectNats() first.');
  return natsConnection;
}

export function getJetStream(): JetStreamClient {
  return getNatsClient().jetstream();
}

export async function drainNats(): Promise<void> {
  if (natsConnection) {
    await natsConnection.drain();
    natsConnection = null;
    logger.info('NATS connection drained and closed');
  }
}
