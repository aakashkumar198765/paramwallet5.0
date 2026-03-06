import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listWorkspaces,
  createWorkspace,
  listPlants,
  createPlant,
  listInstalledSuperApps,
  installSuperApp,
  listOrgs,
  onboardPartner,
  listUsers,
  addUser,
} from '@/api/workspace.api';
import { useWorkspaceStore } from '@/store/workspace.store';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceKeys.all, 'list'] as const,
  plants: (ws: string) => ['plants', ws] as const,
  superApps: (ws: string) => ['superApps', ws] as const,
  orgs: (ws: string, saId: string) => ['orgs', ws, saId] as const,
  users: (ws: string, saId: string) => ['users', ws, saId] as const,
};

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: async () => {
      const res = await listWorkspaces();
      return res.workspaces;
    },
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  const { setWorkspaceList } = useWorkspaceStore();

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: async () => {
      const res = await listWorkspaces();
      setWorkspaceList(res.workspaces);
      qc.invalidateQueries({ queryKey: workspaceKeys.list() });
    },
  });
}

export function usePlants(workspaceSubdomain: string) {
  return useQuery({
    queryKey: workspaceKeys.plants(workspaceSubdomain),
    queryFn: async () => {
      const res = await listPlants();
      return res.plants;
    },
    enabled: !!workspaceSubdomain,
  });
}

export function useCreatePlant(workspaceSubdomain: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createPlant>[0]) => createPlant(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.plants(workspaceSubdomain) }),
  });
}

export function useInstalledSuperApps(workspaceSubdomain: string) {
  return useQuery({
    queryKey: workspaceKeys.superApps(workspaceSubdomain),
    queryFn: async () => {
      const res = await listInstalledSuperApps();
      return res.superapps;
    },
    enabled: !!workspaceSubdomain,
  });
}

export function useInstallSuperApp(workspaceSubdomain: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (superAppId: string) => installSuperApp(superAppId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.superApps(workspaceSubdomain) }),
  });
}

export function useOrgs(workspaceSubdomain: string, superAppId: string) {
  return useQuery({
    queryKey: workspaceKeys.orgs(workspaceSubdomain, superAppId),
    queryFn: async () => {
      const res = await listOrgs(superAppId);
      return res.organizations;
    },
    enabled: !!workspaceSubdomain && !!superAppId,
  });
}

export function useOnboardPartner(workspaceSubdomain: string, superAppId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof onboardPartner>[1]) => onboardPartner(superAppId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.orgs(workspaceSubdomain, superAppId) }),
  });
}

export function useUsers(workspaceSubdomain: string, superAppId: string, role?: string) {
  return useQuery({
    queryKey: workspaceKeys.users(workspaceSubdomain, superAppId),
    queryFn: async () => {
      const res = await listUsers(superAppId, role ?? '');
      return res.users;
    },
    enabled: !!workspaceSubdomain && !!superAppId,
  });
}

export function useAddUser(workspaceSubdomain: string, superAppId: string, role: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof addUser>[2]) => addUser(superAppId, role, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: workspaceKeys.users(workspaceSubdomain, superAppId) }),
  });
}
