"use client";

/**
 * /billing · Piani Manager (super_admin)
 * ────────────────────────────────────────────────────────────────
 * CRUD completo sui piani di abbonamento piattaforma. Consuma il
 * router `piattaforma.piani.*` che espone:
 *
 *   - listAll   (superAdmin)  query
 *   - create    (superAdmin)  mutation
 *   - update    (superAdmin)  mutation
 *   - disable   (superAdmin)  mutation
 *
 * La sezione viene renderizzata su /billing subito sopra l'elenco
 * fatture. Ogni card ha un menù edit/disattiva; il bottone "Nuovo
 * piano" apre un editor modale. Invalidiamo la query dopo ogni
 * mutation per aggiornare la UI immediatamente.
 */

import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc";
import {
	CheckCircle2,
	Edit3,
	EyeOff,
	Infinity as InfinityIcon,
	Plus,
	RotateCcw,
	Save,
	Sparkles,
} from "lucide-react";
import { type FormEvent, useState } from "react";

type Piano = {
	id: string;
	codice: string;
	nome: string;
	descrizione: string | null;
	prezzoMensile: string;
	prezzoAnnuale: string;
	valuta: string;
	maxSoci: number;
	maxUtenti: number;
	maxStorageMb: number;
	maxCorsi: number | null;
	maxEventi: number | null;
	aiAbilitato: boolean;
	integrazioniGoogle: boolean;
	integrazioniMicrosoft: boolean;
	customDomain: boolean;
	customPalette: boolean;
	fatturazioneSDI: boolean;
	exportAvanzato: boolean;
	supportoPrioritario: boolean;
	whiteLabel: boolean;
	ordine: number;
	colore: string | null;
	highlighted: boolean;
	attivo: boolean;
};

type FormState = {
	codice: string;
	nome: string;
	descrizione: string;
	prezzoMensile: string;
	prezzoAnnuale: string;
	maxSoci: string;
	maxUtenti: string;
	maxStorageMb: string;
	aiAbilitato: boolean;
	integrazioniGoogle: boolean;
	integrazioniMicrosoft: boolean;
	customDomain: boolean;
	customPalette: boolean;
	fatturazioneSDI: boolean;
	exportAvanzato: boolean;
	supportoPrioritario: boolean;
	whiteLabel: boolean;
	ordine: string;
	highlighted: boolean;
	attivo: boolean;
};

const emptyForm: FormState = {
	codice: "",
	nome: "",
	descrizione: "",
	prezzoMensile: "0",
	prezzoAnnuale: "0",
	maxSoci: "0",
	maxUtenti: "0",
	maxStorageMb: "0",
	aiAbilitato: false,
	integrazioniGoogle: false,
	integrazioniMicrosoft: false,
	customDomain: false,
	customPalette: false,
	fatturazioneSDI: false,
	exportAvanzato: false,
	supportoPrioritario: false,
	whiteLabel: false,
	ordine: "0",
	highlighted: false,
	attivo: true,
};

function pianoToForm(p: Piano): FormState {
	return {
		codice: p.codice,
		nome: p.nome,
		descrizione: p.descrizione ?? "",
		prezzoMensile: p.prezzoMensile,
		prezzoAnnuale: p.prezzoAnnuale,
		maxSoci: String(p.maxSoci),
		maxUtenti: String(p.maxUtenti),
		maxStorageMb: String(p.maxStorageMb),
		aiAbilitato: p.aiAbilitato,
		integrazioniGoogle: p.integrazioniGoogle,
		integrazioniMicrosoft: p.integrazioniMicrosoft,
		customDomain: p.customDomain,
		customPalette: p.customPalette,
		fatturazioneSDI: p.fatturazioneSDI,
		exportAvanzato: p.exportAvanzato,
		supportoPrioritario: p.supportoPrioritario,
		whiteLabel: p.whiteLabel,
		ordine: String(p.ordine),
		highlighted: p.highlighted,
		attivo: p.attivo,
	};
}

