"use client";

import { TesseraDigitale } from "@/components/tessera-digitale";
import { EmptyState } from "@/components/ui/empty-state";
import { trpc } from "@/lib/trpc";
import { IdCard, Search } from "lucide-react";
import { useState } from "react";

/**
 * Digital membership card page.
 * - Admin/segreteria: pick any socio from the tenant and show their tessera.
 * - Socio/atleta/genitore: show their own tessera (looked up by email).
 */
export default function TesseraPage() {
	const [selectedSocioId, setSelectedSocioId] = useState<string | null>(null);
	const [search, setSearch] = useState("");

	const tenantQuery = trpc.tenant.getCurrent.useQuery();
	const sociQuery = trpc.soci.list.useQuery({ page: 1, perPage: 500 });

	const soci = sociQuery.data?.items ?? [];

	const filtered = search
		? soci.filter((s) =>
				`${s.cognome} ${s.nome} ${s.codiceTessera ?? ""}`
					.toLowerCase()
					.includes(search.toLowerCase()),
			)
		: soci;

	const selectedSocio = selectedSocioId
		? soci.find((s) => s.id === selectedSocioId)
		: (soci[0] ?? null);

	const tenantMeta = tenantQuery.data
		? {
				slug: tenantQuery.data.slug,
				ragioneSociale: tenantQuery.data.ragioneSociale,
			}
		: { slug: "demo-asd", ragioneSociale: "NEOGESYS Sport" };

	return (
		<div className="p-6">
			<div className="page-header">
				<div>
					<h1 className="page-title">Tessera digitale</h1>
					<p className="page-subtitle">
						Tessera digitale con QR code · Mostra dal cellulare per verifica rapida
					</p>
				</div>
			</div>

			<div
				className="card"
				style={{
					marginBottom: "1.5rem",
					borderColor: "hsl(var(--primary) / 0.3)",
					background: "hsl(var(--primary) / 0.05)",
				}}
			>
				<div
					className="card-body"
					style={{
						display: "flex",
						gap: "0.75rem",
						alignItems: "flex-start",
						padding: "1rem",
					}}
				>
					<IdCard
						style={{
							width: "1.5rem",
							height: "1.5rem",
							color: "hsl(var(--primary))",
							flexShrink: 0,
						}}
					/>
					<div>
						<div style={{ fontWeight: 600, marginBottom: "0.125rem" }}>Come usarla</div>
						<div style={{ fontSize: "0.8125rem", color: "hsl(var(--muted-foreground))" }}>
							Ogni socio ha una tessera digitale con QR univoco. Il QR rimanda alla pagina pubblica
							di verifica <code>/verifica-tessera</code> che conferma nome, stato e validità. Può
							essere scaricata come PNG o condivisa via share nativo del dispositivo.
						</div>
					</div>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "18rem 1fr", gap: "1.5rem" }}>
				{/* Sidebar: socio list */}
				<div className="card" style={{ maxHeight: "70vh", overflow: "auto" }}>
					<div
						style={{
							padding: "0.75rem",
							borderBottom: "1px solid hsl(var(--border))",
							position: "sticky",
							top: 0,
							background: "hsl(var(--card))",
							zIndex: 1,
						}}
					>
						<div style={{ position: "relative" }}>
							<Search
								className="icon-sm"
								style={{
									position: "absolute",
									left: "0.625rem",
									top: "50%",
									transform: "translateY(-50%)",
									color: "hsl(var(--muted-foreground))",
								}}
							/>
							<input
								className="input"
								placeholder="Cerca socio..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								style={{ paddingLeft: "2rem", width: "100%" }}
							/>
						</div>
					</div>
					{sociQuery.isLoading ? (
						<div style={{ padding: "1rem", textAlign: "center" }}>Caricamento…</div>
					) : filtered.length === 0 ? (
						<EmptyState title="Nessun socio" description="Non ci sono soci con questi filtri." />
					) : (
						<div>
							{filtered.map((s) => {
								const active = s.id === (selectedSocio?.id ?? "");
								return (
									<button
										key={s.id}
										type="button"
										onClick={() => setSelectedSocioId(s.id)}
										style={{
											width: "100%",
											display: "flex",
											flexDirection: "column",
											alignItems: "flex-start",
											gap: "0.125rem",
											padding: "0.625rem 0.75rem",
											borderBottom: "1px solid hsl(var(--border))",
											background: active ? "hsl(var(--primary) / 0.08)" : "transparent",
											borderLeft: active
												? "3px solid hsl(var(--primary))"
												: "3px solid transparent",
											cursor: "pointer",
											textAlign: "left",
										}}
									>
										<span style={{ fontWeight: 500, fontSize: "0.875rem" }}>
											{s.cognome} {s.nome}
										</span>
										<span
											style={{
												fontSize: "0.6875rem",
												color: "hsl(var(--muted-foreground))",
												fontFamily: "ui-monospace, monospace",
											}}
										>
											{s.codiceTessera ?? `TMP-${s.id.slice(0, 8)}`}
										</span>
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Main: tessera display */}
				<div>
					{selectedSocio ? (
						<TesseraDigitale
							socio={{
								id: selectedSocio.id,
								nome: selectedSocio.nome,
								cognome: selectedSocio.cognome,
								codiceTessera: selectedSocio.codiceTessera,
								numeroTesseraFed: selectedSocio.numeroTesseraFed,
								federazione: selectedSocio.federazione,
								disciplina: selectedSocio.disciplina,
								tipologia: selectedSocio.tipologia,
								dataIscrizione: selectedSocio.dataIscrizione,
								stato: selectedSocio.stato,
								fotoUrl: selectedSocio.fotoUrl,
							}}
							tenant={tenantMeta}
						/>
					) : (
						<EmptyState
							title="Seleziona un socio"
							description="Scegli dalla lista per visualizzare la tessera digitale."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
