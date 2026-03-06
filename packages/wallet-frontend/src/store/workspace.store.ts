import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace } from '@/types/workspace';

interface WorkspaceState {
  activeWorkspace: string | null;
  workspaceList: Workspace[];
  setActiveWorkspace: (subdomain: string) => void;
  setWorkspaceList: (list: Workspace[]) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      workspaceList: [],

      setActiveWorkspace: (subdomain) => set({ activeWorkspace: subdomain }),
      setWorkspaceList: (list) => set({ workspaceList: list }),
      clearWorkspace: () => set({ activeWorkspace: null }),
    }),
    {
      name: 'param-workspace',
      partialize: (state) => ({ activeWorkspace: state.activeWorkspace }),
    },
  ),
);
