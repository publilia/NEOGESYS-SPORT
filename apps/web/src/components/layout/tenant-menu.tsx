"use client";

import { getRoleInfo, useCurrentUser } from "@/lib/current-user";
import { trpc } from "@/lib/trpc";
import {
	Building2,
	Check,
	ChevronDown,
	CreditCard,
	ExternalLink,
	Globe,
	Loader2,
	Palette,
	Sparkles,
	UserCog,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Header tenant menu.
 *
 * Sostituisce la vecchia label statica "tenant · ruolo" con un dropdown
 * funzionale:
 *
 *  - admin_tenant / coordinatore / operatore / ... :
 *      → info tenant (nome, piano, stato), trial countdown, link rapidi
 *        (branding, piano, impostazioni), identità ruolo corrente.
 *
 *  - super_admin:
 *      → stesso contenuto MA con uno "switcher impersonation" che elenca
 *        gli ultimi 10 tenant e permette di simulare il login su uno di
 *        essi, cambiando il contesto della UI. Il contesto attivo è
 *        marcato con ✓.
 *
 * Tecnicamente è un bottone + popover con click-outside-to-close, uniforme
 * al notif / profile dropdown dell'AppHeader.
 */
export function TenantMenu() {
	const { current } = useCurrentUser();
	const roleInfo = getRoleInfo(current.role);
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const isSuperAdmin = current.role === "super_admin";

	// Tenant corrente: solo per utenti tenant. Super admin non ne ha uno fisso
	// (impersona), quindi saltiamo la query.
	const tenantQuery = trpc.tenant.getCurrent.useQuery(undefined, {
		enabled: !isSuperAdmin,
		retry: false,
	});

	// Lista tenant: solo per super_admin.
	const tenantsListQuery = trpc.tenant.list.useQuery(
		{ page: 1, perPage: 10 },
		{ enabled: isSuperAdmin && open, retry: false },
	);

	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const tenant = tenantQuery.data;
	const pianoColor = getPianoColor(tenant?.piano);

	return (
		<div ref={wrapperRef} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="tenant-menu-btn"
				title="Menu tenant"
			>
				<Building2 className="icon-sm" style={{ color: "hsl(var(--primary))" }} />
				<span className="tenant-menu-label">
					<span className="tenant-menu-name">
						{isSuperAdmin ? "NEOGESYS Platform" : current.tenant}
					</span>
					<span className="tenant-menu-role">
						{isSuperAdmin ? "Impersonation" : roleInfo.label}
					</span>
				</span>
				<ChevronDown className="icon-sm" style={{ opacity: 0.6 }} />
			</button>

			{open && (
				<div
					className="popover"
					style={{ top: "3.5rem", left: 0, width: "22rem", maxHeight: "min(80vh, 560px)", overflowY: "auto" }}
				>
					{/* Header */}
					<div
						style={{
							padding: "1rem",
							background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.12))",
							borderBottom: "1px solid hsl(var(--border))",
						}}
					>
						<div
							style={{
								fontSize: "0.6875rem",
								letterSpacing: "0.08em",
								textTransform: "uppercase",
								opacity: 0.6,
							}}
						>
							{isSuperAdmin ? "Contesto impersonation" : "Tenant attivo"}
						</div>

						{/* Tenant name row */}
						<div
							style={{
								marginTop: "0.375rem",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "0.5rem",
							}}
						>
							<div style={{ minWidth: 0 }}>
								<div
									style={{
										fontWeight: 700,
										fontSize: "1rem",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									{isSuperAdmin ? "NEOGESYS Platform" : (tenant?.ragioneSociale ?? current.tenant)}
								</div>
								<div
									style={{
										fontSize: "0.75rem",
										color: "hsl(var(--muted-foreground))",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
									}}
								>
									{isSuperAdmin ? "Super Admin — accesso a tutti i tenant" : (tenant?.slug ?? "—")}
								</div>
							</div>

							{!isSuperAdmin && tenant?.piano ? (
								<span
									style={{
										padding: "0.125rem 0.5rem",
										background: pianoColor.bg,
										color: pianoColor.fg,
										fontSize: "0.6875rem",
										fontWeight: 700,
										borderRadius: "9999px",
										textTransform: "uppercase",
										letterSpacing: "0.05em",
										whiteSpace: "nowrap",
									}}
								>
									{tenant.piano}
								</span>
							) : null}
						</div>

						{/* Trial countdown */}
						{!isSuperAdmin && tenant?.stato === "trial" && tenant.trialEnd ? (
							<TrialBadge end={tenant.trialEnd} />
						) : null}
					</div>

					{/* Quick actions — tenant-level */}
					{!isSuperAdmin ? (
						<>
							<div className="popover-label">Gestione tenant</div>
							<a href="/impostazioni" className="popover-item" style={{ textDecoration: "none" }}>
								<Building2 className="icon" /> Anagrafica & sede legale
							</a>
							<a href="/impostazioni#branding" className="popover-item" style={{ textDecoration: "none" }}>
								<Palette className="icon" /> Branding & palette
							</a>
							<a href="/impostazioni#piano" className="popover-item" style={{ textDecoration: "none" }}>
								<CreditCard className="icon" /> Piano & fatturazione
							</a>
							<a href="/utenti" className="popover-item" style={{ textDecoration: "none" }}>
								<UserCog className="icon" /> Utenti & ruoli
							</a>
							{tenant?.customDomain ? (
								<a
									href={`https://${tenant.customDomain}`}
									target="_blank"
									rel="noopener noreferrer"
									className="popover-item"
									style={{ textDecoration: "none" }}
								>
									<Globe className="icon" /> {tenant.customDomain}
									<ExternalLink className="icon-sm" style={{ marginLeft: "auto", opacity: 0.5 }} />
								</a>
							) : null}
						</>
					) : null}

					{/* Super admin: tenant switcher */}
					{isSuperAdmin ? (
						<>
							<div className="popover-label">Impersonation · scegli tenant</div>
							{tenantsListQuery.isLoading ? (
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.5rem",
										padding: "0.75rem",
										fontSize: "0.8125rem",
										color: "hsl(var(--muted-foreground))",
									}}
								>
									<Loader2 className="icon-sm animate-spin" />
									Caricamento tenant…
								</div>
							) : null}

							{tenantsListQuery.isError ? (
								<div
									style={{
										padding: "0.75rem",
										fontSize: "0.75rem",
										color: "hsl(var(--destructive))",
									}}
								>
									Impossibile caricare la lista tenant. Riprovare più tardi.
								</div>
							) : null}

							{(tenantsListQuery.data?.items ?? []).map((t) => (
								<a
									key={t.id}
									href={`/tenants/${t.id}`}
									className="popover-item"
									style={{
										justifyContent: "space-between",
										textDecoration: "none",
										gap: "0.5rem",
									}}
								>
									<span
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.5rem",
											minWidth: 0,
											flex: 1,
										}}
									>
										<Building2 className="icon-sm" />
										<span
											style={{
												minWidth: 0,
												display: "flex",
												flexDirection: "column",
												lineHeight: 1.15,
											}}
										>
											<span
												style={{
													fontSize: "0.8125rem",
													fontWeight: 600,
													whiteSpace: "nowrap",
													overflow: "hidden",
													textOverflow: "ellipsis",
												}}
											>
												{t.ragioneSociale}
											</span>
											<span
												style={{
													fontSize: "0.6875rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{t.slug} · {t.piano}
											</span>
										</span>
									</span>
									{t.stato === "attivo" ? (
										<Check className="icon-sm" style={{ color: "hsl(142 71% 40%)" }} />
									) : (
										<span
											style={{
												fontSize: "0.625rem",
												padding: "0 0.375rem",
												borderRadius: "9999px",
												background:
													t.stato === "sospeso"
														? "hsl(var(--destructive) / 0.15)"
														: "hsl(var(--muted))",
												color:
													t.stato === "sospeso"
														? "hsl(var(--destructive))"
														: "hsl(var(--muted-foreground))",
												textTransform: "uppercase",
												letterSpacing: "0.04em",
											}}
										>
											{t.stato}
										</span>
									)}
								</a>
							))}

							<div className="popover-divider" />
							<a href="/tenants" className="popover-item" style={{ textDecoration: "none" }}>
								<Building2 className="icon" /> Tutti i tenant
								<ChevronDown className="icon-sm" style={{ marginLeft: "auto", transform: "rotate(-90deg)", opacity: 0.5 }} />
							</a>
							<a href="/billing" className="popover-item" style={{ textDecoration: "none" }}>
								<CreditCard className="icon" /> Billing piattaforma
							</a>
						</>
					) : null}

					{/* Ecosistema teaser (solo se > 1 installato) */}
					<EcosystemTeaser enabled={!isSuperAdmin} />

					<div className="popover-divider" />
					<div
						style={{
							padding: "0.5rem 0.75rem",
							fontSize: "0.6875rem",
							color: "hsl(var(--muted-foreground))",
							display: "flex",
							alignItems: "center",
							gap: "0.375rem",
						}}
					>
						<Sparkles className="icon-sm" style={{ opacity: 0.6 }} />
						<span>Ruolo: <strong>{roleInfo.label}</strong></span>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function TrialBadge({ end }: { end: Date | string }) {
	const endDate = typeof end === "string" ? new Date(end) : end;
	const now = new Date();
	const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
	const critical = daysLeft <= 3;
	return (
		<div
			style={{
				marginTop: "0.5rem",
				padding: "0.375rem 0.625rem",
				background: critical
					? "hsl(var(--destructive) / 0.15)"
					: "hsl(var(--warning, 38 92% 50%) / 0.15)",
				color: critical ? "hsl(var(--destructive))" : "hsl(38 92% 50%)",
				borderRadius: "0.375rem",
				fontSize: "0.75rem",
				fontWeight: 500,
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "0.5rem",
			}}
		>
			<span>Trial: {daysLeft} giorni rimanenti</span>
			<a
				href="/impostazioni#piano"
				style={{
					fontWeight: 700,
					textDecoration: "underline",
					textUnderlineOffset: "2px",
				}}
			>
				Upgrade
			</a>
		</div>
	);
}

function EcosystemTeaser({ enabled }: { enabled: boolean }) {
	const query = trpc.ecosystem.listInstalled.useQuery(undefined, {
		enabled,
		retry: false,
	});
	const installed = query.data?.filter((a) => !a.current && a.meta) ?? [];
	if (!enabled || installed.length === 0) return null;

	return (
		<>
			<div className="popover-divider" />
			<div className="popover-label">Ecosistema NEOGESYS</div>
			{installed.map((i) => {
				const m = i.meta;
				if (!m) return null;
				return (
					<a
						key={m.id}
						href={m.url}
						target="_blank"
						rel="noopener noreferrer"
						className="popover-item"
						style={{ textDecoration: "none" }}
					>
						<Sparkles className="icon" style={{ color: m.color }} />
						{m.name}
						<ExternalLink className="icon-sm" style={{ marginLeft: "auto", opacity: 0.5 }} />
					</a>
				);
			})}
		</>
	);
}

function getPianoColor(piano: string | null | undefined): { bg: string; fg: string } {
	switch (piano) {
		case "enterprise":
			return { bg: "hsl(328 86% 60% / 0.18)", fg: "hsl(328 86% 60%)" };
		case "pro":
			return { bg: "hsl(272 82% 58% / 0.18)", fg: "hsl(272 82% 58%)" };
		case "base":
			return { bg: "hsl(199 89% 48% / 0.18)", fg: "hsl(199 89% 48%)" };
		case "trial":
			return { bg: "hsl(38 92% 50% / 0.18)", fg: "hsl(38 92% 50%)" };
		case "free":
			return { bg: "hsl(210 10% 50% / 0.18)", fg: "hsl(210 10% 50%)" };
		default:
			return { bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" };
	}
}
