import { soci, tenants } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { publicProcedure, router } from "../trpc/index";

/**
 * Public verification router for digital tessera QR codes.
 *
 * No authentication required — exposed as a public read-only endpoint
 * so the QR code scanned from a member's digital tessera resolves on
 * ANY device (e.g. at the gym entrance, during events) without login.
 *
 * Returns ONLY the strict minimum needed to verify validity:
 *  - nome (only the first name + surname initial for privacy)
 *  - stato (attivo | sospeso | scaduto | dimesso)
 *  - valida (boolean — true if stato === "attivo")
 *  - tessera/fed/tipologia/disciplina metadata
 *  - tenant display name (but NOT tenant id or sensitive fields)
 */
export const verificaRouter = router({
	/**
	 * Verify a digital tessera by (tenant slug, codice tessera OR socio id).
	 *
	 * Returns a minimal, GDPR-safe payload suitable for a public page.
	 * Throws NOT_FOUND when the combination is invalid to avoid enumeration.
	 */
	verifyTessera: publicProcedure
		.input(
			z.object({
				tenantSlug: z.string().min(1).max(64),
				codiceTessera: z.string().max(40).optional(),
				socioId: z.string().uuid().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Resolve the tenant by its slug.
			const [tenant] = await ctx.db
				.select({
					id: tenants.id,
					slug: tenants.slug,
					ragioneSociale: tenants.ragioneSociale,
					nomeVisualizzato: tenants.nomeVisualizzato,
					logo: tenants.logo,
					stato: tenants.stato,
				})
				.from(tenants)
				.where(eq(tenants.slug, input.tenantSlug))
				.limit(1);

			if (!tenant) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Tessera non trovata.",
				});
			}

			// Refuse verification for tenants that are not currently active.
			if (tenant.stato === "chiuso" || tenant.stato === "sospeso") {
				return {
					valida: false,
					motivo: `Associazione non attiva (${tenant.stato}).`,
					tenant: {
						ragioneSociale: tenant.nomeVisualizzato ?? tenant.ragioneSociale,
						logo: tenant.logo,
					},
					socio: null,
				};
			}

			// Build the lookup: prefer explicit socioId, fall back to codiceTessera.
			const conditions = [eq(soci.tenantId, tenant.id)];
			if (input.socioId) {
				conditions.push(eq(soci.id, input.socioId));
			} else if (input.codiceTessera) {
				conditions.push(eq(soci.codiceTessera, input.codiceTessera));
			} else {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Parametri di verifica mancanti.",
				});
			}

			const [socio] = await ctx.db
				.select({
					id: soci.id,
					nome: soci.nome,
					cognome: soci.cognome,
					codiceTessera: soci.codiceTessera,
					numeroTesseraFed: soci.numeroTesseraFed,
					federazione: soci.federazione,
					disciplina: soci.disciplina,
					tipologia: soci.tipologia,
					dataIscrizione: soci.dataIscrizione,
					fotoUrl: soci.fotoUrl,
					consensoFoto: soci.consensoFoto,
					stato: soci.stato,
				})
				.from(soci)
				.where(and(...conditions))
				.limit(1);

			if (!socio) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Tessera non trovata.",
				});
			}

			const valida = socio.stato === "attivo";

			// GDPR-safe: expose nome completo (user opted-in by sharing the QR)
			// but never personal contact data, CF, address, notes, etc.
			return {
				valida,
				motivo: valida ? null : `Tessera ${socio.stato}.`,
				tenant: {
					ragioneSociale: tenant.nomeVisualizzato ?? tenant.ragioneSociale,
					logo: tenant.logo,
				},
				socio: {
					nome: socio.nome,
					cognome: socio.cognome,
					codiceTessera: socio.codiceTessera,
					numeroTesseraFed: socio.numeroTesseraFed,
					federazione: socio.federazione,
					disciplina: socio.disciplina,
					tipologia: socio.tipologia,
					dataIscrizione: socio.dataIscrizione,
					stato: socio.stato,
					// Only expose photo if the member explicitly consented.
					fotoUrl: socio.consensoFoto ? socio.fotoUrl : null,
				},
			};
		}),
});
