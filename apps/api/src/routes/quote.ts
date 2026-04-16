import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  stato: z.enum(["emessa", "pagata", "scaduta", "annullata"]).optional(),
  socioId: z.string().uuid().optional(),
  annoSportivoId: z.string().uuid().optional(),
});

const createQuotaInput = z.object({
  socioId: z.string().uuid(),
  tipoQuotaId: z.string().uuid().optional(),
  annoSportivoId: z.string().uuid().optional(),
  descrizione: z.string().max(500),
  importo: z.number().min(0),
  dataEmissione: z.string().datetime().optional(),
  dataScadenza: z.string().datetime().optional(),
  note: z.string().optional(),
});

const registraPagamentoInput = z.object({
  quotaId: z.string().uuid(),
  importoPagato: z.number().min(0),
  dataPagamento: z.string().datetime().optional(),
  metodoPagamento: z.enum(["contanti", "bonifico", "carta", "satispay", "altro"]),
  riferimentoPagamento: z.string().optional(),
  note: z.string().optional(),
});

const statsInput = z.object({
  annoSportivoId: z.string().uuid().optional(),
  periodoInizio: z.string().datetime().optional(),
  periodoFine: z.string().datetime().optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const quoteRouter = router({
  /**
   * List quote with pagination and filters.
   */
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const { page, perPage } = input;
    const offset = (page - 1) * perPage;

    const result = await ctx.db.execute(sql`
      SELECT q.*, s.nome AS socio_nome, s.cognome AS socio_cognome,
        count(*) OVER() AS total_count
      FROM quote q
      JOIN soci s ON s.id = q.socio_id
      WHERE q.tenant_id = ${tenantId}
        ${input.stato ? sql`AND q.stato = ${input.stato}` : sql``}
        ${input.socioId ? sql`AND q.socio_id = ${input.socioId}` : sql``}
        ${input.annoSportivoId ? sql`AND q.anno_sportivo_id = ${input.annoSportivoId}` : sql``}
      ORDER BY q.data_emissione DESC
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
   * Get a single quota by ID.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        SELECT q.*, s.nome AS socio_nome, s.cognome AS socio_cognome,
          s.codice_fiscale AS socio_codice_fiscale
        FROM quote q
        JOIN soci s ON s.id = q.socio_id
        WHERE q.id = ${input.id} AND q.tenant_id = ${tenantId}
        LIMIT 1
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
      }

      return rows[0];
    }),

  /**
   * Create (emit) a new quota.
   */
  create: protectedProcedure.input(createQuotaInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    // Verify socio belongs to tenant
    const socioCheck = await ctx.db.execute(sql`
      SELECT id FROM soci WHERE id = ${input.socioId} AND tenant_id = ${tenantId} LIMIT 1
    `);
    if ((socioCheck as unknown as Array<unknown>).length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
    }

    const result = await ctx.db.execute(sql`
      INSERT INTO quote (tenant_id, socio_id, tipo_quota_id, anno_sportivo_id,
        descrizione, importo, data_emissione, data_scadenza, stato, note)
      VALUES (
        ${tenantId}, ${input.socioId}, ${input.tipoQuotaId ?? null},
        ${input.annoSportivoId ?? null}, ${input.descrizione}, ${input.importo},
        ${input.dataEmissione ?? new Date().toISOString()},
        ${input.dataScadenza ?? null}, 'emessa', ${input.note ?? null}
      )
      RETURNING *
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows[0];
  }),

  /**
   * Record a payment for a quota.
   */
  registraPagamento: protectedProcedure
    .input(registraPagamentoInput)
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // Verify quota exists and belongs to tenant
      const quotaResult = await ctx.db.execute(sql`
        SELECT id, importo, stato FROM quote
        WHERE id = ${input.quotaId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      const quotaRows = quotaResult as unknown as Array<Record<string, unknown>>;
      if (quotaRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
      }

      const quota = quotaRows[0]!;
      if (quota.stato === "pagata") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quota gia' pagata." });
      }

      // Update quota with payment info
      const result = await ctx.db.execute(sql`
        UPDATE quote SET
          stato = 'pagata',
          importo_pagato = ${input.importoPagato},
          data_pagamento = ${input.dataPagamento ?? new Date().toISOString()},
          metodo_pagamento = ${input.metodoPagamento},
          riferimento_pagamento = ${input.riferimentoPagamento ?? null},
          note = COALESCE(note || E'\n', '') || COALESCE(${input.note ?? null}, ''),
          updated_at = NOW()
        WHERE id = ${input.quotaId} AND tenant_id = ${tenantId}
        RETURNING *
      `);

      // TODO: Create prima_nota_movimenti entry for accounting

      const rows = result as unknown as Array<Record<string, unknown>>;
      return rows[0];
    }),

  /**
   * Get overdue payments (scadenzario).
   */
  getScadenzario: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);
      const offset = (input.page - 1) * input.perPage;

      const result = await ctx.db.execute(sql`
        SELECT q.*, s.nome AS socio_nome, s.cognome AS socio_cognome,
          s.email AS socio_email, s.telefono AS socio_telefono,
          count(*) OVER() AS total_count
        FROM quote q
        JOIN soci s ON s.id = q.socio_id
        WHERE q.tenant_id = ${tenantId}
          AND q.stato = 'emessa'
          AND q.data_scadenza < NOW()
        ORDER BY q.data_scadenza ASC
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
   * Generate a PDF receipt URL for a paid quota.
   */
  generaRicevuta: protectedProcedure
    .input(z.object({ quotaId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const quotaResult = await ctx.db.execute(sql`
        SELECT q.*, s.nome AS socio_nome, s.cognome AS socio_cognome,
          s.codice_fiscale AS socio_codice_fiscale,
          t.ragione_sociale, t.partita_iva, t.codice_fiscale AS tenant_cf,
          t.sede_legale
        FROM quote q
        JOIN soci s ON s.id = q.socio_id
        JOIN tenants t ON t.id = q.tenant_id
        WHERE q.id = ${input.quotaId} AND q.tenant_id = ${tenantId}
        LIMIT 1
      `);

      const rows = quotaResult as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
      }

      const quota = rows[0]!;
      if (quota.stato !== "pagata") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La ricevuta puo' essere generata solo per quote pagate.",
        });
      }

      // TODO: Generate PDF via a PDF service (e.g. puppeteer, pdfkit)
      // and upload to object storage. Return the URL.
      return {
        success: true,
        message: "Generazione ricevuta avviata.",
        url: null as string | null, // Will be populated once PDF service is implemented
      };
    }),

  /**
   * Income statistics by period and discipline.
   */
  stats: protectedProcedure.input(statsInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const [totals, byDisciplina, byMese] = await Promise.all([
      // Overall totals
      ctx.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE stato = 'pagata') AS quote_pagate,
          count(*) FILTER (WHERE stato = 'emessa') AS quote_emesse,
          count(*) FILTER (WHERE stato = 'scaduta') AS quote_scadute,
          COALESCE(SUM(importo) FILTER (WHERE stato = 'pagata'), 0) AS totale_incassato,
          COALESCE(SUM(importo) FILTER (WHERE stato = 'emessa'), 0) AS totale_da_incassare
        FROM quote
        WHERE tenant_id = ${tenantId}
          ${input.periodoInizio ? sql`AND data_emissione >= ${input.periodoInizio}` : sql``}
          ${input.periodoFine ? sql`AND data_emissione <= ${input.periodoFine}` : sql``}
          ${input.annoSportivoId ? sql`AND anno_sportivo_id = ${input.annoSportivoId}` : sql``}
      `),

      // By discipline
      ctx.db.execute(sql`
        SELECT s.disciplina,
          count(*) AS count,
          COALESCE(SUM(q.importo) FILTER (WHERE q.stato = 'pagata'), 0) AS incassato
        FROM quote q
        JOIN soci s ON s.id = q.socio_id
        WHERE q.tenant_id = ${tenantId}
          ${input.periodoInizio ? sql`AND q.data_emissione >= ${input.periodoInizio}` : sql``}
          ${input.periodoFine ? sql`AND q.data_emissione <= ${input.periodoFine}` : sql``}
        GROUP BY s.disciplina
        ORDER BY incassato DESC
      `),

      // Monthly trend
      ctx.db.execute(sql`
        SELECT
          date_trunc('month', data_pagamento) AS mese,
          count(*) AS count,
          COALESCE(SUM(importo), 0) AS incassato
        FROM quote
        WHERE tenant_id = ${tenantId}
          AND stato = 'pagata'
          AND data_pagamento IS NOT NULL
          ${input.periodoInizio ? sql`AND data_pagamento >= ${input.periodoInizio}` : sql``}
          ${input.periodoFine ? sql`AND data_pagamento <= ${input.periodoFine}` : sql``}
        GROUP BY mese
        ORDER BY mese
      `),
    ]);

    return {
      totals: (totals as unknown as Array<Record<string, unknown>>)[0] ?? {},
      byDisciplina: byDisciplina as unknown as Array<Record<string, unknown>>,
      byMese: byMese as unknown as Array<Record<string, unknown>>,
    };
  }),
});
