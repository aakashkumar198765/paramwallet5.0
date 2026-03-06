import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import {
  resolveDefinitionsDb,
  resolveOrgPartitionDbName,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import { buildDateRangeFilter, buildStateFilter } from '../../db/queries.js';
import { DocumentListQuerySchema } from './schemas.js';
import {
  resolveAppUserContext,
  resolveDocumentAccess,
  buildPartnerIdFilter,
  AppUser,
} from './rbac-filter.js';
import { buildFieldWhitelist, buildSchemaFilter } from './schema-filter.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';
import type { PlatformContext } from '../../middleware/platform-context.js';

/**
 * GET /documents
 * Spec §16.1: Paginated list with full 3-level RBAC filter.
 * Response: { total, page, limit, documents: [...] }
 */
export async function listDocuments(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { workspace, superAppId, portal, superAppDbName } = req.requestContext;

  if (!workspace || !superAppId || !portal) {
    return reply.status(400).send({
      error: 'X-Workspace, X-SuperApp-ID and X-Portal headers required',
    });
  }

  const query = DocumentListQuerySchema.parse(request.query);
  const { authContext, platformContext } = req;

  if (!platformContext) {
    return reply.status(403).send({ error: 'Platform context not resolved — access denied' });
  }

  const callerOrgParamId = authContext.paramId;
  const callerIsSponsor = platformContext.appUserDocs.some(d => d.isWorkspaceAdmin);

  // Resolve org partition DB for this caller
  const orgPartitionDbName = resolveOrgPartitionDbName(
    workspace,
    superAppId,
    callerOrgParamId,
    portal
  );
  const orgDb = getDb(orgPartitionDbName);
  const sappDb = getDb(superAppDbName!);
  const defsDb = getDb(resolveDefinitionsDb());

  // Load team RBAC matrix for this SM
  const smId = query.smId;
  let teamRbacMatrix: Record<string, unknown> | null = null;
  if (smId) {
    const rbacId = `${superAppId.slice(0, 8)}:${smId}`;
    teamRbacMatrix = await sappDb
      .collection('team_rbac_matrix')
      .findOne({ _id: rbacId as unknown as string }) as Record<string, unknown> | null;
  }

  // Load schema for field whitelisting (if smId provided)
  let whitelist: Set<string> | null = null;
  let schemaProperties: Record<string, unknown> = {};
  if (smId) {
    const smDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: smId as unknown as string });
    if (smDef) {
      const schema = (smDef as Record<string, unknown>).schema as Record<string, unknown> | undefined;
      if (schema) {
        whitelist = buildFieldWhitelist(schema);
        schemaProperties = (schema.properties as Record<string, unknown>) ?? {};
      }
    }
  }

  // Discover SM collections matching sm_{state}_ pattern
  let collections: string[] = [];
  try {
    const colList = await orgDb.listCollections().toArray();
    collections = colList
      .map(c => c.name)
      .filter(n => n.startsWith('sm_'));

    // If state filter provided, narrow to matching collections
    if (query.state) {
      collections = collections.filter(n =>
        n.startsWith(`sm_${query.state}_`) || n === `sm_${query.state}`
      );
    }
  } catch {
    // DB might not exist yet — return empty
    return reply.send({ total: 0, page: query.page, limit: query.limit, documents: [] });
  }

  if (collections.length === 0) {
    return reply.send({ total: 0, page: query.page, limit: query.limit, documents: [] });
  }

  // Build base filter
  const baseFilter: Record<string, unknown> = {
    ...buildStateFilter(query.state, query.subState, query.phase),
    ...buildDateRangeFilter(query.from, query.to),
  };

  if (query.plant) {
    baseFilter['$or'] = [
      { '_chain.plant': query.plant },
      { '_chain.plants': query.plant },
    ];
  }

  // Partner ID filter
  const partnerFilter = buildPartnerIdFilter(
    platformContext.role,
    callerIsSponsor,
    query.partner_id
  );
  if (partnerFilter) Object.assign(baseFilter, partnerFilter);

  // Text search
  if (query.search) {
    baseFilter['$text'] = { $search: query.search };
  }

  // Dynamic filter[*] params from query string
  const rawQuery = request.query as Record<string, string>;
  const filterParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawQuery)) {
    if (k.startsWith('filter[') && k.endsWith(']')) {
      const field = k.slice(7, -1);
      filterParams[field] = v;
    }
  }

  if (whitelist && Object.keys(filterParams).length > 0) {
    const schemaFilter = buildSchemaFilter(
      filterParams,
      whitelist,
      schemaProperties as Record<string, import('./schema-filter.js').SchemaProperty>
    );
    Object.assign(baseFilter, schemaFilter);
  }

  // Load app_users doc for RBAC checks
  const appUsersCol = getDb(superAppDbName!).collection('app_users');
  const appUserDoc = await resolveAppUserContext(
    appUsersCol,
    authContext.userId,
    superAppId,
    callerOrgParamId,
    {},
    query.partner_id
  );

  if (!appUserDoc) {
    return reply.status(403).send({ error: 'User not found in this SuperApp' });
  }

  // Collect documents across all matching SM collections
  const allDocs: Array<Record<string, unknown>> = [];
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  for (const colName of collections) {
    const col = orgDb.collection(colName);
    const rawDocs = await col
      .find(baseFilter)
      .sort({ '_local.timestamp': -1 })
      .toArray();

    for (const rawDoc of rawDocs) {
      const doc = rawDoc as Record<string, unknown>;

      if (!teamRbacMatrix) {
        // No RBAC matrix — allow read-only for all
        allDocs.push({ ...doc, access: 'RO' });
        continue;
      }

      const access = resolveDocumentAccess(
        doc,
        appUserDoc as AppUser,
        teamRbacMatrix,
        callerOrgParamId
      );

      if (access) {
        allDocs.push({ ...doc, access });
      }
    }
  }

  // Sort combined results by _local.timestamp DESC
  allDocs.sort((a, b) => {
    const ta = ((a._local as Record<string, unknown>)?.timestamp as number) ?? 0;
    const tb = ((b._local as Record<string, unknown>)?.timestamp as number) ?? 0;
    return tb - ta;
  });

  const total = allDocs.length;
  const paged = allDocs.slice(skip, skip + limit);

  // Spec §16.1: Annotate each doc with smId (from _chain) and smName (from param_definitions)
  const uniqueSmIds = new Set<string>();
  for (const doc of paged) {
    const docSmId = (doc._chain as Record<string, unknown>)?.smId as string | undefined;
    if (docSmId) uniqueSmIds.add(docSmId);
  }

  const smNameMap: Record<string, string> = {};
  if (uniqueSmIds.size > 0) {
    const smDefs = await defsDb
      .collection('onchain_sm_definitions')
      .find({ _id: { $in: Array.from(uniqueSmIds) as unknown[] } })
      .toArray();
    for (const def of smDefs) {
      const d = def as Record<string, unknown>;
      smNameMap[d._id as string] = (d.name ?? d.displayName) as string;
    }
  }

  const annotated = paged.map(doc => {
    const docSmId = (doc._chain as Record<string, unknown>)?.smId as string | undefined;
    return {
      smId: docSmId ?? null,
      smName: docSmId ? (smNameMap[docSmId] ?? null) : null,
      ...doc,
    };
  });

  // Spec §16.1 response: { total, page, limit, documents: [...] }
  return reply.send({ total, page, limit, documents: annotated });
}

