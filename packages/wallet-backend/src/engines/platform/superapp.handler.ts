import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import {
  resolveDefinitionsDb,
  resolveDomainDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { ensureAppUserIndexes } from '../../db/indexes.js';
import { InstallSuperAppSchema } from './schemas.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

/**
 * POST /superapp/install
 * Spec §15.4: 6-step atomic SuperApp install process.
 */
export async function installSuperApp(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const body = InstallSuperAppSchema.parse(request.body);
  const req = request as FastifyRequest & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;

  if (!workspace) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const { superAppId } = body;
  const defsDb = getDb(resolveDefinitionsDb());
  const saasDb = getDb(resolveDomainDb());
  const wsDb = getDb(resolveWorkspaceDb(workspace));
  const sappDbName = resolveSuperAppDbName(workspace, superAppId);
  const sappDb = getDb(sappDbName);

  // Step 1: Read param_definitions.superapp_definitions
  const superAppDef = await defsDb
    .collection('superapp_definitions')
    .findOne({ _id: superAppId as unknown as string });

  if (!superAppDef) {
    return reply.status(404).send({ error: 'SuperApp definition not found' });
  }

  const defRecord = superAppDef as Record<string, unknown>;
  const linkedSMs: string[] = (defRecord.linkedSMs as string[]) ?? [];
  // Sponsor role is defined on the SuperApp definition — NOT from request
  const sponsorRole: string = (defRecord.sponsor as string) ?? '';

  // Step 2: Read param_definitions.team_rbac_matrix for all linked SMs
  const rbacMatrixDocs = await defsDb
    .collection('team_rbac_matrix')
    .find({ superAppId })
    .toArray();

  const now = Date.now();

  // Step 3: Write {subdomain}.installed_superapps — full copy of superapp_definitions + install metadata
  const installedDoc = {
    ...defRecord,
    _id: superAppId,
    paramId: req.authContext.paramId,   // installer's org paramId
    status: 'active',
    installedAt: now,
    updatedAt: now,
  };

  await wsDb.collection('installed_superapps').updateOne(
    { _id: superAppId as unknown as string },
    { $set: installedDoc },
    { upsert: true }
  );

  // Step 4: Write sapp.organizations — sponsor role only
  const orgPart = req.authContext.paramId.startsWith('0x')
    ? req.authContext.paramId.slice(2, 22)
    : req.authContext.paramId.slice(0, 20);
  const orgId = `org:${superAppId}:${sponsorRole}:${orgPart}`;

  await sappDb.collection('organizations').updateOne(
    { _id: orgId as unknown as string },
    {
      $set: {
        _id: orgId,
        superAppId,
        role: sponsorRole,
        org: {
          paramId: req.authContext.paramId,
          name: '',
        },
        isSponsorOrg: true,
        status: 'active',
        onboardedAt: now,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  // Step 5: Write sapp.team_rbac_matrix for each SM — full copy from param_definitions
  for (const rbacDoc of rbacMatrixDocs) {
    const doc = rbacDoc as Record<string, unknown>;
    const rbacId = `${superAppId.slice(0, 8)}:${doc.smId as string}`;
    await sappDb.collection('team_rbac_matrix').updateOne(
      { _id: rbacId as unknown as string },
      { $set: { ...doc, _id: rbacId, installedAt: now } },
      { upsert: true }
    );
  }

  // Step 6: Append workspace to param_saas.subdomain_users[caller.userId].subdomains
  await saasDb.collection('subdomain_users').updateOne(
    { userId: req.authContext.userId },
    {
      $addToSet: { subdomains: workspace } as Record<string, unknown>,
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  await ensureAppUserIndexes(sappDbName);

  // Spec response: created installed_superapps document — full copy + install metadata
  return reply.status(201).send(installedDoc);
}

/**
 * GET /superapp
 * Spec §15.4: List all installed superapps.
 */
export async function listInstalledSuperApps(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & { requestContext: RequestContext };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const docs = await wsDb
    .collection('installed_superapps')
    .find({})
    .project({ _id: 1, name: 1, version: 1, sponsor: 1, status: 1, installedAt: 1 })
    .toArray();

  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /superapp/:superAppId
 * Spec §15.4: Full installed_superapps doc + orgs grouped by role.
 */
export async function getInstalledSuperApp(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    requestContext: RequestContext;
  };
  const { workspaceDbName, workspace } = req.requestContext;
  const { superAppId } = request.params;

  if (!workspaceDbName || !workspace) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const wsDb = getDb(workspaceDbName);
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));

  const [superApp, orgsRaw] = await Promise.all([
    wsDb
      .collection('installed_superapps')
      .findOne({ _id: superAppId as unknown as string }),
    sappDb.collection('organizations').find({}).toArray(),
  ]);

  if (!superApp) {
    return reply.status(404).send({ error: 'SuperApp not found' });
  }

  // Group orgs by role — spec says { orgs: { "Consignee": [...], "FF": [...] } }
  const orgs: Record<string, unknown[]> = {};
  for (const org of orgsRaw) {
    const role = (org as Record<string, unknown>).role as string;
    if (!orgs[role]) orgs[role] = [];
    orgs[role].push(org);
  }

  // Spec response: full installed_superapps doc + orgs (no wrapper)
  return reply.send({ ...(superApp as Record<string, unknown>), orgs });
}

/**
 * PUT /superapp/:superAppId/status
 * Spec §15.4: { "_id": "...", "status": "..." }
 */
export async function updateSuperAppStatus(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    requestContext: RequestContext;
  };
  const { workspaceDbName } = req.requestContext;

  if (!workspaceDbName) {
    return reply.status(400).send({ error: 'X-Workspace header required' });
  }

  const { status } = request.body as { status: string };
  const wsDb = getDb(workspaceDbName);

  const result = await wsDb.collection('installed_superapps').findOneAndUpdate(
    { _id: request.params.superAppId as unknown as string },
    { $set: { status, updatedAt: Date.now() } },
    { returnDocument: 'after' }
  );

  if (!result) return reply.status(404).send({ error: 'SuperApp not found' });
  // Spec response: { "_id": "...", "status": "..." }
  return reply.send({ _id: request.params.superAppId, status });
}
