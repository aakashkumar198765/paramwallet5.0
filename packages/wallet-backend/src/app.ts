import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';

// Engine routers
import { platformRouter } from './engines/platform/router.js';
import { queryRouter } from './engines/query/router.js';
import { authRouter } from './engines/auth/router.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } } }
        : {}),
    },
    trustProxy: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: 'array',
        useDefaults: true,
      },
    },
  });

  // CORS
  await app.register(cors, {
    origin: config.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Param-ID',
      'X-Workspace',
      'X-SuperApp-ID',
      'X-Portal',
    ],
  });

  // Health check (no auth required)
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

  // Mount engine routers under /api/v1
  await app.register(authRouter, { prefix: '/api/v1' });
  await app.register(platformRouter, { prefix: '/api/v1' });
  await app.register(queryRouter, { prefix: '/api/v1' });

  // Global error handler
  app.setErrorHandler(errorHandler);

  return app;
}
