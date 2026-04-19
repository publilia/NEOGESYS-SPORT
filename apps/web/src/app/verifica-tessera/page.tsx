"use client";

import { trpc } from "@/lib/trpc";
import { BadgeCheck, Ban, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * Public verification page for digital tessere.
 * Accessible without authentication — invoked by the QR code embedded
 * in TesseraDigitale. Shows a compact validity badge suitable for
 * presenting at gates, events, or during federation checks.
 *
 * Route: /verifica-tessera?t=<tenantSlug>&c=<codiceTessera>&s=<socioId>
 */
export default function VerificaTesseraPage() {
	return (
		<Suspense
			fallback={
				<div
					style={{
						minHeight: "100vh",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Loader2 className="animate-spin" />
				</div>
			}
		>
			<VerificaContent />
		</Suspense>
	);
}

function fmtDate(d: Date | string | null | undefined): string {
	if (!d) return "—";
	const date = typeof d === "string" ? new Date(d) : d;
	return date.toLocaleDateString("it-IT", {
		year: "numeric",
		month: "long",
		day: "2-digit",
	});
}

function VerificaContent() {
	const params = useSearchParams();
	const tenantSlug = params.get("t") ?? "";
	const codiceTessera = params.get("c") ?? undefined;
	const socioId = params.get("s") ?? undefined;

	const verifyQuery = trpc.verifica.verifyTessera.useQuery(
		{
			tenantSlug,
			codiceTessera,
			socioId,
		},
		{
			enabled: !!tenantSlug && (!!codiceTessera || !!socioId),
			retry: false,
		},
	);

	const data = verifyQuery.data;
	const errored = verifyQuery.isError;
	const loading = verifyQuery.isLoading;

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
				color: "white",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "1rem",
				fontFamily:
					'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
			}}
		>
			<div
				style={{
					width: "100%",
					maxWidth: "28rem",
					background: "rgba(255,255,255,0.08)",
					backdropFilter: "blur(16px)",
					border: "1px solid rgba(255,255,255,0.12)",
					borderRadius: "1rem",
					padding: "2rem 1.5rem",
					boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
				}}
			>
				<div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
					<div
						style={{
							fontSize: "0.6875rem",
							letterSpacing: "0.12em",
							opacity: 0.7,
							textTransform: "uppercase",
						}}
					>
						Verifica tessera digitale
					</div>
					{data?.tenant ? (
						<div
							style={{
								marginTop: "0.25rem",
								fontSize: "1.125rem",
								fontWeight: 700,
							}}
						>
							{data.tenant.ragioneSociale}
						</div>
					) : null}
				</div>

				{loading && (
					<div style={{ textAlign: "center", padding: "2rem" }}>
						<Loader2
							className="animate-spin"
							style={{ width: "2rem", height: "2rem", margin: "0 auto", opacity: 0.8 }}
						/>
						<div style={{ marginTop: "0.75rem", opacity: 0.8 }}>Verifica in corso…</div>
					</div>
				)}

				{errored && (
					<div style={{ textAlign: "center", padding: "1rem" }}>
						<Ban
							style={{
								width: "3rem",
								height: "3rem",
								margin: "0 auto",
								color: "#f87171",
							}}
						/>
						<div
							style={{
								fontSize: "1.25rem",
								fontWeight: 700,
								marginTop: "0.75rem",
							}}
						>
							Tessera non trovata
						</div>
						<div style={{ marginTop: "0.5rem", opacity: 0.7, fontSize: "0.875rem" }}>
							Il codice non corrisponde a nessuna tessera registrata, oppure il link è scaduto.
						</div>
					</div>
				)}

				{!loading && !errored && data && (
					<>
						{/* Stato badge */}
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "0.5rem",
								padding: "1rem",
								background: data.valida ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
								border: `1px solid ${data.valida ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
								borderRadius: "0.75rem",
								marginBottom: "1.25rem",
							}}
						>
							{data.valida ? (
								<ShieldCheck
									style={{
										width: "3.5rem",
										height: "3.5rem",
										color: "#4ade80",
									}}
								/>
							) : (
								<ShieldAlert
									style={{
										width: "3.5rem",
										height: "3.5rem",
										color: "#f87171",
									}}
								/>
							)}
							<div
								style={{
									fontSize: "1.25rem",
									fontWeight: 700,
									letterSpacing: "0.02em",
								}}
							>
								{data.valida ? "TESSERA VALIDA" : "TESSERA NON VALIDA"}
							</div>
							{data.motivo ? (
								<div style={{ fontSize: "0.8125rem", opacity: 0.85, textAlign: "center" }}>
									{data.motivo}
								</div>
							) : null}
						</div>

						{/* Socio info */}
						{data.socio ? (
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: "0.75rem",
								}}
							>
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										padding: "0.75rem",
										background: "rgba(255,255,255,0.05)",
										borderRadius: "0.5rem",
									}}
								>
									{data.socio.fotoUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={data.socio.fotoUrl}
											alt=""
											style={{
												width: "3rem",
												height: "3rem",
												borderRadius: "50%",
												objectFit: "cover",
												border: "2px solid rgba(255,255,255,0.2)",
											}}
										/>
									) : (
										<div
											style={{
												width: "3rem",
												height: "3rem",
												borderRadius: "50%",
												background: "rgba(255,255,255,0.12)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												fontSize: "1rem",
												fontWeight: 700,
											}}
										>
											{data.socio.nome[0]?.toUpperCase()}
											{data.socio.cognome[0]?.toUpperCase()}
										</div>
									)}
									<div>
										<div style={{ fontSize: "1.0625rem", fontWeight: 700 }}>
											{data.socio.nome} {data.socio.cognome}
										</div>
										<div style={{ fontSize: "0.75rem", opacity: 0.7, textTransform: "uppercase" }}>
											{data.socio.tipologia}
										</div>
									</div>
									{data.valida ? (
										<BadgeCheck
											style={{
												marginLeft: "auto",
												width: "1.5rem",
												height: "1.5rem",
												color: "#4ade80",
											}}
										/>
									) : null}
								</div>

								<dl
									style={{
										display: "grid",
										gridTemplateColumns: "auto 1fr",
										gap: "0.375rem 1rem",
										fontSize: "0.8125rem",
										margin: 0,
										padding: "0.75rem",
										background: "rgba(0,0,0,0.18)",
										borderRadius: "0.5rem",
									}}
								>
									{data.socio.codiceTessera ? (
										<>
											<dt style={{ opacity: 0.7 }}>Tessera</dt>
											<dd
												style={{
													fontFamily: "ui-monospace, monospace",
													fontWeight: 600,
													margin: 0,
												}}
											>
												{data.socio.codiceTessera}
											</dd>
										</>
									) : null}
									{data.socio.numeroTesseraFed ? (
										<>
											<dt style={{ opacity: 0.7 }}>N° Federazione</dt>
											<dd
												style={{
													fontFamily: "ui-monospace, monospace",
													margin: 0,
												}}
											>
												{data.socio.numeroTesseraFed}
											</dd>
										</>
									) : null}
									{data.socio.federazione ? (
										<>
											<dt style={{ opacity: 0.7 }}>Ente</dt>
											<dd style={{ margin: 0 }}>{data.socio.federazione}</dd>
										</>
									) : null}
									{data.socio.disciplina ? (
										<>
											<dt style={{ opacity: 0.7 }}>Disciplina</dt>
											<dd style={{ margin: 0 }}>{data.socio.disciplina}</dd>
										</>
									) : null}
									<dt style={{ opacity: 0.7 }}>Iscritto dal</dt>
									<dd style={{ margin: 0 }}>{fmtDate(data.socio.dataIscrizione)}</dd>
									<dt style={{ opacity: 0.7 }}>Stato</dt>
									<dd
										style={{
											margin: 0,
											textTransform: "uppercase",
											fontWeight: 600,
											color: data.valida ? "#4ade80" : "#f87171",
										}}
									>
										{data.socio.stato}
									</dd>
								</dl>
							</div>
						) : null}
					</>
				)}

				<div
					style={{
						marginTop: "1.5rem",
						textAlign: "center",
						fontSize: "0.6875rem",
						opacity: 0.5,
						letterSpacing: "0.04em",
					}}
				>
					NEOGESYS Sport · Verifica tessera pubblica
				</div>
			</div>
		</div>
	);
}
