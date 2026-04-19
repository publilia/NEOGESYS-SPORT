"use client";

/**
 * /impostazioni/piano · Upgrade self-service (tenant admin)
 * ─────────────────────────────────────────────────────────────────
 * Pagina dedicata al tenant admin per:
 *
 *   1. Vedere il piano in corso + trial/scadenza.
 *   2. Confrontare i piani disponibili (letti dal DB).
 *   3. Richiedere un upgrade/downgrade con un click.
 *
 * La mutation `tenant.requestPlanChange` applica il cambio piano
 * immediatamente (MVP). Quando Stripe sarà integrato, al posto del
 * cambio diretto aprirà un checkout.
 */

import { EmptyState } from "@/components/ui/empty-state";
import { useCurrentUser } from "@/lib/current-user";
import { trpc } from "@/lib/trpc";
import {
	ArrowLeft,
	CheckCircle2,
	Crown,
	Globe,
	HardDrive,
	Palette,
	Send,
	Shield,
	Sparkles,
	Star,
	User,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type PianoCodice = "trial" | "free" | "base" | "pro" | "enterprise";

function fmtDate(d: string | Date | null | undefined): string {
	if (!d) return "—";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

export default function PianoUpgradePage() {
	const { current } = useCurrentUser();
	const isPlatformContext = current.tenant === "NEOGESYS Platform";

	const tenantQuery = trpc.tenant.getCurrent.useQuery(undefined, { enabled: !isPlatformContext });
	const planiQuery = trpc.piattaforma.piani.list.useQuery();
	const utils = trpc.useUtils();

	const [pendingPiano, setPendingPiano] = useState<PianoCodice | null>(null);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [success, setSuccess] = useState<string | null>(null);

	const changeMut = trpc.tenant.requestPlanChange.useMutation({
		onSuccess: (res) => {
			utils.tenant.getCurrent.invalidate();
			setConfirmOpen(false);
			setPendingPiano(null);
			setSuccess(
				res.changed
					? `Piano aggiornato con successo a "${res.tenant?.piano?.toUpperCase() ?? ""}".`
					: "Nessuna modifica: sei già su questo piano.",
			);
			setTimeout(() => setSuccess(null), 5000);
		},
	});

	if (isPlatformContext) {
		return (
			<div className="p-6">
				<EmptyState
					title="Modifica piani disponibile solo per tenant"
					description="Il super_admin gestisce il listino dei piani da /billing. Questa pagina è pensata per i tenant che vogliono fare upgrade in autonomia."
				/>
			</div>
		);
	}

	const tenant = tenantQuery.data;
	const pianoAttuale = (tenant?.piano ?? "trial") as PianoCodice;
	const piani = (planiQuery.data ?? []).filter((p) => p.attivo);

	const pendingPlan = piani.find((p) => (p.codice as PianoCodice) === pendingPiano) ?? null;

	return (
		<div className="p-6">
			{/* ═══════════ Header ═══════════════════════════════════════════ */}
			<div className="page-header">
				<div>
					<Link
						href="/impostazioni"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
						style={{ marginBottom: "0.5rem" }}
					>
						<ArrowLeft className="icon-sm" /> Torna a Impostazioni
					</Link>
					<h1 className="page-title">Piano & Upgrade</h1>
					<p className="page-subtitle">
						Scegli il piano più adatto alla tua organizzazione. Cambi piano in autonomia, senza
						dover contattare il supporto.
					</p>
				</div>
			</div>

			{/* ═══════════ Success banner ═══════════════════════════════════ */}
			{success && (
				<div
					className="card"
					style={{
						marginBottom: "1rem",
						padding: "0.75rem 1rem",
						background: "hsl(var(--success) / 0.1)",
						borderColor: "hsl(var(--success) / 0.4)",
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
					}}
				>
					<CheckCircle2 className="icon" style={{ color: "hsl(var(--success))" }} />
					<span style={{ fontSize: "0.875rem" }}>{success}</span>
				</div>
			)}

			{/* ═══════════ Piano attuale ════════════════════════════════════ */}
			<div
				className="card"
				style={{
					marginBottom: "1.5rem",
					padding: "1.5rem",
					background:
						"linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.05))",
					borderColor: "hsl(var(--primary) / 0.3)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "1rem",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
						<div
							style={{
								width: "3rem",
								height: "3rem",
								borderRadius: "0.75rem",
								background: "hsl(var(--primary))",
								color: "hsl(var(--primary-foreground))",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<Crown className="icon" />
						</div>
						<div>
							<div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
								Piano attuale
							</div>
							<div
								style={{
									fontSize: "1.5rem",
									fontWeight: 700,
									textTransform: "capitalize",
								}}
							>
								{pianoAttuale}
							</div>
						</div>
					</div>
					<div style={{ display: "flex", gap: "2rem", fontSize: "0.8125rem" }}>
						<Metric
							icon={Users}
							label="Limite soci"
							value={
								tenant?.maxSoci === "999999" ? "Illimitati" : (tenant?.maxSoci ?? "—")
							}
						/>
						<Metric
							icon={User}
							label="Limite utenti"
							value={
								tenant?.maxUtenti === "999999" ? "Illimitati" : (tenant?.maxUtenti ?? "—")
							}
						/>
						{tenant?.trialEnd && pianoAttuale === "trial" && (
							<Metric
								icon={Star}
								label="Trial scade"
								value={fmtDate(tenant.trialEnd as unknown as string)}
								warn
							/>
						)}
					</div>
				</div>
			</div>

			{/* ═══════════ Listino piani ═══════════════════════════════════ */}
			<div className="card">
				<div className="card-header">
					<div className="card-title">Piani disponibili</div>
					<div className="card-desc">
						Seleziona il piano di tuo interesse. Il cambio è immediato e senza interruzioni.
					</div>
				</div>
				<div
					className="card-body"
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
						gap: "1rem",
					}}
				>
					{planiQuery.isLoading ? (
						<div>Caricamento piani…</div>
					) : piani.length === 0 ? (
						<EmptyState
							title="Nessun piano disponibile"
							description="Il catalogo piani è momentaneamente vuoto. Contatta il supporto."
						/>
					) : (
						piani.map((p) => {
							const codice = p.codice as PianoCodice;
							const isCurrent = codice === pianoAttuale;
							return (
								<div
									key={p.id}
									className="card"
									style={{
										padding: "1.25rem",
										position: "relative",
										borderColor: isCurrent
											? "hsl(var(--success))"
											: p.highlighted
												? "hsl(var(--primary))"
												: "hsl(var(--border))",
										borderWidth: isCurrent || p.highlighted ? "2px" : "1px",
										display: "flex",
										flexDirection: "column",
									}}
								>
									{p.highlighted && !isCurrent && (
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
									{isCurrent && (
										<span
											className="badge badge-success"
											style={{
												position: "absolute",
												top: "-0.625rem",
												right: "1rem",
												display: "inline-flex",
												alignItems: "center",
												gap: "0.25rem",
											}}
										>
											<CheckCircle2 className="icon-sm" /> Attuale
										</span>
									)}
									<div style={{ fontWeight: 600, fontSize: "1.125rem", marginBottom: "0.25rem" }}>
										{p.nome}
									</div>
									<div
										style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.125rem" }}
									>
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
											fontSize: "0.8125rem",
											color: "hsl(var(--muted-foreground))",
											marginBottom: "1rem",
											minHeight: "2.5em",
										}}
									>
										{p.descrizione ?? ""}
									</div>

									<ul
										style={{
											listStyle: "none",
											padding: 0,
											margin: "0 0 1rem 0",
											display: "flex",
											flexDirection: "column",
											gap: "0.5rem",
											flex: 1,
										}}
									>
										<FeatureRow
											icon={Users}
											label={
												p.maxSoci >= 999999 ? "Soci illimitati" : `Fino a ${p.maxSoci} soci`
											}
										/>
										<FeatureRow
											icon={User}
											label={
												p.maxUtenti >= 999999
													? "Utenti illimitati"
													: `${p.maxUtenti} utenti`
											}
										/>
										{p.maxStorageMb > 0 && (
											<FeatureRow
												icon={HardDrive}
												label={`${(p.maxStorageMb / 1024).toFixed(0)} GB storage`}
											/>
										)}
										{p.aiAbilitato && <FeatureRow icon={Zap} label="AI assistant" />}
										{p.fatturazioneSDI && (
											<FeatureRow icon={Shield} label="Fatturazione SDI" />
										)}
										{p.customDomain && <FeatureRow icon={Globe} label="Custom domain" />}
										{p.customPalette && <FeatureRow icon={Palette} label="Palette custom" />}
										{p.supportoPrioritario && (
											<FeatureRow icon={Sparkles} label="Supporto prioritario" />
										)}
									</ul>

									<button
										type="button"
										className={`btn ${isCurrent ? "btn-outline" : p.highlighted ? "btn-primary" : "btn-outline"}`}
										disabled={isCurrent || changeMut.isPending}
										onClick={() => {
											setPendingPiano(codice);
											setConfirmOpen(true);
										}}
										style={{ width: "100%", justifyContent: "center" }}
									>
										{isCurrent ? (
											"Piano attuale"
										) : (
											<>
												<Send className="icon-sm" /> Passa a {p.nome}
											</>
										)}
									</button>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* ═══════════ Conferma upgrade modale ══════════════════════════ */}
			{confirmOpen && pendingPlan && (
				<div
					className="modal-backdrop"
					onClick={() => !changeMut.isPending && setConfirmOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape" && !changeMut.isPending) setConfirmOpen(false);
					}}
					role="dialog"
					aria-modal="true"
					tabIndex={-1}
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.5)",
						zIndex: 50,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
					}}
				>
					<div
						className="card"
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => e.stopPropagation()}
						role="document"
						style={{
							width: "100%",
							maxWidth: "480px",
							padding: "1.5rem",
							background: "hsl(var(--card))",
						}}
					>
						<div style={{ marginBottom: "1rem" }}>
							<h2 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>
								Conferma cambio piano
							</h2>
							<p
								style={{
									fontSize: "0.875rem",
									color: "hsl(var(--muted-foreground))",
									marginTop: "0.5rem",
								}}
							>
								Stai per cambiare il piano della tua organizzazione da{" "}
								<strong style={{ textTransform: "capitalize" }}>{pianoAttuale}</strong> a{" "}
								<strong>{pendingPlan.nome}</strong>. Il cambio è immediato.
							</p>
						</div>
						<div
							style={{
								background: "hsl(var(--muted))",
								borderRadius: "0.5rem",
								padding: "0.75rem 1rem",
								marginBottom: "1rem",
								fontSize: "0.8125rem",
							}}
						>
							<div
								style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}
							>
								<span>Nuovo limite soci</span>
								<strong>
									{pendingPlan.maxSoci >= 999999
										? "Illimitati"
										: pendingPlan.maxSoci.toLocaleString("it-IT")}
								</strong>
							</div>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span>Nuovo costo mensile</span>
								<strong>€ {Number(pendingPlan.prezzoMensile).toFixed(2)}</strong>
							</div>
						</div>
						{changeMut.error && (
							<div
								style={{
									padding: "0.5rem 0.75rem",
									background: "hsl(var(--destructive) / 0.1)",
									color: "hsl(var(--destructive))",
									borderRadius: "0.375rem",
									fontSize: "0.8125rem",
									marginBottom: "0.75rem",
								}}
							>
								{changeMut.error.message}
							</div>
						)}
						<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
							<button
								type="button"
								className="btn btn-ghost"
								onClick={() => setConfirmOpen(false)}
								disabled={changeMut.isPending}
							>
								Annulla
							</button>
							<button
								type="button"
								className="btn btn-primary"
								onClick={() =>
									pendingPiano && changeMut.mutate({ piano: pendingPiano })
								}
								disabled={changeMut.isPending}
							>
								{changeMut.isPending ? "Aggiorno…" : "Conferma upgrade"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Small UI helpers ────────────────────────────────────────────────────────

function Metric({
	icon: Icon,
	label,
	value,
	warn,
}: {
	icon: typeof Users;
	label: string;
	value: string | number;
	warn?: boolean;
}) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
			<Icon
				className="icon"
				style={{
					color: warn ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))",
				}}
			/>
			<div>
				<div style={{ fontSize: "0.6875rem", color: "hsl(var(--muted-foreground))" }}>
					{label}
				</div>
				<div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{value}</div>
			</div>
		</div>
	);
}

function FeatureRow({ icon: Icon, label }: { icon: typeof Users; label: string }) {
	return (
		<li
			style={{
				display: "flex",
				gap: "0.5rem",
				alignItems: "center",
				fontSize: "0.8125rem",
			}}
		>
			<Icon
				className="icon-sm"
				style={{ color: "hsl(var(--primary))", flexShrink: 0 }}
			/>
			<span>{label}</span>
		</li>
	);
}
