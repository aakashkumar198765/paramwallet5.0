import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import {
  resolveDomainDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { OnboardPartnerSchema, UpdateOrgStatusSchema } from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

interface OrgParams {
  superAppId: string;
}

interface OrgRoleParams extends OrgParams {
  role: string;
}

interface OrgRoleParamIdParams extends OrgRoleParams {
  paramId: string;
}

/**
 * GET /superapp/:superAppId/org/profile
 * Returns caller's own org doc in this superApp.
 */
export async function getOrgProfile(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: OrgParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const org = await sappDb
    .collection('organizations')
    .findOne({ 'org.paramId': req.authContext.paramId });

  if (!org) return reply.status(404).send({ error: 'Organisation not found' });
  return reply.send({ data: org });
}

/**
 * GET /superapp/:superAppId/orgs
 * List all orgs.
 */
export async function listOrgs(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: OrgParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const orgs = await sappDb.collection('organizations').find({}).toArray();
  return reply.send({ data: orgs });
}

/**
 * GET /superapp/:superAppId/orgs/:role
 * List orgs by role.
 */
export async function listOrgsByRole(
  request: FastifyRequest<{ Params: OrgRoleParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: OrgRoleParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const orgs = await sappDb
    .collection('organizations')
    .find({ role: request.params.role })
    .toArray();
  return reply.send({ data: orgs });
}

/**
 * POST /superapp/:superAppId/partners/onboard
 * Full partner onboard: org + plants + subdomain_users + app_users.
 */
export async function onboardPartner(
  request: FastifyRequest<{ Params: OrgParams }>,
  reply: FastifyReply
): Promise<void> {
  const body = OnboardPartnerSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: OrgParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const wsDb = getDb(resolveWorkspaceDb(workspace));
  const saasDb = getDb(resolveDomainDb());
  const now = new Date();

  // Build org doc _id
  const orgParamId = body.org.paramId;
  const orgPart = orgParamId.startsWith('0x') ? orgParamId.slice(2, 22) : orgParamId.slice(0, 20);
  const orgId = `org:${superAppId}:${body.role}:${orgPart}`;

  // Insert org
  await sappDb.collection('organizations').updateOne(
    { _id: orgId as unknown as string },
    {
      $set: {
        _id: orgId,
        superAppId,
        role: body.role,
        org: body.org,
        status: 'active',
        isSponsor: false,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Insert plants into workspace DB (if any)
  for (const plantCode of body.plants) {
    await wsDb.collection('plants').updateOne(
      { _id: plantCode as unknown as string },
      {
        $setOnInsert: {
          _id: plantCode,
          code: plantCode,
          isActive: true,
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }

  // Upsert subdomain_users for the partner's primary user (email-based)
  const userId = createHash('sha256').update(body.email.toLowerCase()).digest('hex');

  await saasDb.collection('subdomain_users').updateOne(
    { userId },
    {
      $setOnInsert: { userId, email: body.email, createdAt: now },
      $addToSet: { subdomains: workspace } as Record<string, unknown>,
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  // Insert app_users
  const appUserId = `au:${superAppId}:${body.role}:${userId}`;
  await sappDb.collection('app_users').updateOne(
    { _id: appUserId as unknown as string },
    {
      $set: {
        _id: appUserId,
        userId,
        email: body.email,
        superAppId,
        role: body.role,
        partnerId: body.org.partnerId ?? orgPart,
        plantTeams: body.plantTeams,
        isOrgAdmin: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return reply.status(201).send({ success: true, orgId });
}

/**
 * PUT /superapp/:superAppId/orgs/:role/:paramId/status
 */
export async function updateOrgStatus(
  request: FastifyRequest<{ Params: OrgRoleParamIdParams }>,
  reply: FastifyReply
): Promise<void> {
  const body = UpdateOrgStatusSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: OrgRoleParamIdParams }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId, role, paramId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const result = await sappDb.collection('organizations').findOneAndUpdate(
    { 'org.paramId': paramId, role },
    { $set: { status: body.status, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'Organisation not found' });
  return reply.send({ data: result });
}
