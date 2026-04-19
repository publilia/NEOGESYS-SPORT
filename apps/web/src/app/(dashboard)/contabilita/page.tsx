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
	ChevronLeft,
	ChevronRight,
	Edit,
	Plus,
	Receipt,
	Trash2,
	TrendingDown,
	TrendingUp,
	Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatColor = "primary" | "success" | "warning" | "destructive";

type TipoMov = "entrata" | "uscita";

interface MovimentoForm {
	tipo: TipoMov;
	causale: string;
	descrizione: string;
	importo: string;
	data: string;
	categoriaContabile: string;
	socioId: string;
	note: string;
}

const EMPTY_FORM: MovimentoForm = {
	tipo: "entrata",
	causale: "",
	descrizione: "",
	importo: "",
	data: new Date().toISOString().slice(0, 10),
	categoriaContabile: "",
	socioId: "",
	note: "",
};

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
	return `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | Date | null | undefined): string {
	if (!d) return "—";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleDateString("it-IT");
}

export default function ContabilitaPage() {
	const utils = trpc.useUtils();

	const [page, setPage] = useState(1);
	const perPage = 20;
	const [filterTipo, setFilterTipo] = useState<"" | TipoMov>("");
	const [filterCategoria, setFilterCategoria] = useState<string>("");

	// Default range: current month
	const today = new Date();
	const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
	const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
	const [dataInizio, setDataInizio] = useState(monthStart.toISOString().slice(0, 10));
	const [dataFine, setDataFine] = useState(monthEnd.toISOString().slice(0, 10));

	const rangeIso = useMemo(
		() => ({
			start: new Date(`${dataInizio}T00:00:00`).toISOString(),
			end: new Date(`${dataFine}T23:59:59`).toISOString(),
		}),
		[dataInizio, dataFine],
	);

	const listQuery = trpc.contabilita.listMovimenti.useQuery({
		page,
		perPage,
		tipo: filterTipo === "" ? undefined : filterTipo,
		categoriaContabile: filterCategoria || undefined,
		dataInizio: rangeIso.start,
		dataFine: rangeIso.end,
	});

	const reportQuery = trpc.contabilita.report.useQuery({
		dataInizio: rangeIso.start,
		dataFine: rangeIso.end,
	});

	const categorieQuery = trpc.contabilita.categorieDiffuse.useQuery();
	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 500 });

	const createMut = trpc.contabilita.createMovimento.useMutation({
		onSuccess: () => {
			toast.success("Movimento creato");
			utils.contabilita.listMovimenti.invalidate();
			utils.contabilita.report.invalidate();
			utils.contabilita.categorieDiffuse.invalidate();
			closeForm();
		},
		onError: (err) => toast.error(err.message),
	});
	const updateMut = trpc.contabilita.updateMovimento.useMutation({
		onSuccess: () => {
			toast.success("Movimento aggiornato");
			utils.contabilita.listMovimenti.invalidate();
			utils.contabilita.report.invalidate();
			utils.contabilita.categorieDiffuse.invalidate();
			closeForm();
		},
		onError: (err) => toast.error(err.message),
	});
	const deleteMut = trpc.contabilita.deleteMovimento.useMutation({
		onSuccess: () => {
			toast.success("Movimento eliminato");
			utils.contabilita.listMovimenti.invalidate();
			utils.contabilita.report.invalidate();
			setConfirmDeleteId(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const [formOpen, setFormOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<MovimentoForm>(EMPTY_FORM);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	const openCreate = () => {
		setEditId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	type Movimento = NonNullable<typeof listQuery.data>["items"][number];

	const openEdit = (m: Movimento) => {
		setEditId(m.id);
		setForm({
			tipo: m.tipo as TipoMov,
			causale: m.causale ?? "",
			descrizione: m.descrizione ?? "",
			importo: String(m.importo ?? "0"),
			data: new Date(m.data as unknown as string).toISOString().slice(0, 10),
			categoriaContabile: m.categoriaContabile ?? "",
			socioId: m.socioId ?? "",
			note: m.note ?? "",
		});
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setEditId(null);
		setForm(EMPTY_FORM);
	};

	const submitForm = () => {
		if (!form.causale.trim()) {
			toast.error("Causale obbligatoria");
			return;
		}
		const importoNum = Number(form.importo);
		if (!Number.isFinite(importoNum) || importoNum < 0) {
			toast.error("Importo non valido");
			return;
		}
		if (!form.data) {
			toast.error("Data obbligatoria");
			return;
		}
		const payload = {
			tipo: form.tipo,
			causale: form.causale.trim(),
			descrizione: form.descrizione.trim() || undefined,
			importo: importoNum,
			data: new Date(`${form.data}T12:00:00`).toISOString(),
			categoriaContabile: form.categoriaContabile.trim() || undefined,
			socioId: form.socioId || undefined,
			note: form.note.trim() || undefined,
		};
		if (editId) updateMut.mutate({ id: editId, ...payload });
		else createMut.mutate(payload);
	};

	const items = listQuery.data?.items ?? [];
	const totalPages = listQuery.data?.totalPages ?? 1;
	const total = listQuery.data?.total ?? 0;
	const report = reportQuery.data;
	const categorie = categorieQuery.data ?? [];
	const sociList = sociQuery.data?.items ?? [];

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Contabilità</h1>
					<p className="page-subtitle">
						Prima nota · {total} movimenti nel periodo selezionato
					</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-outline btn-sm" disabled title="Funzione SDI in arrivo">
						<Receipt className="icon" /> Fattura SDI
					</button>
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Plus className="icon" /> Nuovo Movimento
					</button>
				</div>
			</div>

			<div className="stat-grid">
				<StatCard
					title="Entrate"
					value={fmtEuro(report?.entrate ?? 0)}
					trend={`${fmtDate(dataInizio)} → ${fmtDate(dataFine)}`}
					dir="up"
					Icon={TrendingUp}
					color="success"
				/>
				<StatCard
					title="Uscite"
					value={fmtEuro(report?.uscite ?? 0)}
					trend={`${fmtDate(dataInizio)} → ${fmtDate(dataFine)}`}
					dir="down"
					Icon={TrendingDown}
					color="destructive"
				/>
				<StatCard
					title="Saldo"
					value={fmtEuro(report?.saldo ?? 0)}
					trend={(report?.saldo ?? 0) >= 0 ? "Positivo" : "Negativo"}
					dir={(report?.saldo ?? 0) >= 0 ? "up" : "down"}
					Icon={Wallet}
					color={(report?.saldo ?? 0) >= 0 ? "primary" : "warning"}
				/>
				<StatCard
					title="Categorie"
					value={String(report?.byCategory.length ?? 0)}
					trend="Attive nel periodo"
					dir="up"
					Icon={AlertCircle}
					color="primary"
				/>
			</div>

			<div className="card" style={{ marginBottom: "1rem" }}>
				<div className="card-body">
					<FormGrid>
						<Field label="Da data" span={1}>
							<Input
								type="date"
								value={dataInizio}
								onChange={(e) => {
									setPage(1);
									setDataInizio(e.target.value);
								}}
							/>
						</Field>
						<Field label="A data" span={1}>
							<Input
								type="date"
								value={dataFine}
								onChange={(e) => {
									setPage(1);
									setDataFine(e.target.value);
								}}
							/>
						</Field>
						<Field label="Tipo" span={1}>
							<Select
								value={filterTipo}
								onChange={(e) => {
									setPage(1);
									setFilterTipo(e.target.value as "" | TipoMov);
								}}
							>
								<option value="">Tutti</option>
								<option value="entrata">Entrata</option>
								<option value="uscita">Uscita</option>
							</Select>
						</Field>
						<Field label="Categoria" span={1}>
							<Select
								value={filterCategoria}
								onChange={(e) => {
									setPage(1);
									setFilterCategoria(e.target.value);
								}}
							>
								<option value="">Tutte</option>
								{categorie.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</Select>
						</Field>
					</FormGrid>
				</div>
			</div>

			<div className="card">
				{listQuery.isLoading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</div>
				) : items.length === 0 ? (
					<EmptyState
						title="Nessun movimento"
						description="Nessuna operazione registrata nel periodo filtrato."
					/>
				) : (
					<div className="table-container">
						<table className="table">
							<thead>
								<tr>
									<th>Data</th>
									<th>Causale</th>
									<th>Categoria</th>
									<th>Socio</th>
									<th style={{ textAlign: "right" }}>Entrate</th>
									<th style={{ textAlign: "right" }}>Uscite</th>
									<th style={{ textAlign: "right" }}>Azioni</th>
								</tr>
							</thead>
							<tbody>
								{items.map((m) => {
									const importoNum = Number(m.importo ?? 0);
									const isEntrata = m.tipo === "entrata";
									return (
										<tr key={m.id}>
											<td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
												{fmtDate(m.data as unknown as string)}
											</td>
											<td style={{ fontWeight: 500 }}>
												{m.causale}
												{m.descrizione ? (
													<div
														style={{
															fontSize: "0.75rem",
															color: "hsl(var(--muted-foreground))",
														}}
													>
														{m.descrizione}
													</div>
												) : null}
											</td>
											<td>
												{m.categoriaContabile ? (
													<span className="badge badge-outline">{m.categoriaContabile}</span>
												) : (
													<span style={{ color: "hsl(var(--muted-foreground))" }}>—</span>
												)}
											</td>
											<td>
												{m.socioNome || m.socioCognome
													? `${m.socioNome ?? ""} ${m.socioCognome ?? ""}`.trim()
													: "—"}
											</td>
											<td
												style={{
													textAlign: "right",
													fontFamily: "monospace",
													color: isEntrata ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
													fontWeight: isEntrata ? 600 : 400,
												}}
											>
												{isEntrata ? fmtEuro(importoNum) : "—"}
											</td>
											<td
												style={{
													textAlign: "right",
													fontFamily: "monospace",
													color: !isEntrata
														? "hsl(var(--destructive))"
														: "hsl(var(--muted-foreground))",
													fontWeight: !isEntrata ? 600 : 400,
												}}
											>
												{!isEntrata ? fmtEuro(importoNum) : "—"}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													<button
														type="button"
														className="btn btn-ghost btn-icon"
														title="Modifica"
														onClick={() => openEdit(m)}
													>
														<Edit className="icon" />
													</button>
													<button
														type="button"
														className="btn btn-ghost btn-icon"
														title="Elimina"
														onClick={() => setConfirmDeleteId(m.id)}
													>
														<Trash2 className="icon" />
													</button>
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
						<span
							style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}
						>
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

			{/* ─── Form Modal ───────────────────────────────────────── */}
			<Modal
				open={formOpen}
				onClose={closeForm}
				title={editId ? "Modifica movimento" : "Nuovo movimento"}
				size="md"
				footer={
					<>
						<button type="button" className="btn btn-outline btn-sm" onClick={closeForm}>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={submitForm}
							disabled={createMut.isPending || updateMut.isPending}
						>
							{editId ? "Salva modifiche" : "Crea movimento"}
						</button>
					</>
				}
			>
				<FormGrid>
					<Field label="Tipo" required span={1}>
						<Select
							value={form.tipo}
							onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoMov }))}
						>
							<option value="entrata">Entrata</option>
							<option value="uscita">Uscita</option>
						</Select>
					</Field>
					<Field label="Data" required span={1}>
						<Input
							type="date"
							value={form.data}
							onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
						/>
					</Field>
					<Field label="Causale" required span={2}>
						<Input
							value={form.causale}
							onChange={(e) => setForm((f) => ({ ...f, causale: e.target.value }))}
							placeholder="es. Quota mensile Mario Rossi"
						/>
					</Field>
					<Field label="Importo (€)" required span={1}>
						<Input
							type="number"
							step="0.01"
							min="0"
							value={form.importo}
							onChange={(e) => setForm((f) => ({ ...f, importo: e.target.value }))}
						/>
					</Field>
					<Field label="Categoria contabile" span={1}>
						<Input
							list="categorie-list"
							value={form.categoriaContabile}
							onChange={(e) =>
								setForm((f) => ({ ...f, categoriaContabile: e.target.value }))
							}
							placeholder="es. Entrate Quote"
						/>
						<datalist id="categorie-list">
							{categorie.map((c) => (
								<option key={c} value={c} />
							))}
						</datalist>
					</Field>
					<Field label="Socio collegato" span={2}>
						<Select
							value={form.socioId}
							onChange={(e) => setForm((f) => ({ ...f, socioId: e.target.value }))}
						>
							<option value="">— Nessuno —</option>
							{sociList.map((s) => (
								<option key={s.id} value={s.id}>
									{s.cognome} {s.nome}
									{s.codiceTessera ? ` (${s.codiceTessera})` : ""}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Descrizione" span={2}>
						<Textarea
							rows={2}
							value={form.descrizione}
							onChange={(e) => setForm((f) => ({ ...f, descrizione: e.target.value }))}
						/>
					</Field>
					<Field label="Note interne" span={2}>
						<Textarea
							rows={2}
							value={form.note}
							onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
						/>
					</Field>
				</FormGrid>
			</Modal>

			<ConfirmDialog
				open={confirmDeleteId !== null}
				onClose={() => setConfirmDeleteId(null)}
				onConfirm={() => {
					if (confirmDeleteId) deleteMut.mutate({ id: confirmDeleteId });
				}}
				title="Eliminare movimento?"
				message="Il movimento verrà rimosso definitivamente dalla prima nota. Operazione non annullabile."
				variant="danger"
				confirmLabel="Elimina"
				loading={deleteMut.isPending}
			/>
		</div>
	);
}
