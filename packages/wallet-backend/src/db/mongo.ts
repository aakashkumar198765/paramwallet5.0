import { MongoClient, Db } from 'mongodb';
import { config } from '../config.js';
import { logger } from '../logger.js';

let client: MongoClient | null = null;

export async function connect(): Promise<void> {
  if (client) return;

  client = new MongoClient(config.MONGO_URI, {
    maxPoolSize: config.MONGO_POOL_SIZE,
    minPoolSize: 2,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  logger.info({ uri: config.MONGO_URI }, 'MongoDB connected');
}

export function getClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client not initialised — call connect() first');
  }
  return client;
}

export function getDb(name: string): Db {
  return getClient().db(name);
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    logger.info('MongoDB connection closed');
  }
}
