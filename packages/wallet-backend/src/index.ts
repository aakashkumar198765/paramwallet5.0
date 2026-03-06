import { buildApp } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { connectMongo, closeMongo } from './db/mongo.js';
import { createIndexes } from './db/indexes.js';
import { connectNats, drainNats } from './nats/client.js';

async function start(): Promise<void> {
  // Connect to MongoDB
  const mongoClient = await connectMongo();
  await createIndexes(mongoClient);

  // Connect to NATS (non-fatal — NATS is for realtime/notifications which are future)
  try {
    await connectNats();
  } catch (err) {
    logger.warn({ err }, 'NATS connection failed — realtime features will be unavailable');
  }

  // Build and start Fastify
  const app = await buildApp();

  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');
    try {
      await app.close();
      await drainNats();
      await closeMongo();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  logger.info({ port: config.PORT }, 'Wallet Backend started');
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
