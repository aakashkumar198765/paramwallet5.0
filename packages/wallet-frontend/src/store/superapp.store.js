import { create } from 'zustand';
export const useSuperAppStore = create()((set) => ({
    activeSuperApp: null,
    activeDocType: null,
    setActiveSuperApp: (sapp) => set({ activeSuperApp: sapp, activeDocType: null }),
    setActiveDocType: (docType) => set({ activeDocType: docType }),
    clearSuperApp: () => set({ activeSuperApp: null, activeDocType: null }),
}));
