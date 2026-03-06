import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterAll } from 'vitest';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  process.env.JWT_SECRET = 'test-secret-32-chars-minimum-reqd!!';
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.NATS_URL = 'nats://localhost:4222';
  process.env.ENN_BASE_URL = 'https://localhost:9999'; // will not be called in unit tests
});

afterAll(async () => {
  await mongod.stop();
});
