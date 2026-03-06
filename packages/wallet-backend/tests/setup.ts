import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMongo, closeMongo, getMongoClient } from '../src/db/mongo.js';

let mongoServer: MongoMemoryServer;

// Set test env vars before config is loaded
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test-secret-32-chars-long-minimum!';
process.env['ENN_BASE_URL'] = 'https://keystore.test.local';
process.env['ENN_APP_KEY'] = 'test-app-key';
process.env['ENN_EXCHANGE_KEY'] = 'test-exchange-key';
process.env['LOG_LEVEL'] = 'error'; // suppress logs in tests

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env['MONGO_URI'] = uri;
  await connectMongo(uri);
});

afterAll(async () => {
  await closeMongo();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Drop all test databases between tests for isolation
  const client = getMongoClient();
  const adminDb = client.db('admin');
  const dbList = await adminDb.admin().listDatabases();
  for (const { name } of dbList.databases) {
    if (name === 'admin' || name === 'local' || name === 'config') continue;
    await client.db(name).dropDatabase();
  }
});
