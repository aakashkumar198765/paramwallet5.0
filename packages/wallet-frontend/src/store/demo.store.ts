import { create } from 'zustand';

interface DemoState {
  isDemoMode: boolean;
  demoRole: string | null;
  startDemo: (role: string) => void;
  endDemo: () => void;
}

export const useDemoStore = create<DemoState>()((set) => ({
  isDemoMode: false,
  demoRole: null,

  startDemo: (role) => set({ isDemoMode: true, demoRole: role }),
  endDemo: () => set({ isDemoMode: false, demoRole: null }),
}));
