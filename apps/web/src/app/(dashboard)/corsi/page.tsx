"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	Calendar,
	Check,
	Clock,
	GraduationCap,
	MapPin,
	Pencil,
	Plus,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type StatoCorso = "attivo" | "sospeso" | "chiuso";
type Livello = "principiante" | "intermedio" | "avanzato" | "agonistico";
type Giorno = "lunedi" | "martedi" | "mercoledi" | "giovedi" | "venerdi" | "sabato" | "domenica";

interface OrarioRow {
	giorno: Giorno;
	oraInizio: string;
	oraFine: string;
}

interface CorsoFormState {
	nome: string;
	disciplina: string;
	descrizione: string;
	livello: "" | Livello;
	etaMin: string;
	etaMax: string;
	sedeNome: string;
	capacitaMax: string;
	quotaAssociata: string;
	stato: StatoCorso;
	orari: OrarioRow[];
}

const EMPTY_FORM: CorsoFormState = {
	nome: "",
	disciplina: "",
	descrizione: "",
	livello: "",
	etaMin: "",
	etaMax: "",
	sedeNome: "",
	capacitaMax: "",
	quotaAssociata: "",
	stato: "attivo",
	orari: [{ giorno: "lunedi", oraInizio: "17:00", oraFine: "18:30" }],
};

const GIORNI: Giorno[] = [
	"lunedi",
	"martedi",
	"mercoledi",
	"giovedi",
	"venerdi",
	"sabato",
	"domenica",
];

function formatOrario(orari: unknown): string {
	if (!Array.isArray(orari) || orari.length === 0) return "Orario non definito";
	return orari
		.map((o: { giorno: string; oraInizio: string; oraFine: string }) => {
			const g = o.giorno.charAt(0).toUpperCase() + o.giorno.slice(1, 3);
			return `${g} ${o.oraInizio}-${o.oraFine}`;
		})
		.join(", ");
}

