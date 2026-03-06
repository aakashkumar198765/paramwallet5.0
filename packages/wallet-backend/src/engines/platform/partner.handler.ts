import { FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { Document } from 'mongodb';
import { getDb } from '../../db/mongo.js';
import {
  resolveDomainDb,
  resolveWorkspaceDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { subscribe } from '../../nats/client.js';
import { logger } from '../../logger.js';
import { OnboardPartnerSchema } from './schemas.js';
import type { RequestContext } from '../../middleware/request-context.js';

// ── Partner SM document field types (from spec §15.5.1) ──────────────────────

interface PlantEntry {
  C_PlantID: string;
  C_PlantName: string;
  C_PlantLocation?: string;
}

interface PartnerSmDoc {
  _local?: { state?: string; subState?: string };
  Contact?: {
    C_Identifier?: string;   // → org.paramId
    C_Organization?: string; // → org.name
    C_InternalID?: string;   // → org.partnerId (LSP/vendor code)
    C_TaxID?: string;
    C_LegalName?: string;
    C_Telephone?: string;
    C_StreetAddress?: string;
    C_City?: string;
    C_Region?: string;
    C_PostalCode?: string;
    C_Country?: string;
    C_PenID?: string;        // → pennId
  };
  Invitee?: {
    C_Email?: string;        // → orgAdmin
    C_Category?: string;     // → role
    C_InternalID?: string;
    C_Plants?: PlantEntry[];
    C_Identifier?: string;
    C_PenID?: string;
  };
  _chain?: { superAppId?: string; workspace?: string };
  smType?: string;
}

/**
 * Core partner lifecycle handler — called both from NATS and REST override.
 * Spec §15.5.1: Partner:Active and Partner:Inactive DB writes.
 */
export async function partnerLifecycleHandler(
  workspace: string,
  superAppId: string,
  smDoc: PartnerSmDoc
): Promise<void> {
  const subState = smDoc._local?.subState;
  const contact = smDoc.Contact ?? {};
  const invitee = smDoc.Invitee ?? {};

  const orgParamId = contact.C_Identifier ?? '';
  const orgName = contact.C_Organization ?? '';
  const partnerId = contact.C_InternalID ?? '';
  const email = invitee.C_Email ?? '';
  const role = invitee.C_Category ?? 'Partner';
  const plants: PlantEntry[] = invitee.C_Plants ?? [];

  if (!orgParamId || !email) {
    logger.warn({ workspace, superAppId, subState }, 'Partner SM doc missing required fields');
    return;
  }

  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const wsDb = getDb(resolveWorkspaceDb(workspace));
  const saasDb = getDb(resolveDomainDb());
  const now = Date.now();

  if (subState === 'Active') {
    // Conflict check: same role + same org.partnerId → skip if already exists
    const orgPart = orgParamId.startsWith('0x')
      ? orgParamId.slice(2, 22)
      : orgParamId.slice(0, 20);

    // Spec _id format: "org:{superAppId}:{role}:{paramId[2:22]}:{vendorId}"
    const vendorId = partnerId || contact.C_InternalID || '';
    const orgId = `org:${superAppId}:${role}:${orgPart}:${vendorId}`;

    // 1. Upsert sapp.organizations
    await sappDb.collection('organizations').updateOne(
      { _id: orgId as unknown as string },
      {
        $set: {
          _id: orgId,
          superAppId,
          role,
          org: {
            paramId: orgParamId,
            name: orgName,
            partnerId: vendorId || undefined,
            taxId: contact.C_TaxID || undefined,
            legalName: contact.C_LegalName || undefined,
            telephone: contact.C_Telephone || undefined,
            address: {
              street: contact.C_StreetAddress || undefined,
              city: contact.C_City || undefined,
              state: contact.C_Region || undefined,
              postalCode: contact.C_PostalCode || undefined,
              country: contact.C_Country || undefined,
            },
          },
          orgAdmin: email,
          isSponsorOrg: false,
          status: 'active',
          onboardedAt: now,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now } as unknown as Document,
      },
      { upsert: true }
    );

    // 2. Upsert plants in workspace DB (idempotent)
    for (const plant of plants) {
      if (!plant.C_PlantID) continue;
      await wsDb.collection('plants').updateOne(
        { _id: `plant:${plant.C_PlantID}` as unknown as string },
        {
          $setOnInsert: {
            _id: `plant:${plant.C_PlantID}`,
            code: plant.C_PlantID,
            name: plant.C_PlantName,
            location: plant.C_PlantLocation ? { city: plant.C_PlantLocation } : undefined,
            orgParamId,
            isActive: true,
            createdAt: now,
          } as unknown as Document,
        },
        { upsert: true }
      );
    }

    // 3. Upsert param_saas.subdomain_users
    const userId = createHash('sha256').update(email.toLowerCase()).digest('hex');
    await saasDb.collection('subdomain_users').updateOne(
      { _id: `user:${userId}` as unknown as string },
      {
        $setOnInsert: { _id: `user:${userId}`, userId, email, createdAt: now } as unknown as Document,
        $addToSet: { workspaces: workspace } as unknown as Document,
        $set: { orgParamId, updatedAt: now },
      },
      { upsert: true }
    );

    // 4. Upsert sapp.app_users — one doc per (superAppId, userId, partnerId)
    // Spec _id: "user:{superAppId}:{userId}:{vendorId}"
    const appUserId = `user:${superAppId}:${userId}:${vendorId}`;
    await sappDb.collection('app_users').updateOne(
      { _id: appUserId as unknown as string },
      {
        $set: {
          _id: appUserId,
          userId,
          email,
          orgParamId,
          superAppId,
          role,
          partnerId: vendorId || undefined,
          plantTeams: plants.map(p => ({
            plant: p.C_PlantID,
            teams: [role],  // default team = role name
          })),
          isOrgAdmin: true,
          status: 'active',
          addedBy: 'system',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now } as unknown as Document,
      },
      { upsert: true }
    );

    logger.info({ workspace, superAppId, orgId, email, role }, 'Partner lifecycle: activated');

  } else if (subState === 'Inactive') {
    // Spec §15.5.1 Partner:Inactive writes
    const vendorId = partnerId || '';

    // 1. organizations: suspend the specific vendor record
    await sappDb.collection('organizations').updateOne(
      { 'org.paramId': orgParamId, role, 'org.partnerId': vendorId },
      { $set: { status: 'suspended', updatedAt: now } }
    );

    // 2. app_users: suspend only the app_users for this vendor context
    await sappDb.collection('app_users').updateMany(
      { orgParamId, partnerId: vendorId },
      { $set: { status: 'suspended', updatedAt: now } }
    );

    // 3. plants — unchanged
    // 4. subdomain_users — unchanged
    logger.info({ workspace, superAppId, orgParamId }, 'Partner lifecycle: suspended');
  }
}

/**
 * Subscribe to NATS partner lifecycle events for a given workspace + superApp.
 */
export async function subscribeToPartnerLifecycle(
  workspace: string,
  superAppId: string
): Promise<() => void> {
  const subject = `param.syncfactory.${workspace}.${superAppId}.create`;

  return subscribe(subject, async (data: unknown) => {
    const smDoc = data as PartnerSmDoc;
    if (smDoc.smType !== '@sm/Partner') return;
    await partnerLifecycleHandler(workspace, superAppId, smDoc);
  });
}

/**
 * REST override: POST /superapp/:superAppId/partners/onboard
 * Spec §15.5: admin override / bootstrap tool.
 * Body: { role, org: {...}, orgAdmin, plants: [{code, name, location?}] }
 */
export async function handlePartnerOnboardRest(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const body = OnboardPartnerSchema.parse(request.body);
  const superAppId = request.params.superAppId;

  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const wsDb = getDb(resolveWorkspaceDb(workspace));
  const saasDb = getDb(resolveDomainDb());
  const now = Date.now();

  const { role, org, orgAdmin, plants } = body;

  // Conflict check: same role + same org.partnerId → 409
  const existing = await sappDb.collection('organizations').findOne({
    role,
    'org.partnerId': org.partnerId,
  });
  if (existing) {
    return reply.status(409).send({ error: 'Partner with this role and partnerId already exists' });
  }

  // Build org _id: "org:{superAppId}:{role}:{paramId[2:22]}:{partnerId}"
  const orgPart = org.paramId.startsWith('0x')
    ? org.paramId.slice(2, 22)
    : org.paramId.slice(0, 20);
  const orgId = `org:${superAppId}:${role}:${orgPart}:${org.partnerId}`;

  // 1. Insert sapp.organizations
  const orgDoc = {
    _id: orgId,
    superAppId,
    role,
    org: {
      paramId: org.paramId,
      name: org.name,
      partnerId: org.partnerId,
      taxId: org.taxId,
      legalName: org.legalName,
      telephone: org.telephone,
      address: org.address,
    },
    orgAdmin,
    isSponsorOrg: false,
    status: 'active',
    onboardedAt: now,
    updatedAt: now,
    createdAt: now,
  };
  await sappDb.collection('organizations').insertOne(orgDoc as unknown as Document);

  // 2. Upsert plants (idempotent)
  for (const plant of plants) {
    await wsDb.collection('plants').updateOne(
      { _id: `plant:${plant.code}` as unknown as string },
      {
        $setOnInsert: {
          _id: `plant:${plant.code}`,
          code: plant.code,
          name: plant.name,
          location: plant.location ? { city: plant.location } : undefined,
          isActive: true,
          createdAt: now,
        } as unknown as Document,
      },
      { upsert: true }
    );
  }

  // 3. Upsert subdomain_users
  const userId = createHash('sha256').update(orgAdmin.toLowerCase()).digest('hex');
  await saasDb.collection('subdomain_users').updateOne(
    { _id: `user:${userId}` as unknown as string },
    {
      $setOnInsert: { _id: `user:${userId}`, userId, email: orgAdmin, createdAt: now } as unknown as Document,
      $addToSet: { workspaces: workspace } as unknown as Document,
      $set: { orgParamId: org.paramId, updatedAt: now },
    },
    { upsert: true }
  );

  // 4. Upsert app_users — org admin
  const appUserId = `user:${superAppId}:${userId}:${org.partnerId}`;
  await sappDb.collection('app_users').insertOne({
    _id: appUserId,
    userId,
    email: orgAdmin,
    orgParamId: org.paramId,
    superAppId,
    role,
    partnerId: org.partnerId,
    plantTeams: plants.map(p => ({ plant: p.code, teams: [role] })),
    isOrgAdmin: true,
    status: 'active',
    addedBy: 'admin',
    createdAt: now,
    updatedAt: now,
  } as unknown as Document);

  // Spec response: created organizations document
  return reply.status(201).send(orgDoc);
}

/**
 * GET /superapp/:superAppId/org/profile
 * Spec §15.5: Caller's org profile.
 */
export async function getOrgProfile(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    authContext: { paramId: string };
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const superAppId = request.params.superAppId;
  const sappDb = getDb(resolveSuperAppDbName(workspace, superAppId));
  const callerParamId = req.authContext.paramId;
  const partnerId = (request.query as Record<string, string>).partnerId;

  if (partnerId) {
    const org = await sappDb.collection('organizations').findOne({
      'org.paramId': callerParamId,
      'org.partnerId': partnerId,
    });
    if (!org) return reply.status(404).send({ error: 'Org not found' });
    return reply.send(org);
  }

  const orgs = await sappDb
    .collection('organizations')
    .find({ 'org.paramId': callerParamId })
    .toArray();

  if (orgs.length === 0) return reply.status(404).send({ error: 'Org not found' });
  return reply.send(orgs.length === 1 ? orgs[0] : orgs);
}

/**
 * GET /superapp/:superAppId/orgs
 * Spec §15.5: All orgs for this SuperApp.
 */
export async function listOrgs(
  request: FastifyRequest<{ Params: { superAppId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string } }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const orgs = await sappDb.collection('organizations').find({}).toArray();
  return reply.send(orgs);
}

/**
 * GET /superapp/:superAppId/orgs/:role
 * Spec §15.5: All orgs for a specific role.
 */
export async function listOrgsByRole(
  request: FastifyRequest<{ Params: { superAppId: string; role: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string; role: string } }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));
  const orgs = await sappDb
    .collection('organizations')
    .find({ role: request.params.role })
    .toArray();
  return reply.send(orgs);
}

/**
 * PUT /superapp/:superAppId/orgs/:role/:paramId/status
 * Spec §15.5: Update org status.
 */
export async function updateOrgStatus(
  request: FastifyRequest<{ Params: { superAppId: string; role: string; paramId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { superAppId: string; role: string; paramId: string } }> & {
    requestContext: RequestContext;
  };
  const { workspace } = req.requestContext;
  if (!workspace) return reply.status(400).send({ error: 'X-Workspace header required' });

  const { status } = request.body as { status: string };
  const sappDb = getDb(resolveSuperAppDbName(workspace, request.params.superAppId));

  await sappDb.collection('organizations').updateMany(
    { 'org.paramId': request.params.paramId, role: request.params.role },
    { $set: { status, updatedAt: Date.now() } }
  );

  return reply.send({ role: request.params.role, paramId: request.params.paramId, status });
}