export function PianiManager() {
	const utils = trpc.useUtils();
	const planiQuery = trpc.piattaforma.piani.listAll.useQuery();
	const piani = (planiQuery.data ?? []) as Piano[];

	const createMut = trpc.piattaforma.piani.create.useMutation({
		onSuccess: () => {
			utils.piattaforma.piani.listAll.invalidate();
			setOpen(false);
		},
	});
	const updateMut = trpc.piattaforma.piani.update.useMutation({
		onSuccess: () => {
			utils.piattaforma.piani.listAll.invalidate();
			setOpen(false);
		},
	});
	const disableMut = trpc.piattaforma.piani.disable.useMutation({
		onSuccess: () => utils.piattaforma.piani.listAll.invalidate(),
	});

	const [open, setOpen] = useState(false);
	const [editing, setEditing] = useState<Piano | null>(null);
	const [form, setForm] = useState<FormState>(emptyForm);

	const openCreate = () => {
		setEditing(null);
		setForm(emptyForm);
		setOpen(true);
	};
	const openEdit = (p: Piano) => {
		setEditing(p);
		setForm(pianoToForm(p));
		setOpen(true);
	};

	const handleSubmit = (e: FormEvent) => {
		e.preventDefault();
		const payload = {
			codice: form.codice.trim(),
			nome: form.nome.trim(),
			descrizione: form.descrizione.trim() || undefined,
			prezzoMensile: Number.parseFloat(form.prezzoMensile) || 0,
			prezzoAnnuale: Number.parseFloat(form.prezzoAnnuale) || 0,
			valuta: "EUR" as const,
			maxSoci: Number.parseInt(form.maxSoci, 10) || 0,
			maxUtenti: Number.parseInt(form.maxUtenti, 10) || 0,
			maxStorageMb: Number.parseInt(form.maxStorageMb, 10) || 0,
			aiAbilitato: form.aiAbilitato,
			integrazioniGoogle: form.integrazioniGoogle,
			integrazioniMicrosoft: form.integrazioniMicrosoft,
			customDomain: form.customDomain,
			customPalette: form.customPalette,
			fatturazioneSDI: form.fatturazioneSDI,
			exportAvanzato: form.exportAvanzato,
			supportoPrioritario: form.supportoPrioritario,
			whiteLabel: form.whiteLabel,
			ordine: Number.parseInt(form.ordine, 10) || 0,
			highlighted: form.highlighted,
			attivo: form.attivo,
		};

		if (editing) {
			updateMut.mutate({ id: editing.id, ...payload });
		} else {
			createMut.mutate(payload);
		}
	};

	const toggleActive = (p: Piano) => {
		if (p.attivo) {
			if (confirm(`Disattivare il piano "${p.nome}"? I tenant già sul piano non verranno toccati.`))
				disableMut.mutate({ id: p.id });
		} else {
			// Reattivo tramite update (disable solo spegne)
			updateMut.mutate({ id: p.id, attivo: true });
		}
	};

	const isSaving = createMut.isPending || updateMut.isPending;

	return (
		<>
			<div className="card" style={{ marginBottom: "1.5rem" }}>
				<div
					className="card-header"
					style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}
				>
					<div>
						<div className="card-title">Gestione piani</div>
						<div className="card-desc">
							Prezzi, limiti e feature dei piani offerti ai tenant. Modifiche live su Postgres.
						</div>
					</div>
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={openCreate}
						disabled={planiQuery.isLoading}
					>
						<Plus className="icon" /> Nuovo piano
					</button>
				</div>
				<div
					className="card-body"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
						gap: "0.875rem",
					}}
				>
					{planiQuery.isLoading ? (
						<div>Caricamento piani…</div>
					) : piani.length === 0 ? (
						<EmptyState
							title="Nessun piano configurato"
							description='Crea il primo piano con il pulsante "Nuovo piano".'
						/>
					) : (
						piani.map((p) => (
							<div
								key={p.id}
								className="card"
								style={{
									padding: "1rem",
									borderColor: p.highlighted ? "hsl(var(--primary))" : "hsl(var(--border))",
									borderWidth: p.highlighted ? "2px" : "1px",
									position: "relative",
									opacity: p.attivo ? 1 : 0.55,
								}}
							>
								{p.highlighted && (
									<span
										className="badge badge-primary"
										style={{
											position: "absolute",
											top: "-0.625rem",
											right: "1rem",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.25rem",
										}}
									>
										<Sparkles className="icon-sm" /> Più venduto
									</span>
								)}
								{!p.attivo && (
									<span
										className="badge"
										style={{ position: "absolute", top: "-0.625rem", left: "1rem" }}
									>
										Disattivo
									</span>
								)}

								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "flex-start",
										marginBottom: "0.5rem",
									}}
								>
									<div>
										<div style={{ fontWeight: 600, fontSize: "1rem" }}>{p.nome}</div>
										<div
											style={{
												fontSize: "0.6875rem",
												fontFamily: "monospace",
												color: "hsl(var(--muted-foreground))",
											}}
										>
											{p.codice}
										</div>
									</div>
									<div style={{ display: "flex", gap: "0.25rem" }}>
										<button
											type="button"
											className="btn btn-ghost btn-icon btn-sm"
											onClick={() => openEdit(p)}
											title="Modifica"
											aria-label={`Modifica ${p.nome}`}
										>
											<Edit3 className="icon-sm" />
										</button>
										<button
											type="button"
											className="btn btn-ghost btn-icon btn-sm"
											onClick={() => toggleActive(p)}
											title={p.attivo ? "Disattiva" : "Riattiva"}
											aria-label={p.attivo ? `Disattiva ${p.nome}` : `Riattiva ${p.nome}`}
										>
											{p.attivo ? (
												<EyeOff className="icon-sm" />
											) : (
												<RotateCcw className="icon-sm" />
											)}
										</button>
									</div>
								</div>

								<div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.125rem" }}>
									€ {Number(p.prezzoMensile).toFixed(0)}
									<span
										style={{
											fontSize: "0.75rem",
											fontWeight: 400,
											color: "hsl(var(--muted-foreground))",
										}}
									>
										{Number(p.prezzoMensile) === 0 ? " sempre" : " / mese"}
									</span>
								</div>
								{Number(p.prezzoAnnuale) > 0 && (
									<div
										style={{
											fontSize: "0.75rem",
											color: "hsl(var(--muted-foreground))",
											marginBottom: "0.5rem",
										}}
									>
										oppure € {Number(p.prezzoAnnuale).toFixed(0)} / anno
									</div>
								)}
								<div
									style={{
										fontSize: "0.75rem",
										color: "hsl(var(--muted-foreground))",
										marginBottom: "0.75rem",
										minHeight: "2.25em",
									}}
								>
									{p.descrizione ?? ""}
								</div>

								<div
									style={{
										display: "grid",
										gridTemplateColumns: "1fr 1fr",
										gap: "0.25rem",
										marginBottom: "0.5rem",
										fontSize: "0.7rem",
									}}
								>
									<Chip label="Soci" value={p.maxSoci} />
									<Chip label="Utenti" value={p.maxUtenti} />
								</div>

								<ul
									style={{
										listStyle: "none",
										padding: 0,
										margin: 0,
										display: "flex",
										flexDirection: "column",
										gap: "0.25rem",
									}}
								>
									<Feature ok={p.aiAbilitato} label="AI assistant" />
									<Feature ok={p.fatturazioneSDI} label="Fatturazione SDI" />
									<Feature ok={p.customDomain} label="Custom domain" />
									<Feature ok={p.integrazioniGoogle} label="Google Workspace" />
									<Feature ok={p.integrazioniMicrosoft} label="Microsoft 365" />
									<Feature ok={p.supportoPrioritario} label="Supporto prioritario" />
									<Feature ok={p.whiteLabel} label="White label" />
								</ul>
							</div>
						))
					)}
				</div>
			</div>

			<Modal
				open={open}
				onClose={() => !isSaving && setOpen(false)}
				title={editing ? `Modifica piano · ${editing.nome}` : "Nuovo piano"}
				subtitle={
					editing
						? "Aggiorna prezzi, limiti e feature. Le modifiche si riflettono su tutti i tenant collegati al piano."
						: "Definisci un nuovo piano offrable ai tenant."
				}
				size="lg"
				footer={
					<>
						<button
							type="button"
							className="btn btn-ghost"
							onClick={() => setOpen(false)}
							disabled={isSaving}
						>
							Annulla
						</button>
						<button type="submit" form="piano-form" className="btn btn-primary" disabled={isSaving}>
							<Save className="icon" />
							{editing ? "Salva modifiche" : "Crea piano"}
						</button>
					</>
				}
			>
				<form
					id="piano-form"
					onSubmit={handleSubmit}
					style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
				>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
						<FormField label="Codice" required hint="es. pro, enterprise">
							<input
								className="input"
								required
								value={form.codice}
								onChange={(e) => setForm({ ...form, codice: e.target.value })}
								disabled={!!editing}
								placeholder="base"
							/>
						</FormField>
						<FormField label="Nome visibile" required>
							<input
								className="input"
								required
								value={form.nome}
								onChange={(e) => setForm({ ...form, nome: e.target.value })}
								placeholder="Piano Pro"
							/>
						</FormField>
					</div>

					<FormField label="Descrizione">
						<textarea
							className="input"
							rows={2}
							value={form.descrizione}
							onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
							placeholder="Per ASD medio-grandi che vogliono AI + fatturazione SDI…"
						/>
					</FormField>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
						<FormField label="Prezzo mensile (€)" required>
							<input
								className="input"
								type="number"
								min={0}
								step="0.01"
								required
								value={form.prezzoMensile}
								onChange={(e) => setForm({ ...form, prezzoMensile: e.target.value })}
							/>
						</FormField>
						<FormField label="Prezzo annuale (€)" required>
							<input
								className="input"
								type="number"
								min={0}
								step="0.01"
								required
								value={form.prezzoAnnuale}
								onChange={(e) => setForm({ ...form, prezzoAnnuale: e.target.value })}
							/>
						</FormField>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
						<FormField label="Max soci" required>
							<input
								className="input"
								type="number"
								min={0}
								required
								value={form.maxSoci}
								onChange={(e) => setForm({ ...form, maxSoci: e.target.value })}
							/>
						</FormField>
						<FormField label="Max utenti" required>
							<input
								className="input"
								type="number"
								min={0}
								required
								value={form.maxUtenti}
								onChange={(e) => setForm({ ...form, maxUtenti: e.target.value })}
							/>
						</FormField>
						<FormField label="Max storage (MB)" required>
							<input
								className="input"
								type="number"
								min={0}
								required
								value={form.maxStorageMb}
								onChange={(e) => setForm({ ...form, maxStorageMb: e.target.value })}
							/>
						</FormField>
					</div>

					<fieldset
						style={{
							border: "1px solid hsl(var(--border))",
							borderRadius: "0.5rem",
							padding: "0.75rem",
						}}
					>
						<legend
							style={{
								fontSize: "0.75rem",
								fontWeight: 600,
								padding: "0 0.375rem",
								color: "hsl(var(--muted-foreground))",
							}}
						>
							Feature attivabili
						</legend>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: "0.5rem",
								marginTop: "0.25rem",
							}}
						>
							<Toggle
								label="AI assistant"
								checked={form.aiAbilitato}
								onChange={(v) => setForm({ ...form, aiAbilitato: v })}
							/>
							<Toggle
								label="Fatturazione SDI"
								checked={form.fatturazioneSDI}
								onChange={(v) => setForm({ ...form, fatturazioneSDI: v })}
							/>
							<Toggle
								label="Custom domain"
								checked={form.customDomain}
								onChange={(v) => setForm({ ...form, customDomain: v })}
							/>
							<Toggle
								label="Custom palette"
								checked={form.customPalette}
								onChange={(v) => setForm({ ...form, customPalette: v })}
							/>
							<Toggle
								label="Google Workspace"
								checked={form.integrazioniGoogle}
								onChange={(v) => setForm({ ...form, integrazioniGoogle: v })}
							/>
							<Toggle
								label="Microsoft 365"
								checked={form.integrazioniMicrosoft}
								onChange={(v) => setForm({ ...form, integrazioniMicrosoft: v })}
							/>
							<Toggle
								label="Export avanzato"
								checked={form.exportAvanzato}
								onChange={(v) => setForm({ ...form, exportAvanzato: v })}
							/>
							<Toggle
								label="Supporto prioritario"
								checked={form.supportoPrioritario}
								onChange={(v) => setForm({ ...form, supportoPrioritario: v })}
							/>
							<Toggle
								label="White label"
								checked={form.whiteLabel}
								onChange={(v) => setForm({ ...form, whiteLabel: v })}
							/>
						</div>
					</fieldset>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
						<FormField label="Ordine" hint="Piano più basso viene mostrato prima">
							<input
								className="input"
								type="number"
								value={form.ordine}
								onChange={(e) => setForm({ ...form, ordine: e.target.value })}
							/>
						</FormField>
						<Toggle
							label="Highlighted (più venduto)"
							checked={form.highlighted}
							onChange={(v) => setForm({ ...form, highlighted: v })}
						/>
						<Toggle
							label="Attivo"
							checked={form.attivo}
							onChange={(v) => setForm({ ...form, attivo: v })}
						/>
					</div>

					{(createMut.error || updateMut.error) && (
						<div
							style={{
								padding: "0.5rem 0.75rem",
								background: "hsl(var(--destructive) / 0.1)",
								color: "hsl(var(--destructive))",
								borderRadius: "0.375rem",
								fontSize: "0.8125rem",
							}}
						>
							{createMut.error?.message ?? updateMut.error?.message}
						</div>
					)}
				</form>
			</Modal>
		</>
	);
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

