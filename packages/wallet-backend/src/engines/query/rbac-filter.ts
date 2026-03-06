import type { Collection, Document } from 'mongodb';

export type AccessLevel = 'RW' | 'RO' | 'N/A';

export interface AppUserDoc {
  userId: string;
  superAppId: string;
  role: string;
  partnerId?: string | null;
  orgParamId: string;
  plantTeams: Array<{ plant: string; teams: string[] }>;
  isOrgAdmin: boolean;
  status: string;
}

export interface TeamRbacEntry {
  state: string;
  subState: string | null;
  microState: string | null;
  access: Record<string, AccessLevel>;
}

export interface TeamRbacMatrix {
  _id: string;
  superAppId: string;
  smId: string;
  permissions: TeamRbacEntry[];
}

// ── 1. Resolve all plants this user has access to ────────────────────────────

export async function resolveAllUserPlants(
  appUsersCol: Collection<Document>,
  userId: string,
  superAppId: string,
  _callerOrgParamId: string,
): Promise<string[]> {
  const docs = await appUsersCol.find({ userId, superAppId }).toArray();
  const plants = new Set<string>();
  for (const doc of docs) {
    const plantTeams = (doc['plantTeams'] as Array<{ plant: string }>) ?? [];
    for (const pt of plantTeams) plants.add(pt.plant);
  }
  return Array.from(plants);
}

// ── 2. Resolve AppUser context for a specific document ────────────────────────

export async function resolveAppUserContext(
  appUsersCol: Collection<Document>,
  userId: string,
  superAppId: string,
  _callerOrgParamId: string,
  doc: Document,
  partnerIdHint?: string,
): Promise<AppUserDoc | null> {
  const allContexts = await appUsersCol.find({ userId, superAppId }).toArray();
  if (allContexts.length === 0) return null;

  // Get the doc's plants for the caller's org
  const callerOrgParamId = allContexts[0]['orgParamId'] as string;
  const docPlants = (doc['_chain']?.['_sys']?.['plantIDs']?.[callerOrgParamId] as string[]) ?? [];

  // Sponsor users: single context, no partnerId
  const sponsorCtx = allContexts.find((d) => !d['partnerId']);
  if (sponsorCtx) return sponsorCtx as unknown as AppUserDoc;

  // Vendor users: if partnerIdHint is provided, use it directly
  if (partnerIdHint) {
    const hintCtx = allContexts.find((d) => d['partnerId'] === partnerIdHint);
    if (hintCtx) return hintCtx as unknown as AppUserDoc;
  }

  // Vendor users: match by plant overlap
  const matchingCtx = allContexts.find((d) => {
    const pts = (d['plantTeams'] as Array<{ plant: string }>) ?? [];
    return pts.some((pt) => docPlants.includes(pt.plant));
  });

  return (matchingCtx as unknown as AppUserDoc) ?? null;
}

// ── 3. L1: org role in _chain.roles ──────────────────────────────────────────
// L1 is implicitly enforced by querying the correct Org Partition DB.
// This check is a secondary belt-and-suspenders guard.

export function passesL1(doc: Document, callerOrgParamId: string): boolean {
  const roles = doc['_chain']?.['roles'] as Record<string, unknown> | undefined;
  if (!roles) return false;
  return Object.values(roles).some((v) => {
    if (typeof v === 'string') return v === callerOrgParamId;
    if (Array.isArray(v)) return v.includes(callerOrgParamId);
    return false;
  });
}

// ── 4. Plant filter: doc's plants intersect user's plants ────────────────────

export function passesPlantFilter(
  doc: Document,
  callerOrgParamId: string,
  appUser: AppUserDoc,
): boolean {
  const docPlants = (doc['_chain']?.['_sys']?.['plantIDs']?.[callerOrgParamId] as string[]) ?? [];
  if (docPlants.length === 0) return true; // no plant restriction on doc → allow
  const userPlants = appUser.plantTeams.map((pt) => pt.plant);
  return docPlants.some((p) => userPlants.includes(p));
}

// ── 5. Resolve caller's teams for a document's plants ────────────────────────

export function resolveCallerTeams(
  appUser: AppUserDoc,
  _callerOrgParamId: string,
  docPlantIDs: string[],
): string[] {
  if (docPlantIDs.length === 0) {
    // No plant restriction — return all teams across all plants
    const allTeams = new Set<string>();
    for (const pt of appUser.plantTeams) {
      for (const t of pt.teams) allTeams.add(t);
    }
    return Array.from(allTeams);
  }

  const teams = new Set<string>();
  for (const pt of appUser.plantTeams) {
    if (docPlantIDs.includes(pt.plant)) {
      for (const t of pt.teams) teams.add(t);
    }
  }
  return Array.from(teams);
}

