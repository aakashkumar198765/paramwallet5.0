import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../../db/mongo.js';
import {
  resolveOrgPartitionDbName,
  resolveSuperAppDbName,
} from '../../db/resolver.js';
import {
  resolveAppUserContext,
  resolveDocumentAccess,
  passesL1,
  AppUser,
} from './rbac-filter.js';
import type { AuthContext } from '../../middleware/auth.js';
import type { RequestContext } from '../../middleware/request-context.js';
import type { PlatformContext } from '../../middleware/platform-context.js';

interface DocParams {
  docId: string;
}

/**
 * GET /documents/:docId/chain
 * Spec §16.1: Returns txn_history ordered by sequence asc.
 * Response: plain array (no wrapper).
 */
export async function getDocumentChain(
  request: FastifyRequest<{ Params: DocParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: DocParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { workspace, superAppId, portal, superAppDbName } = req.requestContext;
  if (!workspace || !superAppId || !portal) {
    return reply.status(400).send({ error: 'X-Workspace, X-SuperApp-ID and X-Portal headers required' });
  }

  if (!req.platformContext) {
    return reply.status(403).send({ error: 'Access denied' });
  }

  const { docId } = request.params;
  const callerOrgParamId = req.authContext.paramId;
  const orgPartitionDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);
  const orgDb = getDb(orgPartitionDbName);

  // Find the document first to verify access
  let parentDoc: Record<string, unknown> | null = null;
  try {
    const colList = await orgDb.listCollections().toArray();
    const smCollections = colList.map(c => c.name).filter(n => n.startsWith('sm_'));
    for (const colName of smCollections) {
      const doc = await orgDb.collection(colName).findOne({ _id: docId as unknown as string });
      if (doc) { parentDoc = doc as Record<string, unknown>; break; }
    }
  } catch {
    return reply.status(404).send({ error: 'Document not found' });
  }

  if (!parentDoc) return reply.status(404).send({ error: 'Document not found' });

  // HIGH-11 fix: Full L1+L2+L3 RBAC check (previously only checked app_users existence)
  const sappDb = getDb(superAppDbName!);
  const docSmId = (parentDoc._chain as Record<string, unknown>)?.smId as string | undefined;
  let teamRbacMatrix: Record<string, unknown> | null = null;
  if (docSmId) {
    const rbacId = `${superAppId.slice(0, 8)}:${docSmId}`;
    teamRbacMatrix = await sappDb
      .collection('team_rbac_matrix')
      .findOne({ _id: rbacId as unknown as string }) as Record<string, unknown> | null;
  }

  const appUserDoc = await resolveAppUserContext(
    sappDb.collection('app_users'),
    req.authContext.userId,
    superAppId,
    callerOrgParamId,
    parentDoc
  );

  if (!appUserDoc) return reply.status(403).send({ error: 'Access denied' });

  if (teamRbacMatrix) {
    const access = resolveDocumentAccess(parentDoc, appUserDoc as AppUser, teamRbacMatrix, callerOrgParamId);
    if (!access) return reply.status(403).send({ error: 'Access denied' });
  } else {
    // No RBAC matrix — at minimum enforce L1
    if (!passesL1(parentDoc, callerOrgParamId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }
  }

  // Get txn_history for this document, ordered by sequence asc
  const txnHistory = await orgDb
    .collection('txn_history')
    .find({ docId })
    .sort({ sequence: 1 })
    .toArray();

  // Spec §16.1 response: plain array (no wrapper)
  return reply.send(txnHistory);
}

/**
 * GET /documents/:docId/diff
 * Spec §16.1: Quantity balance check — full parent doc with OrderedItems quantities
 * reduced to remaining (per I_SKU), plus diff block.
 */
export async function getDocumentDiff(
  request: FastifyRequest<{ Params: DocParams }>,
  reply: FastifyReply
): Promise<void> {
  const req = request as FastifyRequest<{ Params: DocParams }> & {
    authContext: AuthContext;
    requestContext: RequestContext;
    platformContext: PlatformContext | null;
  };

  const { workspace, superAppId, portal, superAppDbName } = req.requestContext;
  if (!workspace || !superAppId || !portal) {
    return reply.status(400).send({ error: 'X-Workspace, X-SuperApp-ID and X-Portal headers required' });
  }

  if (!req.platformContext) {
    return reply.status(403).send({ error: 'Access denied' });
  }

  const { docId } = request.params;
  const callerOrgParamId = req.authContext.paramId;
  const orgPartitionDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);
  const orgDb = getDb(orgPartitionDbName);

  // Fetch parent document
  let parentDoc: Record<string, unknown> | null = null;
  let foundCollection = '';

  try {
    const colList = await orgDb.listCollections().toArray();
    const smCollections = colList.map(c => c.name).filter(n => n.startsWith('sm_'));
    for (const colName of smCollections) {
      const doc = await orgDb.collection(colName).findOne({ _id: docId as unknown as string });
      if (doc) {
        parentDoc = doc as Record<string, unknown>;
        foundCollection = colName;
        break;
      }
    }
  } catch {
    return reply.status(404).send({ error: 'Document not found' });
  }

  if (!parentDoc) return reply.status(404).send({ error: 'Document not found' });

  // RBAC check
  const sappDb = getDb(superAppDbName!);
  const appUserDoc = await resolveAppUserContext(
    sappDb.collection('app_users'),
    req.authContext.userId,
    superAppId,
    callerOrgParamId,
    parentDoc
  );

  if (!appUserDoc) return reply.status(403).send({ error: 'Access denied' });

  // Resolve access level
  const docSmId = (parentDoc._chain as Record<string, unknown>)?.smId as string | undefined;
  let access = 'RO';
  if (docSmId) {
    const rbacId = `${superAppId.slice(0, 8)}:${docSmId}`;
    const teamRbacMatrix = await sappDb
      .collection('team_rbac_matrix')
      .findOne({ _id: rbacId as unknown as string }) as Record<string, unknown> | null;
    if (teamRbacMatrix) {
      const resolved = resolveDocumentAccess(
        parentDoc,
        appUserDoc as AppUser,
        teamRbacMatrix,
        callerOrgParamId
      );
      if (!resolved) return reply.status(403).send({ error: 'Access denied to this document' });
      access = resolved;
    }
  }

  // Get child doc IDs from _chain.refs.docIds
  const chain = parentDoc._chain as Record<string, unknown> | undefined;
  const refs = chain?.refs as Record<string, unknown> | undefined;
  const childDocIds: string[] = (refs?.docIds as string[]) ?? [];

  // Spec §16.1 diff algorithm — per I_SKU quantity balance
  const parentOrderedItems = getOrderedItems(parentDoc);
  const hasOrderedItems = parentOrderedItems.length > 0;

  if (hasOrderedItems) {
    // Initialize remaining map keyed by I_SKU
    const remaining = new Map<string, number>();
    for (const item of parentOrderedItems) {
      const sku = item.I_SKU as string;
      const qty = (item.I_Quantity as number) ?? 0;
      if (sku) remaining.set(sku, (remaining.get(sku) ?? 0) + qty);
    }

    // Fetch child documents and compute consumed quantities
    const childDetails: Array<{ docId: string; stateTo: string | null; consumedQty: number }> = [];

    for (const childDocId of childDocIds) {
      // Fetch child doc
      const childDoc = await orgDb.collection(foundCollection)
        .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;

      // Fetch child's chain_head for stateTo
      const childChainHead = await orgDb.collection('chain_head')
        .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;
      const childStateTo = (childChainHead?.stateTo as string) ?? null;

      let childConsumedQty = 0;
      if (childDoc) {
        const childItems = getOrderedItems(childDoc);
        for (const item of childItems) {
          const sku = item.I_SKU as string;
          const qty = (item.I_Quantity as number) ?? 0;
          if (sku && remaining.has(sku)) {
            remaining.set(sku, (remaining.get(sku) ?? 0) - qty);
            childConsumedQty += qty;
          }
        }
      }

      childDetails.push({ docId: childDocId, stateTo: childStateTo, consumedQty: childConsumedQty });
    }

    // Build diff items (per-SKU breakdown)
    const diffItems = parentOrderedItems.map(item => {
      const sku = item.I_SKU as string;
      const parentQty = (item.I_Quantity as number) ?? 0;
      const rem = remaining.get(sku) ?? 0;
      return {
        I_SKU: sku,
        parentQty,
        consumedQty: parentQty - rem,
        remainingQty: rem,
      };
    });

    // Total quantities
    const parentQtyTotal = diffItems.reduce((s, i) => s + i.parentQty, 0);
    const remainingQtyTotal = diffItems.reduce((s, i) => s + i.remainingQty, 0);
    const consumedQtyTotal = parentQtyTotal - remainingQtyTotal;
    const canCreateChild = remainingQtyTotal > 0;

    // Build response: full parent doc with OrderedItems replaced by remaining quantities
    const reducedOrderedItems = parentOrderedItems.map(item => {
      const sku = item.I_SKU as string;
      return {
        ...item,
        I_Quantity: remaining.get(sku) ?? 0,
      };
    });

    const diffBlock = {
      hasOrderedItems: true,
      parentQty: parentQtyTotal,
      consumedQty: consumedQtyTotal,
      remainingQty: remainingQtyTotal,
      canCreateChild,
      items: diffItems,
      children: childDetails,
    };

    // Spec response: full parent doc with reduced OrderedItems + diff block + access
    return reply.send({
      ...parentDoc,
      OrderedItems: reducedOrderedItems,
      access,
      diff: diffBlock,
    });

  } else {
    // No OrderedItems — quantity tracking not applicable
    // canCreateChild = only if no children yet
    const canCreateChild = childDocIds.length === 0;

    const childDetails = await Promise.all(
      childDocIds.map(async childDocId => {
        const childChainHead = await orgDb.collection('chain_head')
          .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;
        return {
          docId: childDocId,
          stateTo: (childChainHead?.stateTo as string) ?? null,
          consumedQty: null,
        };
      })
    );

    const diffBlock = {
      hasOrderedItems: false,
      parentQty: null,
      consumedQty: null,
      remainingQty: null,
      canCreateChild,
      items: [],
      children: childDetails,
    };

    // Spec response: full parent doc + diff block + access (OrderedItems unchanged)
    return reply.send({
      ...parentDoc,
      access,
      diff: diffBlock,
    });
  }
}

