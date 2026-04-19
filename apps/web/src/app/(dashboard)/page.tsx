"use client";

import { useCurrentUser } from "@/lib/current-user";
import { trpc } from "@/lib/trpc";
import {
	Activity,
	AlertCircle,
	ArrowDownRight,
	ArrowUpRight,
	Building2,
	CheckCircle2,
	ChevronRight,
	DollarSign,
	Euro,
	FileWarning,
	type LucideIcon,
	MapPin,
	Plus,
	Shield,
	Sparkles,
	TrendingDown,
	TrendingUp,
	Users,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

// ================== HELPERS ==================

type StatColor = "primary" | "success" | "warning" | "destructive";
type TrendDir = "up" | "down" | "warn";

interface StatCardProps {
	title: string;
	value: string;
	trend: string;
	dir: TrendDir;
	Icon: LucideIcon;
	color: StatColor;
}

function StatCard({ title, value, trend, dir, Icon, color }: StatCardProps) {
	const colorStyles: Record<StatColor, React.CSSProperties> = {
		primary: { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" },
		success: { background: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))" },
		warning: { background: "hsl(var(--warning) / 0.15)", color: "hsl(var(--warning))" },
		destructive: {
			background: "hsl(var(--destructive) / 0.15)",
			color: "hsl(var(--destructive))",
		},
	};

	const Arrow = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : AlertCircle;

	return (
		<div className="card stat-card">
			<div className="stat-card-head">
				<span className="stat-card-title">{title}</span>
				<div className="stat-icon" style={colorStyles[color]}>
					<Icon className="icon" />
				</div>
			</div>
			<div className="stat-value">{value}</div>
			<div className={`stat-trend ${dir}`}>
				<Arrow className="icon-sm" />
				<span>{trend}</span>
			</div>
		</div>
	);
}

function fmtEuro(n: number): string {
	return `€ ${n.toLocaleString("it-IT", { maximumFractionDigits: 0 })}`;
}

const MONTH_LABELS = [
	"Gen",
	"Feb",
	"Mar",
	"Apr",
	"Mag",
	"Giu",
	"Lug",
	"Ago",
	"Set",
	"Ott",
	"Nov",
	"Dic",
];

// ================== SUPER ADMIN DASHBOARD ==================

function SuperAdminDashboard({ name }: { name: string }) {
	const overviewQuery = trpc.tenant.overview.useQuery();
	const revenueQuery = trpc.piattaforma.fatture.revenue.useQuery();
	const tenantsQuery = trpc.tenant.list.useQuery({ page: 1, perPage: 5 });

	const overview = overviewQuery.data;
	const revenue = revenueQuery.data;
	const mrr = revenue?.mrr ?? 0;
	const arr = mrr * 12;

	const total = overview?.total ?? 0;
	const attivi = Number(
		(overview?.byStato as Record<string, number> | undefined)?.attivo ?? 0,
	);
	const trial = Number((overview?.byStato as Record<string, number> | undefined)?.trial ?? 0);
	const sospesi = Number(
		(overview?.byStato as Record<string, number> | undefined)?.sospeso ?? 0,
	);

	const recentTenants = tenantsQuery.data?.items ?? [];

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">
						<Shield
							className="icon-lg"
							style={{
								color: "hsl(var(--destructive))",
								display: "inline",
								verticalAlign: "-0.2em",
								marginRight: "0.375rem",
							}}
						/>
						Dashboard Piattaforma
					</h1>
					<p className="page-subtitle">
						Benvenuto, {name}. Overview cross-tenant della piattaforma NEOGESYS SPORT.
					</p>
				</div>
				<div className="page-actions">
					<Link href="/tenants" className="btn btn-primary btn-sm">
						<Building2 className="icon" /> Gestione tenant
					</Link>
				</div>
			</div>

			<div className="stat-grid">
				<StatCard
					title="Tenant totali"
					value={String(total)}
					trend={`${attivi} attivi · ${trial} trial · ${sospesi} sospesi`}
					dir="up"
					Icon={Building2}
					color="primary"
				/>
				<StatCard
					title="MRR (ultimi 30gg)"
					value={fmtEuro(mrr)}
					trend={`ARR stimato ${fmtEuro(arr)}`}
					dir="up"
					Icon={DollarSign}
					color="success"
				/>
				<StatCard
					title="Pending fatture"
					value={fmtEuro(revenue?.pendingRevenue ?? 0)}
					trend="Da incassare"
					dir="warn"
					Icon={Euro}
					color="warning"
				/>
				<StatCard
					title="Tenant paganti"
					value={String(Math.max(0, total - trial - sospesi))}
					trend={sospesi > 0 ? `${sospesi} sospesi · azione richiesta` : "Nessuno sospeso"}
					dir={sospesi > 0 ? "warn" : "up"}
					Icon={TrendingUp}
					color={sospesi > 0 ? "warning" : "success"}
				/>
			</div>

			<div className="dash-grid">
				<div className="card">
					<div className="card-header">
						<div className="card-title">Distribuzione piani</div>
						<div className="card-desc">Tenant per piano di abbonamento</div>
					</div>
					<div className="card-body">
						<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							{Object.entries(
								(overview?.byPiano as Record<string, number> | undefined) ?? {},
							).map(([piano, count]) => {
								const pct = total > 0 ? (Number(count) / total) * 100 : 0;
								return (
									<div key={piano}>
										<div
											style={{
												display: "flex",
												justifyContent: "space-between",
												marginBottom: "0.25rem",
												fontSize: "0.8125rem",
											}}
										>
											<span style={{ textTransform: "capitalize", fontWeight: 500 }}>
												{piano}
											</span>
											<span style={{ color: "hsl(var(--muted-foreground))" }}>
												{count} ({pct.toFixed(0)}%)
											</span>
										</div>
										<div
											style={{
												width: "100%",
												height: "0.5rem",
												background: "hsl(var(--muted))",
												borderRadius: "9999px",
												overflow: "hidden",
											}}
										>
											<div
												style={{
													width: `${pct}%`,
													height: "100%",
													background: "hsl(var(--primary))",
													transition: "width 0.3s",
												}}
											/>
										</div>
									</div>
								);
							})}
							{Object.keys((overview?.byPiano as Record<string, number>) ?? {}).length ===
								0 && (
								<div style={{ color: "hsl(var(--muted-foreground))", padding: "1rem" }}>
									Nessun dato disponibile
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="card">
					<div className="card-header">
						<div className="card-title">Alert piattaforma</div>
						<div className="card-desc">Eventi cross-tenant</div>
					</div>
					<div className="card-body">
						<div className="alert-list">
							{sospesi > 0 && (
								<div className="alert-item danger">
									<div className="alert-icon">
										<XCircle className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{sospesi} tenant {sospesi === 1 ? "sospeso" : "sospesi"}
										</div>
										<div className="alert-desc">Verifica in /tenants</div>
									</div>
								</div>
							)}
							{trial > 0 && (
								<div className="alert-item warn">
									<div className="alert-icon">
										<TrendingUp className="icon" />
									</div>
									<div>
										<div className="alert-title">{trial} tenant in trial</div>
										<div className="alert-desc">Conversioni da monitorare</div>
									</div>
								</div>
							)}
							{(revenue?.pendingRevenue ?? 0) > 0 && (
								<div className="alert-item info">
									<div className="alert-icon">
										<AlertCircle className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{fmtEuro(revenue?.pendingRevenue ?? 0)} pending
										</div>
										<div className="alert-desc">Fatture emesse non ancora pagate</div>
									</div>
								</div>
							)}
							<div className="alert-item info">
								<div className="alert-icon">
									<CheckCircle2 className="icon" />
								</div>
								<div>
									<div className="alert-title">Sistema operativo</div>
									<div className="alert-desc">Tutti i check superati</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="card" style={{ marginTop: "1rem" }}>
				<div className="card-header">
					<div className="card-title">Ultimi tenant registrati</div>
					<div className="card-desc">
						<Link href="/tenants" style={{ color: "hsl(var(--primary))" }}>
							Vedi tutti →
						</Link>
					</div>
				</div>
				<div className="card-body">
					<div className="event-list">
						{tenantsQuery.isLoading ? (
							<div style={{ padding: "1rem" }}>Caricamento…</div>
						) : recentTenants.length === 0 ? (
							<div style={{ padding: "1rem", color: "hsl(var(--muted-foreground))" }}>
								Nessun tenant registrato
							</div>
						) : (
							recentTenants.map((t) => {
								const initials = (t.nomeVisualizzato ?? t.ragioneSociale ?? "")
									.split(" ")
									.filter(Boolean)
									.map((w) => w[0])
									.slice(0, 2)
									.join("")
									.toUpperCase();
								return (
									<Link
										key={t.id}
										href="/tenants"
										className="event-item"
										style={{ textDecoration: "none", color: "inherit" }}
									>
										<div
											className="avatar"
											style={{
												background: "hsl(var(--primary) / 0.15)",
												color: "hsl(var(--primary))",
												width: "2.5rem",
												height: "2.5rem",
												fontSize: "0.8125rem",
											}}
										>
											{initials || "?"}
										</div>
										<div style={{ flex: 1 }}>
											<div className="event-title">
												{t.nomeVisualizzato ?? t.ragioneSociale}
											</div>
											<div className="event-meta">
												<span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
													{t.slug}
												</span>
												<span>
													{t.createdAt
														? new Date(
																t.createdAt as unknown as string,
														  ).toLocaleDateString("it-IT")
														: "—"}
												</span>
											</div>
										</div>
										{t.stato === "trial" ? (
											<span className="badge badge-primary">Trial</span>
										) : t.stato === "attivo" ? (
											<span className="badge badge-success">Attivo</span>
										) : t.stato === "sospeso" ? (
											<span className="badge badge-destructive">Sospeso</span>
										) : (
											<span className="badge">{t.stato}</span>
										)}
										<ChevronRight className="icon" />
									</Link>
								);
							})
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ================== TENANT DASHBOARD ==================

function TenantDashboard({ name }: { name: string }) {
	const statsQuery = trpc.dashboard.getStats.useQuery();
	const trendQuery = trpc.dashboard.getTrend.useQuery({ months: 6 });
	const churnQuery = trpc.dashboard.getChurnAlerts.useQuery({ minScore: 70, limit: 5 });
	const eventiQuery = trpc.eventi.list.useQuery({ page: 1, perPage: 4 });
	const quoteStatsQuery = trpc.quote.stats.useQuery({});

	const stats = statsQuery.data;
	const sociAttivi = Number((stats?.soci as Record<string, unknown>)?.soci_attivi ?? 0);
	const nuoviMese = Number((stats?.soci as Record<string, unknown>)?.nuovi_ultimo_mese ?? 0);
	const incassato = Number((stats?.quote as Record<string, unknown>)?.incassato_totale ?? 0);
	const daIncassare = Number((stats?.quote as Record<string, unknown>)?.da_incassare ?? 0);
	const scadute = Number((stats?.quote as Record<string, unknown>)?.scadute_count ?? 0);
	const certInScadenza = Number(
		(stats?.certificati as Record<string, unknown>)?.scadenza_30gg ?? 0,
	);
	const certScaduti = Number((stats?.certificati as Record<string, unknown>)?.scaduti ?? 0);
	const presenzePct = Number(
		(stats?.presenze as Record<string, unknown>)?.percentuale_presenze ?? 0,
	);

	const incomeTrend = trendQuery.data?.income ?? [];
	const chartData = useMemo(() => {
		const max = Math.max(
			1,
			...incomeTrend.map((r) => Number(r.incassato ?? 0)),
		);
		return incomeTrend.slice(-6).map((r) => {
			const dt = r.mese ? new Date(r.mese as unknown as string) : null;
			return {
				m: dt ? MONTH_LABELS[dt.getMonth()] ?? "" : "",
				v: Number(r.incassato ?? 0),
				h: Math.max(8, (Number(r.incassato ?? 0) / max) * 100),
			};
		});
	}, [incomeTrend]);

	const totalIncome = incomeTrend.reduce((s, r) => s + Number(r.incassato ?? 0), 0);

	const churnList = churnQuery.data ?? [];
	const prossimiEventi = eventiQuery.data?.items ?? [];

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Dashboard</h1>
					<p className="page-subtitle">
						Benvenuto, {name}. Gestione completa della società.
					</p>
				</div>
				<div className="page-actions">
					<Link href="/soci" className="btn btn-primary btn-sm">
						<Plus className="icon" /> Nuovo Socio
					</Link>
				</div>
			</div>

			<div className="stat-grid">
				<StatCard
					title="Soci Attivi"
					value={String(sociAttivi)}
					trend={nuoviMese > 0 ? `+${nuoviMese} negli ultimi 30gg` : "Nessun nuovo ingresso"}
					dir={nuoviMese > 0 ? "up" : "warn"}
					Icon={Users}
					color="primary"
				/>
				<StatCard
					title="Quote Incassate"
					value={fmtEuro(incassato)}
					trend={
						daIncassare > 0
							? `${fmtEuro(daIncassare)} da incassare`
							: "Tutto incassato"
					}
					dir={daIncassare > 0 ? "warn" : "up"}
					Icon={Euro}
					color="success"
				/>
				<StatCard
					title="Certificati in Scadenza"
					value={String(certInScadenza)}
					trend={
						certScaduti > 0
							? `${certScaduti} già scaduti`
							: "Nei prossimi 30 giorni"
					}
					dir={certScaduti > 0 ? "warn" : "up"}
					Icon={FileWarning}
					color={certScaduti > 0 ? "destructive" : "warning"}
				/>
				<StatCard
					title="Presenza Media"
					value={`${Math.round(presenzePct)}%`}
					trend="Ultimi 30 giorni"
					dir={presenzePct >= 70 ? "up" : "warn"}
					Icon={Activity}
					color={presenzePct >= 70 ? "success" : "warning"}
				/>
			</div>

			<div className="dash-grid">
				<div className="card">
					<div className="card-header">
						<div className="card-title">Incassi ultimi 6 mesi</div>
						<div className="card-desc">
							Totale: {fmtEuro(totalIncome)} · {incomeTrend.length} mesi con incassi
						</div>
					</div>
					<div className="card-body">
						{trendQuery.isLoading ? (
							<div
								style={{
									padding: "2rem",
									textAlign: "center",
									color: "hsl(var(--muted-foreground))",
								}}
							>
								Caricamento…
							</div>
						) : chartData.length === 0 ? (
							<div
								style={{
									padding: "2rem",
									textAlign: "center",
									color: "hsl(var(--muted-foreground))",
								}}
							>
								Nessun incasso registrato
							</div>
						) : (
							<div className="chart-bars">
								{chartData.map((b) => (
									<div key={b.m} className="chart-bar">
										<span className="chart-bar-value">
											€{(b.v / 1000).toFixed(1)}k
										</span>
										<div className="chart-bar-fill" style={{ height: `${b.h}%` }} />
										<span className="chart-bar-label">{b.m}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="card">
					<div className="card-header">
						<div className="card-title">Alert & AI</div>
						<div className="card-desc">Eventi da monitorare</div>
					</div>
					<div className="card-body">
						<div className="alert-list">
							{churnList.length > 0 && (
								<div className="alert-item warn">
									<div className="alert-icon">
										<TrendingDown className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{churnList.length}{" "}
											{churnList.length === 1 ? "socio a rischio churn" : "soci a rischio churn"}
										</div>
										<div className="alert-desc">
											Churn score alto · presenze in calo
										</div>
									</div>
								</div>
							)}
							{scadute > 0 && (
								<div className="alert-item danger">
									<div className="alert-icon">
										<AlertCircle className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{scadute} quote scadute
										</div>
										<div className="alert-desc">
											{fmtEuro(daIncassare)} totali da incassare
										</div>
									</div>
								</div>
							)}
							{certScaduti > 0 && (
								<div className="alert-item danger">
									<div className="alert-icon">
										<FileWarning className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{certScaduti} certificati medici scaduti
										</div>
										<div className="alert-desc">
											Blocco partecipazione corsi attivo
										</div>
									</div>
								</div>
							)}
							{certInScadenza > 0 && certScaduti === 0 && (
								<div className="alert-item warn">
									<div className="alert-icon">
										<FileWarning className="icon" />
									</div>
									<div>
										<div className="alert-title">
											{certInScadenza} certificati in scadenza
										</div>
										<div className="alert-desc">Nei prossimi 30 giorni</div>
									</div>
								</div>
							)}
							{quoteStatsQuery.data && (
								<div className="alert-item info">
									<div className="alert-icon">
										<Sparkles className="icon" />
									</div>
									<div>
										<div className="alert-title">
											Tasso di riscossione:{" "}
											{(() => {
												const totals = quoteStatsQuery.data.totals;
												const tot = totals.reduce((acc, t) => acc + Number(t.totale ?? 0), 0);
												const pag = totals.reduce(
													(acc, t) => acc + Number(t.totalePagato ?? 0),
													0,
												);
												return tot > 0 ? `${Math.round((pag / tot) * 100)}%` : "—";
											})()}
										</div>
										<div className="alert-desc">Sul totale dell&apos;anno sportivo</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="card" style={{ marginTop: "1rem" }}>
				<div className="card-header">
					<div className="card-title">Prossimi eventi</div>
					<div className="card-desc">
						<Link href="/eventi" style={{ color: "hsl(var(--primary))" }}>
							Vedi tutti →
						</Link>
					</div>
				</div>
				<div className="card-body">
					<div className="event-list">
						{eventiQuery.isLoading ? (
							<div style={{ padding: "1rem" }}>Caricamento…</div>
						) : prossimiEventi.length === 0 ? (
							<div style={{ padding: "1rem", color: "hsl(var(--muted-foreground))" }}>
								Nessun evento programmato
							</div>
						) : (
							prossimiEventi.map((e) => {
								const dt = new Date(e.dataInizio as unknown as string);
								const giorno = dt.getDate();
								const mese = MONTH_LABELS[dt.getMonth()]?.toUpperCase() ?? "";
								return (
									<Link
										key={e.id}
										href="/eventi"
										className="event-item"
										style={{ textDecoration: "none", color: "inherit" }}
									>
										<div className="event-date">
											<span className="event-date-day">{giorno}</span>
											<span className="event-date-month">{mese}</span>
										</div>
										<div style={{ flex: 1 }}>
											<div className="event-title">{e.nome}</div>
											<div className="event-meta">
												<span>
													<MapPin className="icon-sm" /> {e.luogo ?? "—"}
												</span>
												<span>
													<Users className="icon-sm" /> {e.tipo}
												</span>
											</div>
										</div>
										<ChevronRight className="icon" />
									</Link>
								);
							})
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ================== ROOT ==================

export default function DashboardHomePage() {
	const { current } = useCurrentUser();
	const firstName = current.name.split(" ")[0] ?? current.name;

	if (current.role === "super_admin") {
		return <SuperAdminDashboard name={firstName} />;
	}
	return <TenantDashboard name={firstName} />;
}
