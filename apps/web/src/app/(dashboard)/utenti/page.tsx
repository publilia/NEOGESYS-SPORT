"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Plus, Shield, Trash2, UserCheck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Ruolo = "admin" | "segreteria" | "contabile" | "istruttore" | "atleta" | "genitore";

const RUOLO_LABEL: Record<Ruolo, { label: string; cls: string }> = {
	admin: { label: "Admin", cls: "badge-primary" },
	segreteria: { label: "Segreteria", cls: "badge-success" },
	contabile: { label: "Contabile", cls: "badge-warning" },
	istruttore: { label: "Istruttore", cls: "badge" },
	atleta: { label: "Atleta", cls: "badge-outline" },
	genitore: { label: "Genitore", cls: "badge-outline" },
};

const RUOLI: Ruolo[] = ["admin", "segreteria", "contabile", "istruttore", "atleta", "genitore"];

interface InviteForm {
	email: string;
	nome: string;
	cognome: string;
	telefono: string;
	ruolo: Ruolo;
}

const EMPTY_INVITE: InviteForm = {
	email: "",
	nome: "",
	cognome: "",
	telefono: "",
	ruolo: "segreteria",
};

function fmtDate(d: string | Date | null | undefined): string {
	if (!d) return "Mai";
	const date = typeof d === "string" ? new Date(d) : d;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	if (diffMin < 1) return "Online ora";
	if (diffMin < 60) return `${diffMin} min fa`;
	if (diffMin < 1440) return `${Math.floor(diffMin / 60)} ore fa`;
	const diffDays = Math.floor(diffMin / 1440);
	if (diffDays < 30) return `${diffDays} giorni fa`;
	return date.toLocaleDateString("it-IT");
}

