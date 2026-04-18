"use client";

import { useUIStore } from "@/lib/store";
import { Command } from "cmdk";
import {
	Bot,
	Calendar,
	CalendarDays,
	CreditCard,
	FileText,
	GraduationCap,
	Home,
	Plus,
	Search,
	Settings,
	Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";

export function CommandPalette() {
	const router = useRouter();
	const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setCommandPaletteOpen(!commandPaletteOpen);
			}
			if (e.key === "Escape") {
				setCommandPaletteOpen(false);
			}
		},
		[commandPaletteOpen, setCommandPaletteOpen],
	);

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	const runAction = (action: () => void) => {
		action();
		setCommandPaletteOpen(false);
	};

	if (!commandPaletteOpen) return null;

	return (
		<>
			{/* Overlay */}
			<div
				className="fixed inset-0 z-50 bg-black/50"
				onClick={() => setCommandPaletteOpen(false)}
			/>

			{/* Dialog */}
			<div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2">
				<Command className="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
					<div className="flex items-center border-b border-border px-3">
						<Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
						<Command.Input
							placeholder="Cerca pagine, soci, azioni..."
							className="flex h-12 w-full bg-transparent text-sm text-popover-foreground outline-none placeholder:text-muted-foreground"
							autoFocus
						/>
					</div>

					<Command.List className="max-h-80 overflow-y-auto p-2">
						<Command.Empty className="py-6 text-center text-sm text-muted-foreground">
							Nessun risultato trovato.
						</Command.Empty>

						{/* Navigazione */}
						<Command.Group
							heading="Navigazione"
							className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
						>
							{[
								{ label: "Home", icon: Home, href: "/" },
								{ label: "Soci", icon: Users, href: "/soci" },
								{ label: "Quote", icon: CreditCard, href: "/quote" },
								{ label: "Calendario", icon: CalendarDays, href: "/calendario" },
								{ label: "Corsi", icon: GraduationCap, href: "/corsi" },
								{ label: "Eventi", icon: Calendar, href: "/eventi" },
								{ label: "Documenti", icon: FileText, href: "/documenti" },
								{ label: "AI Assistant", icon: Bot, href: "/ai" },
								{ label: "Impostazioni", icon: Settings, href: "/impostazioni" },
							].map((item) => {
								const Icon = item.icon;
								return (
									<Command.Item
										key={item.href}
										value={item.label}
										onSelect={() => runAction(() => router.push(item.href))}
										className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground aria-selected:bg-muted"
									>
										<Icon className="h-4 w-4 text-muted-foreground" />
										{item.label}
									</Command.Item>
								);
							})}
						</Command.Group>

						{/* Soci */}
						<Command.Group
							heading="Soci"
							className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
						>
							<Command.Item
								value="Mario Rossi"
								onSelect={() => runAction(() => router.push("/soci/1"))}
								className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground aria-selected:bg-muted"
							>
								<Users className="h-4 w-4 text-muted-foreground" />
								Mario Rossi
								<span className="ml-auto text-xs text-muted-foreground">SOC-001</span>
							</Command.Item>
							<Command.Item
								value="Luca Bianchi"
								onSelect={() => runAction(() => router.push("/soci/2"))}
								className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground aria-selected:bg-muted"
							>
								<Users className="h-4 w-4 text-muted-foreground" />
								Luca Bianchi
								<span className="ml-auto text-xs text-muted-foreground">SOC-002</span>
							</Command.Item>
						</Command.Group>

						{/* Azioni */}
						<Command.Group
							heading="Azioni"
							className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
						>
							<Command.Item
								value="Nuovo Socio"
								onSelect={() => runAction(() => router.push("/soci/nuovo"))}
								className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground aria-selected:bg-muted"
							>
								<Plus className="h-4 w-4 text-muted-foreground" />
								Nuovo Socio
							</Command.Item>
							<Command.Item
								value="Apri AI Assistant"
								onSelect={() =>
									runAction(() => {
										useUIStore.getState().setAiDrawerOpen(true);
									})
								}
								className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-popover-foreground aria-selected:bg-muted"
							>
								<Bot className="h-4 w-4 text-muted-foreground" />
								Apri AI Assistant
								<kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
									⌘J
								</kbd>
							</Command.Item>
						</Command.Group>
					</Command.List>

					{/* Footer */}
					<div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
						<span>Naviga con ↑↓ e premi Invio per selezionare</span>
						<span>Esc per chiudere</span>
					</div>
				</Command>
			</div>
		</>
	);
}
