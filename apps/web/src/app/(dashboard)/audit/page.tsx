"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	ChevronLeft,
	ChevronRight,
	Eye,
	Search,
	Shield,
} from "lucide-react";
import { useState } from "react";

type AuditEntry = {
	id: string;
	superAdminId: string;
	superAdminEmail: string;
	azione: string;
	target: string | null;
	targetId: string | null;
	dettagli?: unknown;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date | string;
};

const AZIONE_CLS_MAP: Record<string, string> = {
	LOGIN: "badge-success",
	LOGIN_FAILED: "badge-destructive",
	create: "badge-primary",
	update: "badge-warning",
	delete: "badge-destructive",
	suspend: "badge-destructive",
	reactivate: "badge-success",
	close: "badge-destructive",
	plan_change: "badge-warning",
};

function resolveBadge(azione: string): string {
	const lower = azione.toLowerCase();
	for (const key of Object.keys(AZIONE_CLS_MAP)) {
		if (lower.includes(key.toLowerCase())) return AZIONE_CLS_MAP[key] ?? "badge";
	}
	return "badge";
}

function fmtTs(d: string | Date | null | undefined): string {
	if (!d) return "—";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleString("it-IT", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

export default function AuditPage() {
	const [page, setPage] = useState(1);
	const perPage = 50;
	const [search, setSearch] = useState("");
	const [filterAzione, setFilterAzione] = useState("");
	const [filterTarget, setFilterTarget] = useState("");
	const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

	const listQuery = trpc.piattaforma.audit.list.useQuery({
		page,
		perPage,
		azione: filterAzione || undefined,
		target: filterTarget || undefined,
	});

	const items = listQuery.data?.items ?? [];
	const total = listQuery.data?.total ?? 0;
	const totalPages = listQuery.data?.totalPages ?? 1;

	const filtered = search
		? items.filter((e) =>
				`${e.azione} ${e.target} ${e.superAdminEmail ?? ""} ${e.ipAddress ?? ""}`
					.toLowerCase()
					.includes(search.toLowerCase()),
		  )
		: items;

	const azioniDistinct = Array.from(new Set(items.map((i) => i.azione))).sort();
	const targetsDistinct = Array.from(
		new Set(items.map((i) => i.target).filter((t): t is string => !!t)),
	).sort();

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Audit Log</h1>
					<p className="page-subtitle">
						Log immutabile piattaforma · {total} eventi totali
					</p>
				</div>
			</div>

			<div
				className="card"
				style={{
					marginBottom: "1.5rem",
					borderColor: "hsl(var(--primary) / 0.3)",
					background: "hsl(var(--primary) / 0.05)",
				}}
			>
				<div
					className="card-body"
					style={{
						display: "flex",
						gap: "0.75rem",
						alignItems: "flex-start",
						padding: "1rem",
					}}
				>
					<Shield
						style={{
							width: "1.5rem",
							height: "1.5rem",
							color: "hsl(var(--primary))",
							flexShrink: 0,
						}}
					/>
					<div>
						<div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>
							Audit log super admin
						</div>
						<div style={{ fontSize: "0.8125rem", color: "hsl(var(--muted-foreground))" }}>
							Ogni azione effettuata dal super_admin sulla piattaforma è registrata
							immutabilmente. Solo il ruolo{" "}
							<code
								style={{
									background: "hsl(var(--muted))",
									padding: "0.0625rem 0.25rem",
									borderRadius: "0.25rem",
									fontSize: "0.75rem",
								}}
							>
								super_admin
							</code>{" "}
							può consultare questo log.
						</div>
					</div>
				</div>
			</div>

			<div className="filters-bar">
				<div style={{ position: "relative", flex: 1 }}>
					<Search
						className="icon-sm"
						style={{
							position: "absolute",
							left: "0.625rem",
							top: "50%",
							transform: "translateY(-50%)",
							color: "hsl(var(--muted-foreground))",
						}}
					/>
					<input
						className="input"
						placeholder="Cerca nei risultati caricati..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						style={{ paddingLeft: "2rem", width: "100%" }}
					/>
				</div>
				<select
					className="select"
					value={filterAzione}
					onChange={(e) => {
						setPage(1);
						setFilterAzione(e.target.value);
					}}
				>
					<option value="">Tutte le azioni</option>
					{azioniDistinct.map((a) => (
						<option key={a} value={a}>
							{a}
						</option>
					))}
				</select>
				<select
					className="select"
					value={filterTarget}
					onChange={(e) => {
						setPage(1);
						setFilterTarget(e.target.value);
					}}
				>
					<option value="">Tutti i target</option>
					{targetsDistinct.map((t) => (
						<option key={t} value={t}>
							{t}
						</option>
					))}
				</select>
			</div>

			<div className="card">
				{listQuery.isLoading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</div>
				) : filtered.length === 0 ? (
					<EmptyState
						title="Nessun evento"
						description="Nessun evento audit con i filtri correnti."
					/>
				) : (
					<div className="table-container">
						<table className="table">
							<thead>
								<tr>
									<th>Timestamp</th>
									<th>Super Admin</th>
									<th>Azione</th>
									<th>Target</th>
									<th>Target ID</th>
									<th>IP</th>
									<th style={{ textAlign: "right" }}>Azioni</th>
								</tr>
							</thead>
							<tbody>
								{filtered.map((e) => (
									<tr key={e.id}>
										<td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
											{fmtTs(e.createdAt as unknown as string | null)}
										</td>
										<td style={{ fontSize: "0.8125rem" }}>{e.superAdminEmail}</td>
										<td>
											<span
												className={`badge ${resolveBadge(e.azione)}`}
												style={{ fontSize: "0.6875rem" }}
											>
												{e.azione}
											</span>
										</td>
										<td>
											<code style={{ fontSize: "0.6875rem" }}>{e.target}</code>
										</td>
										<td
											style={{
												fontFamily: "monospace",
												fontSize: "0.7rem",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{e.targetId ? `${e.targetId.slice(0, 8)}…` : "—"}
										</td>
										<td
											style={{
												fontFamily: "monospace",
												fontSize: "0.75rem",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{e.ipAddress ?? "—"}
										</td>
										<td>
											<div className="table-actions" style={{ justifyContent: "flex-end" }}>
												<button
													type="button"
													className="btn btn-ghost btn-icon"
													title="Dettaglio"
													onClick={() => setDetailEntry(e)}
												>
													<Eye className="icon" />
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{totalPages > 1 && (
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							padding: "0.75rem 1rem",
							borderTop: "1px solid hsl(var(--border))",
						}}
					>
						<span
							style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}
						>
							Pagina {page} di {totalPages} · {total} eventi
						</span>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button
								type="button"
								className="btn btn-ghost btn-icon"
								disabled={page <= 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<ChevronLeft className="icon" />
							</button>
							<button
								type="button"
								className="btn btn-ghost btn-icon"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<ChevronRight className="icon" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Detail Modal */}
			<Modal
				open={detailEntry !== null}
				onClose={() => setDetailEntry(null)}
				title="Dettaglio evento audit"
				size="lg"
				footer={
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => setDetailEntry(null)}
					>
						Chiudi
					</button>
				}
			>
				{detailEntry && (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
						<div>
							<strong>Timestamp:</strong>{" "}
							<code>{fmtTs(detailEntry.createdAt as unknown as string | null)}</code>
						</div>
						<div>
							<strong>Super admin:</strong> {detailEntry.superAdminEmail} (
							<code>{detailEntry.superAdminId.slice(0, 8)}…</code>)
						</div>
						<div>
							<strong>Azione:</strong>{" "}
							<span
								className={`badge ${resolveBadge(detailEntry.azione)}`}
							>
								{detailEntry.azione}
							</span>
						</div>
						<div>
							<strong>Target:</strong> <code>{detailEntry.target}</code>
						</div>
						{detailEntry.targetId && (
							<div>
								<strong>Target ID:</strong> <code>{detailEntry.targetId}</code>
							</div>
						)}
						<div>
							<strong>IP:</strong>{" "}
							<code>{detailEntry.ipAddress ?? "—"}</code>
						</div>
						{detailEntry.userAgent && (
							<div>
								<strong>User agent:</strong>{" "}
								<code style={{ wordBreak: "break-all", fontSize: "0.75rem" }}>
									{detailEntry.userAgent}
								</code>
							</div>
						)}
						{detailEntry.dettagli ? (
							<div>
								<strong>Dettagli:</strong>
								<pre
									style={{
										background: "hsl(var(--muted))",
										padding: "0.75rem",
										borderRadius: "0.375rem",
										marginTop: "0.25rem",
										fontSize: "0.75rem",
										overflow: "auto",
									}}
								>
									{JSON.stringify(detailEntry.dettagli, null, 2)}
								</pre>
							</div>
						) : null}
					</div>
				)}
			</Modal>
		</div>
	);
}
