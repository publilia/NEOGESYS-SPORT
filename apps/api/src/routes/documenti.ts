import { z } from "zod";
import { sql } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";
import { createHmac, createHash } from "node:crypto";

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

/** Extract the S3 object key from a full storage URL. */
function extractS3Key(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    // URL format: http(s)://<endpoint>/<bucket>/<key>
    // Remove leading slash and bucket segment
    const parts = url.pathname.split("/").filter(Boolean);
    // parts[0] is bucket name, rest is the key
    return parts.slice(1).join("/");
  } catch {
    return fileUrl;
  }
}

/**
 * Generate an AWS SigV4 presigned PUT URL for MinIO/S3.
 * Expires in 15 minutes by default.
 */
function generatePresignedPutUrl(options: {
  endpoint: string;
  bucket: string;
  key: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  mimeType: string;
  expiresSeconds?: number;
}): string {
  const {
    endpoint,
    bucket,
    key,
    accessKeyId,
    secretAccessKey,
    region,
    mimeType,
    expiresSeconds = 900,
  } = options;

  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const amzdate = now.toISOString().replace(/[:-]/g, "").slice(0, 15) + "Z"; // YYYYMMDDTHHmmssZ
  const credentialScope = `${datestamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const signedHeaders = "host";
  const host = new URL(endpoint).host;

  // Canonical query string (sorted alphabetically)
  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzdate,
    "X-Amz-Expires": String(expiresSeconds),
    "X-Amz-SignedHeaders": signedHeaders,
  });
  // URLSearchParams sorts keys; convert to sorted string
  const canonicalQueryString = Array.from(queryParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalHeaders = `host:${host}\n`;
  const canonicalUri = `/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzdate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  const hmac = (key: Buffer | string, data: string): Buffer =>
    createHmac("sha256", key).update(data).digest();

  const signingKey = hmac(
    hmac(
      hmac(
        hmac(`AWS4${secretAccessKey}`, datestamp),
        region,
      ),
      "s3",
    ),
    "aws4_request",
  );

  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return `${endpoint}/${bucket}/${canonicalUri.slice(bucket.length + 2)}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
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
   * Delete a document record and its file from object storage.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.db.execute(sql`
        DELETE FROM documenti
        WHERE id = ${input.id} AND tenant_id = ${tenantId}
        RETURNING id, file_url
      `);

      const rows = result as unknown as Array<Record<string, unknown>>;
      if (rows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
      }

      // Best-effort: delete from object storage after DB record is removed
      const fileUrl = String(rows[0]!.file_url ?? "");
      if (fileUrl) {
        try {
          const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
          const bucket = process.env.S3_BUCKET ?? "neogesys-sport";
          const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? "minioadmin";
          const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin";
          const key = extractS3Key(fileUrl);
          const authToken = Buffer.from(`${accessKeyId}:${secretAccessKey}`).toString("base64");
          await fetch(`${endpoint}/${bucket}/${key}`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${authToken}` },
          });
        } catch {
          // Non-fatal: log but don't fail the operation
        }
      }

      return { success: true };
    }),

  /**
   * Get a SigV4 pre-signed PUT URL for uploading a new document to MinIO/S3.
   * The client should PUT the file directly to this URL within 15 minutes.
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

      const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:9000";
      const bucket = process.env.S3_BUCKET ?? "neogesys-sport";
      const accessKeyId = process.env.S3_ACCESS_KEY_ID ?? "minioadmin";
      const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY ?? "minioadmin";
      const region = process.env.S3_REGION ?? "us-east-1";

      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `tenants/${tenantId}/${Date.now()}_${safeFileName}`;

      const uploadUrl = generatePresignedPutUrl({
        endpoint,
        bucket,
        key,
        accessKeyId,
        secretAccessKey,
        region,
        mimeType: input.mimeType,
        expiresSeconds: 900, // 15 minutes
      });

      // The public/internal URL the file will be reachable at after upload
      const publicUrl = process.env.S3_PUBLIC_URL
        ? `${process.env.S3_PUBLIC_URL}/${bucket}/${key}`
        : `${endpoint}/${bucket}/${key}`;

      return {
        uploadUrl,
        key,
        fileUrl: publicUrl,
        expiresIn: 900,
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
