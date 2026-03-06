import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspaceStore } from '@/store/workspace.store';
import { listWorkspaces, getWorkspace, createWorkspace } from '@/api/workspace.api';
import type { Workspace } from '@/types/workspace';

export function useWorkspaceStore_() {
  return useWorkspaceStore();
}

export function useWorkspaces() {
  const setWorkspaceList = useWorkspaceStore((s) => s.setWorkspaceList);

  return useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const list = await listWorkspaces();
      setWorkspaceList(list);
      return list;
    },
  });
}

export function useWorkspace(subdomain: string) {
  return useQuery<Workspace>({
    queryKey: ['workspace', subdomain],
    queryFn: () => getWorkspace(subdomain),
    enabled: !!subdomain,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