export default function UtentiPage() {
	const utils = trpc.useUtils();

	const [page, setPage] = useState(1);
	const perPage = 20;
	const [search, setSearch] = useState("");
	const [filterRuolo, setFilterRuolo] = useState<"" | Ruolo>("");
	const [filterAttivo, setFilterAttivo] = useState<"" | "true" | "false">("");

	const listQuery = trpc.utenti.list.useQuery({
		page,
		perPage,
		search: search || undefined,
		ruolo: filterRuolo === "" ? undefined : filterRuolo,
		attivo: filterAttivo === "" ? undefined : filterAttivo === "true",
	});

	const inviteMut = trpc.utenti.invite.useMutation({
		onSuccess: () => {
			toast.success("Utente invitato");
			utils.utenti.list.invalidate();
			closeInvite();
		},
		onError: (err) => toast.error(err.message),
	});

	const changeRoleMut = trpc.utenti.changeRole.useMutation({
		onSuccess: () => {
			toast.success("Ruolo aggiornato");
			utils.utenti.list.invalidate();
			closeRoleModal();
		},
		onError: (err) => toast.error(err.message),
	});

	const deactivateMut = trpc.utenti.deactivate.useMutation({
		onSuccess: () => {
			toast.success("Utente disattivato");
			utils.utenti.list.invalidate();
			setConfirmDeactivateId(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const reactivateMut = trpc.utenti.reactivate.useMutation({
		onSuccess: () => {
			toast.success("Utente riattivato");
			utils.utenti.list.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const [inviteOpen, setInviteOpen] = useState(false);
	const [inviteForm, setInviteForm] = useState<InviteForm>(EMPTY_INVITE);
	const [roleModal, setRoleModal] = useState<{ id: string; nome: string; current: Ruolo } | null>(
		null,
	);
	const [newRuolo, setNewRuolo] = useState<Ruolo>("segreteria");
	const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null);

	const openInvite = () => {
		setInviteForm(EMPTY_INVITE);
		setInviteOpen(true);
	};
	const closeInvite = () => {
		setInviteOpen(false);
		setInviteForm(EMPTY_INVITE);
	};
	const submitInvite = () => {
		if (!inviteForm.email.trim() || !inviteForm.nome.trim() || !inviteForm.cognome.trim()) {
			toast.error("Email, nome e cognome sono obbligatori");
			return;
		}
		inviteMut.mutate({
			email: inviteForm.email.trim().toLowerCase(),
			nome: inviteForm.nome.trim(),
			cognome: inviteForm.cognome.trim(),
			telefono: inviteForm.telefono.trim() || undefined,
			ruolo: inviteForm.ruolo,
		});
	};

	const openRoleModal = (id: string, nome: string, current: Ruolo) => {
		setRoleModal({ id, nome, current });
		setNewRuolo(current);
	};
	const closeRoleModal = () => setRoleModal(null);
	const submitRoleChange = () => {
		if (!roleModal) return;
		if (newRuolo === roleModal.current) {
			toast.error("Ruolo invariato");
			return;
		}
		changeRoleMut.mutate({
			utenteId: roleModal.id,
			nuovoRuolo: newRuolo,
		});
	};

	const items = listQuery.data?.items ?? [];
	const totalPages = listQuery.data?.totalPages ?? 1;
	const total = listQuery.data?.total ?? 0;
	const activeCount = items.filter((u) => u.attivo).length;

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Utenti</h1>
					<p className="page-subtitle">
						Gestione accessi e ruoli · {total} utenti · {activeCount} attivi nella pagina
					</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-primary btn-sm" onClick={openInvite}>
						<Plus className="icon" /> Invita Utente
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<input
					className="input"
					placeholder="Cerca per nome o email..."
					value={search}
					onChange={(e) => {
						setPage(1);
						setSearch(e.target.value);
					}}
				/>
				<select
					className="select"
					value={filterRuolo}
					onChange={(e) => {
						setPage(1);
						setFilterRuolo(e.target.value as "" | Ruolo);
					}}
				>
					<option value="">Tutti i ruoli</option>
					{RUOLI.map((r) => (
						<option key={r} value={r}>
							{RUOLO_LABEL[r].label}
						</option>
					))}
				</select>
				<select
					className="select"
					value={filterAttivo}
					onChange={(e) => {
						setPage(1);
						setFilterAttivo(e.target.value as "" | "true" | "false");
					}}
				>
					<option value="">Tutti gli stati</option>
					<option value="true">Attivi</option>
					<option value="false">Disattivati</option>
				</select>
			</div>

			<div className="card">
				{listQuery.isLoading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</div>
				) : items.length === 0 ? (
					<EmptyState
						title="Nessun utente"
						description="Nessun utente trovato con i filtri correnti."
					/>
				) : (
					<div className="table-container">
						<table className="table">
							<thead>
								<tr>
									<th>Utente</th>
									<th>Email</th>
									<th>Ruolo</th>
									<th>Ultimo accesso</th>
									<th>Stato</th>
									<th style={{ textAlign: "right" }}>Azioni</th>
								</tr>
							</thead>
							<tbody>
								{items.map((u) => {
									const ruolo = u.ruolo as Ruolo;
									const badge = RUOLO_LABEL[ruolo] ?? {
										label: ruolo,
										cls: "badge-outline",
									};
									const fullName = `${u.nome ?? ""} ${u.cognome ?? ""}`.trim() || u.email;
									const initials = fullName
										.split(" ")
										.filter(Boolean)
										.map((n) => n[0])
										.slice(0, 2)
										.join("")
										.toUpperCase();
									return (
										<tr key={u.id}>
											<td>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "0.625rem",
													}}
												>
													<div
														className="avatar"
														style={{
															width: "2rem",
															height: "2rem",
															fontSize: "0.75rem",
														}}
													>
														{initials || "?"}
													</div>
													<span style={{ fontWeight: 500 }}>{fullName}</span>
												</div>
											</td>
											<td
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
													fontFamily: "monospace",
												}}
											>
												{u.email}
											</td>
											<td>
												<span className={`badge ${badge.cls}`}>
													<UserCog className="icon-sm" /> {badge.label}
												</span>
											</td>
											<td
												style={{
													fontSize: "0.8125rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{fmtDate(u.ultimoAccesso as unknown as string | null)}
											</td>
											<td>
												{u.attivo ? (
													<span className="badge badge-success">Attivo</span>
												) : (
													<span className="badge badge-destructive">Disattivato</span>
												)}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													<button
														type="button"
														className="btn btn-ghost btn-icon"
														title="Cambia ruolo"
														onClick={() => openRoleModal(u.id, fullName, ruolo)}
													>
														<Shield className="icon" />
													</button>
													{u.attivo ? (
														<button
															type="button"
															className="btn btn-ghost btn-icon"
															title="Disattiva"
															onClick={() => setConfirmDeactivateId(u.id)}
														>
															<Trash2 className="icon" />
														</button>
													) : (
														<button
															type="button"
															className="btn btn-ghost btn-icon"
															title="Riattiva"
															onClick={() => reactivateMut.mutate({ utenteId: u.id })}
														>
															<UserCheck className="icon" />
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

			{/* Invite Modal */}
			<Modal
				open={inviteOpen}
				onClose={closeInvite}
				title="Invita nuovo utente"
				size="md"
				footer={
					<>
						<button type="button" className="btn btn-outline btn-sm" onClick={closeInvite}>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={submitInvite}
							disabled={inviteMut.isPending}
						>
							Invia invito
						</button>
					</>
				}
			>
				<FormGrid>
					<Field label="Nome" required span={1}>
						<Input
							value={inviteForm.nome}
							onChange={(e) => setInviteForm((f) => ({ ...f, nome: e.target.value }))}
						/>
					</Field>
					<Field label="Cognome" required span={1}>
						<Input
							value={inviteForm.cognome}
							onChange={(e) => setInviteForm((f) => ({ ...f, cognome: e.target.value }))}
						/>
					</Field>
					<Field label="Email" required span={2}>
						<Input
							type="email"
							value={inviteForm.email}
							onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
						/>
					</Field>
					<Field label="Telefono" span={1}>
						<Input
							value={inviteForm.telefono}
							onChange={(e) => setInviteForm((f) => ({ ...f, telefono: e.target.value }))}
						/>
					</Field>
					<Field label="Ruolo" required span={1}>
						<Select
							value={inviteForm.ruolo}
							onChange={(e) => setInviteForm((f) => ({ ...f, ruolo: e.target.value as Ruolo }))}
						>
							{RUOLI.map((r) => (
								<option key={r} value={r}>
									{RUOLO_LABEL[r].label}
								</option>
							))}
						</Select>
					</Field>
				</FormGrid>
			</Modal>

			{/* Change Role Modal */}
			<Modal
				open={roleModal !== null}
				onClose={closeRoleModal}
				title="Cambia ruolo utente"
				size="sm"
				footer={
					<>
						<button type="button" className="btn btn-outline btn-sm" onClick={closeRoleModal}>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							onClick={submitRoleChange}
							disabled={changeRoleMut.isPending}
						>
							Applica
						</button>
					</>
				}
			>
				{roleModal && (
					<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
						<div>
							<strong>{roleModal.nome}</strong>
							<div
								style={{
									fontSize: "0.8125rem",
									color: "hsl(var(--muted-foreground))",
									marginTop: "0.25rem",
								}}
							>
								Ruolo attuale: <strong>{RUOLO_LABEL[roleModal.current].label}</strong>
							</div>
						</div>
						<Field label="Nuovo ruolo" required>
							<Select value={newRuolo} onChange={(e) => setNewRuolo(e.target.value as Ruolo)}>
								{RUOLI.map((r) => (
									<option key={r} value={r}>
										{RUOLO_LABEL[r].label}
									</option>
								))}
							</Select>
						</Field>
					</div>
				)}
			</Modal>

			<ConfirmDialog
				open={confirmDeactivateId !== null}
				onClose={() => setConfirmDeactivateId(null)}
				onConfirm={() => {
					if (confirmDeactivateId) deactivateMut.mutate({ utenteId: confirmDeactivateId });
				}}
				title="Disattivare utente?"
				message="L'utente non potrà più accedere al tenant. Puoi riattivarlo in qualsiasi momento."
				variant="warning"
				confirmLabel="Disattiva"
				loading={deactivateMut.isPending}
			/>
		</div>
	);
}
