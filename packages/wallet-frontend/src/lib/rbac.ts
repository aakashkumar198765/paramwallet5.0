import type { TeamRbacEntry } from '@/types/definitions';
import type { SmDocument } from '@/types/documents';

export type AccessLevel = 'RW' | 'RO' | 'N/A';

/**
 * Resolves the most specific access level for a given role+team
 * at the current state/subState/microState.
 * Specificity: microState > subState > state
 */
export function getTeamAccess(
  permissions: TeamRbacEntry[],
  role: string,
  team: string,
  state: string,
  subState: string | null,
  microState: string | null,
): AccessLevel {
  const key = `${role}.${team}`;

  // microState match (most specific)
  if (microState) {
    const micro = permissions.find(
      (p) => p.state === state && p.subState === subState && p.microState === microState,
    );
    if (micro?.access[key]) return micro.access[key] as AccessLevel;
  }

  // subState match
  if (subState) {
    const sub = permissions.find(
      (p) => p.state === state && p.subState === subState && p.microState === null,
    );
    if (sub?.access[key]) return sub.access[key] as AccessLevel;
  }

  // state match (least specific)
  const statePerm = permissions.find(
    (p) => p.state === state && p.subState === null && p.microState === null,
  );
  if (statePerm?.access[key]) return statePerm.access[key] as AccessLevel;

  return 'N/A';
}

/**
 * Returns the most permissive access across all teams for a role.
 * RW > RO > N/A
 */
export function resolveRoleAccess(
  permissions: TeamRbacEntry[],
  role: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null,
): AccessLevel {
  let best: AccessLevel = 'N/A';
  for (const team of teams) {
    const access = getTeamAccess(permissions, role, team, state, subState, microState);
    if (access === 'RW') return 'RW';
    if (access === 'RO') best = 'RO';
  }
  return best;
}

/** Derive UI capability: can user create documents in this SuperApp? */
export function canCreate(startStateOwners: string[], effectiveRole: string): boolean {
  return startStateOwners.includes(effectiveRole);
}

/** Check if the current user is workspace admin. */
export function isWorkspaceAdmin(ownerParamId: string, callerParamId: string): boolean {
  return ownerParamId === callerParamId;
}

/** Derive read-only state for a document. */
export function isReadOnly(doc: SmDocument): boolean {
  return doc._access === 'RO';
}
