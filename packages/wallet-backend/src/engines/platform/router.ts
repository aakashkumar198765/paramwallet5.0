import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../../middleware/auth.js';
import { requestContextMiddleware } from '../../middleware/request-context.js';
import { definitionsHandlers } from './definitions.handler.js';
import { workspaceHandlers, workspaceAuthHandlers } from './workspace.handler.js';
import { profileHandlers } from './profile.handler.js';
import { superAppHandlers } from './superapp.handler.js';
import { orgHandlers } from './org.handler.js';
import { userHandlers } from './user.handler.js';
import { teamRbacHandlers } from './team-rbac.handler.js';

/**
 * Engine 1: Platform Manager
 *
 * Route groups:
 *   /profile            — auth only, no workspace/superapp context
 *   /workspace, /definitions, /superapp/* — auth + workspace context
 *   /superapp/:id/...   — auth + workspace + superapp context + platform context
 */
export async function platformRouter(app: FastifyInstance): Promise<void> {
  // ── Auth-only routes: no workspace context required ───────────────────────
  app.register(async (sub) => {
    sub.addHook('preHandler', authMiddleware);
    await profileHandlers(sub);
    await workspaceAuthHandlers(sub);
  });

  // ── Workspace-context routes: auth + workspace headers ────────────────────
  app.register(async (sub) => {
    sub.addHook('preHandler', authMiddleware);
    sub.addHook('preHandler', requestContextMiddleware);
    await workspaceHandlers(sub);
    await definitionsHandlers(sub);
    await superAppHandlers(sub);
    await orgHandlers(sub);
    await userHandlers(sub);
    await teamRbacHandlers(sub);
  });
}
