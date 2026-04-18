"use client";

import { PALETTES, type Palette, applyPalette } from "@/lib/palettes";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "neogesys-palette";

export function usePalette() {
	const [currentPaletteId, setCurrentPaletteId] = useState<string>("default");

	useEffect(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored && PALETTES.some((p) => p.id === stored)) {
			setCurrentPaletteId(stored);
			applyPalette(stored);
		}
	}, []);

	const setPalette = useCallback((paletteId: string) => {
		setCurrentPaletteId(paletteId);
		applyPalette(paletteId);
		localStorage.setItem(STORAGE_KEY, paletteId);
	}, []);

	const currentPalette: Palette = (PALETTES.find((p) => p.id === currentPaletteId) ??
		PALETTES[0]) as Palette;

	return {
		currentPaletteId,
		currentPalette,
		setPalette,
		palettes: PALETTES,
	};
}
