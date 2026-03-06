import { create } from 'zustand';

interface DemoState {
  isDemoMode: boolean;
  demoRole: string | null;
  enterDemoMode: (role: string) => void;
  exitDemoMode: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  demoRole: null,
  enterDemoMode: (role) => set({ isDemoMode: true, demoRole: role }),
  exitDemoMode: () => set({ isDemoMode: false, demoRole: null }),
}));
