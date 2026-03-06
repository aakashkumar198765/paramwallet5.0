import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Document } from 'mongodb';
import { anyCol, getDb } from '../../db/mongo.js';
import {
  resolveOrgPartitionDbName,
  resolveDefinitionsDb,
} from '../../db/resolver.js';
import { DocumentListQuerySchema } from './schemas.js';
import {
  resolveAppUserContext,
  resolveAllUserPlants,
  passesPlantFilter,
  resolveDocumentAccess,
  buildPartnerIdFilter,
  type TeamRbacMatrix,
} from './rbac-filter.js';
import { buildFieldWhitelist, buildSchemaFilter, type SchemaDefinition } from './schema-filter.js';
import { computeActions } from './actions.handler.js';
import { computeDiff } from './chain.handler.js';

/**
 * GET /documents
 * 10-step algorithm:
 *  1. Resolve Org Partition DB
 *  2. Collect all user plants
 *  3. Determine which SM collections to query (from smId param or all sm_* collections)
 *  4. L1 query: find docs in org partition
 *  5. Plant filter
 *  6. Partner ID filter (vendor only)
 *  7. Apply dynamic schema filters (validated against whitelist)
 *  8. Per-doc L2 + L3 RBAC
 *  9. Paginate
 * 10. Optionally compute actions / diff inline
 */
