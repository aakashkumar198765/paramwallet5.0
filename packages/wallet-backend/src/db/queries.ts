import { Collection, Filter, FindOptions, Document } from 'mongodb';

/**
 * Build a MongoDB filter that restricts results to documents belonging to specific plants.
 * SM documents store plant info in _chain.plant (string) or _chain.plants (array).
 */
export function buildPlantFilter(plantCodes: string[]): Filter<Document> {
  if (plantCodes.length === 0) return {};
  return {
    $or: [
      { '_chain.plant': { $in: plantCodes } },
      { '_chain.plants': { $in: plantCodes } },
    ],
  };
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
 */
export function buildDateRangeFilter(from?: string, to?: string): Filter<Document> {
  if (!from && !to) return {};
  const filter: Record<string, unknown> = {};
  if (from) filter['$gte'] = new Date(from);
  if (to) filter['$lte'] = new Date(to);
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
export async function paginatedFind<T extends Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  options: FindOptions<T> & { page?: number; limit?: number }
): Promise<{ data: T[]; total: number; page: number; limit: number; pages: number }> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 25));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    collection
      .find(filter, { ...options, skip, limit })
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
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
