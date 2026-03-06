/**
 * Resolves the most specific access level for a given role+team
 * at the current state/subState/microState.
 * Specificity: microState > subState > state
 */
export function getTeamAccess(permissions, role, team, state, subState, microState) {
    const key = `${role}.${team}`;
    // microState match (most specific)
    if (microState) {
        const micro = permissions.find((p) => p.state === state && p.subState === subState && p.microState === microState);
        if (micro?.access[key])
            return micro.access[key];
    }
    // subState match
    if (subState) {
        const sub = permissions.find((p) => p.state === state && p.subState === subState && p.microState === null);
        if (sub?.access[key])
            return sub.access[key];
    }
    // state match (least specific)
    const statePerm = permissions.find((p) => p.state === state && p.subState === null && p.microState === null);
    if (statePerm?.access[key])
        return statePerm.access[key];
    return 'N/A';
}
/**
 * Returns the most permissive access across all teams for a role.
 * RW > RO > N/A
 */
export function resolveRoleAccess(permissions, role, teams, state, subState, microState) {
    let best = 'N/A';
    for (const team of teams) {
        const access = getTeamAccess(permissions, role, team, state, subState, microState);
        if (access === 'RW')
            return 'RW';
        if (access === 'RO')
            best = 'RO';
    }
    return best;
}
/** Derive UI capability: can user create documents in this SuperApp? */
export function canCreate(startStateOwners, effectiveRole) {
    return startStateOwners.includes(effectiveRole);
}
/** Check if the current user is workspace admin. */
export function isWorkspaceAdmin(ownerParamId, callerParamId) {
    return ownerParamId === callerParamId;
}
/** Derive read-only state for a document. */
export function isReadOnly(doc) {
    return doc._access === 'RO';
}
