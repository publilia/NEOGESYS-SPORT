"use client";

import { AIDrawer } from "@/components/ai-drawer";
import { CommandPalette } from "@/components/command-palette";
import { AppHeader } from "@/components/layout/app-header";
import { MobileDrawer } from "@/components/layout/mobile-drawer";
import { PlatformContextEmpty } from "@/components/layout/platform-context-empty";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { useLayout } from "@/hooks/use-layout";
import { useCurrentUser } from "@/lib/current-user";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

/**
 * Rotte consentite quando il super_admin è nel contesto "NEOGESYS Platform"
 * (cioè non sta impersonando nessun tenant). Qualsiasi altra rotta sotto
 * (dashboard) è tenant-scoped e, senza un tenant selezionato, fallirebbe
 * con "Failed to fetch" perché il client tRPC non invia l'header tenant.
 * Vedi apps/web/src/lib/trpc.ts e components/layout/platform-context-empty.tsx.
 *
 * Nota: `/` è consentita perché la dashboard ha un branch "Platform context"
 * che mostra metriche cross-tenant invece dei KPI del singolo tenant.
 * `/impostazioni` NON è consentita: è interamente tenant-scoped (piano,
 * branding, società) → super_admin deve impersonare prima.
 */
const PLATFORM_ALLOWED_ROUTES = ["/", "/tenants", "/billing", "/system", "/audit"];

export default function DashboardLayout({ children }: { children: ReactNode }) {
	const { layoutMode, sidebarCollapsed, toggleSidebarCollapsed } = useLayout();
	const { current } = useCurrentUser();
	const pathname = usePathname() ?? "/";

	// Set data-layout attribute on body to trigger CSS rules
	useEffect(() => {
		document.body.setAttribute("data-layout", layoutMode);
		return () => {
			document.body.removeAttribute("data-layout");
		};
	}, [layoutMode]);

	const isPlatformContext = current.tenant === "NEOGESYS Platform";
	const isAllowedOnPlatform = PLATFORM_ALLOWED_ROUTES.some(
		(r) => pathname === r || pathname.startsWith(r + "/"),
	);
	const showPlatformEmpty = isPlatformContext && !isAllowedOnPlatform;

	return (
		<div className="app-shell">
			<AppHeader onToggleSidebar={toggleSidebarCollapsed} />

			{layoutMode === "topbar" && <TopNav />}

			<div className="app-body">
				{layoutMode === "sidebar" && (
					<Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebarCollapsed} />
				)}

				<main className="app-main" id="main-content">
					{showPlatformEmpty ? <PlatformContextEmpty pathname={pathname} /> : children}
				</main>
			</div>

			{/* Mobile drawer */}
			<MobileDrawer />

			{/* Command palette (Cmd+K) */}
			<CommandPalette />

			{/* AI Assistant drawer (Cmd+J) */}
			<AIDrawer />
		</div>
	);
}
