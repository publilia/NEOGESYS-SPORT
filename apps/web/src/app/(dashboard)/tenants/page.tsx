"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	Ban,
	Building2,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Edit,
	Play,
	Plus,
	TrendingUp,
	Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Piano = "trial" | "free" | "base" | "pro" | "enterprise";
type Stato = "attivo" | "sospeso" | "trial" | "chiuso" | "pending_setup";
type TipoEnte = "ASD" | "SSD" | "FED" | "PALESTRA" | "SCUOLA";

const PIANO_BADGE: Record<Piano, { label: string; cls: string }> = {
	trial: { label: "Trial", cls: "badge-primary" },
	free: { label: "Free", cls: "badge-outline" },
	base: { label: "Base", cls: "badge" },
	pro: { label: "Pro", cls: "badge-primary" },
	enterprise: { label: "Enterprise", cls: "badge-warning" },
};

const STATO_BADGE: Record<Stato, { label: string; cls: string }> = {
	attivo: { label: "Attivo", cls: "badge-success" },
	sospeso: { label: "Sospeso", cls: "badge-destructive" },
	trial: { label: "Trial", cls: "badge-primary" },
	chiuso: { label: "Chiuso", cls: "badge" },
	pending_setup: { label: "Setup", cls: "badge-outline" },
};

interface TenantForm {
	slug: string;
	ragioneSociale: string;
	tipoEnte: TipoEnte;
	partitaIva: string;
	codiceFiscale: string;
	pec: string;
	codiceSDI: string;
	piano: Piano;
	maxSoci: string;
	maxUtenti: string;
	trialDays: number;
	adminEmail: string;
}

const EMPTY_FORM: TenantForm = {
	slug: "",
	ragioneSociale: "",
	tipoEnte: "ASD",
	partitaIva: "",
	codiceFiscale: "",
	pec: "",
	codiceSDI: "",
	piano: "trial",
	maxSoci: "50",
	maxUtenti: "5",
	trialDays: 30,
	adminEmail: "",
};

