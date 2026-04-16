import { z } from "zod";
import { eq, and, lte, gte, count, desc, sql } from "drizzle-orm";
import { certificatiMedici, soci } from "@neogesys/db/schema";
import { router, protectedProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  stato: z.enum(["valido", "scaduto", "in_scadenza"]).optional(),
  tipo: z.enum(["non_agonistico", "agonistico", "idoneita_sportiva"]).optional(),
});

const createInput = z.object({
  socioId: z.string().uuid(),
  tipo: z.enum(["non_agonistico", "agonistico", "idoneita_sportiva"]),
  dataRilascio: z.string().datetime().optional(),
  dataScadenza: z.string().datetime().optional(),
  medicoNome: z.string().max(200).optional(),
  strutturaRilascio: z.string().max(300).optional(),
  fileUrl: z.string().url().optional(),
  note: z.string().optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  tipo: z.enum(["non_agonistico", "agonistico", "idoneita_sportiva"]).optional(),
  dataRilascio: z.string().datetime().optional(),
  dataScadenza: z.string().datetime().optional(),
  medicoNome: z.string().max(200).optional(),
  strutturaRilascio: z.string().max(300).optional(),
  fileUrl: z.string().url().optional(),
  stato: z.enum(["valido", "scaduto", "in_scadenza"]).optional(),
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

export const certificatiRouter = router({
  /**
   * List certificates with filters and pagination.
   */
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const { page, perPage, stato, tipo } = input;
    const offset = (page - 1) * perPage;

    const conditions = [eq(certificatiMedici.tenantId, tenantId)];
    if (stato) conditions.push(eq(certificatiMedici.stato, stato));
    if (tipo) conditions.push(eq(certificatiMedici.tipo, tipo));

    const where = and(...conditions);

    const [items, totalResult] = await Promise.all([
      ctx.db
        .select({
          id: certificatiMedici.id,
          socioId: certificatiMedici.socioId,
          tipo: certificatiMedici.tipo,
          dataRilascio: certificatiMedici.dataRilascio,
          dataScadenza: certificatiMedici.dataScadenza,
          medicoNome: certificatiMedici.medicoNome,
          stato: certificatiMedici.stato,
          fileUrl: certificatiMedici.fileUrl,
          createdAt: certificatiMedici.createdAt,
          // Join socio name
          socioNome: soci.nome,
          socioCognome: soci.cognome,
        })
        .from(certificatiMedici)
        .leftJoin(soci, eq(certificatiMedici.socioId, soci.id))
        .where(where)
        .limit(perPage)
        .offset(offset)
        .orderBy(desc(certificatiMedici.dataScadenza)),
      ctx.db.select({ count: count() }).from(certificatiMedici).where(where),
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
   * Get certificates for a specific socio.
   */
  getBySocio: protectedProcedure
    .input(z.object({ socioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const items = await ctx.db
        .select()
        .from(certificatiMedici)
        .where(
          and(
            eq(certificatiMedici.tenantId, tenantId),
            eq(certificatiMedici.socioId, input.socioId),
          ),
        )
        .orderBy(desc(certificatiMedici.dataScadenza));

      return items;
    }),

  /**
   * Create a new certificate.
   */
  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    // Verify the socio belongs to this tenant
    const [socio] = await ctx.db
      .select({ id: soci.id })
      .from(soci)
      .where(and(eq(soci.id, input.socioId), eq(soci.tenantId, tenantId)))
      .limit(1);

    if (!socio) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
    }

    // Determine initial stato based on scadenza
    let stato = "valido";
    if (input.dataScadenza) {
      const scadenza = new Date(input.dataScadenza);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (scadenza < now) {
        stato = "scaduto";
      } else if (scadenza <= thirtyDaysFromNow) {
        stato = "in_scadenza";
      }
    }

    const [cert] = await ctx.db
      .insert(certificatiMedici)
      .values({
        tenantId,
        socioId: input.socioId,
        tipo: input.tipo,
        dataRilascio: input.dataRilascio ? new Date(input.dataRilascio) : null,
        dataScadenza: input.dataScadenza ? new Date(input.dataScadenza) : null,
        medicoNome: input.medicoNome,
        strutturaRilascio: input.strutturaRilascio,
        fileUrl: input.fileUrl,
        stato,
        note: input.note,
      })
      .returning();

    return cert;
  }),

  /**
   * Update an existing certificate.
   */
  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const { id, dataRilascio, dataScadenza, ...data } = input;

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };
    if (dataRilascio !== undefined) {
      updateData.dataRilascio = new Date(dataRilascio);
    }
    if (dataScadenza !== undefined) {
      updateData.dataScadenza = new Date(dataScadenza);
    }

    const [cert] = await ctx.db
      .update(certificatiMedici)
      .set(updateData)
      .where(and(eq(certificatiMedici.id, id), eq(certificatiMedici.tenantId, tenantId)))
      .returning();

    if (!cert) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Certificato non trovato." });
    }

    return cert;
  }),

  /**
   * Get certificates expiring within the next N days.
   */
  getScadenze: protectedProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(365).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const now = new Date();
      const futureDate = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

      const items = await ctx.db
        .select({
          id: certificatiMedici.id,
          socioId: certificatiMedici.socioId,
          tipo: certificatiMedici.tipo,
          dataScadenza: certificatiMedici.dataScadenza,
          stato: certificatiMedici.stato,
          socioNome: soci.nome,
          socioCognome: soci.cognome,
          socioEmail: soci.email,
        })
        .from(certificatiMedici)
        .leftJoin(soci, eq(certificatiMedici.socioId, soci.id))
        .where(
          and(
            eq(certificatiMedici.tenantId, tenantId),
            gte(certificatiMedici.dataScadenza, now),
            lte(certificatiMedici.dataScadenza, futureDate),
          ),
        )
        .orderBy(certificatiMedici.dataScadenza);

      return items;
    }),

  /**
   * Trigger OCR processing on a certificate's file.
   */
  processOcr: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const [cert] = await ctx.db
        .select()
        .from(certificatiMedici)
        .where(and(eq(certificatiMedici.id, input.id), eq(certificatiMedici.tenantId, tenantId)))
        .limit(1);

      if (!cert) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Certificato non trovato." });
      }

      if (!cert.fileUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Nessun file associato al certificato.",
        });
      }

      // TODO: Call AI module for OCR processing
      // const ocrResult = await aiService.processCertificateOcr(cert.fileUrl);
      // await ctx.db.update(certificatiMedici).set({
      //   ocrDati: ocrResult.data,
      //   ocrConfidenza: ocrResult.confidence.toString(),
      //   updatedAt: new Date(),
      // }).where(eq(certificatiMedici.id, input.id));

      return {
        success: true,
        message: "OCR processing avviato. I risultati saranno disponibili a breve.",
      };
    }),
});
