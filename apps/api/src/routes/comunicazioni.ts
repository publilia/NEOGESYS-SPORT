import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";
import { getEmailProvider } from "@neogesys/integrations/email";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  canale: z.enum(["email", "sms", "whatsapp", "push"]).optional(),
  stato: z.enum(["bozza", "inviata", "programmata", "errore"]).optional(),
});

const createInput = z.object({
  oggetto: z.string().min(1).max(500),
  corpo: z.string().min(1),
  canale: z.enum(["email", "sms", "whatsapp", "push"]),
  destinatariTipo: z.enum(["tutti", "gruppo", "singoli"]),
  destinatariIds: z.array(z.string().uuid()).optional(),
  filtroStato: z.enum(["attivo", "sospeso", "dimesso", "scaduto"]).optional(),
  filtroDisciplina: z.string().optional(),
  filtroTipologia: z.string().optional(),
  programmatoA: z.string().datetime().optional(),
  note: z.string().optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  oggetto: z.string().min(1).max(500).optional(),
  corpo: z.string().min(1).optional(),
  canale: z.enum(["email", "sms", "whatsapp", "push"]).optional(),
  programmatoA: z.string().datetime().optional(),
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

export const comunicazioniRouter = router({
  /**
   * List comunicazioni with pagination and filters.
   */
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const offset = (input.page - 1) * input.perPage;

    const result = await ctx.db.execute(sql`
      SELECT c.*,
        (SELECT count(*) FROM comunicazioni_destinatari cd WHERE cd.comunicazione_id = c.id) AS destinatari_count,
        count(*) OVER() AS total_count
      FROM comunicazioni c
      WHERE c.tenant_id = ${tenantId}
        ${input.canale ? sql`AND c.canale = ${input.canale}` : sql``}
        ${input.stato ? sql`AND c.stato = ${input.stato}` : sql``}
      ORDER BY c.created_at DESC
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
   * Get a single comunicazione by ID with recipients.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const [comunicazione, destinatari] = await Promise.all([
        ctx.db.execute(sql`
          SELECT * FROM comunicazioni
          WHERE id = ${input.id} AND tenant_id = ${tenantId}
          LIMIT 1
        `),
        ctx.db.execute(sql`
          SELECT cd.*, s.nome AS socio_nome, s.cognome AS socio_cognome, s.email AS socio_email
          FROM comunicazioni_destinatari cd
          JOIN soci s ON s.id = cd.socio_id
          WHERE cd.comunicazione_id = ${input.id}
          ORDER BY s.cognome
        `),
      ]);

      const comRows = comunicazione as unknown as Array<Record<string, unknown>>;
      if (comRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
      }

      return {
        ...comRows[0],
        destinatari: destinatari as unknown as Array<Record<string, unknown>>,
      };
    }),

  /**
   * Create a new comunicazione (draft or scheduled).
   */
  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const stato = input.programmatoA ? "programmata" : "bozza";

    const comResult = await ctx.db.execute(sql`
      INSERT INTO comunicazioni (tenant_id, oggetto, corpo, canale, stato,
        programmato_a, note, creato_da_id)
      VALUES (
        ${tenantId}, ${input.oggetto}, ${input.corpo}, ${input.canale},
        ${stato}, ${input.programmatoA ?? null}, ${input.note ?? null},
        ${ctx.user?.id ?? null}
      )
      RETURNING *
    `);

    const comRows = comResult as unknown as Array<Record<string, unknown>>;
    const comunicazione = comRows[0]!;

    // Resolve recipients based on tipo
    if (input.destinatariTipo === "singoli" && input.destinatariIds?.length) {
      // Insert individual recipients
      for (const socioId of input.destinatariIds) {
        await ctx.db.execute(sql`
          INSERT INTO comunicazioni_destinatari (comunicazione_id, socio_id)
          VALUES (${comunicazione.id as string}, ${socioId})
          ON CONFLICT DO NOTHING
        `);
      }
    } else if (input.destinatariTipo === "tutti" || input.destinatariTipo === "gruppo") {
      // Insert recipients based on filters
      await ctx.db.execute(sql`
        INSERT INTO comunicazioni_destinatari (comunicazione_id, socio_id)
        SELECT ${comunicazione.id as string}, s.id
        FROM soci s
        WHERE s.tenant_id = ${tenantId}
          ${input.filtroStato ? sql`AND s.stato = ${input.filtroStato}` : sql`AND s.stato = 'attivo'`}
          ${input.filtroDisciplina ? sql`AND s.disciplina = ${input.filtroDisciplina}` : sql``}
          ${input.filtroTipologia ? sql`AND s.tipologia = ${input.filtroTipologia}` : sql``}
      `);
    }

    return comunicazione;
  }),

  /**
   * Update a comunicazione (only in bozza/programmata state).
   */
  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const { id, ...data } = input;

    // Verify it's in an editable state
    const checkResult = await ctx.db.execute(sql`
      SELECT stato FROM comunicazioni
      WHERE id = ${id} AND tenant_id = ${tenantId}
      LIMIT 1
    `);

    const checkRows = checkResult as unknown as Array<Record<string, unknown>>;
    if (checkRows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
    }

    const currentStato = checkRows[0]!.stato;
    if (currentStato !== "bozza" && currentStato !== "programmata") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Solo le comunicazioni in bozza o programmate possono essere modificate.",
      });
    }

    const setClauses: Array<ReturnType<typeof sql>> = [];
    if (data.oggetto !== undefined) setClauses.push(sql`oggetto = ${data.oggetto}`);
    if (data.corpo !== undefined) setClauses.push(sql`corpo = ${data.corpo}`);
    if (data.canale !== undefined) setClauses.push(sql`canale = ${data.canale}`);
    if (data.programmatoA !== undefined) setClauses.push(sql`programmato_a = ${data.programmatoA}`);
    if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
    setClauses.push(sql`updated_at = NOW()`);

    const setClause = sql.join(setClauses, sql`, `);
    const result = await ctx.db.execute(sql`
      UPDATE comunicazioni SET ${setClause}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows[0];
  }),

  /**
   * Send a comunicazione immediately via the tenant's email integration.
   */
  invia: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // Load the comunicazione and its recipients
      const [comResult, destResult] = await Promise.all([
        ctx.db.execute(sql`
          SELECT * FROM comunicazioni
          WHERE id = ${input.id} AND tenant_id = ${tenantId}
            AND stato IN ('bozza', 'programmata')
          LIMIT 1
        `),
        ctx.db.execute(sql`
          SELECT s.email, s.nome, s.cognome
          FROM comunicazioni_destinatari cd
          JOIN soci s ON s.id = cd.socio_id
          WHERE cd.comunicazione_id = ${input.id}
            AND s.email IS NOT NULL
          ORDER BY s.cognome
        `),
      ]);

      const comRows = comResult as unknown as Array<Record<string, unknown>>;
      if (comRows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Comunicazione non trovata o già inviata.",
        });
      }

      const comunicazione = comRows[0]!;
      const destinatari = destResult as unknown as Array<Record<string, unknown>>;

      let inviate = 0;
      let errori = 0;

      if (comunicazione.canale === "email" && destinatari.length > 0) {
        try {
          const emailProvider = await getEmailProvider(tenantId);
          const emails = destinatari
            .map((d) => String(d.email ?? ""))
            .filter(Boolean);

          if (emails.length > 0) {
            await emailProvider.sendBatch(
              emails.map((to) => ({
                to,
                subject: String(comunicazione.oggetto ?? ""),
                html: String(comunicazione.corpo ?? ""),
              })),
            );
            inviate = emails.length;
          }
        } catch (err) {
          // Mark as error state but don't throw — record the attempt
          errori = destinatari.length;
          await ctx.db.execute(sql`
            UPDATE comunicazioni
            SET stato = 'errore', updated_at = NOW()
            WHERE id = ${input.id} AND tenant_id = ${tenantId}
            RETURNING id
          `);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Errore invio email: ${String(err instanceof Error ? err.message : err)}`,
          });
        }
      }

      const result = await ctx.db.execute(sql`
        UPDATE comunicazioni
        SET stato = 'inviata', inviata_il = NOW(), updated_at = NOW()
        WHERE id = ${input.id} AND tenant_id = ${tenantId}
        RETURNING *
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      return { ...rows[0], inviate, errori };
    }),

  /**
   * Delete a comunicazione (only drafts).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        DELETE FROM comunicazioni
        WHERE id = ${input.id} AND tenant_id = ${tenantId} AND stato = 'bozza'
        RETURNING id
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo le comunicazioni in bozza possono essere eliminate.",
        });
      }

      return { success: true };
    }),
});
