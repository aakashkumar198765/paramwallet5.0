import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';

export interface TestUser {
  email: string;
  userId: string;
  paramId: string;
  token: string;
}

/**
 * Create a test user with a valid JWT (no session in DB — use for route tests that skip session check).
 */
export function makeTestUser(
  email = 'test@example.com',
  paramId = '0x1234567890abcdef1234'
): TestUser {
  const userId = createHash('sha256').update(email.toLowerCase()).digest('hex');
  const secret = process.env.JWT_SECRET ?? 'test-secret-32-chars-minimum-reqd!!';
  const token = jwt.sign({ userId, email, paramId }, secret, { expiresIn: 3600 });
  return { email, userId, paramId, token };
}

/**
 * Build default headers for a request with auth context.
 */
export function makeHeaders(
  user: TestUser,
  options?: {
    workspace?: string;
    superAppId?: string;
    portal?: string;
  }
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${user.token}`,
    'X-Param-ID': user.paramId,
    'Content-Type': 'application/json',
  };

  if (options?.workspace) headers['X-Workspace'] = options.workspace;
  if (options?.superAppId) headers['X-SuperApp-ID'] = options.superAppId;
  if (options?.portal) headers['X-Portal'] = options.portal;

  return headers;
}

/**
 * Inject a GET request into Fastify.
 */
export async function get(
  app: FastifyInstance,
  url: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const response = await app.inject({
    method: 'GET',
    url,
    headers,
  });
  return {
    status: response.statusCode,
    body: JSON.parse(response.body),
  };
}

/**
 * Inject a POST request into Fastify.
 */
export async function post(
  app: FastifyInstance,
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const response = await app.inject({
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    payload: JSON.stringify(body),
  });
  return {
    status: response.statusCode,
    body: JSON.parse(response.body),
  };
}

/**
 * Inject a PUT request into Fastify.
 */
export async function put(
  app: FastifyInstance,
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const response = await app.inject({
    method: 'PUT',
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    payload: JSON.stringify(body),
  });
  return {
    status: response.statusCode,
    body: JSON.parse(response.body),
  };
}

/**
 * Inject a DELETE request into Fastify.
 */
export async function del(
  app: FastifyInstance,
  url: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const response = await app.inject({
    method: 'DELETE',
    url,
    headers,
  });
  return {
    status: response.statusCode,
    body: JSON.parse(response.body),
  };
}