/**
 * GET /documents/:docId
 * Spec §16.1: Single document with full RBAC check.
 * Response: Full document + smName + access (no wrapper).
 */
export async function getDocument(
  request: FastifyRequest<{ Params: { docId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: { docId: string } }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { workspace, superAppId, portal, superAppDbName } = req.requestContext;

  if (!workspace || !superAppId || !portal) {
    return reply.status(400).send({
      error: 'X-Workspace, X-SuperApp-ID and X-Portal headers required',
    });
  }

  if (!req.platformContext) {
    return reply.status(403).send({ error: 'Access denied' });
  }

  const callerOrgParamId = req.authContext.paramId;
  const orgPartitionDbName = resolveOrgPartitionDbName(
    workspace,
    superAppId,
    callerOrgParamId,
    portal
  );
  const orgDb = getDb(orgPartitionDbName);
  const sappDb = getDb(superAppDbName!);
  const defsDb = getDb(resolveDefinitionsDb());
  const { docId } = request.params;

  // Search across all SM collections
  let foundDoc: Record<string, unknown> | null = null;
  let foundCollection = '';

  try {
    const colList = await orgDb.listCollections().toArray();
    const smCollections = colList.map(c => c.name).filter(n => n.startsWith('sm_'));

    for (const colName of smCollections) {
      const doc = await orgDb.collection(colName).findOne({ _id: docId as unknown as string });
      if (doc) {
        foundDoc = doc as Record<string, unknown>;
        foundCollection = colName;
        break;
      }
    }
  } catch {
    return reply.status(404).send({ error: 'Document not found' });
  }

  if (!foundDoc) return reply.status(404).send({ error: 'Document not found' });

  // Resolve RBAC
  const docSmId = (foundDoc._chain as Record<string, unknown>)?.smId as string | undefined;
  let teamRbacMatrix: Record<string, unknown> | null = null;
  if (docSmId) {
    const rbacId = `${superAppId.slice(0, 8)}:${docSmId}`;
    teamRbacMatrix = await sappDb
      .collection('team_rbac_matrix')
      .findOne({ _id: rbacId as unknown as string }) as Record<string, unknown> | null;
  }

  const appUsersCol = sappDb.collection('app_users');
  const appUserDoc = await resolveAppUserContext(
    appUsersCol,
    req.authContext.userId,
    superAppId,
    callerOrgParamId,
    foundDoc
  );

  if (!appUserDoc) {
    return reply.status(403).send({ error: 'User not found in this SuperApp' });
  }

  let access = 'RO';
  if (teamRbacMatrix) {
    const resolved = resolveDocumentAccess(
      foundDoc,
      appUserDoc as AppUser,
      teamRbacMatrix,
      callerOrgParamId
    );
    if (!resolved) return reply.status(403).send({ error: 'Access denied to this document' });
    access = resolved;
  }

  // Spec §16.1: Annotate with smName (from param_definitions) and access
  let smName: string | null = null;
  if (docSmId) {
    const smDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: docSmId as unknown as string });
    smName = (smDef as Record<string, unknown>)?.name as string ?? null
      || (smDef as Record<string, unknown>)?.displayName as string ?? null;
  }

  // Spec response: full document + smName + access (no wrapper)
  return reply.send({ smId: docSmId ?? null, smName, ...foundDoc, access });
}
