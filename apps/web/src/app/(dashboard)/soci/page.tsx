"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Circle,
	Download,
	Pause,
	Pencil,
	Plus,
	Search,
	Trash2,
	TrendingDown,
	Users,
	X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatoSocio = "attivo" | "sospeso" | "dimesso" | "scaduto";
type TipologiaSocio = "socio" | "atleta" | "istruttore" | "dirigente" | "volontario";

interface SocioFormState {
	nome: string;
	cognome: string;
	codiceFiscale: string;
	codiceTessera: string;
	email: string;
	telefono: string;
	tipologia: TipologiaSocio;
	disciplina: string;
	sesso: "" | "M" | "F";
	dataNascita: string;
	luogoNascita: string;
	note: string;
	consensoGdpr: boolean;
	consensoFoto: boolean;
	consensoMarketing: boolean;
}

const EMPTY_FORM: SocioFormState = {
	nome: "",
	cognome: "",
	codiceFiscale: "",
	codiceTessera: "",
	email: "",
	telefono: "",
	tipologia: "socio",
	disciplina: "",
	sesso: "",
	dataNascita: "",
	luogoNascita: "",
	note: "",
	consensoGdpr: true,
	consensoFoto: false,
	consensoMarketing: false,
};

function StatoBadge({ stato }: { stato: StatoSocio }) {
	if (stato === "attivo")
		return (
			<span className="badge badge-success">
				<Circle className="icon-sm" /> Attivo
			</span>
		);
	if (stato === "sospeso")
		return (
			<span className="badge badge-destructive">
				<Pause className="icon-sm" /> Sospeso
			</span>
		);
	if (stato === "scaduto")
		return (
			<span className="badge badge-warning">
				<X className="icon-sm" /> Scaduto
			</span>
		);
	return (
		<span className="badge" style={{ background: "hsl(var(--muted))" }}>
			<TrendingDown className="icon-sm" /> Dimesso
		</span>
	);
}

function TipologiaBadge({ tipo }: { tipo: TipologiaSocio }) {
	const map: Record<TipologiaSocio, { bg: string; label: string }> = {
		atleta: { bg: "rgba(59,130,246,0.15)", label: "Atleta" },
		istruttore: { bg: "rgba(168,85,247,0.15)", label: "Istruttore" },
		dirigente: { bg: "rgba(245,158,11,0.15)", label: "Dirigente" },
		volontario: { bg: "rgba(16,185,129,0.15)", label: "Volontario" },
		socio: { bg: "rgba(100,116,139,0.15)", label: "Socio" },
	};
	const cfg = map[tipo];
	return (
		<span
			style={{
				padding: "2px 8px",
				borderRadius: 999,
				fontSize: "0.75rem",
				fontWeight: 500,
				background: cfg.bg,
			}}
		>
			{cfg.label}
		</span>
	);
}

function formValuesToInput(form: SocioFormState) {
	const payload: Record<string, unknown> = {
		nome: form.nome.trim(),
		cognome: form.cognome.trim(),
		tipologia: form.tipologia,
		consensoGdpr: form.consensoGdpr,
		consensoFoto: form.consensoFoto,
		consensoMarketing: form.consensoMarketing,
	};
	if (form.codiceFiscale.trim()) payload.codiceFiscale = form.codiceFiscale.trim().toUpperCase();
	if (form.codiceTessera.trim()) payload.codiceTessera = form.codiceTessera.trim();
	if (form.email.trim()) payload.email = form.email.trim();
	if (form.telefono.trim()) payload.telefono = form.telefono.trim();
	if (form.disciplina.trim()) payload.disciplina = form.disciplina.trim();
	if (form.sesso) payload.sesso = form.sesso;
	if (form.dataNascita) payload.dataNascita = new Date(form.dataNascita).toISOString();
	if (form.luogoNascita.trim()) payload.luogoNascita = form.luogoNascita.trim();
	if (form.note.trim()) payload.note = form.note.trim();
	return payload;
}

