"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	AlertCircle,
	ArrowDownRight,
	ArrowUpRight,
	Check,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	CreditCard,
	Download,
	Euro,
	Plus,
	Receipt,
	Trash2,
	TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatoQuota = "da_pagare" | "parziale" | "pagato" | "esonerato";
type MetodoPagamento = "contanti" | "bonifico" | "pos" | "stripe" | "satispay";
type StatColor = "primary" | "success" | "warning" | "destructive";

const STATO_BADGE: Record<StatoQuota, { cls: string; label: string }> = {
	pagato: { cls: "badge-success", label: "Pagato" },
	da_pagare: { cls: "badge", label: "Da Pagare" },
	parziale: { cls: "badge-warning", label: "Parziale" },
	esonerato: { cls: "badge", label: "Esonerato" },
};

function money(v: string | number | null | undefined): string {
	const n = typeof v === "string" ? Number(v) : (v ?? 0);
	return new Intl.NumberFormat("it-IT", {
		style: "currency",
		currency: "EUR",
	}).format(n || 0);
}

function StatCard({
	title,
	value,
	trend,
	dir,
	Icon,
	color,
}: {
	title: string;
	value: string;
	trend: string;
	dir: "up" | "down" | "warn";
	Icon: LucideIcon;
	color: StatColor;
}) {
	const colorStyles: Record<StatColor, React.CSSProperties> = {
		primary: { background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" },
		success: { background: "hsl(var(--success) / 0.15)", color: "hsl(var(--success))" },
		warning: { background: "hsl(var(--warning) / 0.15)", color: "hsl(var(--warning))" },
		destructive: { background: "hsl(var(--destructive) / 0.15)", color: "hsl(var(--destructive))" },
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

interface CreateFormState {
	socioId: string;
	tipoQuotaId: string;
	annoSportivoId: string;
	importo: string;
	dataScadenza: string;
	note: string;
}
const EMPTY_CREATE: CreateFormState = {
	socioId: "",
	tipoQuotaId: "",
	annoSportivoId: "",
	importo: "",
	dataScadenza: "",
	note: "",
};

interface PayFormState {
	importoPagato: string;
	metodoPagamento: MetodoPagamento;
	dataPagamento: string;
	note: string;
}

export default function QuotePage() {
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [stato, setStato] = useState<StatoQuota | "">("");

	const [createOpen, setCreateOpen] = useState(false);
	const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE);
	const [createError, setCreateError] = useState<string | null>(null);

	const [payTarget, setPayTarget] = useState<{
		id: string;
		socio: string;
		residuo: number;
		importo: number;
	} | null>(null);
	const [payForm, setPayForm] = useState<PayFormState>({
		importoPagato: "",
		metodoPagamento: "contanti",
		dataPagamento: "",
		note: "",
	});
	const [payError, setPayError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.quote.list.useQuery({
		page,
		perPage,
		stato: stato || undefined,
	});
	const statsQuery = trpc.quote.stats.useQuery({});
	const tipiQuotaQuery = trpc.quote.listTipiQuota.useQuery();
	const anniQuery = trpc.quote.listAnniSportivi.useQuery();
	const sociSearch = trpc.soci.list.useQuery({ page: 1, perPage: 100, stato: "attivo" });

	const createMutation = trpc.quote.create.useMutation({
		onSuccess: () => {
			utils.quote.list.invalidate();
			utils.quote.stats.invalidate();
			toast.success("Quota emessa");
			setCreateOpen(false);
			setCreateForm(EMPTY_CREATE);
		},
		onError: (err) => {
			setCreateError(err.message);
			toast.error(err.message);
		},
	});

	const payMutation = trpc.quote.registraPagamento.useMutation({
		onSuccess: () => {
			utils.quote.list.invalidate();
			utils.quote.stats.invalidate();
			toast.success("Pagamento registrato");
			setPayTarget(null);
		},
		onError: (err) => {
			setPayError(err.message);
			toast.error(err.message);
		},
	});

	const deleteMutation = trpc.quote.delete.useMutation({
		onSuccess: () => {
			utils.quote.list.invalidate();
			utils.quote.stats.invalidate();
			toast.success("Quota eliminata");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const ricevutaMutation = trpc.quote.generaRicevuta.useMutation({
		onSuccess: (res) => {
			if (res.url) {
				toast.success("Ricevuta generata");
				window.open(res.url, "_blank");
			}
		},
		onError: (err) => toast.error(err.message),
	});

	const stats = useMemo(() => {
		if (!statsQuery.data) {
			return { incassato: 0, daIncassare: 0, scadute: 0, nrPagate: 0, nrAperte: 0 };
		}
		let incassato = 0;
		let daIncassare = 0;
		let nrPagate = 0;
		let nrAperte = 0;
		for (const t of statsQuery.data.totals) {
			if (t.stato === "pagato") {
				incassato += t.totalePagato;
				nrPagate += t.count;
			}
			if (t.stato === "parziale") {
				incassato += t.totalePagato;
				daIncassare += t.totale - t.totalePagato;
				nrAperte += t.count;
			}
			if (t.stato === "da_pagare") {
				daIncassare += t.totale;
				nrAperte += t.count;
			}
		}
		return { incassato, daIncassare, scadute: 0, nrPagate, nrAperte };
	}, [statsQuery.data]);

	const items = query.data?.items ?? [];
	const total = query.data?.total ?? 0;
	const totalPages = query.data?.totalPages ?? 1;

	function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		setCreateError(null);
		if (!createForm.socioId || !createForm.tipoQuotaId || !createForm.importo) {
			setCreateError("Socio, tipo quota e importo sono obbligatori.");
			return;
		}
		createMutation.mutate({
			socioId: createForm.socioId,
			tipoQuotaId: createForm.tipoQuotaId,
			annoSportivoId: createForm.annoSportivoId || undefined,
			importo: Number(createForm.importo),
			dataScadenza: createForm.dataScadenza
				? new Date(createForm.dataScadenza).toISOString()
				: undefined,
			note: createForm.note.trim() || undefined,
		});
	}

	function openPay(row: (typeof items)[number]) {
		const importo = Number(row.importo);
		const pagato = Number(row.importoPagato ?? 0);
		const residuo = importo - pagato;
		setPayTarget({
			id: row.id,
			socio: `${row.socioCognome} ${row.socioNome}`,
			residuo,
			importo,
		});
		setPayForm({
			importoPagato: residuo.toFixed(2),
			metodoPagamento: "contanti",
			dataPagamento: new Date().toISOString().slice(0, 10),
			note: "",
		});
		setPayError(null);
	}

	function handlePay(e: React.FormEvent) {
		e.preventDefault();
		if (!payTarget) return;
		setPayError(null);
		const amount = Number(payForm.importoPagato);
		if (!amount || amount <= 0) {
			setPayError("Importo non valido.");
			return;
		}
		payMutation.mutate({
			quotaId: payTarget.id,
			importoPagato: amount,
			metodoPagamento: payForm.metodoPagamento,
			dataPagamento: payForm.dataPagamento
				? new Date(payForm.dataPagamento).toISOString()
				: undefined,
			note: payForm.note.trim() || undefined,
		});
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Quote</h1>
					<p className="page-subtitle">
						{total} quote · {stats.nrPagate} pagate · {stats.nrAperte} aperte
					</p>
				</div>
				<div className="page-actions">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => {
							setCreateForm(EMPTY_CREATE);
							setCreateError(null);
							setCreateOpen(true);
						}}
					>
						<Plus className="icon" /> Emetti Quota
					</button>
				</div>
			</div>

			<div className="stat-grid">
				<StatCard
					title="Incassato"
					value={money(stats.incassato)}
					trend={`${stats.nrPagate} quote pagate`}
					dir="up"
					Icon={CheckCircle}
					color="success"
				/>
				<StatCard
					title="Da Incassare"
					value={money(stats.daIncassare)}
					trend={`${stats.nrAperte} quote aperte`}
					dir="warn"
					Icon={Clock}
					color="warning"
				/>
				<StatCard
					title="Tasso Incasso"
					value={`${
						stats.incassato + stats.daIncassare > 0
							? Math.round((stats.incassato / (stats.incassato + stats.daIncassare)) * 100)
							: 0
					}%`}
					trend="sul totale emesso"
					dir="up"
					Icon={TrendingUp}
					color="primary"
				/>
				<StatCard
					title="Ticket Medio"
					value={money(
						stats.nrPagate + stats.nrAperte > 0
							? (stats.incassato + stats.daIncassare) / (stats.nrPagate + stats.nrAperte)
							: 0,
					)}
					trend="quota media"
					dir="up"
					Icon={Euro}
					color="primary"
				/>
			</div>

			<div className="filters-bar">
				<select
					className="select"
					value={stato}
					onChange={(e) => {
						setStato(e.target.value as StatoQuota | "");
						setPage(1);
					}}
				>
					<option value="">Tutti gli stati</option>
					<option value="pagato">Pagato</option>
					<option value="da_pagare">Da Pagare</option>
					<option value="parziale">Parziale</option>
					<option value="esonerato">Esonerato</option>
				</select>
			</div>

			<div className="card">
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Socio</th>
								<th>Tipo Quota</th>
								<th>Importo</th>
								<th>Pagato</th>
								<th>Stato</th>
								<th>Scadenza</th>
								<th style={{ textAlign: "right" }}>Azioni</th>
							</tr>
						</thead>
						<tbody>
							{query.isLoading ? (
								<tr>
									<td
										colSpan={7}
										style={{
											textAlign: "center",
											padding: "3rem",
											color: "hsl(var(--muted-foreground))",
										}}
									>
										Caricamento...
									</td>
								</tr>
							) : query.isError ? (
								<tr>
									<td
										colSpan={7}
										style={{ textAlign: "center", padding: "3rem", color: "#dc2626" }}
									>
										Errore: {query.error.message}
									</td>
								</tr>
							) : items.length === 0 ? (
								<tr>
									<td colSpan={7} style={{ padding: 0 }}>
										<EmptyState
											icon={Receipt}
											title="Nessuna quota"
											description="Emetti la prima quota per iniziare."
											action={
												<button
													type="button"
													className="btn btn-primary btn-sm"
													onClick={() => setCreateOpen(true)}
												>
													<Plus className="icon" /> Emetti Quota
												</button>
											}
										/>
									</td>
								</tr>
							) : (
								items.map((q) => {
									const b = STATO_BADGE[q.stato as StatoQuota];
									const pagato = Number(q.importoPagato ?? 0);
									return (
										<tr key={q.id}>
											<td style={{ fontWeight: 500 }}>
												{q.socioCognome} {q.socioNome}
											</td>
											<td>{q.tipoQuotaNome ?? "—"}</td>
											<td style={{ fontWeight: 600 }}>{money(q.importo)}</td>
											<td
												style={{
													color: pagato > 0 ? "#059669" : "hsl(var(--muted-foreground))",
												}}
											>
												{money(pagato)}
											</td>
											<td>
												<span className={`badge ${b.cls}`}>{b.label}</span>
											</td>
											<td
												style={{
													fontFamily: "monospace",
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{q.dataScadenza
													? new Date(q.dataScadenza as unknown as string).toLocaleDateString(
															"it-IT",
														)
													: "—"}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													{q.stato !== "pagato" && q.stato !== "esonerato" ? (
														<button
															type="button"
															className="btn btn-primary btn-sm"
															onClick={() => openPay(q)}
														>
															<CreditCard className="icon-sm" /> Incassa
														</button>
													) : q.stato === "pagato" ? (
														<button
															type="button"
															className="table-action"
															title="Genera ricevuta"
															onClick={() => ricevutaMutation.mutate({ quotaId: q.id })}
															disabled={ricevutaMutation.isPending}
														>
															<Download className="icon" />
														</button>
													) : null}
													<button
														type="button"
														className="table-action"
														title="Elimina"
														onClick={() =>
															setDeleteTarget({
																id: q.id,
																label: `${q.socioCognome} ${q.socioNome} - ${money(q.importo)}`,
															})
														}
													>
														<Trash2 className="icon" style={{ color: "#dc2626" }} />
													</button>
												</div>
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
				{total > 0 && (
					<div className="pagination">
						<span>
							Mostra {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} di {total} quote
						</span>
						<div style={{ display: "flex", gap: "0.25rem" }}>
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page === 1}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
							>
								<ChevronLeft className="icon-sm" />
							</button>
							<span
								style={{
									padding: "0 0.75rem",
									display: "flex",
									alignItems: "center",
									fontSize: "0.875rem",
								}}
							>
								{page} / {totalPages}
							</span>
							<button
								type="button"
								className="btn btn-outline btn-sm"
								disabled={page >= totalPages}
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							>
								<ChevronRight className="icon-sm" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Create Quota Modal */}
			<Modal
				open={createOpen}
				onClose={() => setCreateOpen(false)}
				title="Emetti quota"
				subtitle="Crea una nuova quota associativa"
				size="md"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={() => setCreateOpen(false)}
							disabled={createMutation.isPending}
						>
							Annulla
						</button>
						<button
							type="submit"
							form="create-quota"
							className="btn btn-primary btn-sm"
							disabled={createMutation.isPending}
						>
							<Check className="icon" /> {createMutation.isPending ? "Salvataggio..." : "Emetti"}
						</button>
					</>
				}
			>
				<form id="create-quota" onSubmit={handleCreate}>
					{createError && (
						<div
							style={{
								padding: "0.75rem 1rem",
								background: "rgba(220,38,38,0.1)",
								color: "#dc2626",
								borderRadius: 6,
								fontSize: "0.875rem",
								marginBottom: "1rem",
							}}
						>
							{createError}
						</div>
					)}
					<FormGrid>
						<Field label="Socio" required span={2}>
							<Select
								value={createForm.socioId}
								onChange={(e) => setCreateForm({ ...createForm, socioId: e.target.value })}
								required
							>
								<option value="">Seleziona socio...</option>
								{sociSearch.data?.items.map((s) => (
									<option key={s.id} value={s.id}>
										{s.cognome} {s.nome} {s.codiceTessera ? `· ${s.codiceTessera}` : ""}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Tipo Quota" required>
							<Select
								value={createForm.tipoQuotaId}
								onChange={(e) => {
									const id = e.target.value;
									const tipo = tipiQuotaQuery.data?.find((t) => t.id === id);
									setCreateForm({
										...createForm,
										tipoQuotaId: id,
										importo: tipo ? String(tipo.importo ?? createForm.importo) : createForm.importo,
									});
								}}
								required
							>
								<option value="">Seleziona tipo...</option>
								{tipiQuotaQuery.data?.map((t) => (
									<option key={t.id} value={t.id}>
										{t.nome} ({t.tipo})
									</option>
								))}
							</Select>
						</Field>
						<Field label="Anno Sportivo">
							<Select
								value={createForm.annoSportivoId}
								onChange={(e) =>
									setCreateForm({ ...createForm, annoSportivoId: e.target.value })
								}
							>
								<option value="">—</option>
								{anniQuery.data?.map((a) => (
									<option key={a.id} value={a.id}>
										{a.nome}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Importo (EUR)" required>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={createForm.importo}
								onChange={(e) => setCreateForm({ ...createForm, importo: e.target.value })}
								required
							/>
						</Field>
						<Field label="Data Scadenza">
							<Input
								type="date"
								value={createForm.dataScadenza}
								onChange={(e) => setCreateForm({ ...createForm, dataScadenza: e.target.value })}
							/>
						</Field>
						<Field label="Note" span={2}>
							<Textarea
								value={createForm.note}
								onChange={(e) => setCreateForm({ ...createForm, note: e.target.value })}
							/>
						</Field>
					</FormGrid>
				</form>
			</Modal>

			{/* Pay Modal */}
			<Modal
				open={!!payTarget}
				onClose={() => setPayTarget(null)}
				title="Registra pagamento"
				subtitle={payTarget ? `${payTarget.socio} · Residuo ${money(payTarget.residuo)}` : ""}
				size="sm"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={() => setPayTarget(null)}
							disabled={payMutation.isPending}
						>
							Annulla
						</button>
						<button
							type="submit"
							form="pay-form"
							className="btn btn-primary btn-sm"
							disabled={payMutation.isPending}
						>
							<CreditCard className="icon" />{" "}
							{payMutation.isPending ? "Registrazione..." : "Registra"}
						</button>
					</>
				}
			>
				<form id="pay-form" onSubmit={handlePay}>
					{payError && (
						<div
							style={{
								padding: "0.75rem 1rem",
								background: "rgba(220,38,38,0.1)",
								color: "#dc2626",
								borderRadius: 6,
								fontSize: "0.875rem",
								marginBottom: "1rem",
							}}
						>
							{payError}
						</div>
					)}
					<FormGrid>
						<Field label="Importo" required span={2}>
							<Input
								type="number"
								step="0.01"
								min="0"
								value={payForm.importoPagato}
								onChange={(e) => setPayForm({ ...payForm, importoPagato: e.target.value })}
								required
							/>
						</Field>
						<Field label="Metodo" required>
							<Select
								value={payForm.metodoPagamento}
								onChange={(e) =>
									setPayForm({
										...payForm,
										metodoPagamento: e.target.value as MetodoPagamento,
									})
								}
							>
								<option value="contanti">Contanti</option>
								<option value="bonifico">Bonifico</option>
								<option value="pos">POS</option>
								<option value="stripe">Stripe</option>
								<option value="satispay">Satispay</option>
							</Select>
						</Field>
						<Field label="Data">
							<Input
								type="date"
								value={payForm.dataPagamento}
								onChange={(e) => setPayForm({ ...payForm, dataPagamento: e.target.value })}
							/>
						</Field>
						<Field label="Note" span={2}>
							<Textarea
								value={payForm.note}
								onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
							/>
						</Field>
					</FormGrid>
				</form>
			</Modal>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
				}}
				title="Eliminare quota?"
				message={`La quota "${deleteTarget?.label ?? ""}" verra' rimossa definitivamente.`}
				confirmLabel="Elimina"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
