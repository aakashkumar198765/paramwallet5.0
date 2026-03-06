import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useWorkspaceStore = create()(persist((set) => ({
    activeWorkspace: null,
    workspaceList: [],
    setActiveWorkspace: (subdomain) => set({ activeWorkspace: subdomain }),
    setWorkspaceList: (list) => set({ workspaceList: list }),
    clearWorkspace: () => set({ activeWorkspace: null }),
}), {
    name: 'param-workspace',
    partialize: (state) => ({ activeWorkspace: state.activeWorkspace }),
}));
