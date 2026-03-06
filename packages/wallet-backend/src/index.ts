import { buildApp } from './app.js';
import { connect as connectMongo, closeConnection } from './db/mongo.js';
import { createCoreIndexes } from './db/indexes.js';
import { connectNats, drainNats } from './nats/client.js';
import { config } from './config.js';
import { logger } from './logger.js';

let isShuttingDown = false;

async function start(): Promise<void> {
  logger.info({ env: config.NODE_ENV, port: config.PORT }, 'Starting Param Wallet Backend...');

  // Step 1: Connect MongoDB
  logger.info('Connecting to MongoDB...');
  await connectMongo();

  // Step 2: Create core indexes (idempotent)
  logger.info('Creating core indexes...');
  await createCoreIndexes();

  // Step 3: Connect NATS (non-blocking — log warning if unavailable)
  logger.info('Connecting to NATS...');
  try {
    await connectNats();
  } catch (err) {
    logger.warn({ err }, 'NATS connection failed — continuing without NATS');
  }

  // Step 4: Build and start Fastify
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    logger.info({ port: config.PORT }, `Server listening on port ${config.PORT}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start Fastify server');
    await shutdown(app);
    process.exit(1);
  }

  // Step 5: Subscribe to NATS partner lifecycle events
  // Dynamically subscribe to installed superapps
  // In production this would enumerate installed_superapps across workspaces
  // For now, subscriptions are set up per-request via partner.handler.ts
  logger.info('Wallet Backend ready');

  // ── Graceful shutdown ─────────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Shutdown signal received');

    await shutdown(app);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions gracefully
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    gracefulShutdown('uncaughtException').catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
  });
}

async function shutdown(app: { close: () => Promise<void> }): Promise<void> {
  logger.info('Shutting down...');

  try {
    // Step 1: Close Fastify (stops accepting new connections)
    await app.close();
    logger.info('Fastify closed');
  } catch (err) {
    logger.warn({ err }, 'Error closing Fastify');
  }

  try {
    // Step 2: Drain NATS
    await drainNats();
  } catch (err) {
    logger.warn({ err }, 'Error draining NATS');
  }

  try {
    // Step 3: Close MongoDB
    await closeConnection();
  } catch (err) {
    logger.warn({ err }, 'Error closing MongoDB');
  }

  logger.info('Shutdown complete');
}

start().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
