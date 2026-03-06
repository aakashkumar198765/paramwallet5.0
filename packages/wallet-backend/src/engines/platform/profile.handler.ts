import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import { resolveDomainDb, resolveSuperAppDbName } from '../../db/resolver.js';
import { UpdateProfileSchema } from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

/**
 * GET /profile
 * Spec §15.2: X-Workspace and X-SuperApp-ID are optional.
 * Always fetches user profile. When both headers present, also fetches caller's org(s).
 * SKIPS platformContextMiddleware.
 */
export async function getProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { userId, paramId } = req.authContext;
  const saasDb = getDb(resolveDomainDb());

  const userRecord = await saasDb.collection('subdomain_users').findOne({ userId });

  if (!userRecord) {
    return reply.status(404).send({ error: 'User profile not found' });
  }

  const userDoc = userRecord as Record<string, unknown>;

  // Spec response shape: { user: { userId, email, name, subdomains }, org: null }
  const response: Record<string, unknown> = {
    user: {
      userId: userDoc.userId,
      email: userDoc.email,
      name: userDoc.name ?? null,
      subdomains: userDoc.subdomains ?? [],
    },
    org: null,
  };

  // Optionally enrich with org info if workspace + superApp context provided
  const { workspace, superAppId } = req.requestContext;
  if (workspace && superAppId) {
    try {
      const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
      const partnerId = (request.query as Record<string, string>).partnerId;

      if (partnerId) {
        // Return single org doc for this vendor
        const org = await sappDb
          .collection('organizations')
          .findOne({ 'org.paramId': paramId, 'org.partnerId': partnerId });
        response.org = org ?? null;
        if (!org) return reply.status(404).send({ error: 'Org not found' });
      } else {
        // Return all org docs for this paramId
        const orgs = await sappDb
          .collection('organizations')
          .find({ 'org.paramId': paramId })
          .toArray();
        // Sponsor → single doc; Partner with multiple vendors → array
        response.org = orgs.length === 1 ? orgs[0] : orgs.length > 1 ? orgs : null;
      }
    } catch {
      // Non-fatal — org lookup is opportunistic
    }
  }

  return reply.send(response);
}

/**
 * GET /user/profile
 * Spec §15.2: Returns user profile only.
 * Shape: { userId, email, name, subdomains[] }
 */
export async function getUserProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { authContext: AuthContext };
  const saasDb = getDb(resolveDomainDb());

  const userRecord = await saasDb
    .collection('subdomain_users')
    .findOne({ userId: req.authContext.userId });

  if (!userRecord) {
    return reply.status(404).send({ error: 'User profile not found' });
  }

  const u = userRecord as Record<string, unknown>;

  // Spec response: { userId, email, name, subdomains }
  return reply.send({
    userId: u.userId,
    email: u.email,
    name: u.name ?? null,
    subdomains: u.subdomains ?? [],
  });
}

/**
 * PUT /user/profile
 * Spec §15.2: Body { name }. Response: updated subdomain_users document.
 */
export async function updateUserProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateProfileSchema.parse(request.body);
  const req = request as FastifyRequest & { authContext: AuthContext };
  const saasDb = getDb(resolveDomainDb());

  const update: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.name) update.name = body.name;

  const result = await saasDb
    .collection('subdomain_users')
    .findOneAndUpdate(
      { userId: req.authContext.userId },
      { $set: update },
      { returnDocument: 'after' }
    );

  if (!result) {
    return reply.status(404).send({ error: 'User profile not found' });
  }

  // Spec response: updated subdomain_users document (no wrapper)
  return reply.send(result);
}
