import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anyCol, getMongoClient } from '../../db/mongo.js';
import {
  resolveSaasDb,
  resolveDefinitionsDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { createSuperAppIndexes } from '../../db/indexes.js';
import { requireWorkspaceAdmin } from '../../middleware/rbac.js';
import { InstallSuperAppSchema, UpdateSuperAppStatusSchema, ManifestSchema } from './schemas.js';

// ── Install SuperApp (6-step atomic) ─────────────────────────────────────────

async function installSuperApp(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const body = InstallSuperAppSchema.parse(request.body);
  const { userId, paramId } = request.authContext;
  const { workspace } = request.requestContext;

  const superAppDef = await anyCol(resolveDefinitionsDb(), 'superapp_definitions')
    .findOne({ _id: body.superAppId });
  if (!superAppDef) return reply.code(404).send({ error: 'SuperApp definition not found' });

  const rbacMatrixDocs = await anyCol(resolveDefinitionsDb(), 'team_rbac_matrix')
    .find({ superAppId: body.superAppId })
    .toArray();

  const sappDbName = resolveSuperAppDbName(workspace, body.superAppId);
  const now = Date.now();
  const rollback: Array<() => Promise<void>> = [];

  try {
    // Step 3: installed_superapps
    const installedDoc = {
      _id: body.superAppId,
      name: superAppDef['name'], desc: superAppDef['desc'], version: superAppDef['version'],
      roles: superAppDef['roles'], linkedSMs: superAppDef['linkedSMs'], sponsor: superAppDef['sponsor'],
      paramId, status: 'active', installedAt: now, installedBy: userId,
    };
    await anyCol(resolveWorkspaceDb(workspace), 'installed_superapps').insertOne(installedDoc);
    rollback.push(() => anyCol(resolveWorkspaceDb(workspace), 'installed_superapps').deleteOne({ _id: body.superAppId }).then(() => undefined));

    // Step 4: sponsor org
    const sponsorRole = superAppDef['sponsor'] as string;
    const orgParamIdSlice = paramId.startsWith('0x') ? paramId.slice(2, 22) : paramId.slice(0, 20);
    const orgId = `org:${body.superAppId}:${sponsorRole}:${orgParamIdSlice}`;
    const orgDoc = {
      _id: orgId, superAppId: body.superAppId, role: sponsorRole, isSponsorOrg: true,
      org: { paramId, name: '' }, orgAdmin: null, status: 'active', onboardedAt: now, updatedAt: now,
    };
    await anyCol(sappDbName, 'organizations').insertOne(orgDoc);
    rollback.push(() => anyCol(sappDbName, 'organizations').deleteOne({ _id: orgId }).then(() => undefined));

    // Step 5: team_rbac_matrix
    if (rbacMatrixDocs.length > 0) {
      await anyCol(sappDbName, 'team_rbac_matrix').insertMany(rbacMatrixDocs);
      rollback.push(() => anyCol(sappDbName, 'team_rbac_matrix').deleteMany({ superAppId: body.superAppId }).then(() => undefined));
    }

    // Step 6: AddToSet workspace in subdomain_users
    await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
      { userId },
      { $addToSet: { subdomains: workspace }, $set: { updatedAt: now } },
      { upsert: true },
    );

    await createSuperAppIndexes(getMongoClient(), sappDbName);
    return reply.code(201).send(installedDoc);
  } catch (err) {
    for (const op of rollback.reverse()) { try { await op(); } catch { /* best-effort */ } }
    throw err;
  }
}

// ── List / Get / Update ────────────────────────────────────────────────────────

async function listSuperApps(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { workspaceDbName } = request.requestContext;
  return reply.send({ superapps: await anyCol(workspaceDbName, 'installed_superapps').find({}).toArray() });
}

async function getSuperApp(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { workspaceDbName, workspace } = request.requestContext;
  const { superAppId } = request.params;
  const doc = await anyCol(workspaceDbName, 'installed_superapps').findOne({ _id: superAppId });
  if (!doc) return reply.code(404).send({ error: 'SuperApp not installed' });

  const orgs = await anyCol(resolveSuperAppDbName(workspace, superAppId), 'organizations').find({}).toArray();
  const orgsByRole: Record<string, unknown[]> = {};
  for (const org of orgs) {
    const role = org['role'] as string;
    if (!orgsByRole[role]) orgsByRole[role] = [];
    orgsByRole[role].push(org);
  }
  return reply.send({ ...doc, orgBindings: orgsByRole });
}

