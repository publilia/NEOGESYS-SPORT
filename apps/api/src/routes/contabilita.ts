import { primaNotaMovimenti, soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listMovimentiInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	tipo: z.enum(["entrata", "uscita"]).optional(),
	categoriaContabile: z.string().optional(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
});

const createMovimentoInput = z.object({
	tipo: z.enum(["entrata", "uscita"]),
	causale: z.string().min(1).max(200),
	descrizione: z.string().optional(),
	importo: z.number().min(0),
	data: z.string().datetime(),
	categoriaContabile: z.string().max(100).optional(),
	quotaId: z.string().uuid().optional(),
	socioId: z.string().uuid().optional(),
	documentoUrl: z.string().optional(),
	note: z.string().optional(),
});

const updateMovimentoInput = createMovimentoInput.partial().extend({
	id: z.string().uuid(),
});

const reportInput = z.object({
	dataInizio: z.string().datetime(),
	dataFine: z.string().datetime(),
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
	listMovimenti: protectedProcedure.input(listMovimentiInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const conds = [eq(primaNotaMovimenti.tenantId, tenantId)];
		if (input.tipo) conds.push(eq(primaNotaMovimenti.tipo, input.tipo));
		if (input.categoriaContabile)
			conds.push(eq(primaNotaMovimenti.categoriaContabile, input.categoriaContabile));
		if (input.dataInizio)
			conds.push(gte(primaNotaMovimenti.data, new Date(input.dataInizio)));
		if (input.dataFine) conds.push(lte(primaNotaMovimenti.data, new Date(input.dataFine)));

		const [items, totalRows] = await Promise.all([
			ctx.db
				.select({
					id: primaNotaMovimenti.id,
					tipo: primaNotaMovimenti.tipo,
					causale: primaNotaMovimenti.causale,
					descrizione: primaNotaMovimenti.descrizione,
					importo: primaNotaMovimenti.importo,
					data: primaNotaMovimenti.data,
					categoriaContabile: primaNotaMovimenti.categoriaContabile,
					quotaId: primaNotaMovimenti.quotaId,
					socioId: primaNotaMovimenti.socioId,
					socioNome: soci.nome,
					socioCognome: soci.cognome,
					note: primaNotaMovimenti.note,
					createdAt: primaNotaMovimenti.createdAt,
				})
				.from(primaNotaMovimenti)
				.leftJoin(soci, eq(primaNotaMovimenti.socioId, soci.id))
				.where(and(...conds))
				.orderBy(desc(primaNotaMovimenti.data))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(primaNotaMovimenti)
				.where(and(...conds)),
		]);
		const total = totalRows[0]?.value ?? 0;

		return {
			items,
			total: Number(total),
			page,
			perPage,
			totalPages: Math.ceil(Number(total) / perPage),
		};
	}),

	getMovimento: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [row] = await ctx.db
				.select()
				.from(primaNotaMovimenti)
				.where(
					and(
						eq(primaNotaMovimenti.id, input.id),
						eq(primaNotaMovimenti.tenantId, tenantId),
					),
				)
				.limit(1);
			if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
			return row;
		}),

	createMovimento: adminProcedure.input(createMovimentoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const [row] = await ctx.db
			.insert(primaNotaMovimenti)
			.values({
				tenantId,
				tipo: input.tipo,
				causale: input.causale,
				descrizione: input.descrizione ?? null,
				importo: String(input.importo),
				data: new Date(input.data),
				categoriaContabile: input.categoriaContabile ?? null,
				quotaId: input.quotaId ?? null,
				socioId: input.socioId ?? null,
				documentoUrl: input.documentoUrl ?? null,
				note: input.note ?? null,
			})
			.returning();
		return row;
	}),

	updateMovimento: adminProcedure.input(updateMovimentoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;
		const patch: Record<string, unknown> = { updatedAt: new Date() };
		if (data.tipo !== undefined) patch.tipo = data.tipo;
		if (data.causale !== undefined) patch.causale = data.causale;
		if (data.descrizione !== undefined) patch.descrizione = data.descrizione;
		if (data.importo !== undefined) patch.importo = String(data.importo);
		if (data.data !== undefined) patch.data = new Date(data.data);
		if (data.categoriaContabile !== undefined)
			patch.categoriaContabile = data.categoriaContabile;
		if (data.quotaId !== undefined) patch.quotaId = data.quotaId;
		if (data.socioId !== undefined) patch.socioId = data.socioId;
		if (data.documentoUrl !== undefined) patch.documentoUrl = data.documentoUrl;
		if (data.note !== undefined) patch.note = data.note;

		const [updated] = await ctx.db
			.update(primaNotaMovimenti)
			.set(patch)
			.where(
				and(eq(primaNotaMovimenti.id, id), eq(primaNotaMovimenti.tenantId, tenantId)),
			)
			.returning();
		if (!updated)
			throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
		return updated;
	}),

	deleteMovimento: adminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(primaNotaMovimenti)
				.where(
					and(
						eq(primaNotaMovimenti.id, input.id),
						eq(primaNotaMovimenti.tenantId, tenantId),
					),
				)
				.returning({ id: primaNotaMovimenti.id });
			if (!deleted)
				throw new TRPCError({ code: "NOT_FOUND", message: "Movimento non trovato." });
			return { success: true };
		}),

	report: protectedProcedure.input(reportInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const start = new Date(input.dataInizio);
		const end = new Date(input.dataFine);

		const totals = await ctx.db
			.select({
				tipo: primaNotaMovimenti.tipo,
				totale: sum(primaNotaMovimenti.importo),
			})
			.from(primaNotaMovimenti)
			.where(
				and(
					eq(primaNotaMovimenti.tenantId, tenantId),
					gte(primaNotaMovimenti.data, start),
					lte(primaNotaMovimenti.data, end),
				),
			)
			.groupBy(primaNotaMovimenti.tipo);

		const byCategory = await ctx.db
			.select({
				categoria: primaNotaMovimenti.categoriaContabile,
				tipo: primaNotaMovimenti.tipo,
				totale: sum(primaNotaMovimenti.importo),
				count: count(),
			})
			.from(primaNotaMovimenti)
			.where(
				and(
					eq(primaNotaMovimenti.tenantId, tenantId),
					gte(primaNotaMovimenti.data, start),
					lte(primaNotaMovimenti.data, end),
				),
			)
			.groupBy(primaNotaMovimenti.categoriaContabile, primaNotaMovimenti.tipo);

		const entrate = totals.find((t) => t.tipo === "entrata")?.totale ?? "0";
		const uscite = totals.find((t) => t.tipo === "uscita")?.totale ?? "0";
		return {
			periodo: { start: start.toISOString(), end: end.toISOString() },
			entrate: Number(entrate),
			uscite: Number(uscite),
			saldo: Number(entrate) - Number(uscite),
			byCategory: byCategory.map((r) => ({
				categoria: r.categoria ?? "(senza categoria)",
				tipo: r.tipo,
				totale: Number(r.totale ?? 0),
				count: Number(r.count),
			})),
		};
	}),

	categorieDiffuse: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const rows = await ctx.db
			.selectDistinct({ categoria: primaNotaMovimenti.categoriaContabile })
			.from(primaNotaMovimenti)
			.where(eq(primaNotaMovimenti.tenantId, tenantId));
		return rows
			.map((r) => r.categoria)
			.filter((c): c is string => c != null && c.length > 0)
			.sort();
	}),
});

void sql;
