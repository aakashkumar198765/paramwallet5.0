import { Collection, Document } from 'mongodb';

export interface AppUser {
  _id: string;
  userId: string;
  superAppId: string;
  email: string;
  role: string;
  partnerId?: string;
  plantTeams: Array<{ plant: string; teams: string[] }>;
  isOrgAdmin?: boolean;
  isWorkspaceAdmin?: boolean;
  status: string;
}

export type AccessLevel = 'RW' | 'RO' | 'N/A';

/**
 * 1. Resolve all plant codes the caller has access to across all their app_users docs.
 * For sponsor users: single doc; for vendor users: multiple docs (one per partnerId).
 */
export async function resolveAllUserPlants(
  appUsersCol: Collection<Document>,
  userId: string,
  superAppId: string,
  callerOrgParamId: string
): Promise<string[]> {
  const docs = await appUsersCol
    .find({ userId, superAppId })
    .toArray();

  const plantSet = new Set<string>();
  for (const doc of docs) {
    const appUser = doc as unknown as AppUser;
    for (const pt of appUser.plantTeams ?? []) {
      plantSet.add(pt.plant);
    }
  }

  return Array.from(plantSet);
}

/**
 * 2. Resolve the correct app_users doc for this document context.
 * For sponsor users: single doc matches directly.
 * For vendor users: multiple docs, pick by plant overlap with the doc's plant.
 */
export async function resolveAppUserContext(
  appUsersCol: Collection<Document>,
  userId: string,
  superAppId: string,
  callerOrgParamId: string,
  doc: Record<string, unknown>,
  partnerIdHint?: string
): Promise<AppUser | null> {
  // CRIT-5 fix: Fast path — if partnerIdHint given, do targeted lookup FIRST.
  // Must NOT early-return on allDocs.length === 1 before checking partnerIdHint,
  // as a single-doc vendor user could match the wrong partnerId.
  if (partnerIdHint) {
    const byPartner = await appUsersCol
      .findOne({ userId, superAppId, partnerId: partnerIdHint }) as unknown as AppUser | null;
    return byPartner;
  }

  const allDocs = await appUsersCol
    .find({ userId, superAppId })
    .toArray() as unknown as AppUser[];

  if (allDocs.length === 0) return null;

  // Single doc — sponsor user (no partnerIdHint, so direct return is safe)
  if (allDocs.length === 1) return allDocs[0];

  // Multiple docs — vendor user with multiple vendor contexts.
  // Resolve by plant overlap with the document.
  const docPlants: string[] = getDocPlantCodes(doc, callerOrgParamId);
  for (const appUser of allDocs) {
    const userPlants = new Set(appUser.plantTeams.map(pt => pt.plant));
    const overlap = docPlants.some(p => userPlants.has(p));
    if (overlap) return appUser;
  }

  // Fallback: return first doc
  return allDocs[0];
}

/**
 * Extract plant codes from a document for a specific org.
 * Spec §10.2: plants are stored in _chain._sys.plantIDs[orgParamId] as string[]
 */
export function getDocPlantCodes(doc: Record<string, unknown>, orgParamId?: string): string[] {
  const chain = doc._chain as Record<string, unknown> | undefined;
  if (!chain) return [];

  const sys = chain._sys as Record<string, unknown> | undefined;
  if (!sys) return [];

  const plantIDs = sys.plantIDs as Record<string, string[]> | undefined;
  if (!plantIDs) return [];

  if (orgParamId && plantIDs[orgParamId]) {
    return plantIDs[orgParamId];
  }

  // Fallback: return all plant codes from all orgs
  return Object.values(plantIDs).flat();
}

/**
 * 3. L1 check: The org partition DB itself provides L1 isolation.
 * This function verifies _chain.roles contains callerOrgParamId as a participant.
 */
