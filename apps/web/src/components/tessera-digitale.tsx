"use client";

import { Download, Share2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";

interface TesseraDigitaleProps {
	socio: {
		id: string;
		nome: string;
		cognome: string;
		codiceTessera: string | null;
		numeroTesseraFed?: string | null;
		federazione?: string | null;
		disciplina?: string | null;
		tipologia?: string | null;
		dataIscrizione?: Date | string | null;
		stato?: string | null;
		fotoUrl?: string | null;
	};
	tenant: {
		slug: string;
		ragioneSociale: string;
	};
}

/**
 * Digital membership card (tessera) that members can show from mobile.
 * Renders the member's name, codice tessera, federazione info, a QR code
 * encoding a verification URL, and supports download as PNG.
 */
export function TesseraDigitale({ socio, tenant }: TesseraDigitaleProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

	// Construct verification URL (public page)
	const verifyUrl = (() => {
		const origin = typeof window !== "undefined" ? window.location.origin : "";
		const codice = socio.codiceTessera ?? socio.id.slice(0, 8);
		return `${origin}/verifica-tessera?t=${encodeURIComponent(tenant.slug)}&c=${encodeURIComponent(codice)}&s=${encodeURIComponent(socio.id)}`;
	})();

	useEffect(() => {
		let cancelled = false;
		QRCode.toDataURL(verifyUrl, {
			errorCorrectionLevel: "M",
			margin: 1,
			width: 320,
			color: {
				dark: "#0f172a",
				light: "#ffffff",
			},
		})
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			});
		return () => {
			cancelled = true;
		};
	}, [verifyUrl]);

	const downloadPNG = async () => {
		if (!canvasRef.current) return;
		const link = document.createElement("a");
		link.download = `tessera-${socio.cognome}-${socio.nome}.png`;
		link.href = canvasRef.current.toDataURL("image/png");
		link.click();
	};

	const shareCard = async () => {
		if (navigator.share) {
			try {
				await navigator.share({
					title: `Tessera ${tenant.ragioneSociale}`,
					text: `Tessera digitale di ${socio.nome} ${socio.cognome}`,
					url: verifyUrl,
				});
			} catch {
				// user cancelled or share failed
			}
		} else {
			await navigator.clipboard.writeText(verifyUrl);
		}
	};

	const fmtDate = (d: Date | string | null | undefined) => {
		if (!d) return "—";
		const date = typeof d === "string" ? new Date(d) : d;
		return date.toLocaleDateString("it-IT", {
			year: "numeric",
			month: "short",
			day: "2-digit",
		});
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div
				className="tessera-card"
				style={{
					position: "relative",
					borderRadius: "1rem",
					overflow: "hidden",
					padding: "1.25rem",
					background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
					color: "white",
					minHeight: "16rem",
					boxShadow: "0 10px 30px -5px hsl(var(--primary) / 0.4), 0 5px 15px -3px rgba(0,0,0,0.1)",
				}}
			>
				{/* Header row: tenant + stato */}
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
						marginBottom: "0.75rem",
					}}
				>
					<div style={{ opacity: 0.9 }}>
						<div style={{ fontSize: "0.6875rem", letterSpacing: "0.08em", opacity: 0.8 }}>
							TESSERA DIGITALE
						</div>
						<div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>{tenant.ragioneSociale}</div>
					</div>
					<span
						style={{
							background: "rgba(255,255,255,0.18)",
							backdropFilter: "blur(8px)",
							padding: "0.25rem 0.625rem",
							borderRadius: "9999px",
							fontSize: "0.6875rem",
							fontWeight: 600,
							textTransform: "uppercase",
							letterSpacing: "0.05em",
						}}
					>
						{socio.stato ?? "attivo"}
					</span>
				</div>

				{/* Main card layout: info + QR */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr auto",
						gap: "1rem",
						alignItems: "flex-end",
						marginTop: "2rem",
					}}
				>
					<div>
						<div style={{ fontSize: "0.75rem", opacity: 0.8, marginBottom: "0.125rem" }}>
							{socio.tipologia ?? "Socio"}
						</div>
						<div
							style={{
								fontSize: "1.375rem",
								fontWeight: 700,
								lineHeight: 1.1,
								marginBottom: "0.5rem",
							}}
						>
							{socio.nome} {socio.cognome}
						</div>
						<div
							style={{
								fontFamily: "ui-monospace, monospace",
								fontSize: "1rem",
								letterSpacing: "0.06em",
								fontWeight: 600,
								marginBottom: "0.75rem",
							}}
						>
							{socio.codiceTessera ?? `TMP-${socio.id.slice(0, 8).toUpperCase()}`}
						</div>
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "auto 1fr",
								gap: "0.125rem 0.75rem",
								fontSize: "0.75rem",
								opacity: 0.9,
							}}
						>
							{socio.disciplina ? (
								<>
									<span style={{ opacity: 0.7 }}>Disciplina</span>
									<span style={{ fontWeight: 500 }}>{socio.disciplina}</span>
								</>
							) : null}
							{socio.numeroTesseraFed ? (
								<>
									<span style={{ opacity: 0.7 }}>N° Fed.</span>
									<span style={{ fontWeight: 500 }}>{socio.numeroTesseraFed}</span>
								</>
							) : null}
							{socio.federazione ? (
								<>
									<span style={{ opacity: 0.7 }}>Ente</span>
									<span style={{ fontWeight: 500 }}>{socio.federazione}</span>
								</>
							) : null}
							<span style={{ opacity: 0.7 }}>Iscritto dal</span>
							<span style={{ fontWeight: 500 }}>{fmtDate(socio.dataIscrizione)}</span>
						</div>
					</div>

					{/* QR */}
					<div
						style={{
							background: "white",
							padding: "0.5rem",
							borderRadius: "0.5rem",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "0.25rem",
						}}
					>
						{qrDataUrl ? (
							<img
								src={qrDataUrl}
								alt="QR tessera"
								style={{
									width: "6rem",
									height: "6rem",
									display: "block",
								}}
							/>
						) : (
							<div
								style={{
									width: "6rem",
									height: "6rem",
									background: "#f1f5f9",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "0.625rem",
									color: "#64748b",
								}}
							>
								Generating…
							</div>
						)}
						<div
							style={{
								fontSize: "0.5625rem",
								color: "#64748b",
								letterSpacing: "0.05em",
							}}
						>
							VERIFICA QR
						</div>
					</div>
				</div>

				{/* Decorative particles */}
				<div
					aria-hidden
					style={{
						position: "absolute",
						inset: 0,
						background:
							"radial-gradient(circle at 85% 15%, rgba(255,255,255,0.25) 0%, transparent 35%), radial-gradient(circle at 15% 90%, rgba(255,255,255,0.15) 0%, transparent 30%)",
						pointerEvents: "none",
					}}
				/>
			</div>

			<div style={{ display: "flex", gap: "0.5rem" }}>
				<button
					type="button"
					className="btn btn-outline btn-sm"
					onClick={downloadPNG}
					disabled={!qrDataUrl}
				>
					<Download className="icon" /> Scarica PNG
				</button>
				<button type="button" className="btn btn-outline btn-sm" onClick={shareCard}>
					<Share2 className="icon" /> Condividi link verifica
				</button>
				<a
					href={verifyUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="btn btn-ghost btn-sm"
					style={{ marginLeft: "auto" }}
				>
					Verifica pubblica →
				</a>
			</div>

			{/* Hidden canvas used to render a PNG composite */}
			<canvas ref={canvasRef} style={{ display: "none" }} width={640} height={400} />
		</div>
	);
}
