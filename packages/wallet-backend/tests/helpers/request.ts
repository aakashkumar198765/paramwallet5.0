import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';
import { getMongoClient } from '../../src/db/mongo.js';
import { resolveAuthDb } from '../../src/db/resolver.js';
import { seedSession } from './seed.js';

const JWT_SECRET = 'test-secret-32-chars-long-minimum!';

export interface TestUser {
  userId: string;
  email: string;
  paramId: string;
  token: string;
  tokenHash: string;
}

export function makeTestToken(userId: string, email: string, paramId: string): TestUser {
  const token = jwt.sign({ userId, email, paramId }, JWT_SECRET, { expiresIn: 3600 });
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { userId, email, paramId, token, tokenHash };
}

export async function seedTestSession(user: TestUser): Promise<void> {
  const client = getMongoClient();
  const refreshToken = 'test-refresh-token';
  await seedSession(client, user.paramId, user.userId, user.email, user.tokenHash, refreshToken);
}

/**
 * Makes an authenticated request via Fastify inject.
 */
export async function authedRequest(
  app: FastifyInstance,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  user: TestUser,
  options: {
    body?: unknown;
    workspace?: string;
    superAppId?: string;
    portal?: string;
  } = {},
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${user.token}`,
    'X-Param-ID': user.paramId,
    'Content-Type': 'application/json',
  };

  if (options.workspace) headers['X-Workspace'] = options.workspace;
  if (options.superAppId) headers['X-SuperApp-ID'] = options.superAppId;
  if (options.portal) headers['X-Portal'] = options.portal;

  return app.inject({
    method,
    url,
    headers,
    payload: options.body ? JSON.stringify(options.body) : undefined,
  });
}
