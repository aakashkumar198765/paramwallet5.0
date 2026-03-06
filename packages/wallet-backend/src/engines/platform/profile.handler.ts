import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import { resolveSaasDb } from '../../db/resolver.js';
import { authMiddleware } from '../../middleware/auth.js';
import { UpdateUserProfileSchema } from './schemas.js';

function saasDb() { return getDb(resolveSaasDb()); }

/**
 * GET /profile
 * Always returns user info from subdomain_users.
 * Optionally returns org info if X-Workspace + X-SuperApp-ID are present.
 * Does NOT require X-Workspace (skips requestContextMiddleware).
 */
async function getProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { userId } = request.authContext;
  const workspace = request.headers['x-workspace'] as string | undefined;
  const superAppId = request.headers['x-superapp-id'] as string | undefined;

  const userDoc = await saasDb().collection('subdomain_users').findOne({ userId });
  if (!userDoc) return reply.code(404).send({ error: 'User profile not found' });

  const response: Record<string, unknown> = { user: userDoc };

  // Optionally enrich with org context if both workspace and superAppId headers are present
  if (workspace && superAppId) {
    try {
      const { resolveSuperAppDbName } = await import('../../db/resolver.js');
      const sappDbName = resolveSuperAppDbName(workspace, superAppId);
      const appUserDocs = await getDb(sappDbName)
        .collection('app_users')
        .find({ userId, superAppId })
        .toArray();
      response['orgContext'] = appUserDocs;
    } catch {
      // Non-fatal — app context unavailable
    }
  }

  return reply.send(response);
}

/**
 * GET /user/profile
 * Same as GET /profile — alias route (requires workspace context).
 */
async function getUserProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return getProfile(request, reply);
}

/**
 * PUT /user/profile
 * Updates user name in subdomain_users.
 */
async function updateUserProfile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = UpdateUserProfileSchema.parse(request.body);
  const { userId } = request.authContext;

  const result = await saasDb().collection('subdomain_users').findOneAndUpdate(
    { userId },
    { $set: { name: body.name, updatedAt: Date.now() } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'User profile not found' });
  return reply.send(result);
}

export async function profileHandlers(app: FastifyInstance): Promise<void> {
  // GET /profile: auth only, no workspace context required
  app.get('/profile', { preHandler: [authMiddleware] }, getProfile);
  app.get('/user/profile', getUserProfile);
  app.put('/user/profile', updateUserProfile);
}
