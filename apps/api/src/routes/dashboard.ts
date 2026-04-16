import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const dashboardRouter = router({
  /**
   * Main KPIs for the dashboard.
   * Returns: soci attivi, quote incassate, certificati in scadenza, presenze %.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const [sociStats, quoteStats, certStats, presenzeStats] = await Promise.all([
      // Soci attivi count
      ctx.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE stato = 'attivo') AS soci_attivi,
          count(*) AS soci_totali,
          count(*) FILTER (WHERE data_iscrizione >= NOW() - INTERVAL '30 days') AS nuovi_ultimo_mese
        FROM soci
        WHERE tenant_id = ${tenantId}
      `),

      // Quote incassate (current year)
      ctx.db.execute(sql`
        SELECT
          COALESCE(SUM(importo) FILTER (WHERE stato = 'pagata'), 0) AS incassato_totale,
          COALESCE(SUM(importo) FILTER (WHERE stato = 'emessa'), 0) AS da_incassare,
          count(*) FILTER (WHERE stato = 'emessa' AND data_scadenza < NOW()) AS scadute_count
        FROM quote
        WHERE tenant_id = ${tenantId}
          AND data_emissione >= date_trunc('year', NOW())
      `),

      // Certificati in scadenza (next 30 days)
      ctx.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE stato = 'in_scadenza') AS in_scadenza,
          count(*) FILTER (WHERE stato = 'scaduto') AS scaduti,
          count(*) FILTER (WHERE data_scadenza BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS scadenza_30gg
        FROM certificati_medici
        WHERE tenant_id = ${tenantId}
      `),

      // Presenze percentage (last 30 days)
      ctx.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE presente = true) AS presenti,
          count(*) AS totale,
          CASE
            WHEN count(*) > 0
            THEN ROUND(count(*) FILTER (WHERE presente = true)::numeric / count(*)::numeric * 100, 1)
            ELSE 0
          END AS percentuale_presenze
        FROM presenze
        WHERE tenant_id = ${tenantId}
          AND data >= NOW() - INTERVAL '30 days'
      `),
    ]);

    return {
      soci: (sociStats as unknown as Array<Record<string, unknown>>)[0] ?? {},
      quote: (quoteStats as unknown as Array<Record<string, unknown>>)[0] ?? {},
      certificati: (certStats as unknown as Array<Record<string, unknown>>)[0] ?? {},
      presenze: (presenzeStats as unknown as Array<Record<string, unknown>>)[0] ?? {},
    };
  }),

  /**
   * Soci with high churn score (AI-computed).
   */
  getChurnAlerts: protectedProcedure
    .input(
      z.object({
        minScore: z.number().min(0).max(100).default(70),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        SELECT id, nome, cognome, email, telefono, tipologia, disciplina,
          churn_score, data_iscrizione, stato
        FROM soci
        WHERE tenant_id = ${tenantId}
          AND churn_score IS NOT NULL
          AND CAST(churn_score AS numeric) >= ${input.minScore}
          AND stato = 'attivo'
        ORDER BY CAST(churn_score AS numeric) DESC
        LIMIT ${input.limit}
      `);

      return result as unknown as Array<Record<string, unknown>>;
    }),

  /**
   * Recent activity within the tenant.
   */
  getRecentActivity: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // TODO: Pull from audit_log table once it's fully wired
      const result = await ctx.db.execute(sql`
        SELECT id, azione, entita, entita_id, dettagli, utente_id, created_at
        FROM audit_log
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
        LIMIT ${input.limit}
      `);

      return result as unknown as Array<Record<string, unknown>>;
    }),

  /**
   * Enrollment and income trend data for charts.
   */
  getTrend: protectedProcedure
    .input(
      z.object({
        months: z.number().int().min(1).max(24).default(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const [enrollmentTrend, incomeTrend] = await Promise.all([
        // New enrollments per month
        ctx.db.execute(sql`
          SELECT
            date_trunc('month', data_iscrizione) AS mese,
            count(*) AS nuovi_iscritti,
            count(*) FILTER (WHERE stato = 'dimesso') AS dimessi
          FROM soci
          WHERE tenant_id = ${tenantId}
            AND data_iscrizione >= NOW() - (${input.months} || ' months')::interval
          GROUP BY mese
          ORDER BY mese
        `),

        // Income per month
        ctx.db.execute(sql`
          SELECT
            date_trunc('month', data_pagamento) AS mese,
            COALESCE(SUM(importo), 0) AS incassato,
            count(*) AS num_pagamenti
          FROM quote
          WHERE tenant_id = ${tenantId}
            AND stato = 'pagata'
            AND data_pagamento IS NOT NULL
            AND data_pagamento >= NOW() - (${input.months} || ' months')::interval
          GROUP BY mese
          ORDER BY mese
        `),
      ]);

      return {
        enrollment: enrollmentTrend as unknown as Array<Record<string, unknown>>,
        income: incomeTrend as unknown as Array<Record<string, unknown>>,
      };
    }),
});
