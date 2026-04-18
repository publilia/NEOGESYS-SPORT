import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	tipo: z.string().optional(),
	stato: z.enum(["pianificato", "in_corso", "concluso", "annullato"]).optional(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
});

const createEventoInput = z.object({
	titolo: z.string().min(1).max(300),
	tipo: z.string().max(50),
	descrizione: z.string().optional(),
	luogo: z.string().max(300).optional(),
	dataInizio: z.string().datetime(),
	dataFine: z.string().datetime().optional(),
	maxPartecipanti: z.number().int().min(1).optional(),
	costo: z.number().min(0).optional(),
	stato: z.enum(["pianificato", "in_corso", "concluso", "annullato"]).default("pianificato"),
	note: z.string().optional(),
});

const updateEventoInput = z.object({
	id: z.string().uuid(),
	titolo: z.string().min(1).max(300).optional(),
	tipo: z.string().max(50).optional(),
	descrizione: z.string().optional(),
	luogo: z.string().max(300).optional(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
	maxPartecipanti: z.number().int().min(1).optional(),
	costo: z.number().min(0).optional(),
	stato: z.enum(["pianificato", "in_corso", "concluso", "annullato"]).optional(),
	note: z.string().optional(),
});

const iscriviEventoInput = z.object({
	eventoId: z.string().uuid(),
	socioId: z.string().uuid(),
	note: z.string().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const eventiRouter = router({
	/**
	 * List eventi with pagination and filters.
	 */
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const offset = (input.page - 1) * input.perPage;

		const result = await ctx.db.execute(sql`
      SELECT e.*, count(*) OVER() AS total_count,
        (SELECT count(*) FROM iscrizioni_evento ie WHERE ie.evento_id = e.id) AS iscritti_count
      FROM eventi e
      WHERE e.tenant_id = ${tenantId}
        ${input.tipo ? sql`AND e.tipo = ${input.tipo}` : sql``}
        ${input.stato ? sql`AND e.stato = ${input.stato}` : sql``}
        ${input.dataInizio ? sql`AND e.data_inizio >= ${input.dataInizio}` : sql``}
        ${input.dataFine ? sql`AND e.data_inizio <= ${input.dataFine}` : sql``}
      ORDER BY e.data_inizio DESC
      LIMIT ${input.perPage} OFFSET ${offset}
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		const total = rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0;

		return {
			items: rows.map(({ total_count, ...r }) => r),
			total,
			page: input.page,
			perPage: input.perPage,
			totalPages: Math.ceil(total / input.perPage),
		};
	}),

	/**
	 * Get a single evento by ID.
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const result = await ctx.db.execute(sql`
        SELECT e.*,
          (SELECT count(*) FROM iscrizioni_evento ie WHERE ie.evento_id = e.id) AS iscritti_count
        FROM eventi e
        WHERE e.id = ${input.id} AND e.tenant_id = ${tenantId}
        LIMIT 1
      `);

			const rows = result as unknown as Array<Record<string, unknown>>;
			if (rows.length === 0) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });
			}

			return rows[0];
		}),

	/**
	 * Create a new evento.
	 */
	create: protectedProcedure.input(createEventoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const result = await ctx.db.execute(sql`
      INSERT INTO eventi (tenant_id, titolo, tipo, descrizione, luogo,
        data_inizio, data_fine, max_partecipanti, costo, stato, note)
      VALUES (
        ${tenantId}, ${input.titolo}, ${input.tipo}, ${input.descrizione ?? null},
        ${input.luogo ?? null}, ${input.dataInizio}, ${input.dataFine ?? null},
        ${input.maxPartecipanti ?? null}, ${input.costo ?? null},
        ${input.stato}, ${input.note ?? null}
      )
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		return rows[0];
	}),

	/**
	 * Update an existing evento.
	 */
	update: protectedProcedure.input(updateEventoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;

		const setClauses: Array<ReturnType<typeof sql>> = [];
		if (data.titolo !== undefined) setClauses.push(sql`titolo = ${data.titolo}`);
		if (data.tipo !== undefined) setClauses.push(sql`tipo = ${data.tipo}`);
		if (data.descrizione !== undefined) setClauses.push(sql`descrizione = ${data.descrizione}`);
		if (data.luogo !== undefined) setClauses.push(sql`luogo = ${data.luogo}`);
		if (data.dataInizio !== undefined) setClauses.push(sql`data_inizio = ${data.dataInizio}`);
		if (data.dataFine !== undefined) setClauses.push(sql`data_fine = ${data.dataFine}`);
		if (data.maxPartecipanti !== undefined)
			setClauses.push(sql`max_partecipanti = ${data.maxPartecipanti}`);
		if (data.costo !== undefined) setClauses.push(sql`costo = ${data.costo}`);
		if (data.stato !== undefined) setClauses.push(sql`stato = ${data.stato}`);
		if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
		setClauses.push(sql`updated_at = NOW()`);

		if (setClauses.length === 1) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
		}

		const setClause = sql.join(setClauses, sql`, `);
		const result = await ctx.db.execute(sql`
      UPDATE eventi SET ${setClause}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		if (rows.length === 0) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });
		}

		return rows[0];
	}),

	/**
	 * Enroll a socio in an evento.
	 */
	iscrivi: protectedProcedure.input(iscriviEventoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		// TODO: Check max_partecipanti capacity

		const result = await ctx.db.execute(sql`
      INSERT INTO iscrizioni_evento (tenant_id, evento_id, socio_id, note)
      VALUES (${tenantId}, ${input.eventoId}, ${input.socioId}, ${input.note ?? null})
      ON CONFLICT DO NOTHING
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		if (rows.length === 0) {
			throw new TRPCError({ code: "CONFLICT", message: "Socio gia' iscritto a questo evento." });
		}

		return rows[0];
	}),

	/**
	 * Unenroll a socio from an evento.
	 */
	disiscrivi: protectedProcedure
		.input(z.object({ eventoId: z.string().uuid(), socioId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const result = await ctx.db.execute(sql`
        DELETE FROM iscrizioni_evento
        WHERE evento_id = ${input.eventoId}
          AND socio_id = ${input.socioId}
          AND tenant_id = ${tenantId}
        RETURNING id
      `);

			const rows = result as unknown as Array<Record<string, unknown>>;
			if (rows.length === 0) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Iscrizione non trovata." });
			}

			return { success: true };
		}),
});
