import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSuperAppStore } from '@/store/superapp.store';
import {
  listInstalledSuperApps,
  getInstalledSuperApp,
  installSuperApp,
  uninstallSuperApp,
  listAvailableSuperApps,
  getSuperAppKpis,
} from '@/api/superapp.api';
import type { InstalledSuperApp } from '@/types/workspace';

export function useInstalledSuperApps(subdomain: string) {
  return useQuery<InstalledSuperApp[]>({
    queryKey: ['superapps', subdomain],
    queryFn: () => listInstalledSuperApps(subdomain),
    enabled: !!subdomain,
  });
}

export function useInstalledSuperApp(subdomain: string, superAppId: string) {
  return useQuery<InstalledSuperApp>({
    queryKey: ['superapps', subdomain, superAppId],
    queryFn: () => getInstalledSuperApp(subdomain, superAppId),
    enabled: !!subdomain && !!superAppId,
  });
}

export function useAvailableSuperApps() {
  return useQuery({
    queryKey: ['definitions', 'superapps', 'available'],
    queryFn: listAvailableSuperApps,
  });
}

export function useInstallSuperApp(subdomain: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { superAppDefId: string; config?: Record<string, unknown> }) =>
      installSuperApp(subdomain, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superapps', subdomain] });
    },
  });
}

export function useUninstallSuperApp(subdomain: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (superAppId: string) => uninstallSuperApp(subdomain, superAppId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superapps', subdomain] });
    },
  });
}

export function useSuperAppKpis(subdomain: string, superAppId: string) {
  return useQuery({
    queryKey: ['superapps', subdomain, superAppId, 'kpis'],
    queryFn: () => getSuperAppKpis(subdomain, superAppId),
    enabled: !!subdomain && !!superAppId,
    refetchInterval: 30_000,
  });
}

export function useActiveSuperApp() {
  return useSuperAppStore();
}