async function updateSuperAppStatus(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = UpdateSuperAppStatusSchema.parse(request.body);
  const { workspaceDbName } = request.requestContext;
  const result = await anyCol(workspaceDbName, 'installed_superapps').findOneAndUpdate(
    { _id: request.params.superAppId },
    { $set: { status: body.status } },
    { returnDocument: 'after' },
  );
  if (!result) return reply.code(404).send({ error: 'SuperApp not installed' });
  return reply.send(result);
}

// ── Manifest ─────────────────────────────────────────────────────────────────

async function applyManifest(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const body = ManifestSchema.parse(request.body);
  const { superAppId } = request.params;
  const { workspace } = request.requestContext;
  const { userId } = request.authContext;
  const now = Date.now();
  const results = { orgsOnboarded: 0, usersAdded: 0 };

  for (const orgEntry of body.orgs) {
    const slice = orgEntry.org.paramId.startsWith('0x') ? orgEntry.org.paramId.slice(2, 22) : orgEntry.org.paramId.slice(0, 20);
    const orgId = `org:${superAppId}:${orgEntry.role}:${slice}:${orgEntry.org.partnerId}`;
    await anyCol(resolveSuperAppDbName(workspace, superAppId), 'organizations').updateOne(
      { _id: orgId },
      { $set: { superAppId, role: orgEntry.role, isSponsorOrg: false, org: orgEntry.org, orgAdmin: orgEntry.orgAdmin ?? null, status: 'active', updatedAt: now }, $setOnInsert: { onboardedAt: now } },
      { upsert: true },
    );
    for (const plant of orgEntry.plants ?? []) {
      await anyCol(resolveWorkspaceDb(workspace), 'plants').updateOne(
        { _id: `plant:${plant.code}` },
        { $set: { code: plant.code, name: plant.name, paramId: orgEntry.org.paramId, location: plant.location ?? {}, isActive: true }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
    }
    results.orgsOnboarded++;
  }

  for (const userEntry of body.users) {
    const { createHash } = await import('crypto');
    const userUserId = createHash('sha256').update(userEntry.email.toLowerCase()).digest('hex');
    const appUserId = userEntry.partnerId
      ? `user:${superAppId}:${userUserId}:${userEntry.partnerId}`
      : `user:${superAppId}:${userUserId}`;

    await anyCol(resolveSuperAppDbName(workspace, superAppId), 'app_users').updateOne(
      { _id: appUserId },
      { $set: { superAppId, userId: userUserId, email: userEntry.email, orgParamId: userEntry.orgParamId, role: userEntry.role, partnerId: userEntry.partnerId ?? null, plantTeams: userEntry.plantTeams, isOrgAdmin: userEntry.isOrgAdmin, status: 'active', updatedAt: now, addedBy: userId }, $setOnInsert: { addedAt: now } },
      { upsert: true },
    );
    await anyCol(resolveSaasDb(), 'subdomain_users').updateOne(
      { userId: userUserId },
      { $set: { email: userEntry.email, paramId: userEntry.orgParamId, updatedAt: now }, $addToSet: { subdomains: workspace }, $setOnInsert: { _id: `user:${userUserId}`, name: userEntry.name, subdomains: [], createdAt: now } },
      { upsert: true },
    );
    results.usersAdded++;
  }

  return reply.send({ status: 'ok', ...results });
}

export async function superAppHandlers(app: FastifyInstance): Promise<void> {
  app.post('/superapp/install', { preHandler: [requireWorkspaceAdmin] }, installSuperApp);
  app.get('/superapp', listSuperApps);
  app.get<{ Params: { superAppId: string } }>('/superapp/:superAppId', getSuperApp);
  app.put<{ Params: { superAppId: string } }>('/superapp/:superAppId/status', { preHandler: [requireWorkspaceAdmin] }, updateSuperAppStatus);
  app.post<{ Params: { superAppId: string } }>('/superapp/:superAppId/manifest', { preHandler: [requireWorkspaceAdmin] }, applyManifest);
}
