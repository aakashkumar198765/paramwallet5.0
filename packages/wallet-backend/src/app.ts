import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { deriveRequestContext } from './middleware/request-context.js';
import { platformContextMiddleware } from './middleware/platform-context.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { authRouter } from './engines/auth/router.js';
import { platformRouter } from './engines/platform/router.js';
import { queryRouter } from './engines/query/router.js';
import { wsRouter } from './engines/realtime/ws-router.js';
import { notificationRouter } from './engines/notification/router.js';

// Augment FastifyRequest with our custom context properties
import type { AuthContext } from './middleware/auth.js';
import type { RequestContext } from './middleware/request-context.js';
import type { PlatformContext } from './middleware/platform-context.js';

declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: false,  // Using pino directly
    trustProxy: true,
  });

  // ── CORS ──────────────────────────────────────────────────────────────────────
  const allowedOrigins = config.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  await fastify.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Param-ID',
      'X-Workspace',
      'X-SuperApp-ID',
      'X-Portal',
    ],
  });

  // ── @fastify/sensible (http error helpers) ────────────────────────────────────
  await fastify.register(sensible);

  // ── Global middleware hooks ────────────────────────────────────────────────────
  fastify.addHook('preHandler', authMiddleware);
  fastify.addHook('preHandler', deriveRequestContext);
  fastify.addHook('preHandler', platformContextMiddleware);

  // ── Health check (no auth) ────────────────────────────────────────────────────
  fastify.get('/health', async (_request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Engine routers ────────────────────────────────────────────────────────────
  await fastify.register(authRouter, { prefix: '/api/v1' });
  await fastify.register(platformRouter, { prefix: '/api/v1' });
  await fastify.register(queryRouter, { prefix: '/api/v1' });
  await fastify.register(wsRouter, { prefix: '/api/v1' });
  await fastify.register(notificationRouter, { prefix: '/api/v1' });

  // ── Error handler ─────────────────────────────────────────────────────────────
  registerErrorHandler(fastify);

  return fastify;
}
