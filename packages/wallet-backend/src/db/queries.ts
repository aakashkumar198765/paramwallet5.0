import type { Filter, Document } from 'mongodb';

/**
 * Shared MongoDB query builders used across engine handlers.
 */

/**
 * Builds the L1 org visibility filter for SM document queries.
 * Returns a filter that matches documents where the caller's org role
 * is present in _chain.roles.
 */
export function buildOrgRoleFilter(callerRole: string, _callerOrgParamId: string): Filter<Document> {
  // L1 is implicitly enforced by querying the correct Org Partition DB.
  // This filter ensures the role key exists in _chain.roles — belt-and-suspenders.
  return { [`_chain.roles.${callerRole}`]: { $exists: true } };
}

/**
 * Builds the plant intersection filter for a given org paramId.
 * Documents must have at least one plant from the user's plant set.
 */
export function buildPlantFilter(
  callerOrgParamId: string,
  userPlants: string[],
): Filter<Document> {
  if (userPlants.length === 0) return { _id: { $exists: false } }; // no plants → no results
  return {
    [`_chain._sys.plantIDs.${callerOrgParamId}`]: { $in: userPlants },
  };
}

/**
 * Builds the partner ID filter for vendor document queries.
 * Only applied when caller is a vendor user AND partner_id param is present.
 */
export function buildPartnerIdFilter(
  callerRole: string,
  partnerId: string,
): Filter<Document> {
  return {
    [`_participants.${callerRole}.C_InternalID`]: partnerId,
  };
}

/**
 * Builds the state/subState filter for document list queries.
 */
export function buildStateFilter(
  state?: string,
  subState?: string,
): Filter<Document> {
  const filter: Filter<Document> = {};
  if (state) filter['_local.state'] = state;
  if (subState) filter['_local.subState'] = subState;
  return filter;
}

/**
 * Builds the phase filter for document list queries.
 */
export function buildPhaseFilter(phase?: string): Filter<Document> {
  if (!phase) return {};
  return { '_local.phase': phase };
}

/**
 * Builds a date range filter on _local.timestamp.
 */
export function buildDateRangeFilter(from?: number, to?: number): Filter<Document> {
  if (!from && !to) return {};
  const filter: Record<string, unknown> = {};
  if (from) filter['$gte'] = from;
  if (to) filter['$lte'] = to;
  return { '_local.timestamp': filter };
}
