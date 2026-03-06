import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Document } from 'mongodb';
import { anyCol, getDb } from '../../db/mongo.js';
import { resolveOrgPartitionDbName } from '../../db/resolver.js';

// ── Diff computation (exported for documents.handler inline use) ──────────────

export interface DiffItem {
  sku: string;
  orderedQty: number;
  fulfilledQty: number;
  remainingQty: number;
}

export interface DiffResult {
  parentDocId: string;
  childDocIds: string[];
  orderedItems: DiffItem[];
  isFullyFulfilled: boolean;
}

/**
 * Quantity balance diff algorithm.
 * Fetches parent doc → fetches all child docs from _chain.refs.docIds
 * → per-SKU subtraction → returns reduced OrderedItems + diff block.
 */
export async function computeDiff(doc: Document, orgPartDbName: string): Promise<DiffResult> {
  const parentDocId = doc['_id'] as string;
  const childDocIds: string[] = (doc['_chain']?.['refs']?.['docIds'] as string[]) ?? [];

  // Build SKU quantities from parent's OrderedItems
  const skuMap = new Map<string, number>();
  const orderedItems = (doc['OrderedItems'] as Array<{ I_SKU: string; I_Quantity: number }>) ?? [];
  for (const item of orderedItems) {
    skuMap.set(item.I_SKU, (skuMap.get(item.I_SKU) ?? 0) + (item.I_Quantity ?? 0));
  }

  // Subtract quantities from all child docs
  const colNames = await getDb(orgPartDbName).listCollections({ name: /^sm_/ }).toArray();
  for (const childId of childDocIds) {
    for (const { name } of colNames) {
      const childDoc = await anyCol(orgPartDbName, name).findOne({ _id: childId });
      if (!childDoc) continue;
      const childItems = (childDoc['OrderedItems'] as Array<{ I_SKU: string; I_Quantity: number }>) ?? [];
      for (const item of childItems) {
        const current = skuMap.get(item.I_SKU) ?? 0;
        skuMap.set(item.I_SKU, current - (item.I_Quantity ?? 0));
      }
      break;
    }
  }

  const diffItems: DiffItem[] = orderedItems.map((item) => ({
    sku: item.I_SKU,
    orderedQty: item.I_Quantity ?? 0,
    fulfilledQty: (item.I_Quantity ?? 0) - (skuMap.get(item.I_SKU) ?? 0),
    remainingQty: skuMap.get(item.I_SKU) ?? 0,
  }));

  const isFullyFulfilled = diffItems.every((i) => i.remainingQty <= 0);

  return { parentDocId, childDocIds, orderedItems: diffItems, isFullyFulfilled };
}

// ── Chain history ─────────────────────────────────────────────────────────────

async function getDocumentChain(
  request: FastifyRequest<{ Params: { docId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { docId } = request.params;
  const { superAppId, workspace } = request.requestContext;
  const { paramId: callerOrgParamId } = request.authContext;
  const { role } = request.platformContext;

  if (!superAppId || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  const portal = request.headers['x-portal'] as string | undefined ?? role;
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);

  const history = await anyCol(orgPartDbName, 'txn_history')
    .find({ docId })
    .sort({ sequence: 1 })
    .toArray();

  return reply.send({ docId, chain: history });
}

// ── Quantity diff ─────────────────────────────────────────────────────────────

async function getDocumentDiff(
  request: FastifyRequest<{ Params: { docId: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { docId } = request.params;
  const { superAppId, workspace } = request.requestContext;
  const { paramId: callerOrgParamId } = request.authContext;
  const { role } = request.platformContext;

  if (!superAppId || !workspace) {
    return reply.code(400).send({ error: 'X-SuperApp-ID and X-Workspace headers required' });
  }

  const portal = request.headers['x-portal'] as string | undefined ?? role;
  const orgPartDbName = resolveOrgPartitionDbName(workspace, superAppId, callerOrgParamId, portal);

  // Find parent doc across sm_* collections
  const colNames = await getDb(orgPartDbName).listCollections({ name: /^sm_/ }).toArray();
  let doc: Document | null = null;
  for (const { name } of colNames) {
    doc = await anyCol(orgPartDbName, name).findOne({ _id: docId });
    if (doc) break;
  }
  if (!doc) return reply.code(404).send({ error: 'Document not found' });

  const diff = await computeDiff(doc, orgPartDbName);
  return reply.send(diff);
}

export async function chainHandlers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { docId: string } }>('/documents/:docId/chain', getDocumentChain);
  app.get<{ Params: { docId: string } }>('/documents/:docId/diff', getDocumentDiff);
}
