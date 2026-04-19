"use client";

import { Bell, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

export function PortaleHeader() {
	const { theme, setTheme } = useTheme();
	const [showNotifications, setShowNotifications] = useState(false);

	const notificheNonLette = 2;

	return (
		<header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
			<div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
				{/* Tenant logo + name */}
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<span className="text-sm font-bold">PS</span>
					</div>
					<div className="hidden sm:block">
						<p className="text-sm font-semibold text-foreground leading-tight">Portale Socio</p>
						<p className="text-xs text-muted-foreground leading-tight">ASD Sportiva Milano</p>
					</div>
				</div>

				{/* Right side actions */}
				<div className="flex items-center gap-2">
					{/* Socio name */}
					<div className="mr-2 hidden items-center gap-2 md:flex">
						<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
							<User className="h-3.5 w-3.5" />
						</div>
						<span className="text-sm font-medium text-foreground">Marco Rossi</span>
					</div>

					{/* Notifications bell */}
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowNotifications(!showNotifications)}
							className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
							aria-label="Notifiche"
						>
							<Bell className="h-4 w-4" />
							{notificheNonLette > 0 && (
								<span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
									{notificheNonLette}
								</span>
							)}
						</button>

						{showNotifications && (
							<div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-lg">
								<p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Notifiche
								</p>
								<div className="space-y-1">
									<button
										type="button"
										className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent/50"
									>
										<p className="text-sm font-medium text-foreground">Cambio orario lezione</p>
										<p className="text-xs text-muted-foreground">2 minuti fa</p>
									</button>
									<button
										type="button"
										className="w-full rounded-lg px-3 py-2 text-left hover:bg-accent/50"
									>
										<p className="text-sm font-medium text-foreground">Quota in scadenza</p>
										<p className="text-xs text-muted-foreground">2 ore fa</p>
									</button>
								</div>
							</div>
						)}
					</div>

					{/* Theme toggle */}
					<button
						type="button"
						onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
						className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
						aria-label="Cambia tema"
					>
						<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
						<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					</button>

					{/* Logout */}
					<button
						type="button"
						onClick={() => {
							localStorage.removeItem("portale-socio-token");
							window.location.href = "/login";
						}}
						className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
						aria-label="Esci"
					>
						<LogOut className="h-4 w-4" />
					</button>
				</div>
			</div>
		</header>
	);
}
