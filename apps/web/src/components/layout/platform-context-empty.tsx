"use client";

import { ArrowUpRight, Building2, Shield } from "lucide-react";
import Link from "next/link";

/**
 * Placeholder renderizzato quando un super_admin è nel contesto
 * "NEOGESYS Platform" (cioè NON sta impersonando nessun tenant)
 * ma sta provando ad aprire una pagina tenant-scoped (soci, corsi,
 * quote, calendario, ecc.).
 *
 * Storia del bug:
 *   - Le pagine tenant-scoped chiamano trpc.<risorsa>.list senza
 *     un `enabled:` guard.
 *   - Il client tRPC non invia l'header `x-dev-tenant-slug` se il
 *     contesto è "NEOGESYS Platform" (vedi apps/web/src/lib/trpc.ts).
 *   - L'API risponde 401 → React Query lo trasforma in "Failed to fetch"
 *     nei card error di ogni pagina.
 *
 * Soluzione: il layout dashboard intercetta il caso "Platform context
 * + rotta tenant-scoped" e rende questo componente PRIMA che le
 * pagine figlie abbiano modo di invocare i loro hook. Nessuna query
 * parte → nessun errore.
 *
 * L'utente capisce cosa deve fare: selezionare un tenant dal menu
 * tenant in header, oppure andare alla gestione Platform (Tenants,
 * Billing, System Health, Audit).
 */
export function PlatformContextEmpty({ pathname }: { pathname: string }) {
	const sectionLabel = pathname.replace(/^\//, "").split("/")[0] || "questa sezione";
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "60vh",
				padding: "2rem",
				textAlign: "center",
				gap: "1.5rem",
			}}
		>
			<div
				style={{
					width: "4.5rem",
					height: "4.5rem",
					borderRadius: "9999px",
					background:
						"radial-gradient(circle at 30% 30%, hsl(272 82% 65%), hsl(328 86% 55%) 60%, hsl(260 60% 25%))",
					display: "grid",
					placeItems: "center",
					color: "white",
					boxShadow: "0 0 32px 4px hsl(328 86% 60% / 0.35)",
				}}
			>
				<Shield style={{ width: "1.75rem", height: "1.75rem" }} />
			</div>

			<div style={{ maxWidth: "28rem" }}>
				<h1
					style={{
						fontSize: "1.375rem",
						fontWeight: 700,
						margin: 0,
						marginBottom: "0.5rem",
					}}
				>
					Contesto Piattaforma
				</h1>
				<p
					style={{
						color: "hsl(var(--muted-foreground))",
						fontSize: "0.9375rem",
						lineHeight: 1.5,
						margin: 0,
					}}
				>
					Stai navigando come <strong>Super Admin</strong> sulla piattaforma NEOGESYS. La sezione{" "}
					<strong>{sectionLabel}</strong> contiene dati specifici di un tenant — per vederli,
					seleziona un tenant dal menu tenant in alto a sinistra (impersonation), oppure usa le
					sezioni Piattaforma qui sotto.
				</p>
			</div>

			<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
				<Link
					href="/tenants"
					className="btn btn-primary"
					style={{ textDecoration: "none", gap: "0.375rem" }}
				>
					<Building2 className="icon-sm" /> Vai ai Tenant
				</Link>
				<Link
					href="/billing"
					className="btn btn-ghost"
					style={{ textDecoration: "none", gap: "0.375rem" }}
				>
					<ArrowUpRight className="icon-sm" /> Gestione piani & billing
				</Link>
			</div>

			<div
				style={{
					marginTop: "0.5rem",
					fontSize: "0.75rem",
					color: "hsl(var(--muted-foreground) / 0.8)",
					fontFamily: "ui-monospace, monospace",
				}}
			>
				ROUTE: {pathname} · TENANT: NEOGESYS Platform
			</div>
		</div>
	);
}
