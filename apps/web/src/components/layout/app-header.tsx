"use client";

import { NeogesysLogoHorizontal } from "@/components/brand/neogesys-mark";
import { TenantMenu } from "@/components/layout/tenant-menu";
import { PaletteSelector } from "@/components/palette-selector";
import { QuasarMenu } from "@/components/quasar-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { NEOGESYS_SECTOR } from "@/lib/brand";
import { getRoleInfo, useCurrentUser } from "@/lib/current-user";
import { useUIStore } from "@/lib/store";
import { Bell, ChevronDown, Inbox, LogOut, Menu, Search, Settings, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AppHeaderProps {
	onToggleSidebar: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
	const { setCommandPaletteOpen } = useUIStore();
	const { current } = useCurrentUser();
	const roleInfo = getRoleInfo(current.role);
	const [showNotifications, setShowNotifications] = useState(false);
	const [showProfile, setShowProfile] = useState(false);
	const notifRef = useRef<HTMLDivElement>(null);
	const profileRef = useRef<HTMLDivElement>(null);

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
		<header className="app-header">
			{/* Left: Hamburger + Logo + Tenant */}
			<div className="header-left">
				<button
					type="button"
					onClick={onToggleSidebar}
					className="btn btn-ghost btn-icon"
					aria-label="Menu"
				>
					<Menu className="icon-lg" />
				</button>

				<a href="/" className="logo logo-horizontal" aria-label={`NEOGESYS ${NEOGESYS_SECTOR}`}>
					<span className="logo-horizontal-wrap" aria-hidden="true">
						<NeogesysLogoHorizontal size="100%" ariaHidden />
					</span>
					<span className="logo-sector">{NEOGESYS_SECTOR}</span>
				</a>

				{/* Menu tenant — info, piano, switcher per super_admin.
				    Sostituisce la vecchia label statica. */}
				<TenantMenu />
			</div>

			{/* Center: Command palette trigger */}
			<button type="button" onClick={() => setCommandPaletteOpen(true)} className="header-search">
				<Search className="icon" />
				<span>Cerca soci, corsi, azioni...</span>
				<kbd>⌘K</kbd>
			</button>

			{/* Right: Actions */}
			<div className="header-right">
				{/* Notifications */}
				<div ref={notifRef} className="relative">
					<button
						type="button"
						onClick={() => setShowNotifications(!showNotifications)}
						className="btn btn-ghost btn-icon"
						aria-label="Notifiche"
					>
						<Bell className="icon-lg" />
						<span className="notification-dot">3</span>
					</button>

					{showNotifications && (
						<div className="popover" style={{ top: "3.5rem", right: 0, width: "20rem" }}>
							<div className="popover-label">Notifiche</div>
							{[
								{ text: "3 certificati medici in scadenza", time: "2 ore fa" },
								{ text: "Nuovo socio registrato: Laura Bianchi", time: "5 ore fa" },
								{ text: "Pagamento ricevuto da Mario Rossi", time: "1 giorno fa" },
							].map((n, i) => (
								<button
									key={i}
									type="button"
									className="popover-item"
									style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.25rem" }}
								>
									<span style={{ fontSize: "0.8125rem" }}>{n.text}</span>
									<span style={{ fontSize: "0.6875rem", color: "hsl(var(--muted-foreground))" }}>
										{n.time}
									</span>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Messages */}
				<button
					type="button"
					className="btn btn-ghost btn-icon"
					aria-label="Messaggi"
					title="Messaggi"
				>
					<Inbox className="icon-lg" />
				</button>

				{/* Palette selector */}
				<PaletteSelector />

				{/* Theme toggle */}
				<ThemeToggle />

				{/* Profile dropdown */}
				<div ref={profileRef} className="relative">
					<button
						type="button"
						onClick={() => setShowProfile(!showProfile)}
						className="btn btn-ghost"
						style={{ padding: "0.25rem 0.5rem 0.25rem 0.25rem", gap: "0.5rem" }}
					>
						<div className="avatar">{current.initials}</div>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								lineHeight: 1.15,
								minWidth: 0,
							}}
						>
							<span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>{current.name}</span>
							<span
								className={`badge ${roleInfo.badgeCls}`}
								style={{ fontSize: "0.625rem", padding: "0 0.375rem", lineHeight: "1rem" }}
							>
								{roleInfo.label}
							</span>
						</div>
						<ChevronDown className="icon-sm" />
					</button>

					{showProfile && (
						<div className="popover" style={{ top: "3.5rem", right: 0, width: "17rem" }}>
							<div
								style={{
									padding: "0.75rem",
									display: "flex",
									gap: "0.625rem",
									alignItems: "center",
								}}
							>
								<div className="avatar" style={{ width: "2.5rem", height: "2.5rem" }}>
									{current.initials}
								</div>
								<div style={{ minWidth: 0, flex: 1 }}>
									<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{current.name}</div>
									<div
										style={{
											fontSize: "0.75rem",
											color: "hsl(var(--muted-foreground))",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{current.email}
									</div>
									<span
										className={`badge ${roleInfo.badgeCls}`}
										style={{ fontSize: "0.625rem", marginTop: "0.25rem" }}
									>
										{roleInfo.label}
									</span>
								</div>
							</div>
							<div
								style={{
									fontSize: "0.75rem",
									color: "hsl(var(--muted-foreground))",
									padding: "0 0.75rem 0.5rem",
								}}
							>
								{roleInfo.description}
							</div>
							<div className="popover-divider" />
							<button type="button" className="popover-item">
								<User className="icon" /> Il mio profilo
							</button>
							<a href="/impostazioni" className="popover-item">
								<Settings className="icon" /> Impostazioni
							</a>
							<div className="popover-divider" />
							<a
								href="/login"
								className="popover-item"
								style={{ color: "hsl(var(--destructive))" }}
							>
								<LogOut className="icon" /> Cambia ruolo / Esci
							</a>
						</div>
					)}
				</div>

				{/* Quasar menu — a destra dell'avatar utente.
				    Centralizza crediti AI, piano attivo, stato sistema, stack,
				    aggiornamenti e changelog. Voluto qui per essere l'ultimo
				    punto visivo della barra: "la stella della NEOGESYS suite". */}
				<QuasarMenu />
			</div>
		</header>
	);
}
