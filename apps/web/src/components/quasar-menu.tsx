"use client";

import { NeogesysMarkMinimal } from "@/components/brand/neogesys-mark";
import { useCurrentUser } from "@/lib/current-user";
import { trpc } from "@/lib/trpc";
import {
	APP_RELEASE_DATE,
	APP_RELEASE_TIME,
	APP_VERSION,
	formatReleaseDateTime,
} from "@/lib/version";
import {
	Activity,
	ArrowUpRight,
	CheckCircle2,
	Coins,
	Database,
	GitBranch,
	HardDrive,
	LifeBuoy,
	Link as LinkIcon,
	Package,
	RefreshCw,
	Server,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Quasar Star button + dropdown.
 *
 * Sits in the top header next to the user avatar. Acts as the primary
 * access point for cross-cutting concerns that don't belong in a
 * specific gestionale section:
 *  - Crediti AI rimanenti e piano attivo
 *  - Assistenza / supporto
 *  - Informazioni sullo stack tecnologico
 *  - Stato server / database (live ping)
 *  - Aggiornamenti manuali / automatici
 *  - Upgrade piano
 *
 * Animated with a pulsing quasar-pulse CSS keyframe (see globals.css).
 */
export function QuasarMenu() {
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const { current } = useCurrentUser();

	// Per super_admin il piano si gestisce da Billing (vista cross-tenant).
	// Per tenant user c'è la pagina di upgrade self-service dedicata.
	const upgradePianoHref = current.role === "super_admin" ? "/billing" : "/impostazioni/piano";

	// Skippa la fetch se siamo nel contesto "NEOGESYS Platform" — il client tRPC
	// non invia l'header tenant (vedi lib/trpc.ts) e l'API risponderebbe 401.
	// In quel caso mostriamo "Trial" come fallback pacifico.
	const isPlatformContext = current.tenant === "NEOGESYS Platform";
	const tenantQuery = trpc.tenant.getCurrent.useQuery(undefined, {
		retry: false,
		enabled: !isPlatformContext,
	});

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
	const piano = tenant?.piano ?? "trial";

	// Placeholder metrics — in production these would come from a dedicated
	// `/api/health` endpoint. Values here are realistic stand-ins.
	const crediti = {
		aiUsati: 142,
		aiLimite: 500,
	};
	const aiPercent = Math.min(100, Math.round((crediti.aiUsati / crediti.aiLimite) * 100));

	const pianoMeta: Record<string, { label: string; color: string; features: number }> = {
		trial: { label: "Trial", color: "hsl(38 92% 50%)", features: 8 },
		free: { label: "Free", color: "hsl(210 10% 50%)", features: 6 },
		base: { label: "Base", color: "hsl(199 89% 48%)", features: 12 },
		pro: { label: "Pro", color: "hsl(272 82% 58%)", features: 22 },
		enterprise: { label: "Enterprise", color: "hsl(328 86% 60%)", features: 40 },
	};
	const fallbackPiano = { label: "Trial", color: "hsl(38 92% 50%)", features: 8 };
	const pianoInfo = pianoMeta[piano] ?? fallbackPiano;

	return (
		<div ref={wrapperRef} className="relative">
			<button
				type="button"
				className="quasar-btn"
				aria-label="Menu Quasar · crediti, piano, status"
				title="Quasar · NEOGESYS"
				onClick={() => setOpen(!open)}
			>
				{/* Icona = quasar NEOGESYS minimal (currentColor → eredita bianco dal
				    bottone). Pulsa sempre via `.quasar-btn .quasar-btn-mark` in
				    globals.css (scale + opacity ~2.4s, sincronizzata con l'alone
				    esterno box-shadow). */}
				<NeogesysMarkMinimal className="quasar-btn-mark" size="1.35rem" ariaHidden />
			</button>

			{open && (
				<div
					className="popover"
					style={{
						top: "3.5rem",
						right: 0,
						width: "22rem",
						maxHeight: "min(80vh, 640px)",
						overflowY: "auto",
					}}
				>
					{/* Hero: piano */}
					<div
						style={{
							padding: "1rem",
							background: "linear-gradient(135deg, hsl(272 82% 58%) 0%, hsl(328 86% 60%) 100%)",
							color: "white",
						}}
					>
						<div
							style={{
								fontSize: "0.6875rem",
								letterSpacing: "0.08em",
								opacity: 0.85,
								textTransform: "uppercase",
							}}
						>
							Piano attivo
						</div>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginTop: "0.25rem",
							}}
						>
							<div style={{ fontWeight: 700, fontSize: "1.25rem" }}>{pianoInfo.label}</div>
							<span
								style={{
									padding: "0.125rem 0.5rem",
									background: "rgba(255,255,255,0.25)",
									borderRadius: "9999px",
									fontSize: "0.6875rem",
									fontWeight: 600,
								}}
							>
								{pianoInfo.features} features
							</span>
						</div>
						<Link
							href={upgradePianoHref}
							onClick={() => setOpen(false)}
							className="btn"
							style={{
								marginTop: "0.75rem",
								padding: "0.375rem 0.75rem",
								background: "rgba(255,255,255,0.95)",
								color: "hsl(272 82% 30%)",
								fontWeight: 600,
								fontSize: "0.8125rem",
								width: "100%",
								textDecoration: "none",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.375rem",
							}}
						>
							<ArrowUpRight className="icon" /> Upgrade piano
						</Link>
					</div>

					{/* Crediti AI */}
					<div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								fontSize: "0.8125rem",
								fontWeight: 600,
							}}
						>
							<span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
								<Coins className="icon-sm" style={{ color: "hsl(var(--primary))" }} />
								Crediti AI
							</span>
							<span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
								{crediti.aiUsati} / {crediti.aiLimite}
							</span>
						</div>
						<div
							style={{
								marginTop: "0.375rem",
								height: "0.375rem",
								borderRadius: "9999px",
								background: "hsl(var(--muted))",
								overflow: "hidden",
							}}
						>
							<div
								style={{
									width: `${aiPercent}%`,
									height: "100%",
									background: "linear-gradient(90deg, hsl(272 82% 58%), hsl(328 86% 60%))",
								}}
							/>
						</div>
					</div>

					{/* Status server + db (live ping placeholder) */}
					<div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
						<div className="popover-label" style={{ padding: 0, marginBottom: "0.5rem" }}>
							Stato sistema
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
							<StatusRow icon={Server} label="API" ok detail="200 OK · 23 ms" />
							<StatusRow icon={Database} label="PostgreSQL" ok detail="connesso · neogesys_sport" />
							<StatusRow icon={HardDrive} label="Storage MinIO" ok detail="online · 4.2 GB usati" />
							<StatusRow icon={Activity} label="Redis cache" ok detail="online · 99.9% hit" />
						</div>
					</div>

					{/* Aggiornamenti */}
					<div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
						<div
							className="popover-label"
							style={{
								padding: 0,
								marginBottom: "0.5rem",
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
							}}
						>
							<span>Aggiornamenti</span>
							<span
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: "0.25rem",
									fontSize: "0.6875rem",
									fontWeight: 600,
									color: "hsl(var(--primary))",
									letterSpacing: "0.02em",
									textTransform: "none",
								}}
								title={`Release ${APP_VERSION} · ${formatReleaseDateTime()}`}
							>
								<GitBranch className="icon-sm" />v{APP_VERSION}
							</span>
						</div>
						<button
							type="button"
							className="popover-item"
							style={{ padding: "0.375rem 0", justifyContent: "space-between" }}
						>
							<span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
								<RefreshCw className="icon-sm" /> Controlla ora
							</span>
							<span
								style={{ fontSize: "0.6875rem", color: "hsl(var(--muted-foreground))" }}
								title={formatReleaseDateTime()}
							>
								{APP_RELEASE_DATE} · {APP_RELEASE_TIME}
							</span>
						</button>
						<label
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.5rem",
								fontSize: "0.8125rem",
								marginTop: "0.375rem",
								cursor: "pointer",
							}}
						>
							<input
								type="checkbox"
								defaultChecked
								style={{ accentColor: "hsl(var(--primary))" }}
							/>
							<span>Aggiornamenti automatici</span>
						</label>
					</div>

					{/* Stack tecnologico */}
					<div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
						<div className="popover-label" style={{ padding: 0, marginBottom: "0.5rem" }}>
							Stack tecnologico
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(2, 1fr)",
								gap: "0.25rem",
								fontSize: "0.75rem",
								color: "hsl(var(--muted-foreground))",
							}}
						>
							<TechItem label="Next.js 15.1" />
							<TechItem label="Fastify 5.2" />
							<TechItem label="tRPC 11" />
							<TechItem label="Drizzle ORM 0.38" />
							<TechItem label="PostgreSQL 16" />
							<TechItem label="pgvector · AI" />
							<TechItem label="Redis 7" />
							<TechItem label="Claude 4.5" />
						</div>
					</div>

					{/* Link utili */}
					<button type="button" className="popover-item">
						<LifeBuoy className="icon" /> Assistenza · apri ticket
					</button>
					<a href="/integrazioni" className="popover-item" style={{ textDecoration: "none" }}>
						<LinkIcon className="icon" /> Integrazioni connesse
					</a>
					<button type="button" className="popover-item">
						<Package className="icon" /> Info gestionale & licenza
					</button>
					<button type="button" className="popover-item">
						<Zap className="icon" /> Changelog & novità
					</button>
				</div>
			)}
		</div>
	);
}

function StatusRow({
	icon: Icon,
	label,
	ok,
	detail,
}: {
	icon: typeof Server;
	label: string;
	ok: boolean;
	detail: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				fontSize: "0.8125rem",
			}}
		>
			<span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
				<Icon className="icon-sm" style={{ color: "hsl(var(--muted-foreground))" }} />
				{label}
			</span>
			<span
				style={{
					display: "flex",
					alignItems: "center",
					gap: "0.25rem",
					fontSize: "0.6875rem",
					color: ok ? "hsl(142 71% 40%)" : "hsl(var(--destructive))",
					fontWeight: 500,
				}}
			>
				<CheckCircle2 style={{ width: "0.875rem", height: "0.875rem" }} />
				{detail}
			</span>
		</div>
	);
}

function TechItem({ label }: { label: string }) {
	return (
		<span
			style={{
				padding: "0.125rem 0.375rem",
				background: "hsl(var(--muted))",
				borderRadius: "0.25rem",
				fontFamily: "ui-monospace, monospace",
				fontSize: "0.6875rem",
				color: "hsl(var(--foreground))",
			}}
		>
			{label}
		</span>
	);
}
