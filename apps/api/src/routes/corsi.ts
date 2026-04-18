import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// NOTE: The corsi, iscrizioniCorso, presenze, lezioni tables are referenced in the DB schema
// relations but may not have their Drizzle table definitions created yet.
// The queries below use raw SQL as a fallback where needed.

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	disciplina: z.string().optional(),
	stato: z.enum(["attivo", "concluso", "pianificato"]).optional(),
});

const createCorsoInput = z.object({
	nome: z.string().min(1).max(200),
	disciplina: z.string().max(100),
	descrizione: z.string().optional(),
	istruttoreId: z.string().uuid().optional(),
	maxPartecipanti: z.number().int().min(1).optional(),
	dataInizio: z.string().datetime(),
	dataFine: z.string().datetime().optional(),
	orario: z
		.object({
			giorno: z.string(),
			oraInizio: z.string(),
			oraFine: z.string(),
		})
		.array()
		.optional(),
	stato: z.enum(["attivo", "concluso", "pianificato"]).default("pianificato"),
	costo: z.number().min(0).optional(),
	note: z.string().optional(),
});

const updateCorsoInput = z.object({
	id: z.string().uuid(),
	nome: z.string().min(1).max(200).optional(),
	disciplina: z.string().max(100).optional(),
	descrizione: z.string().optional(),
	istruttoreId: z.string().uuid().optional(),
	maxPartecipanti: z.number().int().min(1).optional(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
	orario: z
		.object({
			giorno: z.string(),
			oraInizio: z.string(),
			oraFine: z.string(),
		})
		.array()
		.optional(),
	stato: z.enum(["attivo", "concluso", "pianificato"]).optional(),
	costo: z.number().min(0).optional(),
	note: z.string().optional(),
});

const iscriviInput = z.object({
	corsoId: z.string().uuid(),
	socioId: z.string().uuid(),
	dataIscrizione: z.string().datetime().optional(),
	note: z.string().optional(),
});

const registraPresenzaInput = z.object({
	corsoId: z.string().uuid(),
	socioId: z.string().uuid(),
	data: z.string().datetime(),
	presente: z.boolean(),
	note: z.string().optional(),
});

const getPresenzeInput = z.object({
	corsoId: z.string().uuid(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
});

const calendarioInput = z.object({
	start: z.string().datetime(),
	end: z.string().datetime(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const corsiRouter = router({
	/**
	 * List corsi with pagination and filters.
	 */
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		// TODO: Replace with Drizzle query once corsi table definition is available
		const result = await ctx.db.execute(sql`
      SELECT c.*, count(*) OVER() AS total_count
      FROM corsi c
      WHERE c.tenant_id = ${tenantId}
        ${input.disciplina ? sql`AND c.disciplina = ${input.disciplina}` : sql``}
        ${input.stato ? sql`AND c.stato = ${input.stato}` : sql``}
      ORDER BY c.data_inizio DESC
      LIMIT ${perPage} OFFSET ${offset}
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		const total = rows.length > 0 ? Number(rows[0]?.total_count ?? 0) : 0;

		return {
			items: rows.map(({ total_count, ...r }) => r),
			total,
			page,
			perPage,
			totalPages: Math.ceil(total / perPage),
		};
	}),

	/**
	 * Get a single corso by ID.
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const result = await ctx.db.execute(sql`
        SELECT c.*,
          (SELECT count(*) FROM iscrizioni_corso ic WHERE ic.corso_id = c.id) AS iscritti_count
        FROM corsi c
        WHERE c.id = ${input.id} AND c.tenant_id = ${tenantId}
        LIMIT 1
      `);

			const rows = result as unknown as Array<Record<string, unknown>>;
			if (rows.length === 0) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
			}

			return rows[0];
		}),

	/**
	 * Create a new corso.
	 */
	create: protectedProcedure.input(createCorsoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const result = await ctx.db.execute(sql`
      INSERT INTO corsi (tenant_id, nome, disciplina, descrizione, istruttore_id,
        max_partecipanti, data_inizio, data_fine, orario, stato, costo, note)
      VALUES (
        ${tenantId}, ${input.nome}, ${input.disciplina}, ${input.descrizione ?? null},
        ${input.istruttoreId ?? null}, ${input.maxPartecipanti ?? null},
        ${input.dataInizio}, ${input.dataFine ?? null},
        ${input.orario ? JSON.stringify(input.orario) : null}::jsonb,
        ${input.stato}, ${input.costo ?? null}, ${input.note ?? null}
      )
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		return rows[0];
	}),

	/**
	 * Update an existing corso.
	 */
	update: protectedProcedure.input(updateCorsoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;

		// Build SET clause dynamically
		const setClauses: Array<ReturnType<typeof sql>> = [];
		if (data.nome !== undefined) setClauses.push(sql`nome = ${data.nome}`);
		if (data.disciplina !== undefined) setClauses.push(sql`disciplina = ${data.disciplina}`);
		if (data.descrizione !== undefined) setClauses.push(sql`descrizione = ${data.descrizione}`);
		if (data.istruttoreId !== undefined) setClauses.push(sql`istruttore_id = ${data.istruttoreId}`);
		if (data.maxPartecipanti !== undefined)
			setClauses.push(sql`max_partecipanti = ${data.maxPartecipanti}`);
		if (data.dataInizio !== undefined) setClauses.push(sql`data_inizio = ${data.dataInizio}`);
		if (data.dataFine !== undefined) setClauses.push(sql`data_fine = ${data.dataFine}`);
		if (data.orario !== undefined)
			setClauses.push(sql`orario = ${JSON.stringify(data.orario)}::jsonb`);
		if (data.stato !== undefined) setClauses.push(sql`stato = ${data.stato}`);
		if (data.costo !== undefined) setClauses.push(sql`costo = ${data.costo}`);
		if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
		setClauses.push(sql`updated_at = NOW()`);

		if (setClauses.length === 1) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
		}

		const setClause = sql.join(setClauses, sql`, `);
		const result = await ctx.db.execute(sql`
      UPDATE corsi SET ${setClause}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		if (rows.length === 0) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
		}

		return rows[0];
	}),

	/**
	 * Enroll a socio in a corso.
	 */
	iscrivi: protectedProcedure.input(iscriviInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		// Verify corso and socio belong to this tenant
		const checkResult = await ctx.db.execute(sql`
      SELECT
        (SELECT count(*) FROM corsi WHERE id = ${input.corsoId} AND tenant_id = ${tenantId}) AS corso_exists,
        (SELECT count(*) FROM soci WHERE id = ${input.socioId} AND tenant_id = ${tenantId}) AS socio_exists,
        (SELECT count(*) FROM iscrizioni_corso WHERE corso_id = ${input.corsoId} AND socio_id = ${input.socioId}) AS already_enrolled
    `);

		const check = (checkResult as unknown as Array<Record<string, unknown>>)[0];
		if (Number(check?.corso_exists) === 0) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
		}
		if (Number(check?.socio_exists) === 0) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
		}
		if (Number(check?.already_enrolled) > 0) {
			throw new TRPCError({ code: "CONFLICT", message: "Socio gia' iscritto a questo corso." });
		}

		// TODO: Check max_partecipanti capacity

		const result = await ctx.db.execute(sql`
      INSERT INTO iscrizioni_corso (tenant_id, corso_id, socio_id, data_iscrizione, note)
      VALUES (${tenantId}, ${input.corsoId}, ${input.socioId},
        ${input.dataIscrizione ?? new Date().toISOString()}, ${input.note ?? null})
      RETURNING *
    `);

		const rows = result as unknown as Array<Record<string, unknown>>;
		return rows[0];
	}),

	/**
	 * Unenroll a socio from a corso.
	 */
	disiscrivi: protectedProcedure
		.input(z.object({ corsoId: z.string().uuid(), socioId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const result = await ctx.db.execute(sql`
        DELETE FROM iscrizioni_corso
        WHERE corso_id = ${input.corsoId}
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

	/**
	 * Register attendance for a lesson.
	 */
	registraPresenza: protectedProcedure
		.input(registraPresenzaInput)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const result = await ctx.db.execute(sql`
        INSERT INTO presenze (tenant_id, corso_id, socio_id, data, presente, note)
        VALUES (${tenantId}, ${input.corsoId}, ${input.socioId},
          ${input.data}, ${input.presente}, ${input.note ?? null})
        ON CONFLICT (corso_id, socio_id, data) DO UPDATE
        SET presente = ${input.presente}, note = ${input.note ?? null}, updated_at = NOW()
        RETURNING *
      `);

			const rows = result as unknown as Array<Record<string, unknown>>;
			return rows[0];
		}),

	/**
	 * Get attendance report for a corso.
	 */
	getPresenze: protectedProcedure.input(getPresenzeInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const result = await ctx.db.execute(sql`
      SELECT p.*, s.nome AS socio_nome, s.cognome AS socio_cognome
      FROM presenze p
      JOIN soci s ON s.id = p.socio_id
      WHERE p.corso_id = ${input.corsoId} AND p.tenant_id = ${tenantId}
        ${input.dataInizio ? sql`AND p.data >= ${input.dataInizio}` : sql``}
        ${input.dataFine ? sql`AND p.data <= ${input.dataFine}` : sql``}
      ORDER BY p.data DESC, s.cognome ASC
    `);

		return result as unknown as Array<Record<string, unknown>>;
	}),

	/**
	 * Get calendar data for FullCalendar integration.
	 * Returns events in the start-end range.
	 */
	getCalendario: protectedProcedure.input(calendarioInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		// TODO: Expand recurring orario patterns into individual calendar events
		// For now, return corsi as events with their date ranges
		const result = await ctx.db.execute(sql`
      SELECT c.id, c.nome AS title, c.disciplina, c.data_inizio AS start,
        COALESCE(c.data_fine, c.data_inizio) AS "end",
        c.orario, c.stato,
        c.istruttore_id,
        (SELECT count(*) FROM iscrizioni_corso ic WHERE ic.corso_id = c.id) AS iscritti_count
      FROM corsi c
      WHERE c.tenant_id = ${tenantId}
        AND c.data_inizio <= ${input.end}
        AND COALESCE(c.data_fine, c.data_inizio) >= ${input.start}
      ORDER BY c.data_inizio
    `);

		return result as unknown as Array<Record<string, unknown>>;
	}),
});
