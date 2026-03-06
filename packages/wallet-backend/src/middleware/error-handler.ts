import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import { logger } from '../logger.js';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  // Zod validation errors → 400
  if (error instanceof ZodError) {
    const issues = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    reply.code(400).send({ error: 'Validation error', issues });
    return;
  }

  // MongoDB duplicate key → 409
  if (error instanceof MongoServerError && error.code === 11000) {
    reply.code(409).send({ error: 'Duplicate key', detail: error.message });
    return;
  }

  // Fastify-generated errors (JSON schema validation, not found, etc.)
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    reply.code(fastifyError.statusCode).send({
      error: fastifyError.message,
    });
    return;
  }

  // Custom application errors with a status code
  const appError = error as Error & { statusCode?: number };
  if (appError.statusCode) {
    reply.code(appError.statusCode).send({ error: appError.message });
    return;
  }

  // ENN timeout / upstream errors — check message
  if (appError.message?.includes('Auth service unavailable')) {
    reply.code(502).send({ error: 'Auth service unavailable' });
    return;
  }

  // Unknown error → 500
  logger.error({ err: error, url: request.url, method: request.method }, 'Unhandled error');
  reply.code(500).send({ error: 'Internal server error' });
}

/**
 * Creates a typed application error with an HTTP status code.
 */
export function createHttpError(statusCode: number, message: string): Error & { statusCode: number } {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}
