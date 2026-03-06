import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import {
  resolveDefinitionsDb,
  resolveDomainDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { ensureAppUserIndexes, ensureOrganizationIndexes } from '../../db/indexes.js';
import { InstallSuperAppSchema } from './schemas.js';
import { z } from 'zod';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

const ManifestSchema = z.object({
  roles: z.array(z.object({
    role: z.string().min(1),
    paramId: z.string().min(1),
    orgName: z.string().min(1),
    orgAdmin: z.string().email(),
    // B-5/B-6 fix: partnerId field added so partner orgs get the 5-part _id format
    // "org:{superAppId}:{role}:{paramId[2:22]}:{partnerId}" per spec §9.1
    partnerId: z.string().optional(),
    users: z.array(z.object({
      email: z.string().email(),
      name: z.string().optional(),
      plantTeams: z.array(z.object({
        plant: z.string(),
        teams: z.array(z.string()),
      })).default([]),
      isOrgAdmin: z.boolean().default(false),
    })).default([]),
  })),
});

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

  // MED-10/LOW-2 fix: use caller-provided orgName if available; fallback to user name from subdomain_users
  // (subdomain_users.name is the user's personal name, not org name — caller should provide orgName)
  let sponsorOrgName = body.orgName ?? '';
  if (!sponsorOrgName) {
    const installerRecord = await saasDb.collection('subdomain_users').findOne({ userId: req.authContext.userId });
    sponsorOrgName = (installerRecord as Record<string, unknown> | null)?.name as string ?? '';
  }

  // Step 3: Write {subdomain}.installed_superapps — full copy of superapp_definitions + install metadata
  const installedDoc = {
    ...defRecord,
    _id: superAppId,
    paramId: req.authContext.paramId,
    installedBy: req.authContext.userId,
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
          name: sponsorOrgName,
        },
        orgAdmin: null,
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
  // HIGH-3 fix: Use _id-based lookup and include $setOnInsert with all required fields
  // so that if this is the first access the document is created with proper schema.
  const callerSubdUserDocId = `user:${req.authContext.userId}`;
  await saasDb.collection('subdomain_users').updateOne(
    { _id: callerSubdUserDocId as unknown as string },
    {
      $setOnInsert: {
        _id: callerSubdUserDocId,
        userId: req.authContext.userId,
        email: req.authContext.email,
        createdAt: now,
      } as unknown as Document,
      $addToSet: { subdomains: workspace } as Record<string, unknown>,
      $set: { updatedAt: now },
    },
    { upsert: true }
  );

  await ensureAppUserIndexes(sappDbName);
  await ensureOrganizationIndexes(sappDbName);

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
 * POST /superapp/:superAppId/manifest
 * Spec §15.8: Atomic batch onboard orgs + assign users.
 * Guard: Workspace admin.
 */
export async function manifestSuperApp(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const body = ManifestSchema.parse(request.body);
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { superAppId } = request.params;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const saasDb = getDb(resolveDomainDb());
  const now = Date.now();

  const onboarded: Array<{ role: string; paramId: string; orgName: string }> = [];
  const usersCreated: Array<{ email: string; userId: string }> = [];
  const createdOrgIds: string[] = [];
  const createdAppUserIds: string[] = [];

  try {
    for (const entry of body.roles) {
      const { role, paramId: orgParamId, orgName, orgAdmin, users, partnerId } = entry;

      const orgPart = orgParamId.startsWith('0x')
        ? orgParamId.slice(2, 22)
        : orgParamId.slice(0, 20);
      // B-5 fix: use 5-part _id for partner roles (partnerId present), 4-part for sponsor
      const orgId = partnerId
        ? `org:${superAppId}:${role}:${orgPart}:${partnerId}`
        : `org:${superAppId}:${role}:${orgPart}`;

      // 1. Upsert org in sapp.organizations
      await sappDb.collection('organizations').updateOne(
        { _id: orgId as unknown as string },
        {
          $set: {
            _id: orgId,
            superAppId,
            role,
            org: { paramId: orgParamId, name: orgName, ...(partnerId ? { partnerId } : {}) },
            orgAdmin,
            isSponsorOrg: !partnerId,
            status: 'active',
            onboardedAt: now,
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now } as unknown as Document,
        },
        { upsert: true }
      );
      createdOrgIds.push(orgId);
      onboarded.push({ role, paramId: orgParamId, orgName });

      // 2. Upsert orgAdmin in subdomain_users
      const adminUserId = createHash('sha256').update(orgAdmin.toLowerCase()).digest('hex');
      const adminSubdUserDocId = `user:${adminUserId}`;
      await saasDb.collection('subdomain_users').updateOne(
        { _id: adminSubdUserDocId as unknown as string },
        {
          $setOnInsert: { _id: adminSubdUserDocId, userId: adminUserId, email: orgAdmin, createdAt: now } as unknown as Document,
          $addToSet: { subdomains: workspace } as unknown as Document,
          $set: { orgParamId, updatedAt: now },
        },
        { upsert: true }
      );

      // 3. Assign users
      for (const user of users) {
        const userId = createHash('sha256').update(user.email.toLowerCase()).digest('hex');
        // B-6 fix: use vendor _id format when partnerId present per spec §9.2
        const docId = partnerId
          ? `user:${superAppId}:${userId}:${partnerId}`
          : `user:${superAppId}:${userId}`;

        await sappDb.collection('app_users').updateOne(
          { _id: docId as unknown as string },
          {
            $set: {
              _id: docId,
              userId,
              email: user.email,
              name: user.name ?? null,
              superAppId,
              role,
              orgParamId,
              ...(partnerId ? { partnerId } : {}),
              plantTeams: user.plantTeams,
              isOrgAdmin: user.isOrgAdmin,
              status: 'active',
              addedAt: now,
              addedBy: req.authContext.paramId,
              updatedAt: now,
            },
            $setOnInsert: { createdAt: now } as unknown as Document,
          },
          { upsert: true }
        );
        createdAppUserIds.push(docId);

        const subdUserDocId = `user:${userId}`;
        await saasDb.collection('subdomain_users').updateOne(
          { _id: subdUserDocId as unknown as string },
          {
            $setOnInsert: { _id: subdUserDocId, userId, email: user.email, createdAt: now } as unknown as Document,
            $addToSet: { subdomains: workspace } as unknown as Document,
            $set: { updatedAt: now },
          },
          { upsert: true }
        );

        usersCreated.push({ email: user.email, userId });
      }
    }
  } catch (err) {
    // Rollback: delete all created docs on failure
    if (createdOrgIds.length > 0) {
      await sappDb.collection('organizations').deleteMany({ _id: { $in: createdOrgIds as unknown[] } });
    }
    if (createdAppUserIds.length > 0) {
      await sappDb.collection('app_users').deleteMany({ _id: { $in: createdAppUserIds as unknown[] } });
    }
    throw err;
  }

  return reply.status(201).send({ onboarded, users: usersCreated });
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
