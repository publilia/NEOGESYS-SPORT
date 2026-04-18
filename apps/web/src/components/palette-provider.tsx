"use client";

import { PALETTES, type Palette, applyPalette } from "@/lib/palettes";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";

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

	const currentPalette: Palette = (PALETTES.find((p) => p.id === currentPaletteId) ??
		PALETTES[0]) as Palette;

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
