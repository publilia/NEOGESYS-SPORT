"use client";

import { PaletteSelector } from "@/components/palette-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUIStore } from "@/lib/store";
import {
	Bell,
	ChevronDown,
	LogOut,
	Menu,
	MessageSquare,
	Search,
	Settings,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AppHeaderProps {
	onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
	const { setCommandPaletteOpen } = useUIStore();
	const [showNotifications, setShowNotifications] = useState(false);
	const [showProfile, setShowProfile] = useState(false);
	const notifRef = useRef<HTMLDivElement>(null);
	const profileRef = useRef<HTMLDivElement>(null);

	// Close dropdowns on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
				setShowNotifications(false);
			}
			if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
				setShowProfile(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<header className="sticky top-0 z-40 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			{/* Left: Hamburger + Logo */}
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onToggleSidebar}
					className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted lg:flex"
					aria-label="Toggle menu"
				>
					<Menu className="h-5 w-5 text-foreground" />
				</button>

				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
						NS
					</div>
					<span className="hidden text-sm font-semibold text-foreground sm:inline-block">
						NeoGesys Sport
					</span>
				</div>
			</div>

			{/* Center: Command palette trigger */}
			<div className="mx-4 flex-1">
				<button
					type="button"
					onClick={() => setCommandPaletteOpen(true)}
					className="mx-auto flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground hover:bg-muted"
				>
					<Search className="h-4 w-4" />
					<span className="flex-1 text-left">Cerca...</span>
					<kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
						⌘K
					</kbd>
				</button>
			</div>

			{/* Right: Actions */}
			<div className="flex items-center gap-1">
				{/* Notifications */}
				<div ref={notifRef} className="relative">
					<button
						type="button"
						onClick={() => setShowNotifications(!showNotifications)}
						className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted"
						aria-label="Notifiche"
					>
						<Bell className="h-5 w-5 text-foreground" />
						<span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
							3
						</span>
					</button>

					{showNotifications && (
						<div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-popover p-4 shadow-lg">
							<h3 className="mb-3 text-sm font-semibold text-popover-foreground">Notifiche</h3>
							<div className="space-y-3">
								{[
									{
										text: "3 certificati medici in scadenza",
										time: "2 ore fa",
									},
									{
										text: "Nuovo socio registrato: Laura Bianchi",
										time: "5 ore fa",
									},
									{
										text: "Pagamento ricevuto da Mario Rossi",
										time: "1 giorno fa",
									},
								].map((n, i) => (
									<div key={i} className="flex items-start gap-3 rounded-md p-2 hover:bg-muted">
										<div className="mt-1 h-2 w-2 rounded-full bg-primary" />
										<div>
											<p className="text-sm text-popover-foreground">{n.text}</p>
											<p className="text-xs text-muted-foreground">{n.time}</p>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Messages */}
				<button
					type="button"
					className="hidden h-9 w-9 items-center justify-center rounded-md hover:bg-muted sm:inline-flex"
					aria-label="Messaggi"
				>
					<MessageSquare className="h-5 w-5 text-foreground" />
				</button>

				{/* Palette selector */}
				<PaletteSelector />

				{/* Theme toggle */}
				<ThemeToggle />

				{/* Profile dropdown */}
				<div ref={profileRef} className="relative ml-1">
					<button
						type="button"
						onClick={() => setShowProfile(!showProfile)}
						className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
					>
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
							MR
						</div>
						<ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
					</button>

					{showProfile && (
						<div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-popover py-1 shadow-lg">
							<div className="border-b border-border px-4 py-3">
								<p className="text-sm font-medium text-popover-foreground">Mario Rossi</p>
								<p className="text-xs text-muted-foreground">mario@asdnapoli.it</p>
							</div>
							<button
								type="button"
								className="flex w-full items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-muted"
							>
								<User className="h-4 w-4" />
								Profilo
							</button>
							<button
								type="button"
								className="flex w-full items-center gap-2 px-4 py-2 text-sm text-popover-foreground hover:bg-muted"
							>
								<Settings className="h-4 w-4" />
								Impostazioni
							</button>
							<div className="border-t border-border">
								<button
									type="button"
									className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted"
								>
									<LogOut className="h-4 w-4" />
									Esci
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</header>
	);
}
