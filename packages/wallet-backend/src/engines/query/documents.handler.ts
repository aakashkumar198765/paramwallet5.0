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
  passesL1,
  passesL3,
  resolveCallerTeams,
  getDocPlantCodes,
  AppUser,
} from './rbac-filter.js';
import { buildFieldWhitelist, buildSchemaFilter, parseAndValidateFilterParams } from './schema-filter.js';
import { computeActionsBlock } from './actions.handler.js';
import { computeDiffBlock } from './chain.handler.js';
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
  // Spec §22.6: callerIsSponsor = absence of partnerId in app_users docs (not isWorkspaceAdmin)
  const callerIsSponsor = platformContext.appUserDocs.some(d => !(d as Record<string, unknown>).partnerId);

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

  // Extract user's accessible plants from platform context (for L1 plant filter per spec §22.5)
  const userPlants: string[] = [];
  for (const doc of platformContext.appUserDocs) {
    const pts = (doc as Record<string, unknown>).plantTeams as Array<{ plant: string }> | undefined;
    if (pts) userPlants.push(...pts.map(pt => pt.plant).filter(Boolean));
  }

  // Load schema for field whitelisting (if smId provided) — spec §16.1.1: schema is per-state
  let whitelist: Set<string> | null = null;
  let schemaProperties: Record<string, unknown> = {};
  if (smId) {
    const smDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: smId as unknown as string });
    if (smDef) {
      const smDefDoc = smDef as Record<string, unknown>;
      const smStates = (smDefDoc.states ?? {}) as Record<string, Record<string, unknown>>;
      // Use schema for the queried state, or first state that has a schema
      let schemaId: string | undefined;
      if (query.state && smStates[query.state]?.schema) {
        schemaId = smStates[query.state].schema as string;
      } else {
        for (const stateDef of Object.values(smStates)) {
          if (stateDef.schema) { schemaId = stateDef.schema as string; break; }
        }
      }
      if (schemaId) {
        const schemaDef = await defsDb
          .collection('onchain_schema_definitions')
          .findOne({ _id: schemaId as unknown as string });
        if (schemaDef) {
          whitelist = buildFieldWhitelist(schemaDef as Record<string, unknown>);
          schemaProperties = ((schemaDef as Record<string, unknown>).properties as Record<string, unknown>) ?? {};
        }
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

  // Build base filter — L1 org filter mandatory per spec §22.5
  const baseFilter: Record<string, unknown> = {
    ...buildStateFilter(query.state, query.subState, query.phase),
    ...buildDateRangeFilter(query.from, query.to),
    [`_chain.roles.${platformContext.role}`]: callerOrgParamId,
  };

  // Plant filter: spec §22.5 — filter by _chain._sys.plantIDs.{callerOrgParamId}
  // MED-11 fix: plantIDs[orgParamId] is a string[] — use $in directly, not $elemMatch: { $in }.
  // $elemMatch on scalar arrays requires $in at the top level, not nested.
  if (userPlants.length > 0) {
    const effectivePlants = query.plant ? [query.plant] : userPlants;
    baseFilter[`_chain._sys.plantIDs.${callerOrgParamId}`] = { $in: effectivePlants };
  } else if (query.plant) {
    // No plants for this user but specific plant queried → no results
    return reply.send({ total: 0, page: query.page, limit: query.limit, documents: [] });
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

  // HIGH-8 + HIGH-9 fix: Parse filter params with operator support (filter[path][gte]=val etc.)
  // and validate against whitelist — returning 400 for unknown or system fields.
  const rawQuery = request.query as Record<string, string>;
  const hasFilterKeys = Object.keys(rawQuery).some(k => k.startsWith('filter['));

  // Spec §16.1.1: 400 if filter[*] params present without smId
  if (hasFilterKeys && !smId) {
    return reply.status(400).send({ error: 'smId required for schema filters' });
  }

  if (whitelist && hasFilterKeys) {
    const validation = parseAndValidateFilterParams(rawQuery, whitelist);
    if (!validation.ok) {
      return reply.status(400).send({ error: validation.error, field: validation.field });
    }
    if (validation.params.length > 0) {
      const schemaFilter = buildSchemaFilter(
        validation.params,
        whitelist,
        schemaProperties as Record<string, import('./schema-filter.js').SchemaProperty>
      );
      Object.assign(baseFilter, schemaFilter);
    }
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
  // HIGH-7 fix: track which collection each doc came from (needed for computeDiffBlock/computeActionsBlock)
  const docColMap = new Map<string, string>(); // docId → colName
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
        docColMap.set(doc._id as string, colName);
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
        docColMap.set(doc._id as string, colName);
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
  const smDefMap = new Map<string, Record<string, unknown>>();
  if (uniqueSmIds.size > 0) {
    const smDefs = await defsDb
      .collection('onchain_sm_definitions')
      .find({ _id: { $in: Array.from(uniqueSmIds) as unknown[] } })
      .toArray();
    for (const def of smDefs) {
      const d = def as Record<string, unknown>;
      smNameMap[d._id as string] = (d.name ?? d.displayName) as string;
      smDefMap.set(d._id as string, d);
    }
  }

  // HIGH-7 fix: Batch-fetch chain_heads and RBAC matrices for include_actions / include_diff
  const chainHeadMap = new Map<string, Record<string, unknown>>();
  const pagedSmRbacMap = new Map<string, Record<string, unknown> | null>();

  if (query.include_actions || query.include_diff) {
    const pagedDocIds = paged.map(d => d._id as string);
    if (pagedDocIds.length > 0) {
      const chainHeads = await orgDb
        .collection('chain_head')
        .find({ _id: { $in: pagedDocIds as unknown[] } })
        .toArray();
      for (const ch of chainHeads) {
        const c = ch as Record<string, unknown>;
        chainHeadMap.set(c._id as string, c);
      }
    }

    if (uniqueSmIds.size > 0) {
      const rbacIds = Array.from(uniqueSmIds).map(sid => `${superAppId.slice(0, 8)}:${sid}`);
      const rbacDocs = await sappDb
        .collection('team_rbac_matrix')
        .find({ _id: { $in: rbacIds as unknown[] } })
        .toArray();
      for (const r of rbacDocs) {
        const rd = r as Record<string, unknown>;
        // _id format is "{sappPrefix}:{smId}" — extract smId after first colon (8 chars + ':')
        const smIdPart = (rd._id as string).substring(9);
        pagedSmRbacMap.set(smIdPart, rd);
      }
    }
  }

  const annotated = await Promise.all(paged.map(async doc => {
    const docSmId = (doc._chain as Record<string, unknown>)?.smId as string | undefined;
    // MED-3 fix: spread doc first so smId/smName annotations always take precedence
    // (prevents a top-level smId field in the stored doc from overwriting the annotation)
    const base: Record<string, unknown> = {
      ...doc,
      smId: docSmId ?? null,
      smName: docSmId ? (smNameMap[docSmId] ?? null) : null,
    };

    if (!query.include_actions && !query.include_diff) return base;

    const docId = doc._id as string;
    const colName = docColMap.get(docId) ?? '';
    const chainHead = chainHeadMap.get(docId) ?? null;
    const smDef = docSmId ? (smDefMap.get(docSmId) ?? null) : null;
    const docRbacMatrix = docSmId ? (pagedSmRbacMap.get(docSmId) ?? null) : null;

    if (query.include_diff) {
      const { diff, reducedOrderedItems } = await computeDiffBlock(doc, orgDb, colName);
      base.diff = diff;
      if (reducedOrderedItems) base.OrderedItems = reducedOrderedItems;
    }

    if (query.include_actions && docSmId) {
      base.actions = await computeActionsBlock(
        doc,
        docSmId,
        appUserDoc as AppUser,
        platformContext!.role,
        callerOrgParamId,
        chainHead,
        smDef,
        docRbacMatrix,
        defsDb,
        orgDb,
        colName
      );
    }

    return base;
  }));

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

  // MED-12 fix: Spec §16.1 requires chain_head lookup FIRST to find the current collection.
  // chain_head.stateTo = "State:SubState~MicroState" → extract state → narrow to sm_{state}_* collections.
  // Falls back to scanning all sm_* if chain_head not found (e.g. draft docs not yet transitioned).
  let foundDoc: Record<string, unknown> | null = null;
  let foundCollection = '';

  try {
    const chainHead = await orgDb
      .collection('chain_head')
      .findOne({ _id: docId as unknown as string }) as Record<string, unknown> | null;

    const colList = await orgDb.listCollections().toArray();
    let smCollections = colList.map(c => c.name).filter(n => n.startsWith('sm_'));

    if (chainHead?.stateTo) {
      // Extract state name from "State:SubState~MicroState" format
      const currentState = (chainHead.stateTo as string).split(':')[0];
      if (currentState) {
        // Narrow to collections that match sm_{state}_* — avoids scanning stale collections
        const narrowed = smCollections.filter(n =>
          n.startsWith(`sm_${currentState}_`) || n === `sm_${currentState}`
        );
        if (narrowed.length > 0) smCollections = narrowed;
      }
    }

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
  } else {
    // HIGH-14 fix: No RBAC matrix — still enforce L1 and L3 checks
    if (!passesL1(foundDoc, callerOrgParamId)) {
      return reply.status(403).send({ error: 'Access denied to this document' });
    }
    const callerRole = req.platformContext!.role;
    const docPlants = getDocPlantCodes(foundDoc, callerOrgParamId);
    const callerTeams = resolveCallerTeams(appUserDoc as AppUser, callerOrgParamId, docPlants);
    const teamsToCheck = callerTeams.length > 0 ? callerTeams : [''];
    const l3Pass = teamsToCheck.some(team =>
      passesL3(foundDoc, req.authContext.userId, callerRole, team)
    );
    if (!l3Pass) return reply.status(403).send({ error: 'Access denied to this document' });
  }

  // Spec §16.1: Annotate with smName (from param_definitions) and access
  let smName: string | null = null;
  if (docSmId) {
    const smDef = await defsDb
      .collection('onchain_sm_definitions')
      .findOne({ _id: docSmId as unknown as string });
    const d = smDef as Record<string, unknown> | null;
    smName = (d?.name as string | null) ?? (d?.displayName as string | null) ?? null;
  }

  // Spec response: full document + smName + access (no wrapper)
  return reply.send({ smId: docSmId ?? null, smName, ...foundDoc, access });
}
