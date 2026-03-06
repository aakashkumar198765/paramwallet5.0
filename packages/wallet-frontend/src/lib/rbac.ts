import type { TeamRbacMatrix } from '@/types/definitions';
import type { PlatformContext } from '@/types/workspace';

export function canEdit(access: 'RW' | 'RO' | null): boolean {
  return access === 'RW';
}

export function canCreate(
  startStateOwners: string[],
  effectiveRole: string,
  teamAccess: 'RW' | 'RO' | 'N/A'
): boolean {
  return startStateOwners.includes(effectiveRole) && teamAccess === 'RW';
}

export function isAdmin(platformContext: PlatformContext): boolean {
  return platformContext.role === 'admin' || platformContext.role === 'owner';
}

export function resolveTeamAccess(
  rbacMatrix: TeamRbacMatrix | null | undefined,
  roleName: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null
): 'RW' | 'RO' | 'N/A' {
  if (!rbacMatrix) return 'N/A';

  const permission = rbacMatrix.permissions.find((p) => {
    if (p.state !== state) return false;
    if (subState !== null && p.subState !== subState) return false;
    if (microState !== null && p.microState !== microState) return false;
    return true;
  });

  if (!permission) return 'N/A';

  // Check all teams for the role; best access wins (RW > RO > N/A)
  let best: 'RW' | 'RO' | 'N/A' = 'N/A';

  for (const team of teams) {
    const key = `${roleName}.${team}`;
    const access = permission.access[key] ?? 'N/A';
    if (access === 'RW') return 'RW';
    if (access === 'RO' && best === 'N/A') best = 'RO';
  }

  // Also check role-level key without team
  const roleKey = roleName;
  const roleAccess = permission.access[roleKey] ?? 'N/A';
  if (roleAccess === 'RW') return 'RW';
  if (roleAccess === 'RO' && best === 'N/A') best = 'RO';

  return best;
}
