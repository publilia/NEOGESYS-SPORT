import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";
import {
  getAIClient,
  predictChurn,
  extractFeatures,
  processCertificato,
  searchSimilar,
  storeEmbedding,
} from "@neogesys/ai";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const aiRouter = router({
  /**
   * Run churn prediction for all active soci.
   * Fetches activity data, computes features, runs AI model, updates churn_score.
   * Admin only.
   */
  runChurnPrediction: adminProcedure.mutation(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    // Fetch all active soci for this tenant
    const sociResult = await ctx.db.execute(sql`
      SELECT
        s.id,
        s.data_iscrizione,
        -- Last attendance
        (SELECT MAX(p.data) FROM presenze p
         JOIN iscrizioni_corso ic ON ic.id = p.iscrizione_id
         WHERE ic.socio_id = s.id) AS ultima_presenza,
        -- Attendance in last 30 days
        (SELECT count(*) FROM presenze p
         JOIN iscrizioni_corso ic ON ic.id = p.iscrizione_id
         WHERE ic.socio_id = s.id AND p.data >= NOW() - INTERVAL '30 days'
           AND p.presente = true) AS presenze_30g,
        -- Attendance in last 90 days
        (SELECT count(*) FROM presenze p
         JOIN iscrizioni_corso ic ON ic.id = p.iscrizione_id
         WHERE ic.socio_id = s.id AND p.data >= NOW() - INTERVAL '90 days'
           AND p.presente = true) AS presenze_90g,
        -- Expected lessons in last 30 days (from enrolled active courses)
        (SELECT count(*) FROM presenze p
         JOIN iscrizioni_corso ic ON ic.id = p.iscrizione_id
         WHERE ic.socio_id = s.id AND p.data >= NOW() - INTERVAL '30 days') AS lezioni_previste_30g,
        -- Unpaid quotes count
        (SELECT count(*) FROM quote q
         WHERE q.socio_id = s.id AND q.tenant_id = ${tenantId}
           AND q.stato IN ('emessa', 'scaduta')) AS quote_insolute,
        -- Last payment date
        (SELECT MAX(q.data_pagamento) FROM quote q
         WHERE q.socio_id = s.id AND q.tenant_id = ${tenantId}
           AND q.stato = 'pagata') AS ultima_quota_pagata,
        -- Total unpaid amount
        (SELECT COALESCE(SUM(q.importo), 0) FROM quote q
         WHERE q.socio_id = s.id AND q.tenant_id = ${tenantId}
           AND q.stato IN ('emessa', 'scaduta')) AS importo_insoluto,
        -- Active courses
        (SELECT count(*) FROM iscrizioni_corso ic
         JOIN corsi c ON c.id = ic.corso_id
         WHERE ic.socio_id = s.id AND c.stato = 'attivo'
           AND ic.stato = 'attiva') AS corsi_attivi,
        -- Valid certificates
        (SELECT count(*) FROM certificati_medici cm
         WHERE cm.socio_id = s.id AND cm.data_scadenza >= NOW()) AS certificati_validi,
        -- Certificate expiring in 30 days
        (SELECT count(*) > 0 FROM certificati_medici cm
         WHERE cm.socio_id = s.id
           AND cm.data_scadenza BETWEEN NOW() AND NOW() + INTERVAL '30 days') AS certificato_in_scadenza,
        -- Last access
        u.ultimo_accesso
      FROM soci s
      LEFT JOIN utente_tenant ut ON ut.socio_id = s.id AND ut.tenant_id = s.tenant_id
      LEFT JOIN utenti u ON u.id = ut.utente_id
      WHERE s.tenant_id = ${tenantId} AND s.stato = 'attivo'
    `);

    const sociRows = sociResult as unknown as Array<Record<string, unknown>>;

    let processed = 0;
    let errors = 0;

    for (const row of sociRows) {
      try {
        const features = extractFeatures({
          socioId: String(row.id),
          tenantId,
          ultimaPresenza: row.ultima_presenza ? new Date(String(row.ultima_presenza)) : null,
          presenze30g: Number(row.presenze_30g ?? 0),
          presenze90g: Number(row.presenze_90g ?? 0),
          lezionePreviste30g: Number(row.lezioni_previste_30g ?? 0),
          quoteInsolute: Number(row.quote_insolute ?? 0),
          ultimaQuotaPagata: row.ultima_quota_pagata ? new Date(String(row.ultima_quota_pagata)) : null,
          importoInsoluto: Number(row.importo_insoluto ?? 0),
          dataIscrizione: row.data_iscrizione ? new Date(String(row.data_iscrizione)) : null,
          corsiAttivi: Number(row.corsi_attivi ?? 0),
          certificatiValidi: Number(row.certificati_validi ?? 0),
          certificatoInScadenza: Boolean(row.certificato_in_scadenza),
          ultimoAccesso: row.ultimo_accesso ? new Date(String(row.ultimo_accesso)) : null,
        });

        const prediction = await predictChurn(features);

        await ctx.db.execute(sql`
          UPDATE soci SET churn_score = ${prediction.rischio}, updated_at = NOW()
          WHERE id = ${String(row.id)} AND tenant_id = ${tenantId}
        `);

        // Update embedding with socio text representation for semantic search
        const testoSocio = `Socio: score churn ${prediction.score}, rischio ${prediction.rischio}. ${prediction.ragioni.join(". ")}`;
        await storeEmbedding(tenantId, String(row.id), testoSocio);

        processed++;
      } catch {
        errors++;
      }
    }

    return {
      success: true,
      totale: sociRows.length,
      processati: processed,
      errori: errors,
      message: `Predizione churn completata: ${processed}/${sociRows.length} soci analizzati.`,
    };
  }),

  /**
   * Get AI-generated insights for the tenant dashboard.
   */
  getInsights: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    // Fetch aggregate data for insight generation
    const [stats, churnStats, certificatiStats, quoteStats] = await Promise.all([
      ctx.db.execute(sql`
        SELECT
          count(*) AS totale_soci,
          count(*) FILTER (WHERE stato = 'attivo') AS soci_attivi,
          count(*) FILTER (WHERE churn_score IN ('alto', 'critico')) AS soci_rischio_alto
        FROM soci WHERE tenant_id = ${tenantId}
      `),
      ctx.db.execute(sql`
        SELECT churn_score, count(*) AS count
        FROM soci WHERE tenant_id = ${tenantId} AND churn_score IS NOT NULL
        GROUP BY churn_score
      `),
      ctx.db.execute(sql`
        SELECT count(*) AS in_scadenza_30g
        FROM certificati_medici cm
        JOIN soci s ON s.id = cm.socio_id
        WHERE s.tenant_id = ${tenantId}
          AND cm.data_scadenza BETWEEN NOW() AND NOW() + INTERVAL '30 days'
      `),
      ctx.db.execute(sql`
        SELECT
          count(*) FILTER (WHERE stato = 'emessa' AND data_scadenza < NOW()) AS scadute,
          COALESCE(SUM(importo) FILTER (WHERE stato = 'emessa' AND data_scadenza < NOW()), 0) AS importo_scaduto,
          count(*) FILTER (WHERE stato = 'emessa' AND data_scadenza BETWEEN NOW() AND NOW() + INTERVAL '7 days') AS in_scadenza_7g
        FROM quote WHERE tenant_id = ${tenantId}
      `),
    ]);

    const statsRow = (stats as unknown as Array<Record<string, unknown>>)[0] ?? {};
    const certRow = (certificatiStats as unknown as Array<Record<string, unknown>>)[0] ?? {};
    const quoteRow = (quoteStats as unknown as Array<Record<string, unknown>>)[0] ?? {};
    const churnRows = churnStats as unknown as Array<Record<string, unknown>>;

    const dataContext = {
      totale_soci: statsRow.totale_soci,
      soci_attivi: statsRow.soci_attivi,
      soci_rischio_alto: statsRow.soci_rischio_alto,
      churn_distribution: churnRows,
      certificati_in_scadenza_30g: certRow.in_scadenza_30g,
      quote_scadute: quoteRow.scadute,
      importo_quote_scaduto: quoteRow.importo_scaduto,
      quote_in_scadenza_7g: quoteRow.in_scadenza_7g,
    };

    // Generate insights using AI if available, otherwise use rule-based logic
    const insights: Array<{
      tipo: string;
      titolo: string;
      descrizione: string;
      priorita: "alta" | "media" | "bassa";
      azione: string | null;
    }> = [];

    // Always add rule-based insights
    const soci_rischio = Number(statsRow.soci_rischio_alto ?? 0);
    if (soci_rischio > 0) {
      insights.push({
        tipo: "churn",
        titolo: `${soci_rischio} soci a rischio abbandono`,
        descrizione: `${soci_rischio} soci hanno un punteggio di churn alto o critico. Contattarli prima che abbandonino.`,
        priorita: soci_rischio >= 5 ? "alta" : "media",
        azione: "Vai alla lista soci → filtra per Rischio Churn",
      });
    }

    const cert_scadenza = Number(certRow.in_scadenza_30g ?? 0);
    if (cert_scadenza > 0) {
      insights.push({
        tipo: "certificati",
        titolo: `${cert_scadenza} certificati in scadenza nei prossimi 30 giorni`,
        descrizione: `${cert_scadenza} soci devono rinnovare il certificato medico entro 30 giorni.`,
        priorita: cert_scadenza >= 3 ? "alta" : "media",
        azione: "Invia sollecito → Comunicazioni → Nuovo messaggio",
      });
    }

    const quote_scadute = Number(quoteRow.scadute ?? 0);
    if (quote_scadute > 0) {
      insights.push({
        tipo: "pagamenti",
        titolo: `${quote_scadute} quote scadute da incassare`,
        descrizione: `Importo totale insoluto: € ${Number(quoteRow.importo_scaduto ?? 0).toFixed(2)}`,
        priorita: quote_scadute >= 3 ? "alta" : "bassa",
        azione: "Gestisci → Quote → Scadenzario",
      });
    }

    // Try AI-enhanced insights if client is available
    try {
      const client = await getAIClient(tenantId, "fast");
      if (client.provider === "anthropic" && client.anthropic) {
        const response = await client.anthropic.messages.create({
          model: client.model,
          max_tokens: 512,
          system: `Sei un analista per associazioni sportive italiane. Analizza i dati forniti e genera 1-2 insight aggiuntivi non ovvi.
Formato JSON: array di oggetti con campi tipo, titolo, descrizione, priorita (alta|media|bassa), azione.
Rispondi SOLO con il JSON array, senza markdown.`,
          messages: [{
            role: "user",
            content: `Dati associazione:\n${JSON.stringify(dataContext, null, 2)}\n\nInsight già generati:\n${insights.map(i => i.titolo).join(", ")}\n\nGenera insight aggiuntivi non già presenti.`,
          }],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock?.type === "text") {
          const aiInsights = JSON.parse(textBlock.text) as typeof insights;
          insights.push(...aiInsights.slice(0, 2));
        }
      }
    } catch {
      // AI unavailable, return rule-based insights only
    }

    return {
      insights,
      generatedAt: new Date().toISOString(),
    };
  }),

  /**
   * Natural language query on tenant data (RAG).
   */
  query: protectedProcedure
    .input(
      z.object({
        domanda: z.string().min(5).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // Search for relevant soci using semantic similarity
      let contesto = "";
      try {
        const simResults = await searchSimilar(input.domanda, tenantId, 5);
        if (simResults.length > 0) {
          contesto = simResults
            .map((r) => `[Similarità ${(r.similarita * 100).toFixed(0)}%] ${r.testoOriginale}`)
            .join("\n");
        }
      } catch {
        // Vector search unavailable, continue without context
      }

      // Fetch some aggregate stats for general context
      const statsResult = await ctx.db.execute(sql`
        SELECT
          (SELECT count(*) FROM soci WHERE tenant_id = ${tenantId} AND stato = 'attivo') AS soci_attivi,
          (SELECT count(*) FROM quote WHERE tenant_id = ${tenantId} AND stato = 'emessa') AS quote_aperte,
          (SELECT count(*) FROM corsi WHERE tenant_id = ${tenantId} AND stato = 'attivo') AS corsi_attivi
      `);
      const statsRow = (statsResult as unknown as Array<Record<string, unknown>>)[0] ?? {};

      const client = await getAIClient(tenantId, "standard");
      if (client.provider !== "anthropic" || !client.anthropic) {
        return {
          risposta: "Il modulo AI non è configurato per questo tenant. Aggiungi una chiave API dalle impostazioni.",
          fonti: [],
        };
      }

      const systemPrompt = `Sei l'assistente AI di NEOGESYS SPORT, un gestionale per associazioni sportive italiane.
Hai accesso ai dati del tenant. Rispondi in italiano in modo conciso e preciso.
Dati aggregati: soci attivi: ${statsRow.soci_attivi}, quote aperte: ${statsRow.quote_aperte}, corsi attivi: ${statsRow.corsi_attivi}.
${contesto ? `\nContesto soci rilevanti:\n${contesto}` : ""}`;

      const response = await client.anthropic.messages.create({
        model: client.model,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: "user", content: input.domanda }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const risposta = textBlock?.type === "text" ? textBlock.text : "Impossibile generare una risposta.";

      return {
        risposta,
        fonti: [] as Array<{ tipo: string; id: string; rilevanza: number }>,
      };
    }),

  /**
   * Process a document via OCR (certificate, identity doc, etc.).
   */
  processDocument: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string().url(),
        tipo: z.enum(["certificato_medico", "documento_identita", "altro"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      if (input.tipo === "certificato_medico") {
        const result = await processCertificato(input.fileUrl, tenantId);
        return {
          success: true,
          datiEstratti: result as unknown as Record<string, unknown>,
          confidenza: result.confidenza,
          message: `OCR completato con confidenza ${result.confidenza}%`,
        };
      }

      // For other document types, use generic vision extraction
      const client = await getAIClient(tenantId, "standard");
      if (client.provider !== "anthropic" || !client.anthropic) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "OCR richiede il provider Anthropic. Configura una chiave API Anthropic.",
        });
      }

      const response = await client.anthropic.messages.create({
        model: client.model,
        max_tokens: 1024,
        system: `Estrai i dati principali dal documento. Restituisci un JSON con i campi trovati. Solo JSON, nessun markdown.`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "url", url: input.fileUrl } },
            { type: "text", text: "Estrai i dati da questo documento." },
          ],
        }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Nessuna risposta dal modello OCR." });
      }

      const datiEstratti = JSON.parse(textBlock.text) as Record<string, unknown>;
      return {
        success: true,
        datiEstratti,
        confidenza: 70,
        message: "Estrazione dati completata.",
      };
    }),

  /**
   * Generate a draft comunicazione text using AI.
   */
  generaTesto: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["benvenuto", "scadenza_certificato", "sollecito_pagamento", "invito_evento", "personalizzato"]),
        contesto: z.record(z.string(), z.unknown()).optional(),
        tono: z.enum(["formale", "informale", "amichevole"]).default("formale"),
        lingua: z.string().default("it"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // Fetch tenant info for personalization
      const tenantResult = await ctx.db.execute(sql`
        SELECT ragione_sociale, tipo_ente FROM tenants WHERE id = ${tenantId} LIMIT 1
      `);
      const tenant = (tenantResult as unknown as Array<Record<string, unknown>>)[0] ?? {};

      const tipoLabels: Record<string, string> = {
        benvenuto: "messaggio di benvenuto per un nuovo socio",
        scadenza_certificato: "promemoria scadenza certificato medico",
        sollecito_pagamento: "sollecito di pagamento quota",
        invito_evento: "invito a un evento sportivo",
        personalizzato: "comunicazione generica",
      };

      const tonoLabels: Record<string, string> = {
        formale: "tono formale e professionale",
        informale: "tono informale e diretto",
        amichevole: "tono amichevole e cordiale",
      };

      const client = await getAIClient(tenantId, "fast");
      if (client.provider !== "anthropic" || !client.anthropic) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Generazione testo richiede il provider Anthropic.",
        });
      }

      const contesoStr = input.contesto
        ? `\nContesto aggiuntivo: ${JSON.stringify(input.contesto)}`
        : "";

      const response = await client.anthropic.messages.create({
        model: client.model,
        max_tokens: 512,
        system: `Sei l'assistente di comunicazione di ${String(tenant.ragione_sociale ?? "un'associazione sportiva")} (${String(tenant.tipo_ente ?? "ASD")}).
Scrivi in lingua ${input.lingua} con ${tonoLabels[input.tono] ?? "tono formale"}.
Rispondi SOLO con un JSON: { "oggetto": "...", "testo": "..." }. Niente markdown.`,
        messages: [{
          role: "user",
          content: `Scrivi un ${tipoLabels[input.tipo] ?? "comunicazione"}.${contesoStr}`,
        }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Nessuna risposta dal modello." });
      }

      const generated = JSON.parse(textBlock.text) as { oggetto: string; testo: string };
      return {
        testo: generated.testo ?? "",
        oggetto: generated.oggetto ?? "",
        message: "Testo generato con successo.",
      };
    }),

  /**
   * Semantic search across soci using embeddings.
   */
  searchSemantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(3).max(200),
        limit: z.number().int().min(1).max(20).default(5),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const similarResults = await searchSimilar(input.query, tenantId, input.limit);

      if (similarResults.length === 0) {
        return { results: [] };
      }

      const socioIds = similarResults.map((r) => r.socioId);

      // Fetch socio details for the matched IDs
      const sociResult = await ctx.db.execute(sql`
        SELECT id, nome, cognome, email, disciplina
        FROM soci
        WHERE id = ANY(${socioIds}::uuid[]) AND tenant_id = ${tenantId}
      `);

      const sociMap = new Map<string, Record<string, unknown>>();
      for (const row of sociResult as unknown as Array<Record<string, unknown>>) {
        sociMap.set(String(row.id), row);
      }

      return {
        results: similarResults.map((r) => {
          const socio = sociMap.get(r.socioId);
          return {
            socioId: r.socioId,
            nome: String(socio?.nome ?? ""),
            cognome: String(socio?.cognome ?? ""),
            similarity: r.similarita,
          };
        }),
      };
    }),
});
