"use client";

import { trpc } from "@/lib/trpc";
import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Cpu,
	Database,
	HardDrive,
	type LucideIcon,
	MemoryStick,
	RefreshCcw,
	Server,
	XCircle,
	Zap,
} from "lucide-react";

interface MetricProps {
	title: string;
	value: string;
	subtitle: string;
	pct: number;
	color: "success" | "warning" | "destructive" | "primary";
	Icon: LucideIcon;
}

function Metric({ title, value, subtitle, pct, color, Icon }: MetricProps) {
	return (
		<div className="card">
			<div className="card-body">
				<div
					style={{
						display: "flex",
						alignItems: "flex-start",
						justifyContent: "space-between",
						marginBottom: "0.75rem",
					}}
				>
					<div>
						<div
							style={{
								fontSize: "0.75rem",
								color: "hsl(var(--muted-foreground))",
								marginBottom: "0.125rem",
							}}
						>
							{title}
						</div>
						<div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{value}</div>
						<div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
							{subtitle}
						</div>
					</div>
					<div
						className="stat-icon"
						style={{
							background: `hsl(var(--${color}) / 0.15)`,
							color: `hsl(var(--${color}))`,
						}}
					>
						<Icon className="icon" />
					</div>
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
							width: `${Math.min(100, pct)}%`,
							height: "100%",
							background: `hsl(var(--${color}))`,
							transition: "width 0.3s",
						}}
					/>
				</div>
			</div>
		</div>
	);
}

function formatUptime(seconds: number): string {
	if (seconds < 60) return `${Math.floor(seconds)}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
	if (seconds < 86400) {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		return `${h}h ${m}m`;
	}
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	return `${d}d ${h}h`;
}

export default function SystemPage() {
	const healthQuery = trpc.piattaforma.sistema.health.useQuery(undefined, {
		refetchInterval: 30_000,
	});

	const checks = healthQuery.data?.checks ?? [];
	const summary = healthQuery.data?.summary;
	const allHealthy = checks.every((c) => c.status === "ok");
	const hasDown = checks.some((c) => c.status === "down");

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">System Health</h1>
					<p className="page-subtitle">
						Monitoraggio piattaforma · {checks.length} check ·{" "}
						{summary ? `Uptime ${formatUptime(summary.uptime)}` : "…"}
					</p>
				</div>
				<div className="page-actions">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => healthQuery.refetch()}
						disabled={healthQuery.isFetching}
					>
						<RefreshCcw className="icon" /> Run health check
					</button>
				</div>
			</div>

			<div
				className="card"
				style={{
					marginBottom: "1.5rem",
					borderColor: hasDown
						? "hsl(var(--destructive) / 0.3)"
						: allHealthy
							? "hsl(var(--success) / 0.3)"
							: "hsl(var(--warning) / 0.3)",
					background: hasDown
						? "hsl(var(--destructive) / 0.05)"
						: allHealthy
							? "hsl(var(--success) / 0.05)"
							: "hsl(var(--warning) / 0.05)",
				}}
			>
				<div
					className="card-body"
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.75rem",
						padding: "1rem",
					}}
				>
					{hasDown ? (
						<XCircle
							style={{
								width: "1.75rem",
								height: "1.75rem",
								color: "hsl(var(--destructive))",
								flexShrink: 0,
							}}
						/>
					) : allHealthy ? (
						<CheckCircle2
							style={{
								width: "1.75rem",
								height: "1.75rem",
								color: "hsl(var(--success))",
								flexShrink: 0,
							}}
						/>
					) : (
						<AlertTriangle
							style={{
								width: "1.75rem",
								height: "1.75rem",
								color: "hsl(var(--warning))",
								flexShrink: 0,
							}}
						/>
					)}
					<div style={{ flex: 1 }}>
						<div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
							{hasDown
								? "Servizi non operativi"
								: allHealthy
									? "Tutti i servizi operativi"
									: "Alcuni servizi in stato degraded"}
						</div>
						<div
							style={{
								fontSize: "0.8125rem",
								color: "hsl(var(--muted-foreground))",
							}}
						>
							Tenant attivi: {summary?.activeTenants ?? 0} · Versione API: {summary?.version ?? "—"}
						</div>
					</div>
					<span
						className={
							hasDown
								? "badge badge-destructive"
								: allHealthy
									? "badge badge-success"
									: "badge badge-warning"
						}
					>
						● {hasDown ? "Incident" : allHealthy ? "Operational" : "Degraded"}
					</span>
				</div>
			</div>

			<div className="stat-grid">
				<Metric
					title="Uptime API"
					value={summary ? formatUptime(summary.uptime) : "—"}
					subtitle="Da ultimo riavvio"
					pct={Math.min(100, ((summary?.uptime ?? 0) / 86400) * 10)}
					color="success"
					Icon={Activity}
				/>
				<Metric
					title="Tenant attivi"
					value={String(summary?.activeTenants ?? 0)}
					subtitle="Connessi alla piattaforma"
					pct={Math.min(100, (summary?.activeTenants ?? 0) * 5)}
					color="primary"
					Icon={Server}
				/>
				<Metric
					title="Check totali"
					value={String(checks.length)}
					subtitle={`${checks.filter((c) => c.status === "ok").length} OK`}
					pct={
						checks.length
							? (checks.filter((c) => c.status === "ok").length / checks.length) * 100
							: 0
					}
					color={hasDown ? "destructive" : allHealthy ? "success" : "warning"}
					Icon={Zap}
				/>
				<Metric
					title="Versione API"
					value={summary?.version ?? "—"}
					subtitle="Deploy corrente"
					pct={100}
					color="primary"
					Icon={Cpu}
				/>
			</div>

			<div className="card" style={{ marginTop: "1rem" }}>
				<div className="card-header">
					<div className="card-title">Servizi</div>
					<div className="card-desc">Stato controlli runtime</div>
				</div>
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Servizio</th>
								<th>Stato</th>
								<th>Dettagli</th>
							</tr>
						</thead>
						<tbody>
							{healthQuery.isLoading ? (
								<tr>
									<td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
										Caricamento…
									</td>
								</tr>
							) : checks.length === 0 ? (
								<tr>
									<td colSpan={3} style={{ textAlign: "center", padding: "2rem" }}>
										Nessun check configurato.
									</td>
								</tr>
							) : (
								checks.map((c) => {
									let Icon: LucideIcon = Server;
									const name = c.name.toLowerCase();
									if (name.includes("db") || name.includes("database")) Icon = Database;
									else if (name.includes("redis") || name.includes("cache")) Icon = MemoryStick;
									else if (name.includes("storage") || name.includes("s3")) Icon = HardDrive;
									return (
										<tr key={c.name}>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "0.5rem",
													}}
												>
													<Icon className="icon" style={{ color: "hsl(var(--primary))" }} />
													<span style={{ fontWeight: 500 }}>{c.name}</span>
												</div>
											</td>
											<td>
												{c.status === "ok" && (
													<span className="badge badge-success">
														<CheckCircle2 className="icon-sm" /> Healthy
													</span>
												)}
												{c.status === "warn" && (
													<span className="badge badge-warning">
														<AlertTriangle className="icon-sm" /> Degraded
													</span>
												)}
												{c.status === "down" && (
													<span className="badge badge-destructive">
														<XCircle className="icon-sm" /> Down
													</span>
												)}
											</td>
											<td
												style={{
													fontFamily: "monospace",
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{c.details ?? "—"}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