function Chip({ label, value }: { label: string; value: number }) {
	return (
		<div
			style={{
				padding: "0.25rem 0.5rem",
				background: "hsl(var(--muted))",
				borderRadius: "0.25rem",
			}}
		>
			<div style={{ fontSize: "0.625rem", color: "hsl(var(--muted-foreground))" }}>{label}</div>
			<div style={{ fontWeight: 600, fontSize: "0.75rem", display: "flex", alignItems: "center" }}>
				{value >= 999999 ? <InfinityIcon className="icon-sm" /> : value.toLocaleString("it-IT")}
			</div>
		</div>
	);
}

function Feature({ ok, label }: { ok: boolean; label: string }) {
	if (!ok) return null;
	return (
		<li
			style={{
				display: "flex",
				gap: "0.375rem",
				alignItems: "flex-start",
				fontSize: "0.75rem",
			}}
		>
			<CheckCircle2
				className="icon-sm"
				style={{ color: "hsl(var(--success))", flexShrink: 0, marginTop: "0.125rem" }}
			/>
			<span>{label}</span>
		</li>
	);
}

function FormField({
	label,
	hint,
	required,
	children,
}: {
	label: string;
	hint?: string;
	required?: boolean;
	children: React.ReactNode;
}) {
	return (
		<label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
			<span style={{ fontSize: "0.75rem", fontWeight: 500 }}>
				{label}
				{required && (
					<span style={{ color: "hsl(var(--destructive))", marginLeft: "0.125rem" }}>*</span>
				)}
			</span>
			{children}
			{hint && (
				<span style={{ fontSize: "0.6875rem", color: "hsl(var(--muted-foreground))" }}>{hint}</span>
			)}
		</label>
	);
}

function Toggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<label
			style={{
				display: "flex",
				alignItems: "center",
				gap: "0.5rem",
				fontSize: "0.8125rem",
				cursor: "pointer",
			}}
		>
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				style={{ accentColor: "hsl(var(--primary))", width: "1rem", height: "1rem" }}
			/>
			{label}
		</label>
	);
}
