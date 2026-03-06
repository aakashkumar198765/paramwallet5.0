import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { getDb } from '../db/mongo.js';
import { resolveAuthDb } from '../db/resolver.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface AuthContext {
  userId: string;    // SHA256(email)
  email: string;
  paramId: string;   // org ethereum address
  token: string;     // raw JWT
}

// Routes that skip auth entirely
const AUTH_SKIP_PATHS = new Set([
  '/health',
  '/api/v1/auth/otp/request',
  '/api/v1/auth/otp/verify',
  '/api/v1/auth/refresh',
]);

function isAuthSkipped(url: string, method: string): boolean {
  // Strip query string
  const path = url.split('?')[0];
  if (AUTH_SKIP_PATHS.has(path)) return true;
  // SSO provider routes: /api/v1/auth/sso/:provider
  if (path.startsWith('/api/v1/auth/sso/') && method === 'POST') return true;
  // Domain register
  if (path === '/api/v1/auth/domain/register' && method === 'POST') return true;
  return false;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  logger.debug({ url: request.url, method: request.method }, 'Auth middleware checking request');

  if (isAuthSkipped(request.url, request.method)) {
    logger.debug({ url: request.url }, 'Auth skipped for this route');
    return;
  }

  const authHeader = request.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);
  const paramId = request.headers['x-param-id'] as string | undefined;

  if (!paramId) {
    return reply.status(401).send({ error: 'Missing X-Param-ID header' });
  }

  // Verify JWT
  let decoded: { userId: string; email: string; paramId: string };
  try {
    decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
      paramId: string;
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({ error: 'Token expired' });
    }
    return reply.status(401).send({ error: 'Invalid token' });
  }

  // Validate session in param_auth.sessions
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const sessionId = `session:${tokenHash}`;

  try {
    const authDb = getDb(resolveAuthDb());
    const sessionCol = authDb.collection('sessions');
    const session = await sessionCol.findOne({ _id: sessionId as unknown as string });

    if (!session) {
      return reply.status(401).send({ error: 'Session not found or expired' });
    }

    // Check session expiry (belt-and-suspenders — TTL index handles this too)
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      return reply.status(401).send({ error: 'Session expired' });
    }
  } catch (err) {
    logger.error({ err, paramId }, 'Auth session lookup failed');
    return reply.status(500).send({ error: 'Internal server error during auth' });
  }

  (request as FastifyRequest & { authContext: AuthContext }).authContext = {
    userId: decoded.userId,
    email: decoded.email,
    paramId: decoded.paramId,
    token,
  };
}

export function registerAuthMiddleware(fastify: FastifyInstance): void {
  fastify.addHook('preHandler', authMiddleware);
}
