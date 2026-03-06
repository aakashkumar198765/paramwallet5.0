import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { anyCol } from '../db/mongo.js';
import { resolveAuthDb } from '../db/resolver.js';

export interface AuthContext {
  userId: string;
  email: string;
  paramId: string;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthContext;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization'];
  const paramId = request.headers['x-param-id'] as string | undefined;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing Authorization header' });
  }
  if (!paramId) {
    return reply.code(401).send({ error: 'Missing X-Param-ID header' });
  }

  const token = authHeader.slice(7);

  // Verify JWT signature and expiry
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return reply.code(401).send({ error: 'Token expired' });
    }
    return reply.code(401).send({ error: 'Invalid token' });
  }

  // Validate X-Param-ID matches token payload (prevents impersonation)
  if (decoded['paramId'] !== paramId) {
    return reply.code(401).send({ error: 'X-Param-ID mismatch' });
  }

  // Validate session in param_auth.{paramId}
  const sessionId = `session:${createHash('sha256').update(token).digest('hex')}`;
  const session = await anyCol(resolveAuthDb(), paramId).findOne({ _id: sessionId });

  if (!session) {
    return reply.code(401).send({ error: 'Session not found or revoked' });
  }

  request.authContext = {
    userId: decoded['userId'] as string,
    email: decoded['email'] as string,
    paramId,
    sessionId,
  };
}
