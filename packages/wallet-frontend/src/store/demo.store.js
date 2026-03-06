import { create } from 'zustand';
export const useDemoStore = create()((set) => ({
    isDemoMode: false,
    demoRole: null,
    startDemo: (role) => set({ isDemoMode: true, demoRole: role }),
    endDemo: () => set({ isDemoMode: false, demoRole: null }),
}));