export default function TenantsPage() {
	const utils = trpc.useUtils();
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [search, setSearch] = useState("");
	const [filterStato, setFilterStato] = useState<"" | Stato>("");
	const [filterPiano, setFilterPiano] = useState<"" | Piano>("");

	const listQuery = trpc.tenant.list.useQuery({
		page,
		perPage,
		search: search || undefined,
		stato: filterStato === "" ? undefined : filterStato,
		piano: filterPiano === "" ? undefined : filterPiano,
	});

	const overviewQuery = trpc.tenant.overview.useQuery();

	const createMut = trpc.tenant.create.useMutation({
		onSuccess: () => {
			toast.success("Tenant creato");
			utils.tenant.list.invalidate();
			utils.tenant.overview.invalidate();
			closeForm();
		},
		onError: (err) => toast.error(err.message),
	});
	const updateMut = trpc.tenant.update.useMutation({
		onSuccess: () => {
			toast.success("Tenant aggiornato");
			utils.tenant.list.invalidate();
			closeForm();
		},
		onError: (err) => toast.error(err.message),
	});
	const suspendMut = trpc.tenant.suspend.useMutation({
		onSuccess: () => {
			toast.success("Tenant sospeso");
			utils.tenant.list.invalidate();
			utils.tenant.overview.invalidate();
			setSuspendTarget(null);
			setSuspendMotivo("");
		},
		onError: (err) => toast.error(err.message),
	});
	const reactivateMut = trpc.tenant.reactivate.useMutation({
		onSuccess: () => {
			toast.success("Tenant riattivato");
			utils.tenant.list.invalidate();
			utils.tenant.overview.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const [formOpen, setFormOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<TenantForm>(EMPTY_FORM);
	const [suspendTarget, setSuspendTarget] = useState<{ id: string; nome: string } | null>(null);
	const [suspendMotivo, setSuspendMotivo] = useState("");

	const openCreate = () => {
		setEditId(null);
		setForm(EMPTY_FORM);
		setFormOpen(true);
	};

	const openEdit = (t: NonNullable<typeof listQuery.data>["items"][number]) => {
		setEditId(t.id);
		setForm({
			slug: t.slug,
			ragioneSociale: t.ragioneSociale ?? "",
			tipoEnte: (t.tipoEnte as TipoEnte) ?? "ASD",
			partitaIva: "",
			codiceFiscale: "",
			pec: "",
			codiceSDI: "",
			piano: (t.piano as Piano) ?? "trial",
			maxSoci: t.maxSoci ?? "50",
			maxUtenti: "5",
			trialDays: 0,
			adminEmail: "",
		});
		setFormOpen(true);
	};

	const closeForm = () => {
		setFormOpen(false);
		setEditId(null);
		setForm(EMPTY_FORM);
	};

	const submitForm = () => {
		if (!form.ragioneSociale.trim()) {
			toast.error("Ragione sociale obbligatoria");
			return;
		}
		if (editId) {
			updateMut.mutate({
				id: editId,
				ragioneSociale: form.ragioneSociale.trim(),
				tipoEnte: form.tipoEnte,
				partitaIva: form.partitaIva.trim() || undefined,
				codiceFiscale: form.codiceFiscale.trim() || undefined,
				pec: form.pec.trim() || undefined,
				codiceSDI: form.codiceSDI.trim() || undefined,
				piano: form.piano,
				maxSoci: form.maxSoci,
				maxUtenti: form.maxUtenti,
			});
		} else {
			if (!form.slug.trim() || !/^[a-z0-9-]+$/.test(form.slug)) {
				toast.error("Slug non valido (solo minuscole, numeri, trattini)");
				return;
			}
			createMut.mutate({
				slug: form.slug.trim(),
				ragioneSociale: form.ragioneSociale.trim(),
				tipoEnte: form.tipoEnte,
				partitaIva: form.partitaIva.trim() || undefined,
				codiceFiscale: form.codiceFiscale.trim() || undefined,
				pec: form.pec.trim() || undefined,
				codiceSDI: form.codiceSDI.trim() || undefined,
				piano: form.piano,
				maxSoci: form.maxSoci,
				maxUtenti: form.maxUtenti,
				trialDays: form.trialDays,
				adminEmail: form.adminEmail.trim() || undefined,
			});
		}
	};

	const items = listQuery.data?.items ?? [];
	const total = listQuery.data?.total ?? 0;
	const totalPages = listQuery.data?.totalPages ?? 1;

	const overview = overviewQuery.data;
	const attivi = Number((overview?.byStato as Record<string, number> | undefined)?.attivo ?? 0);
	const trial = Number((overview?.byStato as Record<string, number> | undefined)?.trial ?? 0);
	const sospesi = Number((overview?.byStato as Record<string, number> | undefined)?.sospeso ?? 0);

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Tenant</h1>
					<p className="page-subtitle">
						Gestione società registrate · {total} tenant · {attivi} attivi · {trial} trial
					</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Plus className="icon" /> Nuovo Tenant
					</button>
				</div>
			</div>

			<div className="stat-grid">
				<div className="card stat-card">
					<div className="stat-card-head">
						<span className="stat-card-title">Tenant totali</span>
						<div
							className="stat-icon"
							style={{
								background: "hsl(var(--primary) / 0.15)",
								color: "hsl(var(--primary))",
							}}
						>
							<Building2 className="icon" />
						</div>
					</div>
					<div className="stat-value">{overview?.total ?? 0}</div>
					<div className="stat-trend up">
						<CheckCircle2 className="icon-sm" />
						<span>
							{attivi} attivi · {trial} trial
						</span>
					</div>
				</div>
				<div className="card stat-card">
					<div className="stat-card-head">
						<span className="stat-card-title">In trial</span>
						<div
							className="stat-icon"
							style={{
								background: "hsl(var(--warning) / 0.15)",
								color: "hsl(var(--warning))",
							}}
						>
							<TrendingUp className="icon" />
						</div>
					</div>
					<div className="stat-value">{trial}</div>
					<div className="stat-trend up">
						<Play className="icon-sm" /> <span>Conversioni da monitorare</span>
					</div>
				</div>
				<div className="card stat-card">
					<div className="stat-card-head">
						<span className="stat-card-title">Piani Pro+</span>
						<div
							className="stat-icon"
							style={{
								background: "hsl(var(--primary) / 0.15)",
								color: "hsl(var(--primary))",
							}}
						>
							<Users className="icon" />
						</div>
					</div>
					<div className="stat-value">
						{Number((overview?.byPiano as Record<string, number> | undefined)?.pro ?? 0) +
							Number((overview?.byPiano as Record<string, number> | undefined)?.enterprise ?? 0)}
					</div>
					<div className="stat-trend up">
						<CheckCircle2 className="icon-sm" /> <span>Tenant paganti</span>
					</div>
				</div>
				<div className="card stat-card">
					<div className="stat-card-head">
						<span className="stat-card-title">Tenant sospesi</span>
						<div
							className="stat-icon"
							style={{
								background: "hsl(var(--destructive) / 0.15)",
								color: "hsl(var(--destructive))",
							}}
						>
							<Ban className="icon" />
						</div>
					</div>
					<div className="stat-value">{sospesi}</div>
					<div className="stat-trend warn">
						<Ban className="icon-sm" />
						<span>{sospesi > 0 ? "Azione richiesta" : "Nessuno sospeso"}</span>
					</div>
				</div>
			</div>

			<div className="filters-bar">
				<input
					className="input"
					placeholder="Cerca per ragione sociale..."
					value={search}
					onChange={(e) => {
						setPage(1);
						setSearch(e.target.value);
					}}
				/>
				<select
					className="select"
					value={filterPiano}
					onChange={(e) => {
						setPage(1);
						setFilterPiano(e.target.value as "" | Piano);
					}}
				>
					<option value="">Tutti i piani</option>
					<option value="trial">Trial</option>
					<option value="free">Free</option>
					<option value="base">Base</option>
					<option value="pro">Pro</option>
					<option value="enterprise">Enterprise</option>
				</select>
				<select
					className="select"
					value={filterStato}
					onChange={(e) => {
						setPage(1);
						setFilterStato(e.target.value as "" | Stato);
					}}
				>
					<option value="">Tutti gli stati</option>
					<option value="attivo">Attivo</option>
					<option value="trial">Trial</option>
					<option value="sospeso">Sospeso</option>
					<option value="chiuso">Chiuso</option>
					<option value="pending_setup">Pending setup</option>
				</select>
			</div>

			<div className="card">
				{listQuery.isLoading ? (
					<div style={{ padding: "2rem", textAlign: "center" }}>Caricamento…</div>
				) : items.length === 0 ? (
					<EmptyState
						title="Nessun tenant"
						description="Nessun tenant con i filtri correnti. Crea il primo per iniziare."
					/>
				) : (
					<div className="table-container">
						<table className="table">
							<thead>
								<tr>
									<th>Società</th>
									<th>Slug</th>
									<th>Piano</th>
									<th>Stato</th>
									<th style={{ textAlign: "right" }}>Max Soci</th>
									<th>Trial fino</th>
									<th>Creato</th>
									<th style={{ textAlign: "right" }}>Azioni</th>
								</tr>
							</thead>
							<tbody>
								{items.map((t) => {
									const piano = PIANO_BADGE[(t.piano as Piano) ?? "trial"];
									const stato = STATO_BADGE[(t.stato as Stato) ?? "attivo"];
									const initials = (t.nomeVisualizzato ?? t.ragioneSociale ?? "")
										.split(" ")
										.filter(Boolean)
										.map((w) => w[0])
										.slice(0, 2)
										.join("")
										.toUpperCase();
									return (
										<tr key={t.id}>
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
															background: "hsl(var(--primary) / 0.15)",
															color: "hsl(var(--primary))",
														}}
													>
														{initials || "?"}
													</div>
													<span style={{ fontWeight: 500 }}>
														{t.nomeVisualizzato ?? t.ragioneSociale}
													</span>
												</div>
											</td>
											<td
												style={{
													fontFamily: "monospace",
													fontSize: "0.75rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{t.slug}
											</td>
											<td>
												<span className={`badge ${piano.cls}`}>{piano.label}</span>
											</td>
											<td>
												<span className={`badge ${stato.cls}`}>{stato.label}</span>
											</td>
											<td
												style={{
													textAlign: "right",
													fontFamily: "monospace",
												}}
											>
												{t.maxSoci ?? "—"}
											</td>
											<td
												style={{
													fontSize: "0.75rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{t.trialEnd
													? new Date(t.trialEnd as unknown as string).toLocaleDateString("it-IT")
													: "—"}
											</td>
											<td
												style={{
													fontSize: "0.75rem",
													color: "hsl(var(--muted-foreground))",
												}}
											>
												{t.createdAt
													? new Date(t.createdAt as unknown as string).toLocaleDateString("it-IT")
													: "—"}
											</td>
											<td>
												<div className="table-actions" style={{ justifyContent: "flex-end" }}>
													<button
														type="button"
														className="btn btn-ghost btn-icon"
														title="Modifica"
														onClick={() => openEdit(t)}
													>
														<Edit className="icon" />
													</button>
													{t.stato === "sospeso" ? (
														<button
															type="button"
															className="btn btn-ghost btn-icon"
															title="Riattiva"
															onClick={() => reactivateMut.mutate({ id: t.id })}
														>
															<Play className="icon" />
														</button>
													) : (
														<button
															type="button"
															className="btn btn-ghost btn-icon"
															title="Sospendi"
															onClick={() =>
																setSuspendTarget({
																	id: t.id,
																	nome: t.nomeVisualizzato ?? t.ragioneSociale ?? t.slug,
																})
															}
														>
															<Ban className="icon" />
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

			{/* Form Modal */}
			<Modal
				open={formOpen}
				onClose={closeForm}
				title={editId ? "Modifica tenant" : "Nuovo tenant"}
				size="lg"
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
							{editId ? "Salva modifiche" : "Crea tenant"}
						</button>
					</>
				}
			>
				<FormGrid>
					<Field label="Ragione sociale" required span={2}>
						<Input
							value={form.ragioneSociale}
							onChange={(e) => setForm((f) => ({ ...f, ragioneSociale: e.target.value }))}
						/>
					</Field>
					{!editId && (
						<Field label="Slug" required hint="Solo lettere minuscole, numeri e trattini" span={1}>
							<Input
								value={form.slug}
								onChange={(e) =>
									setForm((f) => ({
										...f,
										slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
									}))
								}
								placeholder="es. asd-demo"
							/>
						</Field>
					)}
					<Field label="Tipo ente" required span={1}>
						<Select
							value={form.tipoEnte}
							onChange={(e) => setForm((f) => ({ ...f, tipoEnte: e.target.value as TipoEnte }))}
						>
							<option value="ASD">ASD</option>
							<option value="SSD">SSD</option>
							<option value="FED">Federazione</option>
							<option value="PALESTRA">Palestra</option>
							<option value="SCUOLA">Scuola</option>
						</Select>
					</Field>
					<Field label="Piano" required span={editId ? 2 : 1}>
						<Select
							value={form.piano}
							onChange={(e) => setForm((f) => ({ ...f, piano: e.target.value as Piano }))}
						>
							<option value="trial">Trial</option>
							<option value="free">Free</option>
							<option value="base">Base</option>
							<option value="pro">Pro</option>
							<option value="enterprise">Enterprise</option>
						</Select>
					</Field>
					<Field label="P.IVA" span={1}>
						<Input
							value={form.partitaIva}
							onChange={(e) => setForm((f) => ({ ...f, partitaIva: e.target.value }))}
						/>
					</Field>
					<Field label="Codice fiscale" span={1}>
						<Input
							value={form.codiceFiscale}
							onChange={(e) => setForm((f) => ({ ...f, codiceFiscale: e.target.value }))}
						/>
					</Field>
					<Field label="PEC" span={1}>
						<Input
							type="email"
							value={form.pec}
							onChange={(e) => setForm((f) => ({ ...f, pec: e.target.value }))}
						/>
					</Field>
					<Field label="Codice SDI" span={1}>
						<Input
							value={form.codiceSDI}
							onChange={(e) => setForm((f) => ({ ...f, codiceSDI: e.target.value }))}
						/>
					</Field>
					<Field label="Max soci" span={1}>
						<Input
							value={form.maxSoci}
							onChange={(e) => setForm((f) => ({ ...f, maxSoci: e.target.value }))}
						/>
					</Field>
					<Field label="Max utenti" span={1}>
						<Input
							value={form.maxUtenti}
							onChange={(e) => setForm((f) => ({ ...f, maxUtenti: e.target.value }))}
						/>
					</Field>
					{!editId && (
						<>
							<Field label="Giorni trial" span={1}>
								<Input
									type="number"
									min="0"
									max="90"
									value={form.trialDays}
									onChange={(e) =>
										setForm((f) => ({
											...f,
											trialDays: Number.parseInt(e.target.value) || 0,
										}))
									}
								/>
							</Field>
							<Field label="Email admin iniziale" hint="Per invito setup" span={1}>
								<Input
									type="email"
									value={form.adminEmail}
									onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
								/>
							</Field>
						</>
					)}
				</FormGrid>
			</Modal>

			{/* Suspend Modal */}
			<Modal
				open={suspendTarget !== null}
				onClose={() => {
					setSuspendTarget(null);
					setSuspendMotivo("");
				}}
				title={`Sospendi ${suspendTarget?.nome ?? ""}?`}
				size="sm"
				footer={
					<>
						<button
							type="button"
							className="btn btn-outline btn-sm"
							onClick={() => {
								setSuspendTarget(null);
								setSuspendMotivo("");
							}}
						>
							Annulla
						</button>
						<button
							type="button"
							className="btn btn-destructive btn-sm"
							disabled={suspendMut.isPending || suspendMotivo.trim().length < 3}
							onClick={() => {
								if (!suspendTarget) return;
								suspendMut.mutate({ id: suspendTarget.id, motivo: suspendMotivo.trim() });
							}}
						>
							Sospendi tenant
						</button>
					</>
				}
			>
				<div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
					<p style={{ fontSize: "0.875rem", margin: 0 }}>
						Il tenant sarà bloccato e nessun utente potrà accedere fino alla riattivazione.
					</p>
					<Field label="Motivo sospensione" required>
						<Textarea
							rows={3}
							value={suspendMotivo}
							onChange={(e) => setSuspendMotivo(e.target.value)}
							placeholder="es. Mancato pagamento o richiesta del cliente"
						/>
					</Field>
				</div>
			</Modal>
		</div>
	);
}
