import { create } from 'zustand';
import type { InstalledSuperApp } from '@/types/workspace';

interface SuperAppState {
  activeSuperApp: InstalledSuperApp | null;
  activeDocType: string | null; // SM state name currently selected
  setActiveSuperApp: (sapp: InstalledSuperApp | null) => void;
  setActiveDocType: (docType: string | null) => void;
  clearSuperApp: () => void;
}

export const useSuperAppStore = create<SuperAppState>()((set) => ({
  activeSuperApp: null,
  activeDocType: null,

  setActiveSuperApp: (sapp) => set({ activeSuperApp: sapp, activeDocType: null }),
  setActiveDocType: (docType) => set({ activeDocType: docType }),
  clearSuperApp: () => set({ activeSuperApp: null, activeDocType: null }),
}));
