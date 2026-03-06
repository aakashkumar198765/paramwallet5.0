import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { anyCol } from '../../db/mongo.js';
import { resolveSuperAppDbName, resolveWorkspaceDb, resolveSaasDb } from '../../db/resolver.js';
import { OnboardPartnerSchema, UpdateOrgStatusSchema } from './schemas.js';
import { requireWorkspaceAdmin } from '../../middleware/rbac.js';

function sappCol(workspace: string, superAppId: string, colName: string) {
  return anyCol(resolveSuperAppDbName(workspace, superAppId), colName);
}

async function getOrgProfile(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId } = request.params;
  const { workspace } = request.requestContext;
  const { paramId } = request.authContext;
  const orgs = await sappCol(workspace, superAppId, 'organizations').find({ 'org.paramId': paramId }).toArray();
  return reply.send({ orgs });
}

async function listOrgs(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId } = request.params;
  const { workspace } = request.requestContext;
  return reply.send({ orgs: await sappCol(workspace, superAppId, 'organizations').find({}).toArray() });
}

async function listOrgsByRole(
  request: FastifyRequest<{ Params: { superAppId: string; role: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, role } = request.params;
  const { workspace } = request.requestContext;
  return reply.send({ orgs: await sappCol(workspace, superAppId, 'organizations').find({ role }).toArray() });
}

async function onboardPartner(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId } = request.params;
  const { workspace } = request.requestContext;
  const body = OnboardPartnerSchema.parse(request.body);
  const now = Date.now();

  const slice = body.org.paramId.startsWith('0x') ? body.org.paramId.slice(2, 22) : body.org.paramId.slice(0, 20);
  const orgId = `org:${superAppId}:${body.role}:${slice}:${body.org.partnerId}`;

  const existing = await sappCol(workspace, superAppId, 'organizations').findOne({ _id: orgId });
  if (existing) return reply.code(409).send({ error: 'Partner already onboarded with this vendor ID' });

  const orgDoc = { _id: orgId, superAppId, role: body.role, isSponsorOrg: false, org: body.org, orgAdmin: body.orgAdmin ?? null, status: 'active', onboardedAt: now, updatedAt: now };
  await sappCol(workspace, superAppId, 'organizations').insertOne(orgDoc);

  for (const plant of body.plants ?? []) {
    await anyCol(resolveWorkspaceDb(workspace), 'plants').updateOne(
      { _id: `plant:${plant.code}` },
      { $set: { code: plant.code, name: plant.name, paramId: body.org.paramId, location: plant.location ?? {}, isActive: true }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }

  if (body.orgAdmin) {
    const adminUserId = createHash('sha256').update(body.orgAdmin.toLowerCase()).digest('hex');
    const appUserId = `user:${superAppId}:${adminUserId}:${body.org.partnerId}`;
    await sappCol(workspace, superAppId, 'app_users').updateOne(
      { _id: appUserId },
      { $set: { superAppId, userId: adminUserId, email: body.orgAdmin, orgParamId: body.org.paramId, role: body.role, partnerId: body.org.partnerId, plantTeams: (body.plants ?? []).map((p) => ({ plant: p.code, teams: [body.role] })), isOrgAdmin: true, status: 'active', updatedAt: now, addedBy: 'system' }, $setOnInsert: { addedAt: now } },
      { upsert: true },
    );
    await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
      { userId: adminUserId },
      { $set: { email: body.orgAdmin, paramId: body.org.paramId, updatedAt: now }, $addToSet: { subdomains: workspace }, $setOnInsert: { _id: `user:${adminUserId}`, name: '', subdomains: [], createdAt: now } },
      { upsert: true },
    );
  }

  return reply.code(201).send(orgDoc);
}

async function updateOrgStatus(
  request: FastifyRequest<{ Params: { superAppId: string; role: string; paramId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { superAppId, role, paramId: orgParamId } = request.params;
  const { workspace } = request.requestContext;
  const body = UpdateOrgStatusSchema.parse(request.body);

  const result = await sappCol(workspace, superAppId, 'organizations').findOneAndUpdate(
    { 'org.paramId': orgParamId, role, superAppId },
    { $set: { status: body.status, updatedAt: Date.now() } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'Org not found' });

  if (body.status === 'suspended') {
    await sappCol(workspace, superAppId, 'app_users').updateMany(
      { orgParamId, superAppId },
      { $set: { status: 'suspended', updatedAt: Date.now() } },
    );
  }
  return reply.send(result);
}

export async function orgHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { superAppId: string } }>('/superapp/:superAppId/org/profile', getOrgProfile);
  app.get<{ Params: { superAppId: string } }>('/superapp/:superAppId/orgs', listOrgs);
  app.get<{ Params: { superAppId: string; role: string } }>('/superapp/:superAppId/orgs/:role', listOrgsByRole);
  app.post<{ Params: { superAppId: string } }>('/superapp/:superAppId/partners/onboard', { preHandler: [requireWorkspaceAdmin] }, onboardPartner);
  app.put<{ Params: { superAppId: string; role: string; paramId: string } }>('/superapp/:superAppId/orgs/:role/:paramId/status', { preHandler: [requireWorkspaceAdmin] }, updateOrgStatus);
}
