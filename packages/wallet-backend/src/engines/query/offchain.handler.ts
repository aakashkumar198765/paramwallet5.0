import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import {
  resolveDefinitionsDb,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';

interface CollectionParams {
  collectionName: string;
}

interface CollectionKeyParams extends CollectionParams {
  keyValue: string;
}

interface OffchainSmParams {
  offchainSmId: string;
}

/**
 * Verify caller's org participates in this superApp (access check for offchain endpoints).
 * Spec §16.3: Caller's paramId must exist in sapp.organizations.
 */
async function verifyOrgAccess(
  superAppDbName: string,
  callerParamId: string
): Promise<boolean> {
  const sappDb = getDb(superAppDbName);
  const org = await sappDb
    .collection('organizations')
    .findOne({ 'org.paramId': callerParamId });
  return org !== null;
}

/**
 * GET /offchain/registry/:collectionName
 * Spec §16.3: Paginated list with optional field-level filtering.
 * Response: { total, page, limit, records: [...] }
 */
export async function listOffchainRegistry(
  request: FastifyRequest<{ Params: CollectionParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: CollectionParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { superAppDbName } = req.requestContext;

  if (!superAppDbName) {
    return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
  }

  const hasAccess = await verifyOrgAccess(superAppDbName, req.authContext.paramId);
  if (!hasAccess) {
    return reply.status(403).send({ error: 'Organisation not found in this SuperApp' });
  }

  const { collectionName } = request.params;
  const rawQuery = request.query as Record<string, string>;

  // Pagination
  const page = Math.max(1, parseInt(rawQuery.page ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(rawQuery.limit ?? '25', 10)));
  const skip = (page - 1) * limit;

  // Build filter from any extra query params (excluding page and limit)
  const fieldFilter: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rawQuery)) {
    if (k !== 'page' && k !== 'limit') {
      fieldFilter[k] = v;
    }
  }

  const sappDb = getDb(superAppDbName);
  const col = sappDb.collection(`offchain_registry_${collectionName}`);

  const [total, records] = await Promise.all([
    col.countDocuments(fieldFilter),
    col.find(fieldFilter).skip(skip).limit(limit).toArray(),
  ]);

  // Spec §16.3 response: { total, page, limit, records: [...] }
  return reply.send({ total, page, limit, records });
}

/**
 * GET /offchain/registry/:collectionName/:keyValue
 * Spec §16.3: Single record. Key field from offchain_sm_definitions or default to _id.
 * Response: single document (no wrapper). 404 if not found.
 */
export async function getOffchainRegistryItem(
  request: FastifyRequest<{ Params: CollectionKeyParams; Querystring: { keyField?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{
    Params: CollectionKeyParams;
    Querystring: { keyField?: string };
  }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { superAppDbName } = req.requestContext;

  if (!superAppDbName) {
    return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
  }

  const hasAccess = await verifyOrgAccess(superAppDbName, req.authContext.paramId);
  if (!hasAccess) {
    return reply.status(403).send({ error: 'Organisation not found in this SuperApp' });
  }

  const { collectionName, keyValue } = request.params;

  // Spec §16.3: keyField derived from offchain_sm_definitions.states[collectionName].keyField
  const defsDb = getDb(resolveDefinitionsDb());
  let keyField = '_id';
  const smDoc = await defsDb
    .collection('offchain_sm_definitions')
    .findOne({ [`states.${collectionName}`]: { $exists: true } });
  if (smDoc) {
    const stDef = ((smDoc as Record<string, unknown>).states as Record<string, Record<string, unknown>> | undefined)?.[collectionName];
    if (stDef?.keyField) keyField = stDef.keyField as string;
  }

  const sappDb = getDb(superAppDbName);

  const doc = await sappDb
    .collection(`offchain_registry_${collectionName}`)
    .findOne({ [keyField]: keyValue });

  if (!doc) return reply.status(404).send({ error: 'Registry item not found' });
  // Spec response: single document (no wrapper)
  return reply.send(doc);
}

/**
 * GET /offchain/config/:collectionName
 * Spec §16.3: Single versioned config document.
 * Response: single document (no wrapper). 404 if collection empty.
 */
export async function getOffchainConfig(
  request: FastifyRequest<{ Params: CollectionParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: CollectionParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { superAppDbName } = req.requestContext;

  if (!superAppDbName) {
    return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
  }

  const hasAccess = await verifyOrgAccess(superAppDbName, req.authContext.paramId);
  if (!hasAccess) {
    return reply.status(403).send({ error: 'Organisation not found in this SuperApp' });
  }

  const { collectionName } = request.params;
  const sappDb = getDb(superAppDbName);
  const doc = await sappDb
    .collection(`offchain_config_${collectionName}`)
    .findOne({});

  if (!doc) return reply.status(404).send({ error: 'Config not found' });
  // Spec response: single document (no wrapper)
  return reply.send(doc);
}

/**
 * GET /offchain/definitions
 * Spec §16.3: Array of offchain_sm_definitions filtered by linked superAppId.
 * Response: plain array (no wrapper).
 */
export async function listOffchainDefinitions(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { superAppDbName, superAppId } = req.requestContext;

  if (!superAppDbName || !superAppId) {
    return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
  }

  const hasAccess = await verifyOrgAccess(superAppDbName, req.authContext.paramId);
  if (!hasAccess) {
    return reply.status(403).send({ error: 'Organisation not found in this SuperApp' });
  }

  const defsDb = getDb(resolveDefinitionsDb());
  // Spec §16.3: filter by linkedSuperApps containing superAppId
  const docs = await defsDb
    .collection('offchain_sm_definitions')
    .find({ linkedSuperApps: superAppId })
    .toArray();

  // Spec response: array (no wrapper)
  return reply.send(docs);
}

/**
 * GET /offchain/definitions/:offchainSmId
 * Spec §16.3: { sm, schemas } — SM definition + associated schema definitions.
 */
export async function getOffchainDefinition(
  request: FastifyRequest<{ Params: OffchainSmParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: OffchainSmParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
  };
  const { superAppDbName } = req.requestContext;

  if (!superAppDbName) {
    return reply.status(400).send({ error: 'X-Workspace and X-SuperApp-ID headers required' });
  }

  const hasAccess = await verifyOrgAccess(superAppDbName, req.authContext.paramId);
  if (!hasAccess) {
    return reply.status(403).send({ error: 'Organisation not found in this SuperApp' });
  }

  const defsDb = getDb(resolveDefinitionsDb());
  const sm = await defsDb
    .collection('offchain_sm_definitions')
    .findOne({ _id: request.params.offchainSmId as unknown as string });

  if (!sm) return reply.status(404).send({ error: 'Offchain SM definition not found' });

  // Collect all schema IDs referenced by this SM's states
  const smDoc = sm as Record<string, unknown>;
  const smStates = (smDoc.states ?? {}) as Record<string, Record<string, unknown>>;
  const schemaIds = new Set<string>();
  for (const stateDef of Object.values(smStates)) {
    const schemaId = stateDef.schema as string | undefined;
    if (schemaId) schemaIds.add(schemaId);
  }

  // Fetch associated schema definitions
  const schemas = schemaIds.size > 0
    ? await defsDb
        .collection('offchain_schema_definitions')
        .find({ _id: { $in: Array.from(schemaIds) as unknown[] } })
        .toArray()
    : [];

  // Spec §16.3 response: { sm, schemas: [...] }
  return reply.send({ sm, schemas });
}
