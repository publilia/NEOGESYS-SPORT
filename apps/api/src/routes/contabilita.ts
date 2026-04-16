import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listMovimentiInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  tipo: z.enum(["entrata", "uscita"]).optional(),
  categoria: z.string().optional(),
  dataInizio: z.string().datetime().optional(),
  dataFine: z.string().datetime().optional(),
});

const createMovimentoInput = z.object({
  tipo: z.enum(["entrata", "uscita"]),
  importo: z.number().min(0),
  descrizione: z.string().min(1).max(500),
  categoria: z.string().max(100),
  data: z.string().datetime(),
  socioId: z.string().uuid().optional(),
  quotaId: z.string().uuid().optional(),
  metodoPagamento: z.string().max(50).optional(),
  riferimento: z.string().max(200).optional(),
  note: z.string().optional(),
});

const updateMovimentoInput = z.object({
  id: z.string().uuid(),
  tipo: z.enum(["entrata", "uscita"]).optional(),
  importo: z.number().min(0).optional(),
  descrizione: z.string().min(1).max(500).optional(),
  categoria: z.string().max(100).optional(),
  data: z.string().datetime().optional(),
  metodoPagamento: z.string().max(50).optional(),
  riferimento: z.string().max(200).optional(),
  note: z.string().optional(),
});

const reportInput = z.object({
  dataInizio: z.string().datetime(),
  dataFine: z.string().datetime(),
  raggruppamento: z.enum(["giorno", "settimana", "mese"]).default("mese"),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const contabilitaRouter = router({
  /**
   * List movimenti di prima nota with pagination and filters.
   */
  listMovimenti: protectedProcedure.input(listMovimentiInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const offset = (input.page - 1) * input.perPage;

    const result = await ctx.db.execute(sql`
      SELECT m.*,
        s.nome AS socio_nome, s.cognome AS socio_cognome,
        count(*) OVER() AS total_count
      FROM prima_nota_movimenti m
      LEFT JOIN soci s ON s.id = m.socio_id
      WHERE m.tenant_id = ${tenantId}
        ${input.tipo ? sql`AND m.tipo = ${input.tipo}` : sql``}
        ${input.categoria ? sql`AND m.categoria = ${input.categoria}` : sql``}
        ${input.dataInizio ? sql`AND m.data >= ${input.dataInizio}` : sql``}
        ${input.dataFine ? sql`AND m.data <= ${input.dataFine}` : sql``}
      ORDER BY m.data DESC
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
   * Get a single movimento by ID.
   */
  getMovimento: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        SELECT m.*, s.nome AS socio_nome, s.cognome AS socio_cognome
        FROM prima_nota_movimenti m
        LEFT JOIN soci s ON s.id = m.socio_id
        WHERE m.id = ${input.id} AND m.tenant_id = ${tenantId}
        LIMIT 1
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
      }

      return rows[0];
    }),

  /**
   * Create a new movimento di prima nota.
   */
  createMovimento: protectedProcedure
    .input(createMovimentoInput)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        INSERT INTO prima_nota_movimenti (
          tenant_id, tipo, importo, descrizione, categoria, data,
          socio_id, quota_id, metodo_pagamento, riferimento, note, creato_da_id
        )
        VALUES (
          ${tenantId}, ${input.tipo}, ${input.importo}, ${input.descrizione},
          ${input.categoria}, ${input.data}, ${input.socioId ?? null},
          ${input.quotaId ?? null}, ${input.metodoPagamento ?? null},
          ${input.riferimento ?? null}, ${input.note ?? null}, ${ctx.user?.id ?? null}
        )
        RETURNING *
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      return rows[0];
    }),

  /**
   * Update a movimento di prima nota.
   */
  updateMovimento: protectedProcedure
    .input(updateMovimentoInput)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const { id, ...data } = input;

      const setClauses: Array<ReturnType<typeof sql>> = [];
      if (data.tipo !== undefined) setClauses.push(sql`tipo = ${data.tipo}`);
      if (data.importo !== undefined) setClauses.push(sql`importo = ${data.importo}`);
      if (data.descrizione !== undefined) setClauses.push(sql`descrizione = ${data.descrizione}`);
      if (data.categoria !== undefined) setClauses.push(sql`categoria = ${data.categoria}`);
      if (data.data !== undefined) setClauses.push(sql`data = ${data.data}`);
      if (data.metodoPagamento !== undefined) setClauses.push(sql`metodo_pagamento = ${data.metodoPagamento}`);
      if (data.riferimento !== undefined) setClauses.push(sql`riferimento = ${data.riferimento}`);
      if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
      setClauses.push(sql`updated_at = NOW()`);

      if (setClauses.length === 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
      }

      const setClause = sql.join(setClauses, sql`, `);
      const result = await ctx.db.execute(sql`
        UPDATE prima_nota_movimenti SET ${setClause}
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
      }

      return rows[0];
    }),

  /**
   * Delete a movimento.
   */
  deleteMovimento: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        DELETE FROM prima_nota_movimenti
        WHERE id = ${input.id} AND tenant_id = ${tenantId}
        RETURNING id
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
      }

      return { success: true };
    }),

  /**
   * Financial report: entrate vs uscite over time.
   */
  report: protectedProcedure.input(reportInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const truncFn = {
      giorno: "day",
      settimana: "week",
      mese: "month",
    }[input.raggruppamento];

    const [trend, totals, byCategoria] = await Promise.all([
      // Trend over time
      ctx.db.execute(sql`
        SELECT
          date_trunc(${truncFn}, data) AS periodo,
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'entrata'), 0) AS entrate,
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'uscita'), 0) AS uscite,
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'entrata'), 0) -
            COALESCE(SUM(importo) FILTER (WHERE tipo = 'uscita'), 0) AS saldo
        FROM prima_nota_movimenti
        WHERE tenant_id = ${tenantId}
          AND data >= ${input.dataInizio}
          AND data <= ${input.dataFine}
        GROUP BY periodo
        ORDER BY periodo
      `),

      // Period totals
      ctx.db.execute(sql`
        SELECT
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'entrata'), 0) AS totale_entrate,
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'uscita'), 0) AS totale_uscite,
          COALESCE(SUM(importo) FILTER (WHERE tipo = 'entrata'), 0) -
            COALESCE(SUM(importo) FILTER (WHERE tipo = 'uscita'), 0) AS saldo
        FROM prima_nota_movimenti
        WHERE tenant_id = ${tenantId}
          AND data >= ${input.dataInizio}
          AND data <= ${input.dataFine}
      `),

      // By category
      ctx.db.execute(sql`
        SELECT categoria, tipo,
          count(*) AS count,
          COALESCE(SUM(importo), 0) AS totale
        FROM prima_nota_movimenti
        WHERE tenant_id = ${tenantId}
          AND data >= ${input.dataInizio}
          AND data <= ${input.dataFine}
        GROUP BY categoria, tipo
        ORDER BY totale DESC
      `),
    ]);

    return {
      trend: trend as unknown as Array<Record<string, unknown>>,
      totals: (totals as unknown as Array<Record<string, unknown>>)[0] ?? {},
      byCategoria: byCategoria as unknown as Array<Record<string, unknown>>,
    };
  }),
});
