import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { anyCol } from '../../db/mongo.js';
import { resolveDefinitionsDb } from '../../db/resolver.js';

/**
 * Access check for offchain routes:
 * Caller's paramId must exist in sapp.organizations.
 * No L1/L2/L3 per-org filtering — offchain data is shared across all orgs.
 */
async function requireOrgRegistered(
  superAppDbName: string,
  callerOrgParamId: string,
  superAppId: string,
): Promise<boolean> {
  const count = await anyCol(superAppDbName, 'organizations')
    .countDocuments({ 'org.paramId': callerOrgParamId, superAppId });
  return count > 0;
}

// ── Registry ──────────────────────────────────────────────────────────────────

async function getRegistry(
  request: FastifyRequest<{ Params: { collectionName: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { collectionName } = request.params;
  const { superAppDbName, superAppId, workspace } = request.requestContext;
  const { paramId: callerOrgParamId } = request.authContext;

  if (!superAppDbName || !superAppId || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  if (!(await requireOrgRegistered(superAppDbName, callerOrgParamId, superAppId))) {
    return reply.code(403).send({ error: 'Organization not registered in this SuperApp' });
  }

  const docs = await anyCol(superAppDbName, `offchain_registry_${collectionName}`)
    .find({})
    .toArray();

  return reply.send({ collection: collectionName, records: docs });
}

async function getRegistryRecord(
  request: FastifyRequest<{ Params: { collectionName: string; keyValue: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { collectionName, keyValue } = request.params;
  const { superAppDbName, superAppId, workspace } = request.requestContext;
  const { paramId: callerOrgParamId } = request.authContext;

  if (!superAppDbName || !superAppId || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  if (!(await requireOrgRegistered(superAppDbName, callerOrgParamId, superAppId))) {
    return reply.code(403).send({ error: 'Organization not registered in this SuperApp' });
  }

  // Get keyField from offchain_sm_definitions to query by the right field
  const defsDbName = resolveDefinitionsDb();
  const offchainSmDefs = await anyCol(defsDbName, 'offchain_sm_definitions').find({}).toArray();
  let keyField = '_id';
  for (const def of offchainSmDefs) {
    const states = def['states'] as Record<string, Record<string, unknown>> | undefined ?? {};
    for (const state of Object.values(states)) {
      if (state['collection'] === `offchain_registry_${collectionName}`) {
        keyField = state['keyField'] as string ?? '_id';
        break;
      }
    }
  }

  const doc = await anyCol(superAppDbName, `offchain_registry_${collectionName}`)
    .findOne({ [keyField]: keyValue });

  if (!doc) return reply.code(404).send({ error: 'Record not found' });
  return reply.send(doc);
}

// ── Config ────────────────────────────────────────────────────────────────────

async function getConfig(
  request: FastifyRequest<{ Params: { collectionName: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { collectionName } = request.params;
  const { superAppDbName, superAppId, workspace } = request.requestContext;
  const { paramId: callerOrgParamId } = request.authContext;

  if (!superAppDbName || !superAppId || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  if (!(await requireOrgRegistered(superAppDbName, callerOrgParamId, superAppId))) {
    return reply.code(403).send({ error: 'Organization not registered in this SuperApp' });
  }

  const doc = await anyCol(superAppDbName, `offchain_config_${collectionName}`).findOne({});

  if (!doc) return reply.code(404).send({ error: 'Config not found' });
  return reply.send(doc);
}

// ── OffChain Definitions ──────────────────────────────────────────────────────

async function listOffchainDefinitions(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const docs = await anyCol(resolveDefinitionsDb(), 'offchain_sm_definitions').find({}).toArray();
  return reply.send({ definitions: docs });
}

async function getOffchainDefinition(
  request: FastifyRequest<{ Params: { offchainSmId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const doc = await anyCol(resolveDefinitionsDb(), 'offchain_sm_definitions')
    .findOne({ _id: request.params.offchainSmId });

  if (!doc) return reply.code(404).send({ error: 'OffChain SM definition not found' });
  return reply.send(doc);
}

export async function offchainHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { collectionName: string } }>('/offchain/registry/:collectionName', getRegistry);
  app.get<{ Params: { collectionName: string; keyValue: string } }>('/offchain/registry/:collectionName/:keyValue', getRegistryRecord);
  app.get<{ Params: { collectionName: string } }>('/offchain/config/:collectionName', getConfig);
  app.get('/offchain/definitions', listOffchainDefinitions);
  app.get<{ Params: { offchainSmId: string } }>('/offchain/definitions/:offchainSmId', getOffchainDefinition);
}