export function passesL1(doc: Record<string, unknown>, callerOrgParamId: string): boolean {
  const chain = doc._chain as Record<string, unknown> | undefined;
  if (!chain) return false;

  // CRIT-1 fix: Per spec §10.2, _chain.roles values are plain paramId strings (0x addresses),
  // NOT objects like { paramId, name }. Use Object.values(...).includes() for correct comparison.
  // Example: { "Consignee": "0x6193b497...", "FF": "0x40Af9B6a..." }
  const roles = chain.roles as Record<string, unknown> | undefined;
  if (roles && typeof roles === 'object' && !Array.isArray(roles)) {
    return Object.values(roles).includes(callerOrgParamId);
  }

  return false;
}

/**
 * 4. Check if caller has plant-level access to this document.
 */
export function passesPlantFilter(
  doc: Record<string, unknown>,
  callerOrgParamId: string,
  appUser: AppUser
): boolean {
  const docPlants = getDocPlantCodes(doc, callerOrgParamId);
  if (docPlants.length === 0) return true; // No plant restriction

  const userPlants = new Set(appUser.plantTeams.map(pt => pt.plant));
  return docPlants.some(p => userPlants.has(p));
}

/**
 * 5. Resolve which teams the caller belongs to relative to this document's plants.
 */
export function resolveCallerTeams(
  appUser: AppUser,
  callerOrgParamId: string,
  docPlantIds: string[]
): string[] {
  const teams = new Set<string>();
  for (const pt of appUser.plantTeams) {
    if (docPlantIds.length === 0 || docPlantIds.includes(pt.plant)) {
      for (const t of pt.teams) teams.add(t);
    }
  }
  return Array.from(teams);
}

/**
 * 6. Get access level for a single role+team at a specific state position.
 *
 * The team_rbac_matrix.permissions array stores entries like:
 *   { state: "Contract", subState: null, microState: null, access: { "Consignee.Admin": "RW", "FF.FF": "RO" } }
 *
 * Access resolution priority: most-specific level wins (microState > subState > state).
 * We find the entry for the most specific level available and look up "Role.Team" key.
 */
export function getTeamAccess(
  teamRbacMatrix: Record<string, unknown>,
  roleName: string,
  teamName: string,
  state: string,
  subState: string | null,
  microState: string | null
): AccessLevel {
  const permissions = teamRbacMatrix.permissions as Array<Record<string, unknown>> | undefined;
  if (!permissions) return 'N/A';

  const key = `${roleName}.${teamName}`;

  // CRIT-6 fix: Spec §22.2 defines a three-level fallback:
  // 1. Exact match: (state, subState, microState)
  // 2. SubState fallback: (state, subState, null microState)
  // 3. State fallback: (state, null subState, null microState)
  const nullify = (v: unknown): string | null =>
    (v === undefined || v === null) ? null : (v as string);

  // 1. Exact match
  const exact = permissions.find(p =>
    p.state === state &&
    nullify(p.subState) === subState &&
    nullify(p.microState) === microState
  );
  if (exact) {
    const access = exact.access as Record<string, string> | undefined;
    return (access?.[key] as AccessLevel) ?? 'N/A';
  }

  // 2. SubState-level fallback (state + subState + null microState)
  if (subState !== null) {
    const subStateMatch = permissions.find(p =>
      p.state === state &&
      nullify(p.subState) === subState &&
      nullify(p.microState) === null
    );
    if (subStateMatch) {
      const access = subStateMatch.access as Record<string, string> | undefined;
      return (access?.[key] as AccessLevel) ?? 'N/A';
    }
  }

  // 3. State-level fallback (state + null subState + null microState)
  const stateMatch = permissions.find(p =>
    p.state === state &&
    nullify(p.subState) === null &&
    nullify(p.microState) === null
  );
  if (stateMatch) {
    const access = stateMatch.access as Record<string, string> | undefined;
    return (access?.[key] as AccessLevel) ?? 'N/A';
  }

  return 'N/A';
}

/**
 * 7. Resolve the most permissive access level across all caller teams at a given state.
 * RW > RO > N/A
 */
export function resolveTeamAccess(
  teamRbacMatrix: Record<string, unknown>,
  roleName: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null
): AccessLevel {
  let best: AccessLevel = 'N/A';

  for (const team of teams) {
    const access = getTeamAccess(
      teamRbacMatrix,
      roleName,
      team,
      state,
      subState,
      microState
    );
    if (access === 'RW') return 'RW'; // Short-circuit on most permissive
    if (access === 'RO' && best === 'N/A') best = 'RO';
  }

  return best;
}

