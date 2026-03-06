import { create } from 'zustand';
import type { InstalledSuperApp } from '@/types/workspace';

interface SuperAppState {
  activeSuperApp: string | null;
  activeSuperAppData: InstalledSuperApp | null;
  activeDocType: string | null; // SM state name currently selected
  setActiveSuperApp: (id: string, data?: InstalledSuperApp) => void;
  setActiveDocType: (state: string | null) => void;
  clearSuperApp: () => void;
}

export const useSuperAppStore = create<SuperAppState>((set) => ({
  activeSuperApp: null,
  activeSuperAppData: null,
  activeDocType: null,
  setActiveSuperApp: (id, data) =>
    set({ activeSuperApp: id, activeSuperAppData: data ?? null }),
  setActiveDocType: (docType) => set({ activeDocType: docType }),
  clearSuperApp: () =>
    set({ activeSuperApp: null, activeSuperAppData: null, activeDocType: null }),
}));
