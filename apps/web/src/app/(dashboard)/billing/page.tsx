"use client";

import { PianiManager } from "@/components/billing/piani-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";
import {
	ArrowUpRight,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	Download,
	Euro,
	type LucideIcon,
	TrendingUp,
	Wallet,
	XCircle,
} from "lucide-react";
import { useState } from "react";

type StatoFattura = "bozza" | "emessa" | "pagata" | "scaduta" | "annullata";

interface StatProps {
	title: string;
	value: string;
	trend: string;
	Icon: LucideIcon;
	color: string;
}

function Stat({ title, value, trend, Icon, color }: StatProps) {
	return (
		<div className="card stat-card">
			<div className="stat-card-head">
				<span className="stat-card-title">{title}</span>
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
			<div className="stat-value">{value}</div>
			<div className="stat-trend up">
				<ArrowUpRight className="icon-sm" />
				<span>{trend}</span>
			</div>
		</div>
	);
}

function fmtDate(d: string | Date | null | undefined): string {
	if (!d) return "—";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleDateString("it-IT");
}

function fmtEuro(n: number): string {
	return `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BillingPage() {
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [filterStato, setFilterStato] = useState<"" | StatoFattura>("");

	const revenueQuery = trpc.piattaforma.fatture.revenue.useQuery();
	const fattureQuery = trpc.piattaforma.fatture.listAll.useQuery({
		page,
		perPage,
		stato: filterStato === "" ? undefined : filterStato,
	});
	const tenantOverviewQuery = trpc.tenant.overview.useQuery();

	const revenue = revenueQuery.data;
	const fatture = fattureQuery.data?.items ?? [];
	const totalPages = fattureQuery.data?.totalPages ?? 1;

	const mrr = revenue?.mrr ?? 0;
	const arr = mrr * 12;
	const pending = revenue?.pendingRevenue ?? 0;

	const tenantTotal = tenantOverviewQuery.data?.total ?? 0;
	const trialCount = Number(
		(tenantOverviewQuery.data?.byStato as Record<string, number> | undefined)?.trial ?? 0,
	);
	const sospesoCount = Number(
		(tenantOverviewQuery.data?.byStato as Record<string, number> | undefined)?.sospeso ?? 0,
	);
	const paganti = tenantTotal - trialCount - sospesoCount;

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Billing piattaforma</h1>
					<p className="page-subtitle">
						Abbonamenti tenant · ARR {fmtEuro(arr)} · Pending {fmtEuro(pending)}
					</p>
				</div>
				<div className="page-actions">
					<a
						href="https://dashboard.stripe.com"
						target="_blank"
						rel="noopener noreferrer"
						className="btn btn-outline btn-sm"
					>
						<CreditCard className="icon" /> Apri Stripe
					</a>
				</div>
			</div>

			<div className="stat-grid">
				<Stat
					title="MRR (ultimi 30gg)"
					value={fmtEuro(mrr)}
					trend="Ricavo ricorrente mensile"
					Icon={Euro}
					color="success"
				/>
				<Stat
					title="ARR stimato"
					value={fmtEuro(arr)}
					trend="Run rate annuo"
					Icon={TrendingUp}
					color="primary"
				/>
				<Stat
					title="Tenant paganti"
					value={String(paganti)}
					trend={`${trialCount} in trial · ${sospesoCount} sospesi`}
					Icon={Wallet}
					color="warning"
				/>
				<Stat
					title="Pending fatture"
					value={fmtEuro(pending)}
					trend="Fatture emesse non pagate"
					Icon={CheckCircle2}
					color="success"
				/>
			</div>

			{/* ═══════════ Gestione piani ═══════════════════════════════════
			    CRUD completo sui piani (create, edit, disable/enable).
			    Implementato in `components/billing/piani-manager.tsx` per
			    tenere questa pagina leggibile. */}
			<PianiManager />

			<div className="card">
				<div className="card-header">
					<div className="card-title">Fatture piattaforma</div>
					<div className="card-desc">Emesse ai tenant</div>
				</div>
				<div
					style={{
						display: "flex",
						gap: "0.5rem",
						padding: "0 1rem 0.75rem 1rem",
						alignItems: "center",
					}}
				>
					<select
						className="select"
						value={filterStato}
						onChange={(e) => {
							setPage(1);
							setFilterStato(e.target.value as "" | StatoFattura);
						}}
						style={{ maxWidth: "220px" }}
					>
						<option value="">Tutti gli stati</option>
						<option value="bozza">Bozza</option>
						<option value="emessa">Emessa</option>
						<option value="pagata">Pagata</option>
						<option value="scaduta">Scaduta</option>
						<option value="annullata">Annullata</option>
					</select>
				</div>
				{fattureQuery.isLoading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</div>
				) : fatture.length === 0 ? (
					<EmptyState
						title="Nessuna fattura"
						description="Nessuna fattura emessa con i filtri correnti."
					/>
				) : (
					<div className="table-container">
						<table className="table">
							<thead>
								<tr>
									<th>Numero</th>
									<th>Tenant ID</th>
									<th style={{ textAlign: "right" }}>Totale</th>
									<th>Emessa</th>
									<th>Scadenza</th>
									<th>Stato</th>
									<th style={{ textAlign: "right" }}>Azioni</th>
								</tr>
							</thead>
							<tbody>
								{fatture.map((inv) => {
									const stato = inv.stato as StatoFattura;
									return (
										<tr key={inv.id}>
											<td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{inv.numero}</td>
											<td
												style={{
													fontFamily: "monospace",
													fontSize: "0.7rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{inv.tenantId.slice(0, 8)}…
											</td>
											<td
												style={{
													textAlign: "right",
													fontFamily: "monospace",
													fontWeight: 500,
												}}
											>
												{fmtEuro(Number(inv.totale ?? 0))}
											</td>
											<td
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{fmtDate(inv.dataEmissione as unknown as string | null)}
											</td>
											<td
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{fmtDate(inv.dataScadenza as unknown as string | null)}
											</td>
											<td>
												{stato === "pagata" && (
													<span className="badge badge-success">
														<CheckCircle2 className="icon-sm" /> Pagata
													</span>
												)}
												{stato === "emessa" && <span className="badge badge-warning">Emessa</span>}
												{stato === "scaduta" && (
													<span className="badge badge-destructive">
														<XCircle className="icon-sm" /> Scaduta
													</span>
												)}
												{stato === "bozza" && <span className="badge">Bozza</span>}
												{stato === "annullata" && (
													<span className="badge badge-outline">Annullata</span>
												)}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													{inv.pdfUrl ? (
														<a
															href={inv.pdfUrl}
															target="_blank"
															rel="noopener noreferrer"
															className="btn btn-ghost btn-icon"
															title="Scarica PDF"
														>
															<Download className="icon" />
														</a>
													) : (
														<button
															type="button"
															className="btn btn-ghost btn-icon"
															disabled
															title="PDF non disponibile"
														>
															<Download className="icon" />
														</button>
													)}
												</div>
											</td>
										</tr>
									);
								})}
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
						<span style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
							Pagina {page} di {totalPages}
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
		</div>
	);
}
