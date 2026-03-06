import { create } from 'zustand';
import type { InstalledSuperApp } from '@/types/workspace';

interface SuperAppState {
  activeSuperApp: string | null;
  activeSuperAppData: InstalledSuperApp | null;
  activePortal: string | null; // role/portal for X-Portal header (e.g. "Consignee", "Shipper")
  activeDocType: string | null; // SM state name currently selected
  setActiveSuperApp: (id: string, data?: InstalledSuperApp) => void;
  setActivePortal: (portal: string | null) => void;
  setActiveDocType: (state: string | null) => void;
  clearSuperApp: () => void;
}

export const useSuperAppStore = create<SuperAppState>((set) => ({
  activeSuperApp: null,
  activeSuperAppData: null,
  activePortal: null,
  activeDocType: null,
  setActiveSuperApp: (id, data) =>
    set({ activeSuperApp: id, activeSuperAppData: data ?? null }),
  setActivePortal: (portal) => set({ activePortal: portal }),
  setActiveDocType: (docType) => set({ activeDocType: docType }),
  clearSuperApp: () =>
    set({ activeSuperApp: null, activeSuperAppData: null, activePortal: null, activeDocType: null }),
}));