// ── Exported helper for include_diff in listDocuments ────────────────────────

export interface DiffBlock {
  hasOrderedItems: boolean;
  parentQty: number | null;
  consumedQty: number | null;
  remainingQty: number | null;
  canCreateChild: boolean;
  items: Array<{ I_SKU: string; parentQty: number; consumedQty: number; remainingQty: number }>;
  children: Array<{ docId: string; stateTo: string | null; consumedQty: number | null }>;
}

export interface DiffBlockResult {
  diff: DiffBlock;
  reducedOrderedItems?: Array<Record<string, unknown>>;
}

/**
 * HIGH-7 helper: Compute the diff block for a single document.
 * Extracted so listDocuments can call it per-doc when include_diff=true.
 */
export async function computeDiffBlock(
  doc: Record<string, unknown>,
  orgDb: ReturnType<typeof getDb>,
  foundCollection: string
): Promise<DiffBlockResult> {
  const chain = doc._chain as Record<string, unknown> | undefined;
  const childDocIds: string[] = ((chain?.refs as Record<string, unknown>)?.docIds as string[]) ?? [];
  const parentOrderedItems = getOrderedItems(doc);
  const hasOrderedItems = parentOrderedItems.length > 0;

  if (hasOrderedItems) {
    const remaining = new Map<string, number>();
    for (const item of parentOrderedItems) {
      const sku = item.I_SKU as string;
      const qty = (item.I_Quantity as number) ?? 0;
      if (sku) remaining.set(sku, (remaining.get(sku) ?? 0) + qty);
    }

    const childDetails: Array<{ docId: string; stateTo: string | null; consumedQty: number }> = [];
    for (const childDocId of childDocIds) {
      const childDoc = await orgDb
        .collection(foundCollection)
        .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;
      const childChainHead = await orgDb
        .collection('chain_head')
        .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;
      const childStateTo = (childChainHead?.stateTo as string) ?? null;
      let childConsumedQty = 0;
      if (childDoc) {
        for (const item of getOrderedItems(childDoc)) {
          const sku = item.I_SKU as string;
          const qty = (item.I_Quantity as number) ?? 0;
          if (sku && remaining.has(sku)) {
            remaining.set(sku, (remaining.get(sku) ?? 0) - qty);
            childConsumedQty += qty;
          }
        }
      }
      childDetails.push({ docId: childDocId, stateTo: childStateTo, consumedQty: childConsumedQty });
    }

    const diffItems = parentOrderedItems.map(item => {
      const sku = item.I_SKU as string;
      const parentQty = (item.I_Quantity as number) ?? 0;
      const rem = remaining.get(sku) ?? 0;
      return { I_SKU: sku, parentQty, consumedQty: parentQty - rem, remainingQty: rem };
    });
    const parentQtyTotal = diffItems.reduce((s, i) => s + i.parentQty, 0);
    const remainingQtyTotal = diffItems.reduce((s, i) => s + i.remainingQty, 0);

    return {
      diff: {
        hasOrderedItems: true,
        parentQty: parentQtyTotal,
        consumedQty: parentQtyTotal - remainingQtyTotal,
        remainingQty: remainingQtyTotal,
        canCreateChild: remainingQtyTotal > 0,
        items: diffItems,
        children: childDetails,
      },
      reducedOrderedItems: parentOrderedItems.map(item => ({
        ...item,
        I_Quantity: remaining.get(item.I_SKU as string) ?? 0,
      })),
    };
  } else {
    const childDetails = await Promise.all(
      childDocIds.map(async childDocId => {
        const ch = await orgDb
          .collection('chain_head')
          .findOne({ _id: childDocId as unknown as string }) as Record<string, unknown> | null;
        return { docId: childDocId, stateTo: (ch?.stateTo as string) ?? null, consumedQty: null };
      })
    );
    return {
      diff: {
        hasOrderedItems: false,
        parentQty: null,
        consumedQty: null,
        remainingQty: null,
        canCreateChild: childDocIds.length === 0,
        items: [],
        children: childDetails,
      },
    };
  }
}

function getOrderedItems(doc: Record<string, unknown>): Array<Record<string, unknown>> {
  // Spec uses I_SKU and I_Quantity — check OrderedItems first, then common alternatives
  const items = doc['OrderedItems'];
  if (Array.isArray(items)) return items as Array<Record<string, unknown>>;
  return [];
}
