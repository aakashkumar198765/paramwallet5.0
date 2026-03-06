import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../../src/app.js';
import { getMongoClient } from '../../../src/db/mongo.js';
import { resolveDefinitionsDb } from '../../../src/db/resolver.js';
import { makeTestToken, seedTestSession, authedRequest } from '../../helpers/request.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
const OWNER_PARAM_ID = '0x6193b497f8e2a1d340b20000';
const WORKSPACE = 'test-ws';

beforeEach(async () => {
  app = await buildApp();
});

describe('POST /api/v1/definitions/superapps', () => {
  it('creates a superapp definition and returns 20-char hex id', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);

    const res = await authedRequest(app, 'POST', '/api/v1/definitions/superapps', user, {
      workspace: WORKSPACE,
      body: {
        name: 'My SuperApp',
        desc: 'Test',
        version: '1.0.0',
        roles: [
          { name: 'Buyer', desc: '', teams: [{ name: 'Admin', desc: '' }] },
          { name: 'Seller', desc: '', teams: [{ name: 'Seller', desc: '' }] },
        ],
        linkedSMs: [],
        sponsor: 'Buyer',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body._id).toHaveLength(20);
    expect(/^[0-9a-f]{20}$/.test(body._id)).toBe(true);
    expect(body.name).toBe('My SuperApp');
    expect(body.sponsor).toBe('Buyer');
  });
});

describe('GET /api/v1/definitions/superapps', () => {
  it('returns all superapp definitions', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);

    // Seed two definitions
    await getMongoClient().db(resolveDefinitionsDb()).collection('superapp_definitions').insertMany([
      { _id: 'aaa', name: 'App A', roles: [], linkedSMs: [], sponsor: 'Buyer', isActive: 1, createdAt: 0, modifiedAt: 0 },
      { _id: 'bbb', name: 'App B', roles: [], linkedSMs: [], sponsor: 'Buyer', isActive: 1, createdAt: 0, modifiedAt: 0 },
    ]);

    const res = await authedRequest(app, 'GET', '/api/v1/definitions/superapps', user, {
      workspace: WORKSPACE,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.superapps).toHaveLength(2);
  });
});

describe('POST /api/v1/definitions/team-rbac-matrix', () => {
  it('creates a team RBAC matrix with correct _id format', async () => {
    const user = makeTestToken('user1', 'admin@test.com', OWNER_PARAM_ID);
    await seedTestSession(user);

    const superAppId = 'abcdef1234567890abcd';
    const smId = 'public:0xabc123';

    const res = await authedRequest(app, 'POST', '/api/v1/definitions/team-rbac-matrix', user, {
      workspace: WORKSPACE,
      body: {
        superAppId,
        smId,
        smName: 'Test SM',
        permissions: [
          { state: 'Contract', subState: null, microState: null, access: { 'Buyer.Admin': 'RW', 'Seller.Seller': 'RO' } },
        ],
        version: '1.0.0',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body._id).toBe(`${superAppId.slice(0, 8)}:${smId}`);
  });
});
