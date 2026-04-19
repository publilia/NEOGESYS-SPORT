import { soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	stato: z.enum(["attivo", "sospeso", "dimesso", "scaduto"]).optional(),
	disciplina: z.string().optional(),
	tipologia: z.enum(["socio", "atleta", "istruttore", "dirigente", "volontario"]).optional(),
	search: z.string().optional(),
	sortBy: z.enum(["cognome", "nome", "dataIscrizione", "createdAt"]).default("cognome"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const createSocioInput = z.object({
	nome: z.string().min(1).max(100),
	cognome: z.string().min(1).max(100),
	codiceFiscale: z
		.string()
		.max(16)
		.regex(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i, "Codice fiscale non valido")
		.optional(),
	codiceTessera: z.string().max(20).optional(),
	dataNascita: z.string().datetime().optional(),
	luogoNascita: z.string().max(200).optional(),
	sesso: z.enum(["M", "F"]).optional(),
	email: z.string().email().optional(),
	telefono: z.string().max(30).optional(),
	indirizzo: z
		.object({
			via: z.string(),
			cap: z.string(),
			citta: z.string(),
			provincia: z.string(),
		})
		.optional(),
	tutoreDati: z
		.object({
			nome: z.string(),
			cognome: z.string(),
			codiceFiscale: z.string().optional(),
			telefono: z.string().optional(),
			email: z.string().email().optional(),
			relazione: z.string().optional(),
		})
		.optional(),
	fotoUrl: z.string().url().optional(),
	tipologia: z.enum(["socio", "atleta", "istruttore", "dirigente", "volontario"]),
	disciplina: z.string().max(100).optional(),
	numeroTesseraFed: z.string().max(50).optional(),
	federazione: z.string().max(100).optional(),
	consensoGdpr: z.boolean().default(false),
	consensoFoto: z.boolean().default(false),
	consensoMarketing: z.boolean().default(false),
	dataIscrizione: z.string().datetime().optional(),
	note: z.string().optional(),
});

const updateSocioInput = z.object({
	id: z.string().uuid(),
	nome: z.string().min(1).max(100).optional(),
	cognome: z.string().min(1).max(100).optional(),
	codiceFiscale: z
		.string()
		.max(16)
		.regex(/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i, "Codice fiscale non valido")
		.optional(),
	codiceTessera: z.string().max(20).optional(),
	dataNascita: z.string().datetime().optional(),
	luogoNascita: z.string().max(200).optional(),
	sesso: z.enum(["M", "F"]).optional(),
	email: z.string().email().optional(),
	telefono: z.string().max(30).optional(),
	indirizzo: z
		.object({
			via: z.string(),
			cap: z.string(),
			citta: z.string(),
			provincia: z.string(),
		})
		.optional(),
	tutoreDati: z
		.object({
			nome: z.string(),
			cognome: z.string(),
			codiceFiscale: z.string().optional(),
			telefono: z.string().optional(),
			email: z.string().email().optional(),
			relazione: z.string().optional(),
		})
		.optional(),
	fotoUrl: z.string().url().optional(),
	tipologia: z.enum(["socio", "atleta", "istruttore", "dirigente", "volontario"]).optional(),
	disciplina: z.string().max(100).optional(),
	numeroTesseraFed: z.string().max(50).optional(),
	federazione: z.string().max(100).optional(),
	stato: z.enum(["attivo", "sospeso", "dimesso", "scaduto"]).optional(),
	consensoGdpr: z.boolean().optional(),
	consensoFoto: z.boolean().optional(),
	consensoMarketing: z.boolean().optional(),
	note: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Contesto tenant mancante.",
		});
	}
	return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const sociRouter = router({
	/**
	 * List soci with pagination, filtering, and sorting.
	 */
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage, stato, disciplina, tipologia, search, sortBy, sortOrder } = input;
		const offset = (page - 1) * perPage;

		const conditions = [eq(soci.tenantId, tenantId)];

		if (stato) {
			conditions.push(eq(soci.stato, stato));
		}
		if (disciplina) {
			conditions.push(eq(soci.disciplina, disciplina));
		}
		if (tipologia) {
			conditions.push(eq(soci.tipologia, tipologia));
		}
		if (search) {
			conditions.push(
				or(
					ilike(soci.nome, `%${search}%`),
					ilike(soci.cognome, `%${search}%`),
					ilike(soci.codiceFiscale, `%${search}%`),
					ilike(soci.email, `%${search}%`),
				)!,
			);
		}

		const where = and(...conditions);

		const sortColumn = {
			cognome: soci.cognome,
			nome: soci.nome,
			dataIscrizione: soci.dataIscrizione,
			createdAt: soci.createdAt,
		}[sortBy];

		const orderDir = sortOrder === "desc" ? desc(sortColumn) : sortColumn;

		const [items, totalResult] = await Promise.all([
			ctx.db.select().from(soci).where(where).limit(perPage).offset(offset).orderBy(orderDir),
			ctx.db.select({ count: count() }).from(soci).where(where),
		]);

		return {
			items,
			total: totalResult[0]?.count ?? 0,
			page,
			perPage,
			totalPages: Math.ceil((totalResult[0]?.count ?? 0) / perPage),
		};
	}),

	/**
	 * Get a single socio by ID with related data.
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [socio] = await ctx.db
				.select()
				.from(soci)
				.where(and(eq(soci.id, input.id), eq(soci.tenantId, tenantId)))
				.limit(1);

			if (!socio) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
			}

			// TODO: Load related data (certificati, iscrizioni, quote) via joins or separate queries
			return socio;
		}),

	/**
	 * Create a new socio.
	 */
	create: protectedProcedure.input(createSocioInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		// Validate codice fiscale uniqueness within tenant
		if (input.codiceFiscale) {
			const [existing] = await ctx.db
				.select({ id: soci.id })
				.from(soci)
				.where(
					and(
						eq(soci.tenantId, tenantId),
						eq(soci.codiceFiscale, input.codiceFiscale.toUpperCase()),
					),
				)
				.limit(1);

			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "Esiste gia' un socio con questo codice fiscale.",
				});
			}
		}

		const [socio] = await ctx.db
			.insert(soci)
			.values({
				tenantId,
				nome: input.nome,
				cognome: input.cognome,
				codiceFiscale: input.codiceFiscale?.toUpperCase(),
				codiceTessera: input.codiceTessera,
				dataNascita: input.dataNascita ? new Date(input.dataNascita) : null,
				luogoNascita: input.luogoNascita,
				sesso: input.sesso,
				email: input.email,
				telefono: input.telefono,
				indirizzo: input.indirizzo,
				tutoreDati: input.tutoreDati,
				fotoUrl: input.fotoUrl,
				tipologia: input.tipologia,
				disciplina: input.disciplina,
				numeroTesseraFed: input.numeroTesseraFed,
				federazione: input.federazione,
				stato: "attivo",
				consensoGdpr: input.consensoGdpr,
				consensoFoto: input.consensoFoto,
				consensoMarketing: input.consensoMarketing,
				dataIscrizione: input.dataIscrizione ? new Date(input.dataIscrizione) : new Date(),
				note: input.note,
			})
			.returning();

		return socio;
	}),

	/**
	 * Update a socio.
	 */
	update: protectedProcedure.input(updateSocioInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, dataNascita, ...data } = input;

		const updateData: Record<string, unknown> = {
			...data,
			updatedAt: new Date(),
		};
		if (dataNascita !== undefined) {
			updateData.dataNascita = new Date(dataNascita);
		}
		if (data.codiceFiscale) {
			updateData.codiceFiscale = data.codiceFiscale.toUpperCase();
		}

		const [socio] = await ctx.db
			.update(soci)
			.set(updateData)
			.where(and(eq(soci.id, id), eq(soci.tenantId, tenantId)))
			.returning();

		if (!socio) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
		}

		return socio;
	}),

	/**
	 * Soft-delete a socio by setting stato to 'dimesso'.
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [socio] = await ctx.db
				.update(soci)
				.set({ stato: "dimesso", updatedAt: new Date() })
				.where(and(eq(soci.id, input.id), eq(soci.tenantId, tenantId)))
				.returning();

			if (!socio) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
			}

			return { success: true, id: socio.id };
		}),

	/**
	 * Full-text search across nome, cognome, codice_fiscale, email.
	 */
	search: protectedProcedure
		.input(
			z.object({
				query: z.string().min(2).max(100),
				limit: z.number().int().min(1).max(50).default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const results = await ctx.db
				.select({
					id: soci.id,
					nome: soci.nome,
					cognome: soci.cognome,
					codiceFiscale: soci.codiceFiscale,
					email: soci.email,
					tipologia: soci.tipologia,
					stato: soci.stato,
				})
				.from(soci)
				.where(
					and(
						eq(soci.tenantId, tenantId),
						or(
							ilike(soci.nome, `%${input.query}%`),
							ilike(soci.cognome, `%${input.query}%`),
							ilike(soci.codiceFiscale, `%${input.query}%`),
							ilike(soci.email, `%${input.query}%`),
						),
					),
				)
				.limit(input.limit)
				.orderBy(soci.cognome, soci.nome);

			return results;
		}),

	/**
	 * Export soci as CSV data.
	 */
	exportCsv: protectedProcedure
		.input(
			z.object({
				stato: z.enum(["attivo", "sospeso", "dimesso", "scaduto"]).optional(),
				disciplina: z.string().optional(),
				tipologia: z.enum(["socio", "atleta", "istruttore", "dirigente", "volontario"]).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const conditions = [eq(soci.tenantId, tenantId)];
			if (input.stato) conditions.push(eq(soci.stato, input.stato));
			if (input.disciplina) conditions.push(eq(soci.disciplina, input.disciplina));
			if (input.tipologia) conditions.push(eq(soci.tipologia, input.tipologia));

			const rows = await ctx.db
				.select()
				.from(soci)
				.where(and(...conditions))
				.orderBy(soci.cognome, soci.nome);

			// Build CSV
			const headers = [
				"Cognome",
				"Nome",
				"Codice Fiscale",
				"Email",
				"Telefono",
				"Tipologia",
				"Disciplina",
				"Stato",
				"Data Iscrizione",
			];

			const csvRows = rows.map((r) =>
				[
					r.cognome,
					r.nome,
					r.codiceFiscale ?? "",
					r.email ?? "",
					r.telefono ?? "",
					r.tipologia,
					r.disciplina ?? "",
					r.stato,
					r.dataIscrizione?.toISOString().split("T")[0] ?? "",
				]
					.map((v) => `"${v.replace(/"/g, '""')}"`)
					.join(","),
			);

			const csv = [headers.join(","), ...csvRows].join("\n");

			return { csv, filename: `soci_export_${new Date().toISOString().split("T")[0]}.csv` };
		}),

	/**
	 * Aggregate statistics by stato, tipologia, disciplina.
	 */
	stats: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const [byStato, byTipologia, byDisciplina] = await Promise.all([
			ctx.db
				.select({
					stato: soci.stato,
					count: count(),
				})
				.from(soci)
				.where(eq(soci.tenantId, tenantId))
				.groupBy(soci.stato),

			ctx.db
				.select({
					tipologia: soci.tipologia,
					count: count(),
				})
				.from(soci)
				.where(eq(soci.tenantId, tenantId))
				.groupBy(soci.tipologia),

			ctx.db
				.select({
					disciplina: soci.disciplina,
					count: count(),
				})
				.from(soci)
				.where(eq(soci.tenantId, tenantId))
				.groupBy(soci.disciplina),
		]);

		return { byStato, byTipologia, byDisciplina };
	}),
});
