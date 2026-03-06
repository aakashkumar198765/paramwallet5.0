import { createHash } from 'crypto';
import { anyCol } from '../../db/mongo.js';
import {
  resolveSuperAppDbName,
  resolveWorkspaceDb,
  resolveSaasDb,
} from '../../db/resolver.js';
import { logger } from '../../logger.js';

export interface PartnerLifecycleEvent {
  workspace: string;
  superAppId: string;
  role: string;
  status: 'Active' | 'Inactive';
  org: {
    paramId: string;
    name: string;
    partnerId: string;
    taxId?: string;
    legalName?: string;
    telephone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  orgAdmin?: string;
  plants?: Array<{ code: string; name: string; location?: Record<string, string> }>;
  adminUserId?: string;
}

/**
 * PartnerLifecycleHandler
 * Called by:
 *   1. NATS subscriber when Partner SM substate reaches Active/Inactive
 *   2. REST override: POST /superapp/:superAppId/partners/onboard
 *
 * On Partner:Active  → writes organizations, plants, subdomain_users, app_users
 * On Partner:Inactive → updates organizations + app_users to suspended
 */
export async function partnerLifecycleHandler(event: PartnerLifecycleEvent): Promise<void> {
  const { workspace, superAppId, role, status, org, orgAdmin, plants = [] } = event;

  const sappDbName = resolveSuperAppDbName(workspace, superAppId);
  const wsDbName = resolveWorkspaceDb(workspace);
  const saasDbName = resolveSaasDb();
  const now = Date.now();

  const orgParamIdSlice = org.paramId.startsWith('0x')
    ? org.paramId.slice(2, 22)
    : org.paramId.slice(0, 20);
  const orgId = `org:${superAppId}:${role}:${orgParamIdSlice}:${org.partnerId}`;

  if (status === 'Active') {
    // Upsert organization
    await anyCol(sappDbName, 'organizations').updateOne(
      { _id: orgId },
      {
        $set: { superAppId, role, isSponsorOrg: false, org, orgAdmin: orgAdmin ?? null, status: 'active', updatedAt: now },
        $setOnInsert: { onboardedAt: now },
      },
      { upsert: true },
    );

    // Upsert partner plants in workspace DB
    for (const plant of plants) {
      await anyCol(wsDbName, 'plants').updateOne(
        { _id: `plant:${plant.code}` },
        {
          $set: {
            code: plant.code,
            name: plant.name,
            paramId: org.paramId,
            location: plant.location ?? {},
            isActive: true,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
    }

    // Upsert org admin user if provided
    if (orgAdmin) {
      const adminUserId = createHash('sha256').update(orgAdmin.toLowerCase()).digest('hex');
      const appUserId = `user:${superAppId}:${adminUserId}:${org.partnerId}`;

      await anyCol(sappDbName, 'app_users').updateOne(
        { _id: appUserId },
        {
          $set: {
            superAppId,
            userId: adminUserId,
            email: orgAdmin,
            orgParamId: org.paramId,
            role,
            partnerId: org.partnerId,
            plantTeams: plants.map((p) => ({ plant: p.code, teams: [role] })),
            isOrgAdmin: true,
            status: 'active',
            updatedAt: now,
            addedBy: 'system',
          },
          $setOnInsert: { addedAt: now },
        },
        { upsert: true },
      );

      // Add to global subdomain_users
      await anyCol(saasDbName, 'subdomain_users').updateOne(
        { userId: adminUserId },
        {
          $set: { email: orgAdmin, paramId: org.paramId, updatedAt: now },
          $addToSet: { subdomains: workspace },
          $setOnInsert: { _id: `user:${adminUserId}`, name: '', subdomains: [], createdAt: now },
        },
        { upsert: true },
      );
    }

    logger.info({ orgId, workspace, superAppId }, 'Partner activated');
  } else if (status === 'Inactive') {
    // Suspend organization
    await anyCol(sappDbName, 'organizations').updateOne(
      { _id: orgId },
      { $set: { status: 'suspended', updatedAt: now } },
    );

    // Suspend all app_users for this org + partnerId in this SuperApp
    await anyCol(sappDbName, 'app_users').updateMany(
      { orgParamId: org.paramId, partnerId: org.partnerId, superAppId },
      { $set: { status: 'suspended', updatedAt: now } },
    );

    logger.info({ orgId, workspace, superAppId }, 'Partner suspended');
  }
}

/**
 * Subscribes to NATS Partner SM lifecycle events.
 * Subject pattern: param.syncfactory.{workspace}.{superAppId}.create
 * where smType = "@sm/Partner"
 */
export async function startPartnerNatsSubscriber(
  workspace: string,
  superAppId: string,
): Promise<void> {
  try {
    const { getNatsClient } = await import('../../nats/client.js');
    const nc = getNatsClient();
    const subject = `param.syncfactory.${workspace}.${superAppId}.create`;
    const sub = nc.subscribe(subject);

    logger.info({ subject }, 'Partner NATS subscriber started');

    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(new TextDecoder().decode(msg.data)) as Record<string, unknown>;
          if (data['smType'] !== '@sm/Partner') continue;

          const subState = data['subState'] as string | undefined;
          const status = subState === 'Active' ? 'Active'
            : subState === 'Inactive' ? 'Inactive'
            : null;

          if (!status) continue;

          await partnerLifecycleHandler({
            workspace,
            superAppId,
            role: data['role'] as string,
            status,
            org: data['org'] as PartnerLifecycleEvent['org'],
            orgAdmin: data['orgAdmin'] as string | undefined,
            plants: data['plants'] as PartnerLifecycleEvent['plants'],
          });
        } catch (err) {
          logger.error({ err }, 'Partner NATS message processing error');
        }
      }
    })().catch((err) => logger.error({ err }, 'Partner NATS subscriber loop error'));
  } catch {
    logger.warn('NATS not available — Partner lifecycle subscription skipped');
  }
}
