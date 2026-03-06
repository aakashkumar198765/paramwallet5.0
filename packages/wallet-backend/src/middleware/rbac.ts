import type { FastifyRequest, FastifyReply } from 'fastify';
import { anyCol } from '../db/mongo.js';
import { resolveSaasDb } from '../db/resolver.js';

/**
 * requireWorkspaceAdmin: Checks that the caller is the workspace owner
 * (ownerParamId in param_saas.subdomains matches authContext.paramId).
 */
export async function requireWorkspaceAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const { paramId } = request.authContext;
  const { workspace } = request.requestContext;

  const subdomain = await anyCol(resolveSaasDb(), 'subdomains').findOne({ _id: workspace });

  if (!subdomain) {
    return reply.code(404).send({ error: 'Workspace not found' });
  }
  if (subdomain['ownerParamId'] !== paramId) {
    return reply.code(403).send({ error: 'Workspace admin access required' });
  }
}

/**
 * requireOrgAdmin: Checks that the caller has isOrgAdmin === true in app_users.
 */
export async function requireOrgAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.platformContext?.isOrgAdmin) {
    return reply.code(403).send({ error: 'Org admin access required' });
  }
}

/**
 * requirePlatformContext: Checks that platformContext was resolved (user is in the SuperApp).
 * Use on routes that require an active SuperApp context.
 */
export async function requirePlatformContext(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.platformContext) {
    return reply.code(403).send({ error: 'SuperApp context required (X-SuperApp-ID header)' });
  }
}
