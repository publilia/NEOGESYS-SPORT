"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	FolderPlus,
	Pencil,
	Trash2,
	Upload,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type TipoDoc = "certificato" | "ricevuta" | "modulo" | "liberatoria" | "altro";

const TIPO_LABELS: Record<TipoDoc, string> = {
	certificato: "Certificato",
	ricevuta: "Ricevuta",
	modulo: "Modulo",
	liberatoria: "Liberatoria",
	altro: "Altro",
};

interface DocFormState {
	tipo: TipoDoc;
	nome: string;
	fileUrl: string;
	socioId: string;
	mimeType: string;
	dimensioneBytes: string;
}

const EMPTY_FORM: DocFormState = {
	tipo: "altro",
	nome: "",
	fileUrl: "",
	socioId: "",
	mimeType: "",
	dimensioneBytes: "",
};

function formatBytes(b: number | null | undefined): string {
	if (!b) return "—";
	if (b < 1024) return `${b} B`;
	if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
	return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentiPage() {
	const [page, setPage] = useState(1);
	const perPage = 20;
	const [tipoFilter, setTipoFilter] = useState<TipoDoc | "">("");

	const [modalOpen, setModalOpen] = useState(false);
	const [editId, setEditId] = useState<string | null>(null);
	const [form, setForm] = useState<DocFormState>(EMPTY_FORM);
	const [uploading, setUploading] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

	const utils = trpc.useUtils();

	const query = trpc.documenti.list.useQuery({
		page,
		perPage,
		tipo: tipoFilter || undefined,
	});

	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 200 });

	const createMutation = trpc.documenti.create.useMutation({
		onSuccess: () => {
			utils.documenti.list.invalidate();
			toast.success("Documento salvato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const updateMutation = trpc.documenti.update.useMutation({
		onSuccess: () => {
			utils.documenti.list.invalidate();
			toast.success("Documento aggiornato");
			closeModal();
		},
		onError: (err) => {
			setFormError(err.message);
			toast.error(err.message);
		},
	});

	const deleteMutation = trpc.documenti.delete.useMutation({
		onSuccess: () => {
			utils.documenti.list.invalidate();
			toast.success("Documento eliminato");
			setDeleteTarget(null);
		},
		onError: (err) => toast.error(err.message),
	});

	const presignMutation = trpc.documenti.getUploadUrl.useMutation();

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
			tipo: row.tipo as TipoDoc,
			nome: row.nome,
			fileUrl: row.fileUrl,
			socioId: row.socioId ?? "",
			mimeType: row.mimeType ?? "",
			dimensioneBytes: row.dimensioneBytes?.toString() ?? "",
		});
		setFormError(null);
		setModalOpen(true);
	}

	function closeModal() {
		setModalOpen(false);
		setEditId(null);
		setFormError(null);
		setUploading(false);
	}

	async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const presigned = await presignMutation.mutateAsync({
				fileName: file.name,
				contentType: file.type || "application/octet-stream",
			});
			// Dev stub: we use the returned fileUrl as the stored location.
			setForm((prev) => ({
				...prev,
				nome: prev.nome || file.name,
				fileUrl: presigned.fileUrl,
				mimeType: file.type || "application/octet-stream",
				dimensioneBytes: String(file.size),
			}));
			toast.success(`File pronto: ${file.name}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Errore upload");
		} finally {
			setUploading(false);
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFormError(null);
		if (!form.nome.trim() || !form.fileUrl.trim()) {
			setFormError("Nome e file sono obbligatori.");
			return;
		}
		if (editId) {
			updateMutation.mutate({
				id: editId,
				nome: form.nome.trim(),
				tipo: form.tipo,
				socioId: form.socioId || null,
			});
		} else {
			createMutation.mutate({
				tipo: form.tipo,
				nome: form.nome.trim(),
				fileUrl: form.fileUrl.trim(),
				socioId: form.socioId || undefined,
				mimeType: form.mimeType || undefined,
				dimensioneBytes: form.dimensioneBytes ? Number(form.dimensioneBytes) : undefined,
			});
		}
	}

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Documenti</h1>
					<p className="page-subtitle">{total} documenti archiviati</p>
				</div>
				<div className="page-actions">
					<button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
						<Upload className="icon" /> Carica Documento
					</button>
				</div>
			</div>

			<div className="filters-bar">
				<select
					className="select"
					value={tipoFilter}
					onChange={(e) => {
						setTipoFilter(e.target.value as TipoDoc | "");
						setPage(1);
					}}
				>
					<option value="">Tutti i tipi</option>
					<option value="certificato">Certificato</option>
					<option value="ricevuta">Ricevuta</option>
					<option value="modulo">Modulo</option>
					<option value="liberatoria">Liberatoria</option>
					<option value="altro">Altro</option>
				</select>
			</div>

			<div className="card">
				<div className="table-container">
					<table className="table">
						<thead>
							<tr>
								<th>Nome</th>
								<th>Tipo</th>
								<th>Socio</th>
								<th>Dimensione</th>
								<th>Data</th>
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
											icon={FolderPlus}
											title="Nessun documento"
											description="Carica il primo documento per iniziare."
											action={
												<button
													type="button"
													className="btn btn-primary btn-sm"
													onClick={openCreate}
												>
													<Upload className="icon" /> Carica
												</button>
											}
										/>
									</td>
								</tr>
							) : (
								items.map((d) => (
									<tr key={d.id}>
										<td>
											<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
												<FileText
													className="icon"
													style={{ color: "hsl(var(--primary))" }}
												/>
												<span style={{ fontWeight: 500 }}>{d.nome}</span>
											</div>
										</td>
										<td>
											<span className="badge badge-outline">
												{TIPO_LABELS[d.tipo as TipoDoc]}
											</span>
										</td>
										<td>
											{d.socioCognome ? `${d.socioCognome} ${d.socioNome}` : "—"}
										</td>
										<td
											style={{
												fontFamily: "monospace",
												fontSize: "0.8125rem",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{formatBytes(d.dimensioneBytes)}
										</td>
										<td
											style={{
												fontFamily: "monospace",
												fontSize: "0.8125rem",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{d.createdAt
												? new Date(d.createdAt as unknown as string).toLocaleDateString(
														"it-IT",
													)
												: "—"}
										</td>
										<td>
											<div className="table-actions" style={{ justifyContent: "flex-end" }}>
												<a
													href={d.fileUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="btn btn-ghost btn-icon"
													title="Scarica"
												>
													<Download className="icon" />
												</a>
												<button
													type="button"
													className="btn btn-ghost btn-icon"
													onClick={() => openEdit(d)}
													title="Modifica"
												>
													<Pencil className="icon" />
												</button>
												<button
													type="button"
													className="table-action"
													onClick={() =>
														setDeleteTarget({ id: d.id, nome: d.nome })
													}
													title="Elimina"
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
				title={editId ? "Modifica documento" : "Carica documento"}
				size="md"
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
							form="doc-form"
							className="btn btn-primary btn-sm"
							disabled={createMutation.isPending || updateMutation.isPending || uploading}
						>
							<Check className="icon" />{" "}
							{createMutation.isPending || updateMutation.isPending ? "Salvataggio..." : "Salva"}
						</button>
					</>
				}
			>
				<form id="doc-form" onSubmit={handleSubmit}>
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
						<Field label="Tipo" required>
							<Select
								value={form.tipo}
								onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoDoc })}
							>
								<option value="certificato">Certificato</option>
								<option value="ricevuta">Ricevuta</option>
								<option value="modulo">Modulo</option>
								<option value="liberatoria">Liberatoria</option>
								<option value="altro">Altro</option>
							</Select>
						</Field>
						<Field label="Socio">
							<Select
								value={form.socioId}
								onChange={(e) => setForm({ ...form, socioId: e.target.value })}
							>
								<option value="">— Nessuno —</option>
								{sociQuery.data?.items.map((s) => (
									<option key={s.id} value={s.id}>
										{s.cognome} {s.nome}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Nome file" required span={2}>
							<Input
								value={form.nome}
								onChange={(e) => setForm({ ...form, nome: e.target.value })}
								required
							/>
						</Field>
						{!editId && (
							<Field label="File" required span={2} hint="Clicca per selezionare il file">
								<input
									type="file"
									className="input"
									onChange={handleFileChange}
									disabled={uploading}
								/>
								{form.fileUrl && (
									<p
										style={{
											fontSize: "0.75rem",
											color: "hsl(var(--muted-foreground))",
											margin: "0.25rem 0 0",
										}}
									>
										✓ {form.fileUrl} {form.dimensioneBytes && `(${formatBytes(Number(form.dimensioneBytes))})`}
									</p>
								)}
							</Field>
						)}
					</FormGrid>
				</form>
			</Modal>

			<ConfirmDialog
				open={!!deleteTarget}
				onClose={() => setDeleteTarget(null)}
				onConfirm={() => {
					if (deleteTarget) deleteMutation.mutate({ id: deleteTarget.id });
				}}
				title="Eliminare documento?"
				message={`Il documento "${deleteTarget?.nome ?? ""}" sara' rimosso dall'archivio.`}
				confirmLabel="Elimina"
				loading={deleteMutation.isPending}
			/>
		</div>
	);
}
