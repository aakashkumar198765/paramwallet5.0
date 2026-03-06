import { create } from 'zustand';
import type { Workspace } from '@/types/workspace';

interface WorkspaceState {
  activeWorkspace: string | null;
  workspaceList: Workspace[];
  setActiveWorkspace: (subdomain: string) => void;
  setWorkspaceList: (list: Workspace[]) => void;
  clearWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspace: null,
  workspaceList: [],
  setActiveWorkspace: (subdomain) => set({ activeWorkspace: subdomain }),
  setWorkspaceList: (list) => set({ workspaceList: list }),
  clearWorkspace: () => set({ activeWorkspace: null, workspaceList: [] }),
}));
