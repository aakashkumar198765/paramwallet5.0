import { Collection, Filter, FindOptions, Document } from 'mongodb';

/**
 * Build a MongoDB filter that restricts results to documents belonging to specific plants.
 * Per spec §10.2: plants are stored in _chain._sys.plantIDs[orgParamId] as string[].
 * LOW-5 fix: removed wrong _chain.plant / _chain.plants fields.
 */
export function buildPlantFilter(plantCodes: string[], orgParamId?: string): Filter<Document> {
  if (plantCodes.length === 0) return {};
  if (orgParamId) {
    return { [`_chain._sys.plantIDs.${orgParamId}`]: { $in: plantCodes } };
  }
  // Fallback without org-specific key (avoid if possible)
  return { '_chain._sys.plantIDs': { $exists: true } };
}

/**
 * Build a filter that restricts results to a specific partner (by partnerId).
 */
export function buildPartnerFilter(partnerId: string): Filter<Document> {
  return {
    $or: [
      { '_chain.partnerId': partnerId },
      { '_chain.roles.partnerId': partnerId },
    ],
  };
}

/**
 * Build a date range filter on _local.timestamp.
 * CRIT-4 fix: _local.timestamp is stored as epoch ms integer (not Date object).
 * from/to params are epoch ms strings — must parse as integers, not wrap in new Date().
 */
export function buildDateRangeFilter(from?: string, to?: string): Filter<Document> {
  if (!from && !to) return {};
  const filter: Record<string, unknown> = {};
  if (from) filter['$gte'] = parseInt(from, 10);
  if (to) filter['$lte'] = parseInt(to, 10);
  return { '_local.timestamp': filter };
}

/**
 * Build a state/subState/phase filter for SM documents.
 */
export function buildStateFilter(
  state?: string,
  subState?: string,
  phase?: string
): Filter<Document> {
  const filter: Filter<Document> = {};
  if (state) (filter as Record<string, unknown>)['_local.state'] = state;
  if (subState) (filter as Record<string, unknown>)['_local.subState'] = subState;
  if (phase) (filter as Record<string, unknown>)['_local.phase'] = phase;
  return filter;
}

/**
 * Paginate a MongoDB collection query.
 */
// LOW-7 fix: removed non-spec `pages` field — spec response is { total, page, limit, data }
export async function paginatedFind<T extends Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  options: FindOptions<T> & { page?: number; limit?: number }
): Promise<{ data: T[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    collection
      .find(filter, { ...options, skip, limit })
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { data, total, page, limit };
}

/**
 * Safe upsert — only updates if document matches _id.
 */
export async function safeUpsert<T extends Document>(
  collection: Collection<T>,
  id: string,
  update: Partial<T>
): Promise<void> {
  await collection.updateOne(
    { _id: id } as Filter<T>,
    { $set: update as Partial<T> },
    { upsert: true }
  );
}
