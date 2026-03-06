import { connect as natsConnect, NatsConnection, JetStreamClient, JetStreamManager } from 'nats';
import { config } from '../config.js';
import { logger } from '../logger.js';

let natsConnection: NatsConnection | null = null;
let jetStreamClient: JetStreamClient | null = null;
let jetStreamManager: JetStreamManager | null = null;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;

export async function connectNats(): Promise<void> {
  let attempts = 0;
  while (attempts < MAX_RETRIES) {
    try {
      natsConnection = await natsConnect({
        servers: config.NATS_URL,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        timeout: 5000,
      });

      jetStreamClient = natsConnection.jetstream();
      jetStreamManager = await natsConnection.jetstreamManager();

      logger.info({ url: config.NATS_URL }, 'NATS connected');

      // Handle connection closed
      natsConnection.closed().then(() => {
        logger.warn('NATS connection closed');
        natsConnection = null;
        jetStreamClient = null;
        jetStreamManager = null;
      });

      return;
    } catch (err) {
      attempts++;
      if (attempts >= MAX_RETRIES) {
        logger.warn({ err, url: config.NATS_URL }, 'NATS unavailable — proceeding without NATS');
        return; // Non-blocking — app starts without NATS
      }
      logger.warn({ attempt: attempts, err }, `NATS connection failed, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

export function getNatsConnection(): NatsConnection | null {
  return natsConnection;
}

export function getJetStream(): JetStreamClient | null {
  return jetStreamClient;
}

export function getJetStreamManager(): JetStreamManager | null {
  return jetStreamManager;
}

export function isNatsConnected(): boolean {
  return natsConnection !== null && !natsConnection.isClosed();
}

export async function drainNats(): Promise<void> {
  if (natsConnection && !natsConnection.isClosed()) {
    try {
      await natsConnection.drain();
      logger.info('NATS connection drained');
    } catch (err) {
      logger.warn({ err }, 'Error draining NATS connection');
    }
  }
}

/**
 * Subscribe to a NATS subject with a handler.
 * Returns unsubscribe function.
 */
export async function subscribe(
  subject: string,
  handler: (data: unknown, subject: string) => Promise<void>
): Promise<() => void> {
  const nc = getNatsConnection();
  if (!nc) {
    logger.warn({ subject }, 'NATS not connected — skipping subscription');
    return () => {};
  }

  const sub = nc.subscribe(subject);

  (async () => {
    for await (const msg of sub) {
      try {
        const data = JSON.parse(new TextDecoder().decode(msg.data));
        await handler(data, msg.subject);
      } catch (err) {
        logger.error({ err, subject: msg.subject }, 'NATS message handler error');
      }
    }
  })().catch(err => {
    logger.error({ err, subject }, 'NATS subscription loop error');
  });

  return () => sub.unsubscribe();
}
