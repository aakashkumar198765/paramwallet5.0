import { useMemo } from 'react';
import { useDemoStore } from '@/store/demo.store';
import { useAuthStore } from '@/store/auth.store';
import { useWorkspaceStore } from '@/store/workspace.store';
import { resolveRoleAccess, canCreate, isWorkspaceAdmin } from '@/lib/rbac';
import type { TeamRbacMatrix } from '@/types/definitions';

interface UseRbacOptions {
  platformRole?: string;
  userTeams?: string[];
  matrix?: TeamRbacMatrix;
  state?: string;
  subState?: string | null;
  microState?: string | null;
  startStateOwners?: string[];
}

export function useRbac({
  platformRole,
  userTeams = [],
  matrix,
  state,
  subState = null,
  microState = null,
  startStateOwners = [],
}: UseRbacOptions) {
  const { isDemoMode, demoRole } = useDemoStore();
  const { paramId } = useAuthStore();
  const { activeWorkspace, workspaceList } = useWorkspaceStore();

  const effectiveRole = isDemoMode ? (demoRole ?? 'viewer') : (platformRole ?? 'viewer');

  const access = useMemo(() => {
    if (!matrix || !state) return 'N/A' as const;
    return resolveRoleAccess(matrix.permissions, effectiveRole, userTeams, state, subState, microState);
  }, [matrix, effectiveRole, userTeams, state, subState, microState]);

  const canWrite = access === 'RW';
  const canRead = access === 'RW' || access === 'RO';

  const canInitiate = useMemo(
    () => canCreate(startStateOwners, effectiveRole),
    [startStateOwners, effectiveRole],
  );

  const activeWs = workspaceList.find((w) => w.subdomain === activeWorkspace);
  const isAdmin = activeWs ? isWorkspaceAdmin(activeWs.ownerParamId, paramId ?? '') : false;

  return { effectiveRole, access, canWrite, canRead, canInitiate, isAdmin };
}
