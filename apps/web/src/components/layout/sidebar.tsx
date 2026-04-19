"use client";

import { ROLE_NAV_PERMISSIONS, useCurrentUser } from "@/lib/current-user";
import { useUIStore } from "@/lib/store";
import { trpc } from "@/lib/trpc";
import { APP_VERSION, formatReleaseDateTime } from "@/lib/version";
import {
	Activity,
	Briefcase,
	Building2,
	BookOpen,
	Calculator,
	Calendar,
	CreditCard,
	DollarSign,
	ExternalLink,
	FileText,
	HeartPulse,
	IdCard,
	LayoutDashboard,
	type LucideIcon,
	Mail,
	MapPin,
	Megaphone,
	Plug,
	Settings,
	Shield,
	Sparkles,
	Stethoscope,
	Trophy,
	UserCog,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
	href: string;
	label: string;
	icon: LucideIcon;
	badge?: string;
}

// Sezione "Piattaforma" — visibile solo a super_admin
const PLATFORM_ITEMS: NavItem[] = [
	{ href: "/tenants", label: "Tenant", icon: Building2, badge: "8" },
	{ href: "/billing", label: "Billing", icon: DollarSign },
	{ href: "/system", label: "System Health", icon: Activity },
	{ href: "/audit", label: "Audit Log", icon: Shield },
];

// Sezione "Gestione" — tenant-level, visibile a tutti i ruoli del tenant
const TENANT_ITEMS: NavItem[] = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/soci", label: "Soci", icon: Users, badge: "247" },
	{ href: "/tessera", label: "Tessera digitale", icon: IdCard },
	{ href: "/quote", label: "Quote", icon: CreditCard },
	{ href: "/calendario", label: "Calendario", icon: Calendar },
	{ href: "/corsi", label: "Corsi", icon: BookOpen },
	{ href: "/eventi", label: "Eventi", icon: Trophy },
	{ href: "/documenti", label: "Documenti", icon: FileText },
	{ href: "/comunicazioni", label: "Comunicazioni", icon: Mail },
	{ href: "/contabilita", label: "Contabilità", icon: Calculator },
	{ href: "/integrazioni", label: "Integrazioni", icon: Plug },
	{ href: "/impostazioni", label: "Impostazioni", icon: Settings },
	{ href: "/utenti", label: "Utenti", icon: UserCog },
];

// ─── Ecosistema NEOGESYS ─────────────────────────────────────────────────────
// Il contratto di interoperabilità tra gestionali vive su `trpc.ecosystem.*`
// (apps/api/src/routes/ecosystem.ts). Il blocco UI qui sotto renderizza SOLO
// gli altri gestionali "installed" per il tenant corrente — quindi oggi, con
// solo Sport attivo, NON compare. Non appena verrà registrato un altro
// gestionale NEOGESYS per il tenant (via superAdmin.registerApp) apparirà
// automaticamente.

/** Map iconName string → LucideIcon React component. */
const ECOSYSTEM_ICON_MAP: Record<string, LucideIcon> = {
	Trophy,
	Megaphone,
	MapPin,
	Stethoscope,
	HeartPulse,
	Briefcase,
};

interface SidebarProps {
	collapsed: boolean;
	onToggle: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
	const pathname = usePathname();
	const { toggleAiDrawer } = useUIStore();
	const { current } = useCurrentUser();

	const isSuperAdmin = current.role === "super_admin";
	const allowedPaths = ROLE_NAV_PERMISSIONS[current.role];

	// Ecosistema — solo le app installate DIVERSE da Sport (Sport è già
	// il gestionale corrente). Se nessun'altra app è installata, la sezione
	// non viene renderizzata: niente chunk vuoti, niente teaser di cose
	// che non esistono per il tenant.
	const ecosystemQuery = trpc.ecosystem.listInstalled.useQuery(undefined, {
		retry: false,
		// Super admin su "NEOGESYS Platform" non ha un tenant → salta la query.
		enabled: current.tenant !== "NEOGESYS Platform",
	});
	const crossApps = (ecosystemQuery.data ?? []).filter((a) => !a.current && a.meta);
	// Dashboard "/" è sempre rimossa dall'elenco tenant perché compare in
	// testa a "Piattaforma" per super_admin; per gli altri la inseriamo
	// in cima alla sezione Gestione.
	const tenantItems = isSuperAdmin
		? TENANT_ITEMS // super_admin può impersonare qualunque tenant → vede tutto
		: TENANT_ITEMS.filter((item) => allowedPaths.includes(item.href));

