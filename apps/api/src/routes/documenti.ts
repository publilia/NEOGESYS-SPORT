import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  socioId: z.string().uuid().optional(),
  tipo: z.string().optional(),
  categoria: z.string().optional(),
});

const createInput = z.object({
  socioId: z.string().uuid().optional(),
  tipo: z.string().max(50),
  categoria: z.string().max(100).optional(),
  titolo: z.string().min(1).max(300),
  descrizione: z.string().optional(),
  fileUrl: z.string().url(),
  fileName: z.string().max(300),
  fileMimeType: z.string().max(100).optional(),
  fileSizeBytes: z.number().int().optional(),
  note: z.string().optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  titolo: z.string().min(1).max(300).optional(),
  descrizione: z.string().optional(),
  tipo: z.string().max(50).optional(),
  categoria: z.string().max(100).optional(),
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

export const documentiRouter = router({
  /**
   * List documenti with pagination and optional filters.
   */
  list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const offset = (input.page - 1) * input.perPage;

    const result = await ctx.db.execute(sql`
      SELECT d.*,
        s.nome AS socio_nome, s.cognome AS socio_cognome,
        count(*) OVER() AS total_count
      FROM documenti d
      LEFT JOIN soci s ON s.id = d.socio_id
      WHERE d.tenant_id = ${tenantId}
        ${input.socioId ? sql`AND d.socio_id = ${input.socioId}` : sql``}
        ${input.tipo ? sql`AND d.tipo = ${input.tipo}` : sql``}
        ${input.categoria ? sql`AND d.categoria = ${input.categoria}` : sql``}
      ORDER BY d.created_at DESC
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
   * Get a single documento by ID.
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        SELECT d.*, s.nome AS socio_nome, s.cognome AS socio_cognome
        FROM documenti d
        LEFT JOIN soci s ON s.id = d.socio_id
        WHERE d.id = ${input.id} AND d.tenant_id = ${tenantId}
        LIMIT 1
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
      }

      return rows[0];
    }),

  /**
   * Create a document record (file should already be uploaded).
   */
  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const result = await ctx.db.execute(sql`
      INSERT INTO documenti (tenant_id, socio_id, tipo, categoria, titolo,
        descrizione, file_url, file_name, file_mime_type, file_size_bytes,
        note, caricato_da_id)
      VALUES (
        ${tenantId}, ${input.socioId ?? null}, ${input.tipo},
        ${input.categoria ?? null}, ${input.titolo}, ${input.descrizione ?? null},
        ${input.fileUrl}, ${input.fileName}, ${input.fileMimeType ?? null},
        ${input.fileSizeBytes ?? null}, ${input.note ?? null}, ${ctx.user?.id ?? null}
      )
      RETURNING *
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    return rows[0];
  }),

  /**
   * Update document metadata.
   */
  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);
    const { id, ...data } = input;

    const setClauses: Array<ReturnType<typeof sql>> = [];
    if (data.titolo !== undefined) setClauses.push(sql`titolo = ${data.titolo}`);
    if (data.descrizione !== undefined) setClauses.push(sql`descrizione = ${data.descrizione}`);
    if (data.tipo !== undefined) setClauses.push(sql`tipo = ${data.tipo}`);
    if (data.categoria !== undefined) setClauses.push(sql`categoria = ${data.categoria}`);
    if (data.note !== undefined) setClauses.push(sql`note = ${data.note}`);
    setClauses.push(sql`updated_at = NOW()`);

    if (setClauses.length === 1) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
    }

    const setClause = sql.join(setClauses, sql`, `);
    const result = await ctx.db.execute(sql`
      UPDATE documenti SET ${setClause}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `);

    const rows = result as unknown as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
    }

    return rows[0];
  }),

  /**
   * Delete a document.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // TODO: Also delete the file from object storage

      const result = await ctx.db.execute(sql`
        DELETE FROM documenti
        WHERE id = ${input.id} AND tenant_id = ${tenantId}
        RETURNING id, file_url
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
      }

      return { success: true };
    }),

  /**
   * Get a pre-signed upload URL for a new document.
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().max(300),
        mimeType: z.string().max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      // TODO: Generate pre-signed URL from S3/MinIO integration
      // const s3Credentials = await ctx.vault.getCredentials(tenantId, 's3');
      // const uploadUrl = await generatePresignedUrl(s3Credentials, input.fileName, input.mimeType);

      return {
        uploadUrl: null as string | null, // Will be populated once S3 integration is implemented
        key: `${tenantId}/${Date.now()}_${input.fileName}`,
        message: "Upload URL generation non ancora implementata.",
      };
    }),

  /**
   * Manage GDPR consent records for a socio.
   */
  getConsensi: protectedProcedure
    .input(z.object({ socioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        SELECT * FROM consensi_gdpr
        WHERE socio_id = ${input.socioId} AND tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);

      return result as unknown as Array<Record<string, unknown>>;
    }),
});