async function listDocuments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const query = DocumentListQuerySchema.parse(request.query);
  const rawFilter = request.query as Record<string, string>;

  const { superAppId, superAppDbName, workspace } = request.requestContext;
  const { userId, paramId: callerOrgParamId } = request.authContext;
  const { role } = request.platformContext;

  if (!superAppId || !superAppDbName || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  // Step 1: Resolve org partition DB
  const portal = request.headers['x-portal'] as string | undefined ?? role;
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);
  const defsDbName = resolveDefinitionsDb();

  // Step 2: Collect all user plants (used for plant-based RBAC in per-doc filtering)
  const appUsersCol = anyCol(superAppDbName, 'app_users');
  await resolveAllUserPlants(appUsersCol, userId, superAppId, callerOrgParamId);

  // Step 3: Determine SM collection name(s)
  let smCollections: string[];
  if (query.smId) {
    const smDef = await anyCol(defsDbName, 'onchain_sm_definitions').findOne({ _id: query.smId });
    if (!smDef) return reply.code(404).send({ error: 'SM definition not found' });
    const startAt = smDef['startAt'] as string;
    smCollections = [`sm_${startAt}_${query.smId.replace('public:', '').slice(0, 6)}`];
  } else {
    // List all sm_* collections in org partition DB
    const colNames = await getDb(orgPartDbName).listCollections({ name: /^sm_/ }).toArray();
    smCollections = colNames.map((c) => c.name);
  }

  if (smCollections.length === 0) {
    return reply.send({ total: 0, page: query.page, limit: query.limit, documents: [] });
  }

  // Load team_rbac_matrix (once per request, reused for all docs)
  const rbacMatrixId = query.smId
    ? `${superAppId.slice(0, 8)}:${query.smId}`
    : null;
  const teamRbacMatrix = rbacMatrixId
    ? (await anyCol(superAppDbName, 'team_rbac_matrix').findOne({ _id: rbacMatrixId }) as TeamRbacMatrix | null)
    : null;

  // Step 4-6: Base filter (state + phase + partner ID)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseFilter: Record<string, any> = {};
  if (query.state) baseFilter['_local.state'] = query.state;
  if (query.subState) baseFilter['_local.subState'] = query.subState;
  if (query.phase) baseFilter['_local.phase'] = query.phase;

  const appUserForFilter = await resolveAppUserContext(
    appUsersCol, userId, superAppId, callerOrgParamId, {},
  );
  const callerIsSponsor = !appUserForFilter?.partnerId;
  const partnerFilter = buildPartnerIdFilter(role, callerIsSponsor, query.partner_id);
  if (partnerFilter) Object.assign(baseFilter, partnerFilter);

  // Step 7: Dynamic schema filters
  const schemaFilterParams: Record<string, string> = {};
  for (const [key, val] of Object.entries(rawFilter)) {
    if (key.startsWith('filter[') && key.endsWith(']')) {
      schemaFilterParams[key.slice(7, -1)] = val as string;
    }
  }

  let schemaFilter: Document = {};
  if (Object.keys(schemaFilterParams).length > 0 && query.smId) {
    const smDef = await anyCol(defsDbName, 'onchain_sm_definitions').findOne({ _id: query.smId });
    if (smDef) {
      const schemaId = smDef['states']?.[query.state ?? '']?.['schema'] as string | undefined;
      if (schemaId) {
        const schemaDef = await anyCol(defsDbName, 'onchain_schema_definitions')
          .findOne({ _id: schemaId }) as SchemaDefinition | null;
        if (schemaDef) {
          const whitelist = buildFieldWhitelist(schemaDef);
          schemaFilter = buildSchemaFilter(schemaFilterParams, whitelist, schemaDef);
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fullFilter: Record<string, any> = { ...baseFilter, ...schemaFilter };

  // Cursor-based pagination
  if (query.cursor_timestamp && query.cursor_id) {
    fullFilter['$or'] = [
      { '_local.timestamp': { $lt: query.cursor_timestamp } },
      {
        '_local.timestamp': query.cursor_timestamp,
        '_id': { $lt: query.cursor_id },
      },
    ];
  }

  // Step 8: Query + RBAC filter + Step 9: Paginate
  const allResults: Array<{ doc: Document; access: string }> = [];
  const skip = query.cursor_timestamp ? 0 : (query.page - 1) * query.limit;
  const fetchLimit = query.limit * 3;

  for (const colName of smCollections) {
    const col = anyCol(orgPartDbName, colName);
    const docs = await col
      .find(fullFilter)
      .sort({ '_local.timestamp': -1 })
      .skip(skip)
      .limit(fetchLimit)
      .toArray();

    for (const doc of docs) {
      const appUser = await resolveAppUserContext(
        appUsersCol, userId, superAppId, callerOrgParamId, doc,
      );
      if (!appUser) continue;
      if (!passesPlantFilter(doc, callerOrgParamId, appUser)) continue;

      const access = await resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId);
      if (!access) continue;

      allResults.push({ doc, access });
    }
  }

  // Take the requested page
  const pageResults = allResults.slice(0, query.limit);

  // Step 10: Optionally enrich inline
  const documents = await Promise.all(
    pageResults.map(async ({ doc, access }) => {
      const enriched: Record<string, unknown> = { ...doc, _access: access };

      if (query.include_actions && teamRbacMatrix) {
        try {
          const appUser = await resolveAppUserContext(
            appUsersCol, userId, superAppId, callerOrgParamId, doc,
          );
          if (appUser) {
            enriched['_actions'] = await computeActions(
              doc,
              appUser,
              teamRbacMatrix,
              callerOrgParamId,
              defsDbName,
            );
          }
        } catch { /* non-fatal */ }
      }

      if (query.include_diff) {
        try {
          enriched['_diff'] = await computeDiff(doc, orgPartDbName);
        } catch { /* non-fatal */ }
      }

      return enriched;
    }),
  );

  const total = await anyCol(orgPartDbName, smCollections[0]).estimatedDocumentCount();

  return reply.send({
    total,
    page: query.page,
    limit: query.limit,
    documents,
    nextCursor: documents.length === query.limit
      ? {
          timestamp: (pageResults[pageResults.length - 1].doc['_local'] as Record<string, unknown>)?.['timestamp'],
          id: pageResults[pageResults.length - 1].doc['_id'],
        }
      : null,
  });
}

/**
 * GET /documents/:docId
 */
async function getDocument(
  request: FastifyRequest<{ Params: { docId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { docId } = request.params;
  const { superAppId, superAppDbName, workspace } = request.requestContext;
  const { userId, paramId: callerOrgParamId } = request.authContext;
  const { role } = request.platformContext;

  if (!superAppId || !superAppDbName || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  const portal = request.headers['x-portal'] as string | undefined ?? role;
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);

  // Find doc across all sm_* collections
  const colNames = await getDb(orgPartDbName).listCollections({ name: /^sm_/ }).toArray();
  let doc: Document | null = null;
  for (const { name } of colNames) {
    doc = await anyCol(orgPartDbName, name).findOne({ _id: docId });
    if (doc) break;
  }

  if (!doc) return reply.code(404).send({ error: 'Document not found' });

  const appUsersCol = anyCol(superAppDbName, 'app_users');
  const appUser = await resolveAppUserContext(
    appUsersCol, userId, superAppId, callerOrgParamId, doc,
  );
  if (!appUser) return reply.code(403).send({ error: 'Access denied' });

  const smId = (request.query as Record<string, string>)['smId'];
  const rbacMatrixId = smId ? `${superAppId.slice(0, 8)}:${smId}` : null;
  const teamRbacMatrix = rbacMatrixId
    ? (await anyCol(superAppDbName, 'team_rbac_matrix').findOne({ _id: rbacMatrixId }) as TeamRbacMatrix | null)
    : null;

  const access = await resolveDocumentAccess(doc, appUser, teamRbacMatrix, callerOrgParamId);
  if (!access) return reply.code(403).send({ error: 'Access denied' });

  return reply.send({ ...doc, _access: access });
}

export async function documentsHandlers(app: FastifyInstance): Promise<void> {
  app.get('/documents', listDocuments);
  app.get<{ Params: { docId: string } }>('/documents/:docId', getDocument);
}