	const renderItem = (item: NavItem) => {
		const Icon = item.icon;
		const isActive =
			pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
		return (
			<Link
				key={item.href}
				href={item.href}
				className={`nav-item${isActive ? " active" : ""}`}
				title={item.label}
			>
				<Icon className="icon" />
				<span className="nav-label">{item.label}</span>
				{item.badge && <span className="nav-badge">{item.badge}</span>}
			</Link>
		);
	};

	return (
		<aside className={`app-sidebar${collapsed ? " collapsed" : ""}`}>
			<nav className="sidebar-nav">
				{/* SEZIONE PIATTAFORMA — solo super_admin */}
				{isSuperAdmin && (
					<>
						<div
							className="nav-group-label"
							style={{ color: "hsl(var(--destructive))", display: "flex", alignItems: "center", gap: "0.375rem" }}
						>
							<Shield style={{ width: "0.75rem", height: "0.75rem" }} />
							Piattaforma
						</div>
						{PLATFORM_ITEMS.map(renderItem)}
					</>
				)}

				{/* SEZIONE GESTIONE — tenant-level */}
				<div className="nav-group-label">
					{isSuperAdmin ? "Gestione tenant (impersonation)" : "Gestione"}
				</div>
				{tenantItems.map(renderItem)}

				{/* ECOSISTEMA NEOGESYS — renderizzato SOLO se almeno un altro
				    gestionale della suite risulta installato per il tenant.
				    Data-source: trpc.ecosystem.listInstalled. */}
				{crossApps.length > 0 && (
					<>
						<div
							className="nav-divider"
							style={{
								margin: "0.75rem 0",
								borderTop: "1px solid hsl(var(--border))",
							}}
						/>
						<div
							className="nav-group-label"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.375rem",
								color: "hsl(var(--primary))",
							}}
						>
							<Sparkles style={{ width: "0.75rem", height: "0.75rem" }} />
							Ecosistema NEOGESYS
						</div>
						{crossApps.map((c) => {
							const meta = c.meta;
							if (!meta) return null;
							const Icon = ECOSYSTEM_ICON_MAP[meta.icon] ?? ExternalLink;
							return (
								<a
									key={meta.id}
									href={meta.url}
									target="_blank"
									rel="noopener noreferrer"
									className="nav-item"
									title={`${meta.name} · ${meta.description}`}
								>
									<Icon className="icon" />
									<span className="nav-label">{meta.name}</span>
									<span
										className="nav-badge"
										style={{
											background: "hsl(142 71% 40% / 0.15)",
											color: "hsl(142 71% 40%)",
										}}
									>
										on
									</span>
								</a>
							);
						})}
					</>
				)}

				{/* AI ASSISTANT */}
				<div className="nav-group-label">AI</div>
				<button
					type="button"
					className="nav-item"
					onClick={toggleAiDrawer}
					title="AI Assistente (⌘J)"
				>
					<Sparkles className="icon" />
					<span className="nav-label">AI Assistente</span>
					<kbd
						style={{
							marginLeft: "auto",
							fontSize: "0.625rem",
							padding: "0.0625rem 0.25rem",
							background: "hsl(var(--muted))",
							borderRadius: "0.25rem",
						}}
					>
						⌘J
					</kbd>
				</button>
			</nav>

			{/* Footer — versione release. La stringa viene aggiornata dallo
			    script scripts/release.mjs che riallinea VERSION + CHANGELOG +
			    apps/web/src/lib/version.ts. Nel sidebar collapsed nascondiamo
			    l'etichetta. */}
			<div className="sidebar-footer">
				<span
					className="sidebar-version"
					title={`Release ${APP_VERSION} · ${formatReleaseDateTime()}`}
				>
					v{APP_VERSION}
				</span>
				<span className="sidebar-version-build" title={formatReleaseDateTime()}>
					dev
				</span>
			</div>
		</aside>
	);
}