/**
 * 8. L3 check: restricted docs (_chain._sys.restrictedTo array).
 *
 * Rules (from spec §3.3):
 * - If restrictedTo is empty: skip L3 — L1+L2 are sufficient (pass)
 * - If restrictedTo is non-empty:
 *   - Caller IS in the list → access granted (pass)
 *   - Caller's team HAS entries in the list BUT caller is NOT listed → blocked (fail)
 *   - Caller's team has NO entries in the list → skip L3 for this caller → fall through (pass)
 */
export function passesL3(
  doc: Record<string, unknown>,
  callerId: string,
  callerRole: string,
  callerTeam: string
): boolean {
  const chain = doc._chain as Record<string, unknown> | undefined;
  if (!chain) return true;

  const sys = chain._sys as Record<string, unknown> | undefined;
  if (!sys) return true;

  const restrictedTo = sys.restrictedTo as Array<Record<string, unknown>> | undefined;
  if (!restrictedTo || restrictedTo.length === 0) return true;

  // Check if this caller's userId is explicitly listed → grant
  const callerIsListed = restrictedTo.some(r => r.userId === callerId);
  if (callerIsListed) return true;

  // Check if any entry in restrictedTo targets the caller's team
  const callerTeamHasEntries = restrictedTo.some(
    r => r.role === callerRole && r.team === callerTeam
  );

  // If the caller's team IS restricted but this specific user is NOT listed → block
  if (callerTeamHasEntries) return false;

  // Caller's team is not in restrictedTo at all → skip L3 for this caller → pass
  return true;
}

/**
 * 9. Full document access resolution combining all three RBAC levels.
 * Returns: "RW", "RO", or null (no access).
 */
export function resolveDocumentAccess(
  doc: Record<string, unknown>,
  appUser: AppUser,
  teamRbacMatrix: Record<string, unknown>,
  callerOrgParamId: string
): AccessLevel | null {
  // L1: verify caller's org participates in this document
  if (!passesL1(doc, callerOrgParamId)) return null;

  // L1.5: plant filter
  if (!passesPlantFilter(doc, callerOrgParamId, appUser)) return null;

  // Get document state position
  const local = doc._local as Record<string, unknown> | undefined;
  const state = (local?.state as string) ?? '';
  const subState = (local?.subState as string) ?? null;
  const microState = (local?.microState as string) ?? null;

  // L2: team RBAC matrix
  const docPlants = getDocPlantCodes(doc, callerOrgParamId);
  const callerTeams = resolveCallerTeams(appUser, callerOrgParamId, docPlants);
  const teamAccess = resolveTeamAccess(
    teamRbacMatrix,
    appUser.role,
    callerTeams,
    state,
    subState,
    microState
  );

  if (teamAccess === 'N/A') return null;

  // CRIT-2 fix: L3 check — spec §22.5 uses .some() across ALL caller teams.
  // Access passes L3 if ANY of the caller's teams passes the restrictedTo check.
  const l3Pass = callerTeams.length === 0
    ? passesL3(doc, appUser.userId, appUser.role, '')
    : callerTeams.some(team => passesL3(doc, appUser.userId, appUser.role, team));
  if (!l3Pass) return null;

  return teamAccess;
}

/**
 * 10. Build partner ID filter for document queries.
 * Spec §16.1 step 5: Sponsor users skip this filter entirely.
 * Vendor users with partner_id: filter by _participants.{callerRole}.C_InternalID.
 */
export function buildPartnerIdFilter(
  callerRole: string,
  callerIsSponsor: boolean,
  partnerIdParam: string | undefined
): Record<string, unknown> | null {
  // Spec: sponsor users skip this filter entirely
  if (callerIsSponsor) return null;

  // Spec: vendor only — filter by _participants.{callerRole}.C_InternalID
  if (partnerIdParam) {
    return { [`_participants.${callerRole}.C_InternalID`]: partnerIdParam };
  }

  return null;
}
