"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { PALETTES, applyPalette, type Palette } from "@/lib/palettes";

interface PaletteContextValue {
  currentPaletteId: string;
  currentPalette: Palette;
  setPalette: (id: string) => void;
  palettes: Palette[];
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

const STORAGE_KEY = "neogesys-palette";

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [currentPaletteId, setCurrentPaletteId] = useState("default");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PALETTES.some((p) => p.id === stored)) {
      setCurrentPaletteId(stored);
      applyPalette(stored);
    }
  }, []);

  const setPalette = useCallback((id: string) => {
    setCurrentPaletteId(id);
    applyPalette(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const currentPalette =
    PALETTES.find((p) => p.id === currentPaletteId) ?? PALETTES[0];

  return (
    <PaletteContext.Provider
      value={{ currentPaletteId, currentPalette, setPalette, palettes: PALETTES }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePaletteContext(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("usePaletteContext must be used within PaletteProvider");
  }
  return ctx;
}