export default function CorsiPage() {
	const [stato, setStato] = useState<StatoCorso | "">("");
	const [disciplina, setDisciplina] = useState("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<CorsoFormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);

	const [iscriviTarget, setIscriviTarget] = useState<{ id: string; nome: string } | null>(null);
	const [selectedSocioId, setSelectedSocioId] = useState("");

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

	const [iscrittiFor, setIscrittiFor] = useState<{ id: string; nome: string } | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.corsi.list.useQuery({
		page: 1,
		perPage: 100,
		stato: stato || undefined,
		disciplina: disciplina || undefined,
	});

	const disciplinesQuery = trpc.corsi.disciplines.useQuery();
	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 200, stato: "attivo" });

	const iscrittiQuery = trpc.corsi.listIscritti.useQuery(
		{ corsoId: iscrittiFor?.id ?? "" },
		{ enabled: !!iscrittiFor },
	);

	const createMutation = trpc.corsi.create.useMutation({
		onSuccess: () => {
			utils.corsi.list.invalidate();
			utils.corsi.disciplines.invalidate();
			toast.success("Corso creato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const updateMutation = trpc.corsi.update.useMutation({
		onSuccess: () => {
			utils.corsi.list.invalidate();
			toast.success("Corso aggiornato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const deleteMutation = trpc.corsi.delete.useMutation({
		onSuccess: () => {
			utils.corsi.list.invalidate();
			toast.success("Corso eliminato");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const iscriviMutation = trpc.corsi.iscrivi.useMutation({
		onSuccess: () => {
			utils.corsi.listIscritti.invalidate();
			utils.corsi.list.invalidate();
			toast.success("Socio iscritto");
			setIscriviTarget(null);
			setSelectedSocioId("");
		},
		onError: (err) => toast.error(err.message),
	});

	const disiscriviMutation = trpc.corsi.disiscrivi.useMutation({
		onSuccess: () => {
			utils.corsi.listIscritti.invalidate();
			toast.success("Iscrizione rimossa");
		},
		onError: (err) => toast.error(err.message),
	});

	const items = query.data?.items ?? [];

	function openCreate() {
		setEditId(null);
		setForm(EMPTY_FORM);
		setFormError(null);
		setModalOpen(true);
	}

	function openEdit(row: (typeof items)[number]) {
		setEditId(row.id);
		const orari = Array.isArray(row.orarioSettimanale)
			? (row.orarioSettimanale as OrarioRow[])
			: EMPTY_FORM.orari;
		setForm({
			nome: row.nome,
			disciplina: row.disciplina ?? "",
			descrizione: row.descrizione ?? "",
			livello: (row.livello as Livello | null) ?? "",
			etaMin: row.etaMin?.toString() ?? "",
			etaMax: row.etaMax?.toString() ?? "",
			sedeNome: row.sedeNome ?? "",
			capacitaMax: row.capacitaMax?.toString() ?? "",
			quotaAssociata: row.quotaAssociata?.toString() ?? "",
			stato: row.stato as StatoCorso,
			orari,
		});
		setFormError(null);
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setEditId(null);
		setFormError(null);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFormError(null);
		if (!form.nome.trim()) {
			setFormError("Il nome e' obbligatorio.");
			return;
		}
		const payload = {
			nome: form.nome.trim(),
			disciplina: form.disciplina.trim() || undefined,
			descrizione: form.descrizione.trim() || undefined,
			livello: form.livello || undefined,
			etaMin: form.etaMin ? Number(form.etaMin) : undefined,
			etaMax: form.etaMax ? Number(form.etaMax) : undefined,
			sedeNome: form.sedeNome.trim() || undefined,
			capacitaMax: form.capacitaMax ? Number(form.capacitaMax) : undefined,
			quotaAssociata: form.quotaAssociata ? Number(form.quotaAssociata) : undefined,
			stato: form.stato,
			orarioSettimanale: form.orari,
		};

		if (editId) {
			updateMutation.mutate({ id: editId, ...payload });
		} else {
			createMutation.mutate(payload);
		}
	}

	function updateOrario(idx: number, field: keyof OrarioRow, value: string) {
		const next = [...form.orari];
		next[idx] = { ...next[idx], [field]: value } as OrarioRow;
		setForm({ ...form, orari: next });
	}
	function addOrario() {
		setForm({
			...form,
			orari: [...form.orari, { giorno: "lunedi", oraInizio: "17:00", oraFine: "18:30" }],
		});
	}
	function removeOrario(idx: number) {
		setForm({ ...form, orari: form.orari.filter((_, i) => i !== idx) });
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Corsi</h1>
					<p className="page-subtitle">{items.length} corsi · gestione calendario e iscrizioni</p>
				</div>
				<div className="page-actions">
					<a href="/calendario" className="btn btn-outline btn-sm">
						<Calendar className="icon" /> Calendario
					</a>
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Plus className="icon" /> Nuovo Corso
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<select
					className="select"
					value={stato}
					onChange={(e) => setStato(e.target.value as StatoCorso | "")}
				>
					<option value="">Tutti gli stati</option>
					<option value="attivo">Attivo</option>
					<option value="sospeso">Sospeso</option>
					<option value="chiuso">Chiuso</option>
				</select>
				<select
					className="select"
					value={disciplina}
					onChange={(e) => setDisciplina(e.target.value)}
				>
					<option value="">Tutte le discipline</option>
					{disciplinesQuery.data?.map((d) => (
						<option key={d} value={d}>
							{d}
						</option>
					))}
				</select>
			</div>

			{query.isLoading ? (
				<div
					style={{
						padding: "3rem",
						textAlign: "center",
						color: "hsl(var(--muted-foreground))",
					}}
				>
					Caricamento...
				</div>
			) : items.length === 0 ? (
				<EmptyState
					icon={GraduationCap}
					title="Nessun corso"
					description="Crea il primo corso per gestire calendario e iscrizioni."
					action={
						<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
							<Plus className="icon" /> Nuovo Corso
						</button>
					}
				/>
			) : (
				<div className="course-grid">
					{items.map((c) => {
						const cap = c.capacitaMax ?? 0;
						return (
							<div key={c.id} className="card course-card">
								<div className="course-head">
									<div>
										<div className="course-title">{c.nome}</div>
										<div className="course-desc">
											{c.disciplina && <span>{c.disciplina}</span>}
											{c.livello && <span>· {c.livello}</span>}
										</div>
									</div>
									{c.stato === "chiuso" ? (
										<span className="badge badge-destructive">CHIUSO</span>
									) : c.stato === "sospeso" ? (
										<span className="badge badge-warning">SOSPESO</span>
									) : (
										<span className="badge badge-primary">Attivo</span>
									)}
								</div>
								<div
									style={{
										fontSize: "0.8125rem",
										color: "hsl(var(--muted-foreground))",
										marginBottom: "0.5rem",
										display: "flex",
										alignItems: "center",
										gap: 4,
									}}
								>
									<Clock className="icon-sm" /> {formatOrario(c.orarioSettimanale)}
								</div>
								{c.sedeNome && (
									<div
										style={{
											fontSize: "0.8125rem",
											color: "hsl(var(--muted-foreground))",
											marginBottom: "0.5rem",
											display: "flex",
											alignItems: "center",
											gap: 4,
										}}
									>
										<MapPin className="icon-sm" /> {c.sedeNome}
									</div>
								)}
								{cap > 0 && (
									<div
										style={{
											fontSize: "0.8125rem",
											color: "hsl(var(--muted-foreground))",
											marginBottom: "0.5rem",
										}}
									>
										Capacita': {cap} posti
										{c.quotaAssociata && ` · Quota: € ${c.quotaAssociata}`}
									</div>
								)}
								<div style={{ display: "flex", gap: "0.375rem", marginTop: "0.75rem" }}>
									<button
										type="button"
										className="btn btn-outline btn-sm"
										style={{ flex: 1 }}
										onClick={() => setIscrittiFor({ id: c.id, nome: c.nome })}
									>
										<Users className="icon-sm" /> Iscritti
									</button>
									<button
										type="button"
										className="btn btn-outline btn-sm"
										onClick={() => setIscriviTarget({ id: c.id, nome: c.nome })}
									>
										<UserPlus className="icon-sm" />
									</button>
									<button
										type="button"
										className="btn btn-ghost btn-icon"
										onClick={() => openEdit(c)}
										title="Modifica"
									>
										<Pencil className="icon-sm" />
									</button>
									<button
										type="button"
										className="btn btn-ghost btn-icon"
										onClick={() => setDeleteTarget({ id: c.id, nome: c.nome })}
										title="Elimina"
									>
										<Trash2 className="icon-sm" style={{ color: "#dc2626" }} />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Create/Edit Modal */}
			<Modal
				open={modalOpen}
				onClose={closeModal}
				title={editId ? "Modifica corso" : "Nuovo corso"}
				size="lg"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={closeModal}
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							Annulla
						</button>
						<button
							type="submit"
							form="corso-form"
							className="btn btn-primary btn-sm"
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							<Check className="icon" />{" "}
							{createMutation.isPending || updateMutation.isPending ? "Salvataggio..." : "Salva"}
						</button>
					</>
				}
			>
				<form id="corso-form" onSubmit={handleSubmit}>
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
						<Field label="Nome" required span={2}>
							<Input
								value={form.nome}
								onChange={(e) => setForm({ ...form, nome: e.target.value })}
								required
							/>
						</Field>
						<Field label="Disciplina">
							<Input
								value={form.disciplina}
								onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
							/>
						</Field>
						<Field label="Livello">
							<Select
								value={form.livello}
								onChange={(e) => setForm({ ...form, livello: e.target.value as Livello | "" })}
							>
								<option value="">—</option>
								<option value="principiante">Principiante</option>
								<option value="intermedio">Intermedio</option>
								<option value="avanzato">Avanzato</option>
								<option value="agonistico">Agonistico</option>
							</Select>
						</Field>
						<Field label="Eta' min">
							<Input
								type="number"
								min="0"
								value={form.etaMin}
								onChange={(e) => setForm({ ...form, etaMin: e.target.value })}
							/>
						</Field>
						<Field label="Eta' max">
							<Input
								type="number"
								min="0"
								value={form.etaMax}
								onChange={(e) => setForm({ ...form, etaMax: e.target.value })}
							/>
						</Field>
						<Field label="Sede">
							<Input
								value={form.sedeNome}
								onChange={(e) => setForm({ ...form, sedeNome: e.target.value })}
							/>
						</Field>
						<Field label="Capacita' max">
							<Input
								type="number"
								min="1"
								value={form.capacitaMax}
								onChange={(e) => setForm({ ...form, capacitaMax: e.target.value })}
							/>
						</Field>
						<Field label="Quota associata (EUR)">
							<Input
								type="number"
								min="0"
								step="0.01"
								value={form.quotaAssociata}
								onChange={(e) => setForm({ ...form, quotaAssociata: e.target.value })}
							/>
						</Field>
						<Field label="Stato">
							<Select
								value={form.stato}
								onChange={(e) => setForm({ ...form, stato: e.target.value as StatoCorso })}
							>
								<option value="attivo">Attivo</option>
								<option value="sospeso">Sospeso</option>
								<option value="chiuso">Chiuso</option>
							</Select>
						</Field>
						<Field label="Descrizione" span={2}>
							<Textarea
								value={form.descrizione}
								onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
							/>
						</Field>
					</FormGrid>

					<div style={{ marginTop: "1.25rem" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "0.5rem",
							}}
						>
							<p style={{ fontSize: "0.8125rem", fontWeight: 600, margin: 0 }}>
								Orario settimanale
							</p>
							<button
								type="button"
								className="btn btn-outline btn-sm"
								onClick={addOrario}
							>
								<Plus className="icon-sm" /> Aggiungi giorno
							</button>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							{form.orari.map((o, i) => (
								<div
									key={`${i}-${o.giorno}`}
									style={{
										display: "grid",
										gridTemplateColumns: "2fr 1fr 1fr auto",
										gap: "0.5rem",
										alignItems: "center",
									}}
								>
									<select
										className="select"
										value={o.giorno}
										onChange={(e) => updateOrario(i, "giorno", e.target.value)}
									>
										{GIORNI.map((g) => (
											<option key={g} value={g}>
												{g.charAt(0).toUpperCase() + g.slice(1)}
											</option>
										))}
									</select>
									<input
										type="time"
										className="input"
										value={o.oraInizio}
										onChange={(e) => updateOrario(i, "oraInizio", e.target.value)}
									/>
									<input
										type="time"
										className="input"
										value={o.oraFine}
										onChange={(e) => updateOrario(i, "oraFine", e.target.value)}
									/>
									<button
										type="button"
										className="table-action"
										onClick={() => removeOrario(i)}
										disabled={form.orari.length <= 1}
									>
										<X className="icon" />
									</button>
								</div>
							))}
						</div>
					</div>
				</form>
			</Modal>

			{/* Iscrivi Socio Modal */}
			<Modal
				open={!!iscriviTarget}
				onClose={() => {
					setIscriviTarget(null);
					setSelectedSocioId("");
				}}
				title="Iscrivi socio"
				subtitle={iscriviTarget?.nome}
				size="sm"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={() => setIscriviTarget(null)}
						>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={!selectedSocioId || iscriviMutation.isPending}
							onClick={() => {
								if (iscriviTarget && selectedSocioId) {
									iscriviMutation.mutate({
										corsoId: iscriviTarget.id,
										socioId: selectedSocioId,
									});
								}
							}}
						>
							<UserPlus className="icon" />{" "}
							{iscriviMutation.isPending ? "Iscrizione..." : "Iscrivi"}
						</button>
					</>
				}
			>
				<Field label="Seleziona socio" required>
					<Select
						value={selectedSocioId}
						onChange={(e) => setSelectedSocioId(e.target.value)}
					>
						<option value="">—</option>
						{sociQuery.data?.items.map((s) => (
							<option key={s.id} value={s.id}>
								{s.cognome} {s.nome}
							</option>
						))}
					</Select>
				</Field>
			</Modal>

			{/* Iscritti Modal */}
			<Modal
				open={!!iscrittiFor}
				onClose={() => setIscrittiFor(null)}
				title="Iscritti al corso"
				subtitle={iscrittiFor?.nome}
				size="md"
			>
				{iscrittiQuery.isLoading ? (
					<p>Caricamento...</p>
				) : !iscrittiQuery.data || iscrittiQuery.data.length === 0 ? (
					<EmptyState
						icon={Users}
						title="Nessun iscritto"
						description="Usa il bottone Iscrivi per aggiungere soci al corso."
					/>
				) : (
					<table className="table">
						<thead>
							<tr>
								<th>Cognome</th>
								<th>Nome</th>
								<th>Tessera</th>
								<th>Stato</th>
								<th />
							</tr>
						</thead>
						<tbody>
							{iscrittiQuery.data.map((i) => (
								<tr key={i.id}>
									<td style={{ fontWeight: 500 }}>{i.cognome}</td>
									<td>{i.nome}</td>
									<td
										style={{
											fontFamily: "monospace",
											fontSize: "0.8125rem",
											color: "hsl(var(--muted-foreground))",
										}}
									>
										{i.codiceTessera ?? "—"}
									</td>
									<td>{i.stato}</td>
									<td style={{ textAlign: "right" }}>
										<button
											type="button"
											className="table-action"
											onClick={() => {
												if (iscrittiFor) {
													disiscriviMutation.mutate({
														corsoId: iscrittiFor.id,
														socioId: i.socioId,
													});
												}
											}}
										>
											<X className="icon" />
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</Modal>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
				}}
				title="Eliminare corso?"
				message={`Il corso "${deleteTarget?.nome ?? ""}" verra' rimosso insieme a iscrizioni e presenze.`}
				confirmLabel="Elimina"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