export default function SociPage() {
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [stato, setStato] = useState<StatoSocio | "">("");
	const [tipologia, setTipologia] = useState<TipologiaSocio | "">("");
	const [disciplina, setDisciplina] = useState("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<SocioFormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.soci.list.useQuery({
		page,
		perPage,
		search: search || undefined,
		stato: stato || undefined,
		tipologia: tipologia || undefined,
		disciplina: disciplina || undefined,
	});

	const statsQuery = trpc.soci.stats.useQuery();

	const createMutation = trpc.soci.create.useMutation({
		onSuccess: () => {
			utils.soci.list.invalidate();
			utils.soci.stats.invalidate();
			toast.success("Socio creato con successo");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
		onSettled: () => setSaving(false),
	});

	const updateMutation = trpc.soci.update.useMutation({
		onSuccess: () => {
			utils.soci.list.invalidate();
			utils.soci.stats.invalidate();
			toast.success("Socio aggiornato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
		onSettled: () => setSaving(false),
	});

	const deleteMutation = trpc.soci.delete.useMutation({
		onSuccess: () => {
			utils.soci.list.invalidate();
			utils.soci.stats.invalidate();
			toast.success("Socio rimosso (stato: dimesso)");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const exportQuery = trpc.soci.exportCsv.useQuery(
		{
			stato: stato || undefined,
			tipologia: tipologia || undefined,
			disciplina: disciplina || undefined,
		},
		{ enabled: false },
	);

	const stats = useMemo(() => {
		if (!statsQuery.data) return { attivi: 0, sospesi: 0, dimessi: 0, totali: 0 };
		const map: Record<string, number> = {};
		for (const r of statsQuery.data.byStato) map[r.stato ?? ""] = r.count;
		const attivi = map.attivo ?? 0;
		const sospesi = map.sospeso ?? 0;
		const dimessi = map.dimesso ?? 0;
		const totali = Object.values(map).reduce((a, b) => a + b, 0);
		return { attivi, sospesi, dimessi, totali };
	}, [statsQuery.data]);

	const items = query.data?.items ?? [];
	const total = query.data?.total ?? 0;
	const totalPages = query.data?.totalPages ?? 1;

	function openCreate() {
		setEditId(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setModalOpen(true);
	}

	function openEdit(row: (typeof items)[number]) {
		setEditId(row.id);
		setForm({
			nome: row.nome ?? "",
			cognome: row.cognome ?? "",
			codiceFiscale: row.codiceFiscale ?? "",
			codiceTessera: row.codiceTessera ?? "",
			email: row.email ?? "",
			telefono: row.telefono ?? "",
			tipologia: (row.tipologia as TipologiaSocio) ?? "socio",
			disciplina: row.disciplina ?? "",
			sesso: (row.sesso as "M" | "F") ?? "",
			dataNascita: row.dataNascita
				? new Date(row.dataNascita as unknown as string).toISOString().slice(0, 10)
				: "",
			luogoNascita: row.luogoNascita ?? "",
			note: row.note ?? "",
			consensoGdpr: !!row.consensoGdpr,
			consensoFoto: !!row.consensoFoto,
			consensoMarketing: !!row.consensoMarketing,
		});
		setFormError(null);
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setEditId(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setSaving(false);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFormError(null);
		if (!form.nome.trim() || !form.cognome.trim()) {
			setFormError("Nome e cognome sono obbligatori.");
			return;
		}
		const payload = formValuesToInput(form);
		setSaving(true);
		if (editId) {
			updateMutation.mutate({ id: editId, ...payload } as Parameters<
				typeof updateMutation.mutate
			>[0]);
		} else {
			createMutation.mutate(payload as Parameters<typeof createMutation.mutate>[0]);
		}
	}

	function applySearch() {
		setSearch(searchInput);
		setPage(1);
	}

	async function handleExport() {
		const res = await exportQuery.refetch();
		const data = res.data;
		if (!data) {
			toast.error("Errore export");
			return;
		}
		const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = data.filename;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("CSV scaricato");
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Soci</h1>
					<p className="page-subtitle">
						{stats.totali} soci · {stats.attivi} attivi · {stats.sospesi} sospesi · {stats.dimessi}{" "}
						dimessi
					</p>
				</div>
				<div className="page-actions">
					<button
						type="button"
						className="btn btn-outline btn-sm"
						onClick={handleExport}
						disabled={exportQuery.isFetching}
					>
						<Download className="icon" /> {exportQuery.isFetching ? "Esporto..." : "Esporta CSV"}
					</button>
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Plus className="icon" /> Nuovo Socio
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<div style={{ position: "relative", flex: 1, minWidth: 240 }}>
					<Search
						style={{
							position: "absolute",
							left: 10,
							top: "50%",
							transform: "translateY(-50%)",
							width: 16,
							height: 16,
							color: "hsl(var(--muted-foreground))",
						}}
					/>
					<input
						className="input"
						style={{ paddingLeft: 34 }}
						placeholder="Cerca per nome, cognome, codice fiscale, email..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") applySearch();
						}}
					/>
				</div>
				<select
					className="select"
					value={stato}
					onChange={(e) => {
						setStato(e.target.value as StatoSocio | "");
						setPage(1);
					}}
				>
					<option value="">Tutti gli stati</option>
					<option value="attivo">Attivo</option>
					<option value="sospeso">Sospeso</option>
					<option value="scaduto">Scaduto</option>
					<option value="dimesso">Dimesso</option>
				</select>
				<select
					className="select"
					value={tipologia}
					onChange={(e) => {
						setTipologia(e.target.value as TipologiaSocio | "");
						setPage(1);
					}}
				>
					<option value="">Tutte le tipologie</option>
					<option value="socio">Socio</option>
					<option value="atleta">Atleta</option>
					<option value="istruttore">Istruttore</option>
					<option value="dirigente">Dirigente</option>
					<option value="volontario">Volontario</option>
				</select>
				<input
					className="input"
					style={{ maxWidth: 180 }}
					placeholder="Disciplina"
					value={disciplina}
					onChange={(e) => {
						setDisciplina(e.target.value);
						setPage(1);
					}}
				/>
				<button type="button" className="btn btn-outline btn-sm" onClick={applySearch}>
					Cerca
				</button>
			</div>

			<div className="card">
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Tessera</th>
								<th>Cognome</th>
								<th>Nome</th>
								<th>Tipologia</th>
								<th>Disciplina</th>
								<th>Email</th>
								<th>Stato</th>
								<th style={{ textAlign: "right" }}>Azioni</th>
							</tr>
						</thead>
						<tbody>
							{query.isLoading ? (
								<tr>
									<td
										colSpan={8}
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
										colSpan={8}
										style={{ textAlign: "center", padding: "3rem", color: "#dc2626" }}
									>
										Errore: {query.error.message}
									</td>
								</tr>
							) : items.length === 0 ? (
								<tr>
									<td colSpan={8} style={{ padding: 0 }}>
										<EmptyState
											icon={Users}
											title="Nessun socio trovato"
											description={
												search || stato || tipologia || disciplina
													? "Prova a modificare i filtri di ricerca."
													: "Crea il primo socio per iniziare."
											}
											action={
												<button
													type="button"
													className="btn btn-primary btn-sm"
													onClick={openCreate}
												>
													<Plus className="icon" /> Nuovo Socio
												</button>
											}
										/>
									</td>
								</tr>
							) : (
								items.map((s) => (
									<tr key={s.id}>
										<td
											style={{
												fontFamily: "monospace",
												fontSize: "0.8125rem",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{s.codiceTessera ?? "—"}
										</td>
										<td style={{ fontWeight: 500 }}>{s.cognome}</td>
										<td style={{ fontWeight: 500 }}>{s.nome}</td>
										<td>
											<TipologiaBadge tipo={s.tipologia as TipologiaSocio} />
										</td>
										<td>{s.disciplina ?? "—"}</td>
										<td
											style={{
												color: "hsl(var(--muted-foreground))",
												fontSize: "0.875rem",
											}}
										>
											{s.email ?? "—"}
										</td>
										<td>
											<StatoBadge stato={s.stato as StatoSocio} />
										</td>
										<td>
											<div className="table-actions" style={{ justifyContent: "flex-end" }}>
												<button
													type="button"
													className="table-action"
													title="Modifica"
													onClick={() => openEdit(s)}
												>
													<Pencil className="icon" />
												</button>
												<button
													type="button"
													className="table-action"
													title="Elimina"
													onClick={() =>
														setDeleteTarget({ id: s.id, label: `${s.cognome} ${s.nome}` })
													}
												>
													<Trash2 className="icon" style={{ color: "#dc2626" }} />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
				{total > 0 && (
					<div className="pagination">
						<span>
							Mostra {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} di {total} soci
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

			{/* Create/Edit Modal */}
			<Modal
				open={modalOpen}
				onClose={closeModal}
				title={editId ? "Modifica socio" : "Nuovo socio"}
				subtitle={editId ? "Aggiorna i dati del socio" : "Inserisci i dati anagrafici"}
				size="lg"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={closeModal}
							disabled={saving}
						>
							Annulla
						</button>
						<button
							type="submit"
							form="socio-form"
							className="btn btn-primary btn-sm"
							disabled={saving}
						>
							<Check className="icon" /> {saving ? "Salvataggio..." : "Salva"}
						</button>
					</>
				}
			>
				<form id="socio-form" onSubmit={handleSubmit}>
					{formError && (
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
							{formError}
						</div>
					)}
					<FormGrid>
						<Field label="Nome" required>
							<Input
								value={form.nome}
								onChange={(e) => setForm({ ...form, nome: e.target.value })}
								required
							/>
						</Field>
						<Field label="Cognome" required>
							<Input
								value={form.cognome}
								onChange={(e) => setForm({ ...form, cognome: e.target.value })}
								required
							/>
						</Field>
						<Field label="Codice Fiscale" hint="16 caratteri">
							<Input
								value={form.codiceFiscale}
								onChange={(e) =>
									setForm({ ...form, codiceFiscale: e.target.value.toUpperCase() })
								}
								maxLength={16}
								style={{ fontFamily: "monospace", textTransform: "uppercase" }}
							/>
						</Field>
						<Field label="Codice Tessera">
							<Input
								value={form.codiceTessera}
								onChange={(e) => setForm({ ...form, codiceTessera: e.target.value })}
							/>
						</Field>
						<Field label="Email">
							<Input
								type="email"
								value={form.email}
								onChange={(e) => setForm({ ...form, email: e.target.value })}
							/>
						</Field>
						<Field label="Telefono">
							<Input
								value={form.telefono}
								onChange={(e) => setForm({ ...form, telefono: e.target.value })}
							/>
						</Field>
						<Field label="Tipologia" required>
							<Select
								value={form.tipologia}
								onChange={(e) =>
									setForm({ ...form, tipologia: e.target.value as TipologiaSocio })
								}
							>
								<option value="socio">Socio</option>
								<option value="atleta">Atleta</option>
								<option value="istruttore">Istruttore</option>
								<option value="dirigente">Dirigente</option>
								<option value="volontario">Volontario</option>
							</Select>
						</Field>
						<Field label="Disciplina">
							<Input
								value={form.disciplina}
								onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
								placeholder="es. Atletica, Nuoto..."
							/>
						</Field>
						<Field label="Data di Nascita">
							<Input
								type="date"
								value={form.dataNascita}
								onChange={(e) => setForm({ ...form, dataNascita: e.target.value })}
							/>
						</Field>
						<Field label="Sesso">
							<Select
								value={form.sesso}
								onChange={(e) => setForm({ ...form, sesso: e.target.value as "M" | "F" | "" })}
							>
								<option value="">—</option>
								<option value="M">Maschio</option>
								<option value="F">Femmina</option>
							</Select>
						</Field>
						<Field label="Luogo di Nascita" span={2}>
							<Input
								value={form.luogoNascita}
								onChange={(e) => setForm({ ...form, luogoNascita: e.target.value })}
							/>
						</Field>
						<Field label="Note" span={2}>
							<Textarea
								value={form.note}
								onChange={(e) => setForm({ ...form, note: e.target.value })}
							/>
						</Field>
					</FormGrid>
					<div
						style={{
							marginTop: "1.5rem",
							padding: "1rem",
							background: "hsl(var(--muted) / 0.3)",
							borderRadius: 6,
							display: "flex",
							flexDirection: "column",
							gap: "0.5rem",
						}}
					>
						<p
							style={{
								fontSize: "0.8125rem",
								fontWeight: 600,
								margin: 0,
								marginBottom: "0.25rem",
							}}
						>
							Consensi GDPR
						</p>
						<label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
							<input
								type="checkbox"
								checked={form.consensoGdpr}
								onChange={(e) => setForm({ ...form, consensoGdpr: e.target.checked })}
							/>
							Consenso al trattamento dei dati personali (obbligatorio)
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
							<input
								type="checkbox"
								checked={form.consensoFoto}
								onChange={(e) => setForm({ ...form, consensoFoto: e.target.checked })}
							/>
							Consenso all'utilizzo di foto e video
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
							<input
								type="checkbox"
								checked={form.consensoMarketing}
								onChange={(e) => setForm({ ...form, consensoMarketing: e.target.checked })}
							/>
							Consenso alle comunicazioni di marketing
						</label>
					</div>
				</form>
			</Modal>

			{/* Delete Confirm */}
			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
				}}
				title="Rimuovere socio?"
				message={`Il socio ${deleteTarget?.label ?? ""} sara' contrassegnato come dimesso. L'operazione mantiene lo storico.`}
				confirmLabel="Dimetti"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
