"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

const THEMES = [
	{ id: "light", label: "Chiaro", icon: Sun },
	{ id: "dark", label: "Scuro", icon: Moon },
	{ id: "system", label: "Sistema", icon: Monitor },
] as const;

export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [isOpen, setIsOpen] = useState(false);
	const [mounted, setMounted] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	// SSR-safe: render a placeholder icon before hydration
	const currentTheme = mounted ? theme : "system";
	const CurrentIcon = currentTheme === "dark" ? Moon : currentTheme === "light" ? Sun : Monitor;

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
				aria-label="Cambia tema"
			>
				<CurrentIcon className="h-5 w-5 text-foreground" />
			</button>

			{isOpen && (
				<div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-border bg-popover py-1 shadow-lg">
					{THEMES.map((t) => {
						const Icon = t.icon;
						const isActive = currentTheme === t.id;

						return (
							<button
								key={t.id}
								type="button"
								onClick={() => {
									setTheme(t.id);
									setIsOpen(false);
								}}
								className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${
									isActive ? "bg-primary/10 text-primary" : "text-popover-foreground hover:bg-muted"
								}`}
							>
								<Icon className="h-4 w-4" />
								{t.label}
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}
