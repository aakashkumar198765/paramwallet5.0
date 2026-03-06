import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../../src/app.js';
import { getMongoClient, anyCol } from '../../../src/db/mongo.js';
import { resolveSaasDb } from '../../../src/db/resolver.js';
import {
  makeTestToken,
  seedTestSession,
  authedRequest,
} from '../../helpers/request.js';
import { seedWorkspace } from '../../helpers/seed.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const OWNER_PARAM_ID = '0x6193b497f8e2a1d340b20000';

beforeEach(async () => {
  app = await buildApp();
});

describe('POST /api/v1/workspace/create', () => {
  it('creates a new workspace', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);

    const res = await authedRequest(app, 'POST', '/api/v1/workspace/create', user, {
      body: {
        subdomain: 'test-workspace',
        workspaceName: 'Test Workspace',
        exchangeParamId: '0x5e282dE1000000',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.subdomain).toBe('test-workspace');
    expect(body.status).toBe('active');
  });

  it('returns 409 if subdomain already taken', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);
    await seedWorkspace(getMongoClient(), 'existing-ws', OWNER_PARAM_ID);

    const res = await authedRequest(app, 'POST', '/api/v1/workspace/create', user, {
      body: {
        subdomain: 'existing-ws',
        workspaceName: 'Duplicate',
        exchangeParamId: '0x5e282dE1000000',
      },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/workspace/create',
      payload: JSON.stringify({ subdomain: 'x', workspaceName: 'X', exchangeParamId: '0x0' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/workspace/list', () => {
  it('lists workspaces for user', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);

    // Create two workspaces
    const saasDbName = resolveSaasDb();
    await anyCol(saasDbName, 'subdomains').insertMany([
      { _id: 'ws-a', subdomain: 'ws-a', workspaceName: 'A', ownerParamId: OWNER_PARAM_ID, status: 'active', createdAt: 0, updatedAt: 0 },
      { _id: 'ws-b', subdomain: 'ws-b', workspaceName: 'B', ownerParamId: OWNER_PARAM_ID, status: 'active', createdAt: 0, updatedAt: 0 },
    ]);
    await anyCol(saasDbName, 'subdomain_users').insertOne({
      _id: `user:${user.userId}`,
      userId: user.userId,
      email: user.email,
      paramId: OWNER_PARAM_ID,
      subdomains: ['ws-a', 'ws-b'],
      name: '',
      createdAt: 0,
      updatedAt: 0,
    });

    const res = await authedRequest(app, 'GET', '/api/v1/workspace/list', user, {
      workspace: 'ws-a',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.workspaces).toHaveLength(2);
  });
});

describe('GET /api/v1/workspace/plants', () => {
  it('returns plants for the workspace', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);
    await seedWorkspace(getMongoClient(), 'test-ws', OWNER_PARAM_ID);

    // Seed a plant
    await anyCol('test-ws', 'plants').insertOne({
      _id: 'plant:1810',
      code: '1810',
      name: 'Test Plant',
      paramId: OWNER_PARAM_ID,
      location: {},
      isActive: true,
      createdAt: 0,
    });

    const res = await authedRequest(app, 'GET', '/api/v1/workspace/plants', user, {
      workspace: 'test-ws',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.plants).toHaveLength(1);
    expect(body.plants[0].code).toBe('1810');
  });
});
