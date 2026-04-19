"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	Calendar,
	Check,
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

type TipoEvento = "gara" | "torneo" | "stage" | "saggio" | "raduno";

interface EventoFormState {
	nome: string;
	tipo: TipoEvento;
	descrizione: string;
	dataInizio: string;
	dataFine: string;
	luogo: string;
	disciplina: string;
	categoria: string;
	iscrizioniAperte: boolean;
	deadlineIscrizione: string;
	quotaIscrizione: string;
	maxPartecipanti: string;
}

const EMPTY_FORM: EventoFormState = {
	nome: "",
	tipo: "gara",
	descrizione: "",
	dataInizio: "",
	dataFine: "",
	luogo: "",
	disciplina: "",
	categoria: "",
	iscrizioniAperte: true,
	deadlineIscrizione: "",
	quotaIscrizione: "",
	maxPartecipanti: "",
};

const TIPO_LABELS: Record<TipoEvento, string> = {
	gara: "Gara",
	torneo: "Torneo",
	stage: "Stage",
	saggio: "Saggio",
	raduno: "Raduno",
};

function dateOnly(value: string | Date | null | undefined): string {
	if (!value) return "";
	const d = new Date(value as string);
	return d.toISOString().slice(0, 10);
}

export default function EventiPage() {
	const [tipo, setTipo] = useState<TipoEvento | "">("");
	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<EventoFormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);

	const [iscriviTarget, setIscriviTarget] = useState<{ id: string; nome: string } | null>(null);
	const [iscrittiFor, setIscrittiFor] = useState<{ id: string; nome: string } | null>(null);
	const [selectedSocioId, setSelectedSocioId] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.eventi.list.useQuery({
		page: 1,
		perPage: 100,
		tipo: tipo || undefined,
	});

	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 200, stato: "attivo" });

	const iscrittiQuery = trpc.eventi.listIscritti.useQuery(
		{ eventoId: iscrittiFor?.id ?? "" },
		{ enabled: !!iscrittiFor },
	);

	const createMutation = trpc.eventi.create.useMutation({
		onSuccess: () => {
			utils.eventi.list.invalidate();
			toast.success("Evento creato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const updateMutation = trpc.eventi.update.useMutation({
		onSuccess: () => {
			utils.eventi.list.invalidate();
			toast.success("Evento aggiornato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const deleteMutation = trpc.eventi.delete.useMutation({
		onSuccess: () => {
			utils.eventi.list.invalidate();
			toast.success("Evento eliminato");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const iscriviMutation = trpc.eventi.iscrivi.useMutation({
		onSuccess: () => {
			utils.eventi.listIscritti.invalidate();
			toast.success("Socio iscritto");
			setIscriviTarget(null);
			setSelectedSocioId("");
		},
		onError: (err) => toast.error(err.message),
	});

	const disiscriviMutation = trpc.eventi.disiscrivi.useMutation({
		onSuccess: () => {
			utils.eventi.listIscritti.invalidate();
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
		setForm({
			nome: row.nome,
			tipo: row.tipo as TipoEvento,
			descrizione: row.descrizione ?? "",
			dataInizio: dateOnly(row.dataInizio as string),
			dataFine: dateOnly(row.dataFine as string | null),
			luogo: row.luogo ?? "",
			disciplina: row.disciplina ?? "",
			categoria: row.categoria ?? "",
			iscrizioniAperte: !!row.iscrizioniAperte,
			deadlineIscrizione: dateOnly(row.deadlineIscrizione as string | null),
			quotaIscrizione: row.quotaIscrizione?.toString() ?? "",
			maxPartecipanti: row.maxPartecipanti?.toString() ?? "",
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
		if (!form.nome.trim() || !form.dataInizio) {
			setFormError("Nome e data inizio sono obbligatori.");
			return;
		}
		const payload = {
			nome: form.nome.trim(),
			tipo: form.tipo,
			descrizione: form.descrizione.trim() || undefined,
			dataInizio: new Date(form.dataInizio).toISOString(),
			dataFine: form.dataFine ? new Date(form.dataFine).toISOString() : undefined,
			luogo: form.luogo.trim() || undefined,
			disciplina: form.disciplina.trim() || undefined,
			categoria: form.categoria.trim() || undefined,
			iscrizioniAperte: form.iscrizioniAperte,
			deadlineIscrizione: form.deadlineIscrizione
				? new Date(form.deadlineIscrizione).toISOString()
				: undefined,
			quotaIscrizione: form.quotaIscrizione ? Number(form.quotaIscrizione) : undefined,
			maxPartecipanti: form.maxPartecipanti ? Number(form.maxPartecipanti) : undefined,
		};
		if (editId) {
			updateMutation.mutate({ id: editId, ...payload });
		} else {
			createMutation.mutate(payload);
		}
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Eventi</h1>
					<p className="page-subtitle">
						{items.length} eventi · gare, tornei, stage e saggi
					</p>
				</div>
				<div className="page-actions">
					<a href="/calendario" className="btn btn-outline btn-sm">
						<Calendar className="icon" /> Calendario
					</a>
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Plus className="icon" /> Nuovo Evento
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<select
					className="select"
					value={tipo}
					onChange={(e) => setTipo(e.target.value as TipoEvento | "")}
				>
					<option value="">Tutti i tipi</option>
					<option value="gara">Gara</option>
					<option value="torneo">Torneo</option>
					<option value="stage">Stage</option>
					<option value="saggio">Saggio</option>
					<option value="raduno">Raduno</option>
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
					icon={Calendar}
					title="Nessun evento"
					description="Crea il primo evento per aprire le iscrizioni."
					action={
						<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
							<Plus className="icon" /> Nuovo Evento
						</button>
					}
				/>
			) : (
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
						gap: "1rem",
					}}
				>
					{items.map((e) => {
						const dt = new Date(e.dataInizio as unknown as string);
						const giorno = dt.getDate();
						const mese = dt
							.toLocaleString("it-IT", { month: "short" })
							.toUpperCase()
							.slice(0, 3);
						return (
							<div key={e.id} className="card">
								<div className="card-body">
									<div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
										<div
											style={{
												flexShrink: 0,
												width: "4rem",
												height: "4rem",
												borderRadius: "0.5rem",
												background: "hsl(var(--primary) / 0.1)",
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												justifyContent: "center",
												border: "2px solid hsl(var(--primary) / 0.2)",
											}}
										>
											<div
												style={{
													fontSize: "1.5rem",
													fontWeight: 700,
													color: "hsl(var(--primary))",
													lineHeight: 1,
												}}
											>
												{giorno}
											</div>
											<div
												style={{
													fontSize: "0.6875rem",
													fontWeight: 600,
													color: "hsl(var(--primary))",
													textTransform: "uppercase",
													letterSpacing: "0.05em",
												}}
											>
												{mese}
											</div>
										</div>
										<div style={{ flex: 1, minWidth: 0 }}>
											<h3
												style={{
													fontWeight: 600,
													marginBottom: "0.25rem",
													fontSize: "1rem",
												}}
											>
												{e.nome}
											</h3>
											<div
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
													marginBottom: "0.5rem",
												}}
											>
												<span className="badge badge-outline">{TIPO_LABELS[e.tipo as TipoEvento]}</span>
												{e.disciplina && (
													<span style={{ marginLeft: 8 }}>{e.disciplina}</span>
												)}
											</div>
											{e.luogo && (
												<div
													style={{
														fontSize: "0.8125rem",
														color: "hsl(var(--muted-foreground))",
														display: "flex",
														alignItems: "center",
														gap: "0.25rem",
														marginBottom: "0.5rem",
													}}
												>
													<MapPin className="icon-sm" /> {e.luogo}
												</div>
											)}
											<div
												style={{
													display: "flex",
													gap: "0.5rem",
													alignItems: "center",
													marginBottom: "0.75rem",
												}}
											>
												{e.iscrizioniAperte ? (
													<span className="badge badge-success">Iscrizioni aperte</span>
												) : (
													<span className="badge">Chiuse</span>
												)}
												{e.maxPartecipanti && (
													<span
														style={{
															fontSize: "0.8125rem",
															color: "hsl(var(--muted-foreground))",
														}}
													>
														max {e.maxPartecipanti}
													</span>
												)}
												{e.quotaIscrizione && (
													<span
														style={{
															fontSize: "0.8125rem",
															fontWeight: 600,
														}}
													>
														€ {e.quotaIscrizione}
													</span>
												)}
											</div>
											<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
												<button
													type="button"
													className="btn btn-outline btn-sm"
													onClick={() => setIscrittiFor({ id: e.id, nome: e.nome })}
												>
													<Users className="icon-sm" /> Iscritti
												</button>
												<button
													type="button"
													className="btn btn-primary btn-sm"
													onClick={() => setIscriviTarget({ id: e.id, nome: e.nome })}
												>
													<UserPlus className="icon-sm" /> Iscrivi
												</button>
												<button
													type="button"
													className="btn btn-ghost btn-icon"
													onClick={() => openEdit(e)}
													title="Modifica"
												>
													<Pencil className="icon-sm" />
												</button>
												<button
													type="button"
													className="btn btn-ghost btn-icon"
													onClick={() => setDeleteTarget({ id: e.id, nome: e.nome })}
													title="Elimina"
												>
													<Trash2 className="icon-sm" style={{ color: "#dc2626" }} />
												</button>
											</div>
										</div>
									</div>
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
				title={editId ? "Modifica evento" : "Nuovo evento"}
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
							form="evento-form"
							className="btn btn-primary btn-sm"
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							<Check className="icon" />{" "}
							{createMutation.isPending || updateMutation.isPending ? "Salvataggio..." : "Salva"}
						</button>
					</>
				}
			>
				<form id="evento-form" onSubmit={handleSubmit}>
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
						<Field label="Tipo" required>
							<Select
								value={form.tipo}
								onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoEvento })}
							>
								<option value="gara">Gara</option>
								<option value="torneo">Torneo</option>
								<option value="stage">Stage</option>
								<option value="saggio">Saggio</option>
								<option value="raduno">Raduno</option>
							</Select>
						</Field>
						<Field label="Disciplina">
							<Input
								value={form.disciplina}
								onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
							/>
						</Field>
						<Field label="Data Inizio" required>
							<Input
								type="date"
								value={form.dataInizio}
								onChange={(e) => setForm({ ...form, dataInizio: e.target.value })}
								required
							/>
						</Field>
						<Field label="Data Fine">
							<Input
								type="date"
								value={form.dataFine}
								onChange={(e) => setForm({ ...form, dataFine: e.target.value })}
							/>
						</Field>
						<Field label="Luogo" span={2}>
							<Input
								value={form.luogo}
								onChange={(e) => setForm({ ...form, luogo: e.target.value })}
							/>
						</Field>
						<Field label="Categoria">
							<Input
								value={form.categoria}
								onChange={(e) => setForm({ ...form, categoria: e.target.value })}
							/>
						</Field>
						<Field label="Quota iscrizione (EUR)">
							<Input
								type="number"
								step="0.01"
								min="0"
								value={form.quotaIscrizione}
								onChange={(e) => setForm({ ...form, quotaIscrizione: e.target.value })}
							/>
						</Field>
						<Field label="Max partecipanti">
							<Input
								type="number"
								min="1"
								value={form.maxPartecipanti}
								onChange={(e) => setForm({ ...form, maxPartecipanti: e.target.value })}
							/>
						</Field>
						<Field label="Deadline iscrizioni">
							<Input
								type="date"
								value={form.deadlineIscrizione}
								onChange={(e) => setForm({ ...form, deadlineIscrizione: e.target.value })}
							/>
						</Field>
						<Field label="Iscrizioni aperte" span={2}>
							<label
								style={{
									display: "inline-flex",
									alignItems: "center",
									gap: 8,
									fontSize: "0.875rem",
								}}
							>
								<input
									type="checkbox"
									checked={form.iscrizioniAperte}
									onChange={(e) => setForm({ ...form, iscrizioniAperte: e.target.checked })}
								/>
								Permetti nuove iscrizioni
							</label>
						</Field>
						<Field label="Descrizione" span={2}>
							<Textarea
								value={form.descrizione}
								onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
							/>
						</Field>
					</FormGrid>
				</form>
			</Modal>

			<Modal
				open={!!iscriviTarget}
				onClose={() => {
					setIscriviTarget(null);
					setSelectedSocioId("");
				}}
				title="Iscrivi socio all'evento"
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
										eventoId: iscriviTarget.id,
										socioId: selectedSocioId,
									});
								}
							}}
						>
							<UserPlus className="icon" /> Iscrivi
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

			<Modal
				open={!!iscrittiFor}
				onClose={() => setIscrittiFor(null)}
				title="Iscritti all'evento"
				subtitle={iscrittiFor?.nome}
				size="md"
			>
				{iscrittiQuery.isLoading ? (
					<p>Caricamento...</p>
				) : !iscrittiQuery.data || iscrittiQuery.data.length === 0 ? (
					<EmptyState
						icon={Users}
						title="Nessun iscritto"
						description="Nessun socio si e' ancora iscritto a questo evento."
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
														eventoId: iscrittiFor.id,
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
				title="Eliminare evento?"
				message={`L'evento "${deleteTarget?.nome ?? ""}" e le relative iscrizioni saranno rimossi.`}
				confirmLabel="Elimina"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
