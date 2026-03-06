import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listRbacMatrices,
  getRbacMatrix,
  createRbacMatrix,
  updateRbacMatrix,
} from '@/api/team-rbac.api';
import { resolveTeamAccess } from '@/lib/rbac';
import { useDemoStore } from '@/store/demo.store';
import type { TeamRbacMatrix } from '@/types/definitions';

export function useRbacMatrices(subdomain: string, superAppId: string) {
  return useQuery<TeamRbacMatrix[]>({
    queryKey: ['rbac', subdomain, superAppId],
    queryFn: () => listRbacMatrices(subdomain, superAppId),
    enabled: !!subdomain && !!superAppId,
  });
}

export function useRbacMatrix(subdomain: string, superAppId: string, matrixId: string) {
  return useQuery<TeamRbacMatrix>({
    queryKey: ['rbac', subdomain, superAppId, matrixId],
    queryFn: () => getRbacMatrix(subdomain, superAppId, matrixId),
    enabled: !!subdomain && !!superAppId && !!matrixId,
  });
}

export function useCreateRbacMatrix(subdomain: string, superAppId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<TeamRbacMatrix, '_id'>) =>
      createRbacMatrix(subdomain, superAppId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac', subdomain, superAppId] }),
  });
}

export function useUpdateRbacMatrix(subdomain: string, superAppId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matrixId, data }: { matrixId: string; data: Partial<TeamRbacMatrix> }) =>
      updateRbacMatrix(subdomain, superAppId, matrixId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac', subdomain, superAppId] }),
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
