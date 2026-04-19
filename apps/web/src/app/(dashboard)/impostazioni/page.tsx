"use client";

import { usePaletteContext } from "@/components/palette-provider";
import { Field, FormGrid, Input, Select } from "@/components/ui/form";
import { useLayout } from "@/hooks/use-layout";
import { trpc } from "@/lib/trpc";
import {
	ArrowUpRight,
	Check,
	CheckCircle,
	type LucideIcon,
	Monitor,
	Moon,
	PanelLeft,
	PanelTop,
	Save,
	Sparkles,
	Sun,
	Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const LAYOUTS: { id: "sidebar" | "topbar"; name: string; Icon: LucideIcon; desc: string }[] = [
	{ id: "sidebar", name: "Sidebar", Icon: PanelLeft, desc: "Menu laterale verticale" },
	{ id: "topbar", name: "Topbar", Icon: PanelTop, desc: "Menu in alto orizzontale" },
];

const THEMES: { id: "light" | "dark" | "system"; name: string; Icon: LucideIcon }[] = [
	{ id: "light", name: "Chiaro", Icon: Sun },
	{ id: "dark", name: "Scuro", Icon: Moon },
	{ id: "system", name: "Sistema", Icon: Monitor },
];

export default function ImpostazioniPage() {
	const utils = trpc.useUtils();
	const { layoutMode, setLayoutMode } = useLayout();
	const { theme, setTheme } = useTheme();
	const { currentPaletteId, setPalette, palettes } = usePaletteContext();

	const impostazioniQuery = trpc.impostazioni.get.useQuery();
	const tenantQuery = trpc.tenant.getCurrent.useQuery();

	const updateLayoutMut = trpc.impostazioni.updateLayout.useMutation({
		onSuccess: () => {
			toast.success("Layout salvato");
			utils.impostazioni.get.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const updatePaletteMut = trpc.impostazioni.updatePalette.useMutation({
		onSuccess: () => {
			toast.success("Palette salvata");
			utils.impostazioni.get.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const updateGeneralMut = trpc.impostazioni.updateGeneral.useMutation({
		onSuccess: () => {
			toast.success("Impostazioni salvate");
			utils.impostazioni.get.invalidate();
		},
		onError: (err) => toast.error(err.message),
	});

	const [certDays, setCertDays] = useState(30);
	const [aiEnabled, setAiEnabled] = useState(false);
	const [lingua, setLingua] = useState("it");

	useEffect(() => {
		if (impostazioniQuery.data) {
			setCertDays(impostazioniQuery.data.cert_alert_days ?? 30);
			setAiEnabled(Boolean(impostazioniQuery.data.ai_enabled));
			setLingua(impostazioniQuery.data.lingua ?? "it");
		}
	}, [impostazioniQuery.data]);

	const tenant = tenantQuery.data;

	const pickerCardStyle = (active: boolean): React.CSSProperties => ({
		padding: "1rem",
		background: active ? "hsl(var(--primary) / 0.08)" : "transparent",
		borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
		borderWidth: "2px",
		cursor: "pointer",
		textAlign: "left",
		display: "flex",
		flexDirection: "column",
		gap: "0.5rem",
		transition: "all 0.15s",
	});

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Impostazioni</h1>
					<p className="page-subtitle">Preferenze piattaforma, layout, tema e palette</p>
				</div>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr",
					gap: "1.5rem",
					maxWidth: "48rem",
				}}
			>
				{/* Layout */}
				<div className="card">
					<div className="card-header">
						<div className="card-title">Layout navigazione</div>
						<div className="card-desc">Modalità di visualizzazione del menu principale</div>
					</div>
					<div
						className="card-body"
						style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}
					>
						{LAYOUTS.map((l) => {
							const active = layoutMode === l.id;
							const Icon = l.Icon;
							return (
								<button
									key={l.id}
									type="button"
									onClick={() => {
										setLayoutMode(l.id);
										updateLayoutMut.mutate({ layout_menu: l.id });
									}}
									className="card"
									style={pickerCardStyle(active)}
								>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
										}}
									>
										<Icon
											className="icon-lg"
											style={{
												color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
											}}
										/>
										{active && (
											<CheckCircle className="icon" style={{ color: "hsl(var(--primary))" }} />
										)}
									</div>
									<div>
										<div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>{l.name}</div>
										<div style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
											{l.desc}
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Theme */}
				<div className="card">
					<div className="card-header">
						<div className="card-title">Tema</div>
						<div className="card-desc">Aspetto chiaro, scuro o automatico (solo locale)</div>
					</div>
					<div
						className="card-body"
						style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}
					>
						{THEMES.map((t) => {
							const active = theme === t.id;
							const Icon = t.Icon;
							return (
								<button
									key={t.id}
									type="button"
									onClick={() => setTheme(t.id)}
									className="card"
									style={{
										...pickerCardStyle(active),
										textAlign: "center",
										alignItems: "center",
									}}
								>
									<Icon
										className="icon-lg"
										style={{
											color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
										}}
									/>
									<div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.name}</div>
								</button>
							);
						})}
					</div>
				</div>

				{/* Palette */}
				<div className="card" id="branding">
					<div className="card-header">
						<div className="card-title">Palette colori</div>
						<div className="card-desc">
							{palettes.length} palette predefinite · salvate lato tenant
						</div>
					</div>
					<div
						className="card-body"
						style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
					>
						{/* Grid 2+ colonne per le palette standard. */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
								gap: "0.625rem",
							}}
						>
							{palettes
								.filter((p) => !p.special)
								.map((p) => {
									const active = currentPaletteId === p.id;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => {
												setPalette(p.id);
												updatePaletteMut.mutate({ palette_default: p.id });
											}}
											className="card"
											style={{
												padding: "0.75rem",
												background: active ? "hsl(var(--primary) / 0.08)" : "transparent",
												borderColor: active ? "hsl(var(--primary))" : "hsl(var(--border))",
												borderWidth: "2px",
												cursor: "pointer",
												textAlign: "left",
												display: "flex",
												alignItems: "center",
												gap: "0.5rem",
												transition: "all 0.15s",
											}}
										>
											<span
												style={{
													width: "1.5rem",
													height: "1.5rem",
													borderRadius: "9999px",
													background: `hsl(${p.colors.light.primary})`,
													flexShrink: 0,
												}}
											/>
											<span style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{p.name}</span>
											{active && (
												<Check
													className="icon-sm"
													style={{ color: "hsl(var(--primary))", marginLeft: "auto" }}
												/>
											)}
										</button>
									);
								})}
						</div>

						{/* ═════════════ Palette SPECIAL (full-width) ═════════════
						    Renderizzata dopo le standard e a larghezza piena. La
						    quasar NEOGESYS è "il" tema — non è un'opzione come le
						    altre, è l'identità. Preview Liquid Glass con stelle
						    animate: stesso trattamento del dropdown header. */}
						{palettes
							.filter((p) => p.special)
							.map((p) => {
								const active = currentPaletteId === p.id;
								return (
									<button
										key={p.id}
										type="button"
										onClick={() => {
											setPalette(p.id);
											updatePaletteMut.mutate({ palette_default: p.id });
										}}
										className={`pulsar-card-preview pulsar-card-preview-lg ${
											active ? "pulsar-card-selected" : ""
										}`}
										style={{ width: "100%" }}
										aria-label={`Palette ${p.name}`}
									>
										<div aria-hidden="true" className="pulsar-card-bg" />
										<div aria-hidden="true" className="pulsar-card-stars" />
										<div aria-hidden="true" className="pulsar-card-nebula" />

										<div className="pulsar-card-glass">
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.875rem",
												}}
											>
												<div className="pulsar-card-core pulsar-card-core-lg">
													<Sparkles
														style={{ width: "1.125rem", height: "1.125rem", color: "white" }}
													/>
												</div>
												<div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
													<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
														<span
															style={{
																fontSize: "0.9375rem",
																fontWeight: 700,
																color: "white",
																textShadow: "0 1px 2px rgba(0,0,0,0.4)",
															}}
														>
															{p.name}
														</span>
														<span className="pulsar-card-badge">Special</span>
													</div>
													{p.description ? (
														<p
															style={{
																marginTop: "0.125rem",
																fontSize: "0.75rem",
																lineHeight: 1.35,
																color: "rgba(255,255,255,0.88)",
																textShadow: "0 1px 2px rgba(0,0,0,0.3)",
															}}
														>
															{p.description}
														</p>
													) : null}
												</div>
												{active && (
													<Check
														style={{
															width: "1.25rem",
															height: "1.25rem",
															color: "white",
															flexShrink: 0,
															filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))",
														}}
													/>
												)}
											</div>
										</div>
									</button>
								);
							})}
					</div>
				</div>

				{/* Generali */}
				<div className="card">
					<div className="card-header">
						<div className="card-title">Preferenze generali</div>
						<div className="card-desc">Allerta certificati, AI e lingua piattaforma</div>
					</div>
					<div
						className="card-body"
						style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
					>
						<FormGrid>
							<Field
								label="Giorni preavviso scadenza certificato"
								hint="Numero di giorni prima della scadenza per mostrare avvisi"
								span={1}
							>
								<Input
									type="number"
									min="1"
									max="180"
									value={certDays}
									onChange={(e) => setCertDays(Number(e.target.value))}
								/>
							</Field>
							<Field label="Lingua predefinita" span={1}>
								<Select value={lingua} onChange={(e) => setLingua(e.target.value)}>
									<option value="it">Italiano</option>
									<option value="en">English</option>
									<option value="es">Español</option>
								</Select>
							</Field>
							<Field
								label="Assistente AI"
								hint="Attiva le funzioni di intelligenza artificiale (solo piano Pro/Enterprise)"
								span={2}
							>
								<label
									style={{
										display: "inline-flex",
										alignItems: "center",
										gap: "0.5rem",
										cursor: "pointer",
									}}
								>
									<input
										type="checkbox"
										checked={aiEnabled}
										onChange={(e) => setAiEnabled(e.target.checked)}
									/>
									<span>AI abilitata</span>
								</label>
							</Field>
						</FormGrid>
						<div
							style={{
								display: "flex",
								justifyContent: "flex-end",
								gap: "0.5rem",
							}}
						>
							<button
								type="button"
								className="btn btn-primary btn-sm"
								onClick={() =>
									updateGeneralMut.mutate({
										cert_alert_days: certDays,
										ai_enabled: aiEnabled,
										lingua,
									})
								}
								disabled={updateGeneralMut.isPending}
							>
								<Save className="icon-sm" /> Salva impostazioni
							</button>
						</div>
					</div>
				</div>

				{/* Società — include anche il piano attivo, da qui l'ancora #piano
				    linkata dal TenantMenu ("Gestisci piano → vai al dettaglio").
				    L'upgrade self-service ha la sua pagina dedicata a /impostazioni/piano. */}
				<div className="card" id="piano">
					<div className="card-header">
						<div className="card-title">Società</div>
						<div className="card-desc">
							Dati anagrafici tenant (modificabili solo dal super admin)
						</div>
					</div>
					<div
						className="card-body"
						style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
					>
						{tenantQuery.isLoading ? (
							<div>Caricamento…</div>
						) : tenant ? (
							<FormGrid>
								<Field label="Nome società" span={2}>
									<Input
										value={tenant.ragioneSociale ?? ""}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
								<Field label="Nome visualizzato" span={2}>
									<Input
										value={tenant.nomeVisualizzato ?? ""}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
								<Field label="Slug" span={1}>
									<Input
										value={tenant.slug ?? ""}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
								<Field label="Piano" span={1}>
									<Input
										value={tenant.piano ?? ""}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
								<Field label="Stato" span={1}>
									<Input
										value={tenant.stato ?? ""}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
								<Field label="Custom domain" span={1}>
									<Input
										value={tenant.customDomain ?? "—"}
										readOnly
										style={{ background: "hsl(var(--muted) / 0.3)" }}
									/>
								</Field>
							</FormGrid>
						) : (
							<div>Dati tenant non disponibili.</div>
						)}

						{/* ═══════════ Upgrade CTA ══════════════════════════════════
						    Link verso /impostazioni/piano dove il tenant admin vede
						    tutti i piani e può fare upgrade/downgrade in autonomia. */}
						<div
							style={{
								marginTop: "0.75rem",
								padding: "1rem",
								borderRadius: "0.625rem",
								background:
									"linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.08))",
								border: "1px solid hsl(var(--primary) / 0.25)",
								display: "flex",
								alignItems: "center",
								gap: "0.875rem",
								flexWrap: "wrap",
							}}
						>
							<div
								style={{
									width: "2.5rem",
									height: "2.5rem",
									borderRadius: "0.5rem",
									background: "hsl(var(--primary))",
									color: "hsl(var(--primary-foreground))",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<Zap className="icon" />
							</div>
							<div style={{ flex: 1, minWidth: "200px" }}>
								<div style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Vuoi cambiare piano?</div>
								<div
									style={{
										fontSize: "0.8125rem",
										color: "hsl(var(--muted-foreground))",
										marginTop: "0.125rem",
									}}
								>
									Confronta i piani disponibili e fai l&apos;upgrade in autonomia — nessuna
									telefonata al supporto.
								</div>
							</div>
							<Link
								href="/impostazioni/piano"
								className="btn btn-primary btn-sm"
								style={{ flexShrink: 0 }}
							>
								<Sparkles className="icon-sm" /> Vedi piani
								<ArrowUpRight className="icon-sm" />
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
