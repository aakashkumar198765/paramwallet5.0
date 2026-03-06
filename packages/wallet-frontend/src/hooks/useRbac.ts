import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRbacMatrices,
  getRbacMatrix,
  updateRbacMatrix,
} from '@/api/team-rbac.api';
import { resolveTeamAccess } from '@/lib/rbac';
import { useDemoStore } from '@/store/demo.store';
import type { TeamRbacMatrix } from '@/types/definitions';

// Uses X-Workspace header for all workspace-level RBAC calls.

export function useRbacMatrices(superAppId: string) {
  return useQuery<TeamRbacMatrix[]>({
    queryKey: ['rbac', superAppId],
    queryFn: () => listRbacMatrices(superAppId),
    enabled: !!superAppId,
  });
}

export function useRbacMatrix(superAppId: string, smId: string) {
  return useQuery<TeamRbacMatrix>({
    queryKey: ['rbac', superAppId, smId],
    queryFn: () => getRbacMatrix(superAppId, smId),
    enabled: !!superAppId && !!smId,
  });
}

export function useUpdateRbacMatrix(superAppId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ smId, data }: { smId: string; data: Partial<TeamRbacMatrix> }) =>
      updateRbacMatrix(superAppId, smId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac', superAppId] }),
  });
}

/**
 * Resolve access for the current user at a given state/subState/microState.
 * Respects demo mode role override.
 */
export function useEffectiveAccess(
  rbacMatrix: TeamRbacMatrix | null | undefined,
  platformRole: string,
  teams: string[],
  state: string,
  subState: string | null,
  microState: string | null
): 'RW' | 'RO' | 'N/A' {
  const { isDemoMode, demoRole } = useDemoStore();
  const effectiveRole = isDemoMode && demoRole ? demoRole : platformRole;
  return resolveTeamAccess(rbacMatrix, effectiveRole, teams, state, subState, microState);
}
