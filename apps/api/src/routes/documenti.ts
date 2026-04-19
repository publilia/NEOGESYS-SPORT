import { createHash, createHmac } from "node:crypto";
import { consensiGdpr, documenti, soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	socioId: z.string().uuid().optional(),
	tipo: z.enum(["certificato", "ricevuta", "modulo", "liberatoria", "altro"]).optional(),
});

const createInput = z.object({
	socioId: z.string().uuid().optional(),
	tipo: z.enum(["certificato", "ricevuta", "modulo", "liberatoria", "altro"]),
	nome: z.string().min(1).max(300),
	fileUrl: z.string(),
	mimeType: z.string().max(100).optional(),
	dimensioneBytes: z.number().int().optional(),
	classificazioneAi: z.string().max(100).optional(),
});

const updateInput = z.object({
	id: z.string().uuid(),
	socioId: z.string().uuid().nullable().optional(),
	tipo: z.enum(["certificato", "ricevuta", "modulo", "liberatoria", "altro"]).optional(),
	nome: z.string().min(1).max(300).optional(),
	classificazioneAi: z.string().max(100).optional(),
});

const presignInput = z.object({
	fileName: z.string().min(1).max(300),
	contentType: z.string().min(1).max(100),
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
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const conds = [eq(documenti.tenantId, tenantId)];
		if (input.socioId) conds.push(eq(documenti.socioId, input.socioId));
		if (input.tipo) conds.push(eq(documenti.tipo, input.tipo));

		const [rows, totalRows] = await Promise.all([
			ctx.db
				.select({
					id: documenti.id,
					tenantId: documenti.tenantId,
					socioId: documenti.socioId,
					tipo: documenti.tipo,
					nome: documenti.nome,
					fileUrl: documenti.fileUrl,
					mimeType: documenti.mimeType,
					dimensioneBytes: documenti.dimensioneBytes,
					classificazioneAi: documenti.classificazioneAi,
					createdAt: documenti.createdAt,
					socioNome: soci.nome,
					socioCognome: soci.cognome,
				})
				.from(documenti)
				.leftJoin(soci, eq(documenti.socioId, soci.id))
				.where(and(...conds))
				.orderBy(desc(documenti.createdAt))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(documenti)
				.where(and(...conds)),
		]);
		const total = totalRows[0]?.value ?? 0;

		return {
			items: rows,
			total: Number(total),
			page,
			perPage,
			totalPages: Math.ceil(Number(total) / perPage),
		};
	}),

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [doc] = await ctx.db
				.select()
				.from(documenti)
				.where(and(eq(documenti.id, input.id), eq(documenti.tenantId, tenantId)))
				.limit(1);
			if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
			return doc;
		}),

	create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const [doc] = await ctx.db
			.insert(documenti)
			.values({
				tenantId,
				socioId: input.socioId ?? null,
				tipo: input.tipo,
				nome: input.nome,
				fileUrl: input.fileUrl,
				mimeType: input.mimeType ?? null,
				dimensioneBytes: input.dimensioneBytes ?? null,
				classificazioneAi: input.classificazioneAi ?? null,
			})
			.returning();
		return doc;
	}),

	update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;
		const patch: Record<string, unknown> = {};
		if (data.socioId !== undefined) patch.socioId = data.socioId;
		if (data.tipo !== undefined) patch.tipo = data.tipo;
		if (data.nome !== undefined) patch.nome = data.nome;
		if (data.classificazioneAi !== undefined) patch.classificazioneAi = data.classificazioneAi;

		if (Object.keys(patch).length === 0) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
		}

		const [updated] = await ctx.db
			.update(documenti)
			.set(patch)
			.where(and(eq(documenti.id, id), eq(documenti.tenantId, tenantId)))
			.returning();
		if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
		return updated;
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(documenti)
				.where(and(eq(documenti.id, input.id), eq(documenti.tenantId, tenantId)))
				.returning({ id: documenti.id });
			if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Documento non trovato." });
			return { success: true };
		}),

	/**
	 * Get a MinIO-compatible pre-signed URL for direct upload from the browser.
	 * Returns a stub URL in dev that the UI can POST to the API instead.
	 */
	getUploadUrl: protectedProcedure.input(presignInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const ts = Date.now();
		const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
		const key = `tenants/${tenantId}/documents/${ts}-${safeName}`;

		// Simple HMAC signature for dev purposes; in prod this would be S3/MinIO presign.
		const secret = process.env.UPLOAD_SIGN_SECRET || "neogesys-dev-upload-secret";
		const signature = createHmac("sha256", secret).update(key).digest("hex");
		const uploadUrl = `/uploads/${encodeURIComponent(key)}?sig=${signature}`;
		const fileUrl = `/files/${encodeURIComponent(key)}`;

		return {
			uploadUrl,
			fileUrl,
			key,
			expiresIn: 3600,
			checksum: createHash("sha256").update(key).digest("hex"),
		};
	}),

	getConsensi: protectedProcedure
		.input(z.object({ socioId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			return ctx.db
				.select()
				.from(consensiGdpr)
				.where(
					and(
						eq(consensiGdpr.socioId, input.socioId),
						eq(consensiGdpr.tenantId, tenantId),
					),
				)
				.orderBy(desc(consensiGdpr.createdAt));
		}),

	upsertConsenso: protectedProcedure
		.input(
			z.object({
				socioId: z.string().uuid(),
				tipoConsenso: z.string().max(50),
				acconsentito: z.boolean(),
				dettagli: z.record(z.unknown()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [row] = await ctx.db
				.insert(consensiGdpr)
				.values({
					tenantId,
					socioId: input.socioId,
					tipoConsenso: input.tipoConsenso,
					acconsentito: input.acconsentito,
					dataConsenso: new Date(),
					dettagli: input.dettagli ?? null,
				})
				.returning();
			return row;
		}),
});
