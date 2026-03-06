import { MongoClient, type Db, type Collection } from 'mongodb';

/**
 * Document type with a string _id.
 * Use `anyCol()` to get a properly typed collection for our string-keyed documents.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDoc = { [key: string]: any };
import { config } from '../config.js';
import { logger } from '../logger.js';

let client: MongoClient | null = null;

export async function connectMongo(uri?: string): Promise<MongoClient> {
  if (client) return client;

  const mongoUri = uri ?? config.MONGO_URI;
  client = new MongoClient(mongoUri, {
    maxPoolSize: config.MONGO_POOL_SIZE,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  logger.info({ uri: mongoUri }, 'MongoDB connected');
  return client;
}

export function getMongoClient(): MongoClient {
  if (!client) throw new Error('MongoDB not connected. Call connectMongo() first.');
  return client;
}

export function getDb(dbName: string): Db {
  return getMongoClient().db(dbName);
}

/**
 * Returns a collection typed to accept string _id values.
 * Use instead of getDb(dbName).collection(colName) throughout handlers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anyCol(dbName: string, colName: string): Collection<any> {
  // Cast to Collection<any> so callers can use string _id values without type errors
  return getDb(dbName).collection(colName) as Collection<any>;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    logger.info('MongoDB connection closed');
  }
}
