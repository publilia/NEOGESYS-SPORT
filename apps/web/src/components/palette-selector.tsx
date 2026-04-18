"use client";

import { usePaletteContext } from "@/components/palette-provider";
import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function PaletteSelector() {
	const [isOpen, setIsOpen] = useState(false);
	const popoverRef = useRef<HTMLDivElement>(null);
	const { currentPaletteId, setPalette, palettes } = usePaletteContext();

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const handleSelect = (paletteId: string) => {
		setPalette(paletteId);
		setIsOpen(false);
	};

	return (
		<div ref={popoverRef} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
				aria-label="Seleziona palette"
			>
				<Palette className="h-5 w-5 text-foreground" />
			</button>

			{isOpen && (
				<div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg">
					<h3 className="mb-2 text-sm font-semibold text-popover-foreground">Palette Colori</h3>

					<div className="grid grid-cols-2 gap-2">
						{palettes.map((palette) => {
							const isSelected = currentPaletteId === palette.id;
							const primaryColor = palette.colors.light.primary;
							const secondaryColor = palette.colors.light.accent;

							return (
								<button
									key={palette.id}
									type="button"
									onClick={() => handleSelect(palette.id)}
									className={`flex items-center gap-2 rounded-md border p-2 text-left text-sm ${
										isSelected
											? "border-primary bg-primary/5 ring-1 ring-primary"
											: "border-border hover:bg-muted"
									}`}
								>
									{/* Color preview circle */}
									<div className="relative flex h-7 w-7 shrink-0 items-center justify-center">
										<div
											className="absolute h-7 w-7 rounded-full"
											style={{
												background: `linear-gradient(135deg, hsl(${primaryColor}) 50%, hsl(${secondaryColor}) 50%)`,
											}}
										/>
										{isSelected && (
											<Check className="relative z-10 h-3.5 w-3.5 text-white drop-shadow-sm" />
										)}
									</div>
									<span className="text-xs font-medium text-popover-foreground">
										{palette.name}
									</span>
								</button>
							);
						})}
					</div>

					{/* Custom palette for admin */}
					<div className="mt-3 border-t border-border pt-3">
						<button
							type="button"
							className="w-full rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"
						>
							Palette personalizzata...
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