// ── 6. Get team access for a specific state/subState/microState ───────────────

export function getTeamAccess(
  permissions: TeamRbacEntry[],
  roleName: string,
  teamName: string,
  state: string,
  subState: string | null,
  microState: string | null,
): AccessLevel {
  const key = `${roleName}.${teamName}`;

  // Find the most specific matching entry (microState > subState > state)
  let entry: TeamRbacEntry | undefined;

  if (microState !== null) {
    entry = permissions.find(
      (p) => p.state === state && p.subState === subState && p.microState === microState,
    );
  }
  if (!entry && subState !== null) {
    entry = permissions.find(
      (p) => p.state === state && p.subState === subState && p.microState === null,
    );
  }
  if (!entry) {
    entry = permissions.find(
      (p) => p.state === state && p.subState === null && p.microState === null,
    );
  }

  if (!entry) return 'N/A';
  return (entry.access[key] as AccessLevel | undefined) ?? 'N/A';
}

// ── 7. Resolve most permissive access across all teams ────────────────────────

export function resolveTeamAccess(
  permissions: TeamRbacEntry[],
  roleName: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null,
): AccessLevel {
  if (teams.length === 0) return 'N/A';

  let result: AccessLevel = 'N/A';
  for (const team of teams) {
    const access = getTeamAccess(permissions, roleName, team, state, subState, microState);
    if (access === 'RW') return 'RW'; // short-circuit on most permissive
    if (access === 'RO') result = 'RO';
  }
  return result;
}

// ── 8. L3: _chain._sys.restrictedTo check ────────────────────────────────────

export function passesL3(
  doc: Document,
  callerId: string,
  callerRole: string,
  callerTeams: string[],
): boolean {
  const restrictedTo = (doc['_chain']?.['_sys']?.['restrictedTo'] as Array<{
    userId: string;
    role: string;
    team: string;
  }>) ?? [];

  if (restrictedTo.length === 0) return true; // no restriction — pass

  // Check if caller's team has any entries in the list
  const teamHasEntries = restrictedTo.some(
    (r) => r.role === callerRole && callerTeams.includes(r.team),
  );

  if (!teamHasEntries) return true; // caller's team not restricted — L3 does not apply

  // Caller's team IS in the restricted list — they must be personally listed
  return restrictedTo.some(
    (r) =>
      r.userId === callerId &&
      r.role === callerRole &&
      callerTeams.includes(r.team),
  );
}

// ── 9. Full document access resolution ───────────────────────────────────────

export async function resolveDocumentAccess(
  doc: Document,
  appUser: AppUserDoc,
  teamRbacMatrix: TeamRbacMatrix | null,
  callerOrgParamId: string,
): Promise<AccessLevel | null> {
  const state = doc['_local']?.['state'] as string | undefined;
  const subState = (doc['_local']?.['subState'] as string | null | undefined) ?? null;
  const microState = (doc['_local']?.['microState'] as string | null | undefined) ?? null;

  if (!state) return null;

  // Resolve teams for the doc's plants
  const docPlants = (doc['_chain']?.['_sys']?.['plantIDs']?.[callerOrgParamId] as string[]) ?? [];
  const teams = resolveCallerTeams(appUser, callerOrgParamId, docPlants);

  // L3 check first (early exit if blocked)
  if (!passesL3(doc, appUser.userId, appUser.role, teams)) return null;

  if (!teamRbacMatrix) return null;

  // L2: team_rbac_matrix check
  const access = resolveTeamAccess(
    teamRbacMatrix.permissions,
    appUser.role,
    teams,
    state,
    subState,
    microState,
  );

  if (access === 'N/A') return null;
  return access;
}

// ── 10. Partner ID filter builder ─────────────────────────────────────────────

export function buildPartnerIdFilter(
  callerRole: string,
  callerIsSponsor: boolean,
  partnerIdParam: string | undefined,
): Record<string, unknown> | null {
  // Silently ignored for sponsor users
  if (callerIsSponsor || !partnerIdParam) return null;
  return { [`_participants.${callerRole}.C_InternalID`]: partnerIdParam };
}
