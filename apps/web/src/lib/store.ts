import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  aiDrawerOpen: boolean;
  commandPaletteOpen: boolean;
  activeModal: string | null;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setAiDrawerOpen: (open: boolean) => void;
  toggleAiDrawer: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  aiDrawerOpen: false,
  commandPaletteOpen: false,
  activeModal: null,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setAiDrawerOpen: (open) => set({ aiDrawerOpen: open }),
  toggleAiDrawer: () =>
    set((state) => ({ aiDrawerOpen: !state.aiDrawerOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
