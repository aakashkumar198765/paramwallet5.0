import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuperAppStore } from '@/store/superapp.store';
import {
  listInstalledSuperApps,
  getInstalledSuperApp,
  installSuperApp,
  updateSuperAppStatus,
  listAvailableSuperApps,
} from '@/api/superapp.api';
import type { InstalledSuperApp } from '@/types/workspace';

// All calls use X-Workspace header from store.

export function useInstalledSuperApps() {
  return useQuery<InstalledSuperApp[]>({
    queryKey: ['superapps'],
    queryFn: listInstalledSuperApps,
  });
}

export function useInstalledSuperApp(superAppId: string) {
  return useQuery<InstalledSuperApp>({
    queryKey: ['superapps', superAppId],
    queryFn: () => getInstalledSuperApp(superAppId),
    enabled: !!superAppId,
  });
}

export function useAvailableSuperApps() {
  return useQuery({
    queryKey: ['definitions', 'superapps', 'available'],
    queryFn: listAvailableSuperApps,
  });
}

export function useInstallSuperApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { superAppDefId: string; orgName?: string; config?: Record<string, unknown> }) =>
      installSuperApp(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superapps'] });
    },
  });
}

export function useUpdateSuperAppStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ superAppId, status }: { superAppId: string; status: string }) =>
      updateSuperAppStatus(superAppId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superapps'] });
    },
  });
}

export function useActiveSuperApp() {
  return useSuperAppStore();
}
