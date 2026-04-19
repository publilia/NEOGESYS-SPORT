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
	Mail,
	MessageCircle,
	MessageSquare,
	Pencil,
	Send,
	Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TipoCom = "email" | "sms" | "whatsapp" | "push";
type StatoCom = "bozza" | "inviata" | "in_corso" | "errore";

const STATO_BADGE: Record<StatoCom, { cls: string; label: string }> = {
	inviata: { cls: "badge-success", label: "Inviata" },
	in_corso: { cls: "badge-warning", label: "In corso" },
	bozza: { cls: "badge", label: "Bozza" },
	errore: { cls: "badge-destructive", label: "Errore" },
};

const CANALE_ICON: Record<TipoCom, LucideIcon> = {
	email: Mail,
	sms: MessageSquare,
	whatsapp: MessageCircle,
	push: Mail,
};

interface ComFormState {
	tipo: TipoCom;
	oggetto: string;
	corpo: string;
	mittente: string;
	destinatariSoci: string[];
	selectAll: boolean;
}
const EMPTY_FORM: ComFormState = {
	tipo: "email",
	oggetto: "",
	corpo: "",
	mittente: "",
	destinatariSoci: [],
	selectAll: false,
};

export default function ComunicazioniPage() {
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [statoFilter, setStatoFilter] = useState<StatoCom | "">("");
	const [tipoFilter, setTipoFilter] = useState<TipoCom | "">("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<ComFormState>(EMPTY_FORM);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; oggetto: string | null } | null>(
		null,
	);
	const [inviaTarget, setInviaTarget] = useState<{ id: string; oggetto: string | null } | null>(
		null,
	);

	const utils = trpc.useUtils();

	const query = trpc.comunicazioni.list.useQuery({
		page,
		perPage,
		stato: statoFilter || undefined,
		tipo: tipoFilter || undefined,
	});

	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 200, stato: "attivo" });

	const createMutation = trpc.comunicazioni.create.useMutation({
		onSuccess: () => {
			utils.comunicazioni.list.invalidate();
			toast.success("Bozza salvata");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const updateMutation = trpc.comunicazioni.update.useMutation({
		onSuccess: () => {
			utils.comunicazioni.list.invalidate();
			toast.success("Comunicazione aggiornata");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const deleteMutation = trpc.comunicazioni.delete.useMutation({
		onSuccess: () => {
			utils.comunicazioni.list.invalidate();
			toast.success("Comunicazione eliminata");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const inviaMutation = trpc.comunicazioni.invia.useMutation({
		onSuccess: () => {
			utils.comunicazioni.list.invalidate();
			toast.success("Comunicazione inviata");
			setInviaTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

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
			tipo: row.tipo as TipoCom,
			oggetto: row.oggetto ?? "",
			corpo: row.corpo ?? "",
			mittente: row.mittente ?? "",
			destinatariSoci: [],
			selectAll: false,
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
		if (!form.oggetto.trim() || !form.corpo.trim()) {
			setFormError("Oggetto e corpo sono obbligatori.");
			return;
		}
		if (editId) {
			updateMutation.mutate({
				id: editId,
				tipo: form.tipo,
				oggetto: form.oggetto.trim(),
				corpo: form.corpo,
				mittente: form.mittente.trim() || undefined,
			});
		} else {
			const destinatari = form.selectAll
				? (sociQuery.data?.items.map((s) => s.id) ?? [])
				: form.destinatariSoci;
			if (destinatari.length === 0) {
				setFormError("Seleziona almeno un destinatario.");
				return;
			}
			createMutation.mutate({
				tipo: form.tipo,
				oggetto: form.oggetto.trim(),
				corpo: form.corpo,
				mittente: form.mittente.trim() || undefined,
				destinatariSoci: destinatari,
				stato: "bozza",
			});
		}
	}

	function toggleSocio(id: string) {
		setForm((prev) => ({
			...prev,
			destinatariSoci: prev.destinatariSoci.includes(id)
				? prev.destinatariSoci.filter((s) => s !== id)
				: [...prev.destinatariSoci, id],
		}));
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Comunicazioni</h1>
					<p className="page-subtitle">{total} comunicazioni · Email, SMS, WhatsApp</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Send className="icon" /> Nuovo Invio
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<select
					className="select"
					value={tipoFilter}
					onChange={(e) => {
						setTipoFilter(e.target.value as TipoCom | "");
						setPage(1);
					}}
				>
					<option value="">Tutti i canali</option>
					<option value="email">Email</option>
					<option value="sms">SMS</option>
					<option value="whatsapp">WhatsApp</option>
					<option value="push">Push</option>
				</select>
				<select
					className="select"
					value={statoFilter}
					onChange={(e) => {
						setStatoFilter(e.target.value as StatoCom | "");
						setPage(1);
					}}
				>
					<option value="">Tutti gli stati</option>
					<option value="bozza">Bozza</option>
					<option value="in_corso">In corso</option>
					<option value="inviata">Inviata</option>
					<option value="errore">Errore</option>
				</select>
			</div>

			<div className="card">
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Oggetto</th>
								<th>Canale</th>
								<th>Mittente</th>
								<th>Stato</th>
								<th>Data invio</th>
								<th style={{ textAlign: "right" }}>Azioni</th>
							</tr>
						</thead>
						<tbody>
							{query.isLoading ? (
								<tr>
									<td
										colSpan={6}
										style={{
											textAlign: "center",
											padding: "3rem",
											color: "hsl(var(--muted-foreground))",
										}}
									>
										Caricamento...
									</td>
								</tr>
							) : items.length === 0 ? (
								<tr>
									<td colSpan={6} style={{ padding: 0 }}>
										<EmptyState
											icon={Mail}
											title="Nessuna comunicazione"
											description="Crea la prima comunicazione per contattare i soci."
											action={
												<button
													type="button"
													className="btn btn-primary btn-sm"
													onClick={openCreate}
												>
													<Send className="icon" /> Nuovo Invio
												</button>
											}
										/>
									</td>
								</tr>
							) : (
								items.map((m) => {
									const Icon = CANALE_ICON[m.tipo as TipoCom];
									const b = STATO_BADGE[m.stato as StatoCom];
									return (
										<tr key={m.id}>
											<td style={{ fontWeight: 500 }}>{m.oggetto}</td>
											<td>
												<span
													style={{
														display: "inline-flex",
														alignItems: "center",
														gap: "0.25rem",
														fontSize: "0.8125rem",
													}}
												>
													<Icon className="icon-sm" /> {String(m.tipo).toUpperCase()}
												</span>
											</td>
											<td
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{m.mittente ?? "—"}
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
												{m.dataInvio
													? new Date(m.dataInvio as unknown as string).toLocaleDateString("it-IT")
													: "—"}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													{m.stato === "bozza" && (
														<button
															type="button"
															className="btn btn-primary btn-sm"
															onClick={() => setInviaTarget({ id: m.id, oggetto: m.oggetto })}
														>
															<Send className="icon-sm" /> Invia
														</button>
													)}
													<button
														type="button"
														className="btn btn-ghost btn-icon"
														onClick={() => openEdit(m)}
														title="Modifica"
													>
														<Pencil className="icon" />
													</button>
													<button
														type="button"
														className="table-action"
														onClick={() => setDeleteTarget({ id: m.id, oggetto: m.oggetto })}
														title="Elimina"
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
							Mostra {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} di {total}
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

			<Modal
				open={modalOpen}
				onClose={closeModal}
				title={editId ? "Modifica comunicazione" : "Nuova comunicazione"}
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
							form="com-form"
							className="btn btn-primary btn-sm"
							disabled={createMutation.isPending || updateMutation.isPending}
						>
							<Check className="icon" /> Salva
						</button>
					</>
				}
			>
				<form id="com-form" onSubmit={handleSubmit}>
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
						<Field label="Canale" required>
							<Select
								value={form.tipo}
								onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCom })}
							>
								<option value="email">Email</option>
								<option value="sms">SMS</option>
								<option value="whatsapp">WhatsApp</option>
								<option value="push">Push</option>
							</Select>
						</Field>
						<Field label="Mittente">
							<Input
								value={form.mittente}
								onChange={(e) => setForm({ ...form, mittente: e.target.value })}
								placeholder={form.tipo === "email" ? "es. info@asd.it" : "opzionale"}
							/>
						</Field>
						<Field label="Oggetto" required span={2}>
							<Input
								value={form.oggetto}
								onChange={(e) => setForm({ ...form, oggetto: e.target.value })}
								required
							/>
						</Field>
						<Field label="Corpo messaggio" required span={2}>
							<Textarea
								rows={8}
								value={form.corpo}
								onChange={(e) => setForm({ ...form, corpo: e.target.value })}
								required
								style={{ minHeight: "10rem" }}
							/>
						</Field>
					</FormGrid>

					{!editId && (
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
									Destinatari ({form.selectAll ? "tutti" : form.destinatariSoci.length})
								</p>
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
										checked={form.selectAll}
										onChange={(e) =>
											setForm({
												...form,
												selectAll: e.target.checked,
												destinatariSoci: e.target.checked ? [] : form.destinatariSoci,
											})
										}
									/>
									Invia a tutti i soci attivi
								</label>
							</div>
							{!form.selectAll && (
								<div
									style={{
										maxHeight: 260,
										overflowY: "auto",
										border: "1px solid hsl(var(--border))",
										borderRadius: 6,
										padding: "0.5rem",
									}}
								>
									{sociQuery.data?.items.map((s) => (
										<label
											key={s.id}
											style={{
												display: "flex",
												alignItems: "center",
												gap: 8,
												padding: "0.25rem 0.5rem",
												cursor: "pointer",
												fontSize: "0.875rem",
											}}
										>
											<input
												type="checkbox"
												checked={form.destinatariSoci.includes(s.id)}
												onChange={() => toggleSocio(s.id)}
											/>
											{s.cognome} {s.nome}
											<span
												style={{
													marginLeft: "auto",
													fontSize: "0.75rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{form.tipo === "email" ? s.email : s.telefono}
											</span>
										</label>
									))}
								</div>
							)}
						</div>
					)}
				</form>
			</Modal>

			<ConfirmDialog
				open={!!inviaTarget}
				onClose={() => setInviaTarget(null)}
				onConfirm={() => {
					if (inviaTarget) inviaMutation.mutate({ id: inviaTarget.id });
				}}
				title="Inviare comunicazione?"
				message={`La bozza "${inviaTarget?.oggetto ?? ""}" sara' inviata a tutti i destinatari.`}
				confirmLabel="Invia"
				variant="info"
				loading={inviaMutation.isPending}
			/>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
				}}
				title="Eliminare comunicazione?"
				message={`La comunicazione "${deleteTarget?.oggetto ?? ""}" sara' rimossa.`}
				confirmLabel="Elimina"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
