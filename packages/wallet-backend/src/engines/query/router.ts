import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.js';
import { requestContextMiddleware } from '../../middleware/request-context.js';
import { platformContextMiddleware } from '../../middleware/platform-context.js';
import { documentsHandlers } from './documents.handler.js';
import { actionsHandlers } from './actions.handler.js';
import { chainHandlers } from './chain.handler.js';
import { offchainHandlers } from './offchain.handler.js';

/**
 * Engine 2: Query Engine
 * All routes: auth + workspace + superapp context + platform context
 */
export async function queryRouter(app: FastifyInstance): Promise<void> {
  app.register(async (sub) => {
    sub.addHook('preHandler', authMiddleware);
    sub.addHook('preHandler', requestContextMiddleware);
    sub.addHook('preHandler', platformContextMiddleware);

    await documentsHandlers(sub);
    await actionsHandlers(sub);
    await chainHandlers(sub);
    await offchainHandlers(sub);
  });
}
