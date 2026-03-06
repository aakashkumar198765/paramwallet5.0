import { FastifyError, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../logger.js';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  validation?: unknown[];
}

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    (error: FastifyError & AppError, request: FastifyRequest, reply: FastifyReply) => {
      const { method, url } = request;
      logger.error({ err: error, method, url }, 'Request error');

      // Fastify validation errors
      if (error.validation) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.validation,
        });
      }

      // Zod validation errors (thrown as plain Error with 'ZodError' name)
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
        });
      }

      // Auth errors
      if (
        error.message === 'UNAUTHORIZED' ||
        error.statusCode === 401 ||
        error.name === 'UnauthorizedError'
      ) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      // Forbidden errors
      if (
        error.message === 'FORBIDDEN' ||
        error.statusCode === 403 ||
        error.name === 'ForbiddenError'
      ) {
        return reply.status(403).send({ error: 'Forbidden', message: error.message });
      }

      // Not found
      if (error.statusCode === 404 || error.message === 'NOT_FOUND') {
        return reply.status(404).send({ error: 'Not Found' });
      }

      // MongoDB duplicate key (code 11000)
      if (
        (error as AppError & { code?: number }).code === 11000 ||
        error.message?.includes('duplicate key')
      ) {
        return reply.status(409).send({ error: 'Conflict', message: 'Resource already exists' });
      }

      // ENN timeout / gateway errors
      if (
        error.message?.includes('ENN_TIMEOUT') ||
        error.message?.includes('ECONNREFUSED') ||
        error.code === 'ETIMEDOUT'
      ) {
        return reply.status(502).send({ error: 'Bad Gateway', message: 'External service unavailable' });
      }

      // Explicit status codes
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        return reply.status(error.statusCode).send({ error: error.message });
      }

      // Default: 500
      return reply.status(500).send({
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { message: error.message } : {}),
      });
    }
  );

  // 404 handler for unmatched routes
  fastify.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({ error: 'Not Found' });
  });
}
