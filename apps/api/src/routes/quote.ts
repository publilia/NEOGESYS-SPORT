import { anniSportivi, primaNotaMovimenti, quote, soci, tenants, tipiQuota } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, gte, isNotNull, lt, lte, sql, sum } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const statoEnum = z.enum(["da_pagare", "parziale", "pagato", "esonerato"]);
const metodoEnum = z.enum(["contanti", "bonifico", "pos", "stripe", "satispay"]);

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	stato: statoEnum.optional(),
	socioId: z.string().uuid().optional(),
	annoSportivoId: z.string().uuid().optional(),
});

const createQuotaInput = z.object({
	socioId: z.string().uuid(),
	tipoQuotaId: z.string().uuid(),
	annoSportivoId: z.string().uuid().optional(),
	importo: z.number().min(0),
	dataEmissione: z.string().datetime().optional(),
	dataScadenza: z.string().datetime().optional(),
	note: z.string().optional(),
});

const updateQuotaInput = z.object({
	id: z.string().uuid(),
	importo: z.number().min(0).optional(),
	dataScadenza: z.string().datetime().nullable().optional(),
	stato: statoEnum.optional(),
	note: z.string().optional(),
});

const registraPagamentoInput = z.object({
	quotaId: z.string().uuid(),
	importoPagato: z.number().min(0),
	dataPagamento: z.string().datetime().optional(),
	metodoPagamento: metodoEnum,
	stripePaymentId: z.string().optional(),
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
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const conds = [eq(quote.tenantId, tenantId)];
		if (input.stato) conds.push(eq(quote.stato, input.stato));
		if (input.socioId) conds.push(eq(quote.socioId, input.socioId));
		if (input.annoSportivoId) conds.push(eq(quote.annoSportivoId, input.annoSportivoId));

		const [items, totalRows] = await Promise.all([
			ctx.db
				.select({
					id: quote.id,
					tenantId: quote.tenantId,
					socioId: quote.socioId,
					tipoQuotaId: quote.tipoQuotaId,
					annoSportivoId: quote.annoSportivoId,
					importo: quote.importo,
					importoPagato: quote.importoPagato,
					stato: quote.stato,
					dataEmissione: quote.dataEmissione,
					dataScadenza: quote.dataScadenza,
					dataPagamento: quote.dataPagamento,
					metodoPagamento: quote.metodoPagamento,
					note: quote.note,
					createdAt: quote.createdAt,
					socioNome: soci.nome,
					socioCognome: soci.cognome,
					socioEmail: soci.email,
					tipoQuotaNome: tipiQuota.nome,
					tipoQuotaTipo: tipiQuota.tipo,
				})
				.from(quote)
				.innerJoin(soci, eq(quote.socioId, soci.id))
				.leftJoin(tipiQuota, eq(quote.tipoQuotaId, tipiQuota.id))
				.where(and(...conds))
				.orderBy(desc(quote.dataEmissione))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(quote)
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

	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [row] = await ctx.db
				.select({
					id: quote.id,
					socioId: quote.socioId,
					tipoQuotaId: quote.tipoQuotaId,
					annoSportivoId: quote.annoSportivoId,
					importo: quote.importo,
					importoPagato: quote.importoPagato,
					stato: quote.stato,
					dataEmissione: quote.dataEmissione,
					dataScadenza: quote.dataScadenza,
					dataPagamento: quote.dataPagamento,
					metodoPagamento: quote.metodoPagamento,
					note: quote.note,
					createdAt: quote.createdAt,
					updatedAt: quote.updatedAt,
					socioNome: soci.nome,
					socioCognome: soci.cognome,
					socioCodiceFiscale: soci.codiceFiscale,
					tipoQuotaNome: tipiQuota.nome,
					tipoQuotaTipo: tipiQuota.tipo,
				})
				.from(quote)
				.innerJoin(soci, eq(quote.socioId, soci.id))
				.leftJoin(tipiQuota, eq(quote.tipoQuotaId, tipiQuota.id))
				.where(and(eq(quote.id, input.id), eq(quote.tenantId, tenantId)))
				.limit(1);
			if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
			return row;
		}),

	create: protectedProcedure.input(createQuotaInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const [socio] = await ctx.db
			.select({ id: soci.id })
			.from(soci)
			.where(and(eq(soci.id, input.socioId), eq(soci.tenantId, tenantId)))
			.limit(1);
		if (!socio) throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });

		const [tipo] = await ctx.db
			.select({ id: tipiQuota.id })
			.from(tipiQuota)
			.where(and(eq(tipiQuota.id, input.tipoQuotaId), eq(tipiQuota.tenantId, tenantId)))
			.limit(1);
		if (!tipo) throw new TRPCError({ code: "NOT_FOUND", message: "Tipo quota non trovato." });

		const [row] = await ctx.db
			.insert(quote)
			.values({
				tenantId,
				socioId: input.socioId,
				tipoQuotaId: input.tipoQuotaId,
				annoSportivoId: input.annoSportivoId ?? null,
				importo: String(input.importo),
				importoPagato: "0",
				stato: "da_pagare",
				dataEmissione: input.dataEmissione ? new Date(input.dataEmissione) : new Date(),
				dataScadenza: input.dataScadenza ? new Date(input.dataScadenza) : null,
				note: input.note ?? null,
			})
			.returning();
		return row;
	}),

	update: protectedProcedure.input(updateQuotaInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;
		const patch: Record<string, unknown> = { updatedAt: new Date() };
		if (data.importo !== undefined) patch.importo = String(data.importo);
		if (data.dataScadenza !== undefined)
			patch.dataScadenza = data.dataScadenza ? new Date(data.dataScadenza) : null;
		if (data.stato !== undefined) patch.stato = data.stato;
		if (data.note !== undefined) patch.note = data.note;

		const [updated] = await ctx.db
			.update(quote)
			.set(patch)
			.where(and(eq(quote.id, id), eq(quote.tenantId, tenantId)))
			.returning();
		if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
		return updated;
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(quote)
				.where(and(eq(quote.id, input.id), eq(quote.tenantId, tenantId)))
				.returning({ id: quote.id });
			if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
			return { success: true };
		}),

	registraPagamento: protectedProcedure
		.input(registraPagamentoInput)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [q] = await ctx.db
				.select()
				.from(quote)
				.where(and(eq(quote.id, input.quotaId), eq(quote.tenantId, tenantId)))
				.limit(1);
			if (!q) throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
			if (q.stato === "pagato")
				throw new TRPCError({ code: "BAD_REQUEST", message: "Quota gia' pagata." });

			const totalePagato = Number(q.importoPagato) + input.importoPagato;
			const importo = Number(q.importo);
			const nuovoStato: "pagato" | "parziale" = totalePagato >= importo ? "pagato" : "parziale";
			const dataPag = input.dataPagamento ? new Date(input.dataPagamento) : new Date();

			const [updated] = await ctx.db
				.update(quote)
				.set({
					stato: nuovoStato,
					importoPagato: String(totalePagato),
					dataPagamento: nuovoStato === "pagato" ? dataPag : null,
					metodoPagamento: input.metodoPagamento,
					stripePaymentId: input.stripePaymentId ?? null,
					note: input.note ? (q.note ? `${q.note}\n${input.note}` : input.note) : q.note,
					updatedAt: new Date(),
				})
				.where(eq(quote.id, input.quotaId))
				.returning();

			// Create matching accounting entry
			if (nuovoStato === "pagato" || nuovoStato === "parziale") {
				const [tq] = await ctx.db
					.select({ nome: tipiQuota.nome })
					.from(tipiQuota)
					.where(eq(tipiQuota.id, q.tipoQuotaId))
					.limit(1);
				await ctx.db.insert(primaNotaMovimenti).values({
					tenantId,
					tipo: "entrata",
					causale: `Pagamento quota ${tq?.nome ?? ""}`.trim(),
					descrizione: `Metodo: ${input.metodoPagamento}`,
					importo: String(input.importoPagato),
					data: dataPag,
					categoriaContabile: "quote_associative",
					quotaId: input.quotaId,
					socioId: q.socioId,
				});
			}

			return updated;
		}),

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

			const now = new Date();
			const conds = [
				eq(quote.tenantId, tenantId),
				eq(quote.stato, "da_pagare"),
				isNotNull(quote.dataScadenza),
				lt(quote.dataScadenza, now),
			];

			const [items, totalRows] = await Promise.all([
				ctx.db
					.select({
						id: quote.id,
						importo: quote.importo,
						importoPagato: quote.importoPagato,
						dataScadenza: quote.dataScadenza,
						stato: quote.stato,
						socioId: quote.socioId,
						socioNome: soci.nome,
						socioCognome: soci.cognome,
						socioEmail: soci.email,
						socioTelefono: soci.telefono,
					})
					.from(quote)
					.innerJoin(soci, eq(quote.socioId, soci.id))
					.where(and(...conds))
					.orderBy(quote.dataScadenza)
					.limit(input.perPage)
					.offset(offset),
				ctx.db
					.select({ value: count() })
					.from(quote)
					.where(and(...conds)),
			]);
			const total = totalRows[0]?.value ?? 0;

			return {
				items,
				total: Number(total),
				page: input.page,
				perPage: input.perPage,
				totalPages: Math.ceil(Number(total) / input.perPage),
			};
		}),

	generaRicevuta: protectedProcedure
		.input(z.object({ quotaId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [row] = await ctx.db
				.select({
					quota: quote,
					socioNome: soci.nome,
					socioCognome: soci.cognome,
					socioCodiceFiscale: soci.codiceFiscale,
					tenantRagioneSociale: tenants.ragioneSociale,
					tenantPartitaIva: tenants.partitaIva,
					tenantCodiceFiscale: tenants.codiceFiscale,
					tenantSedeLegale: tenants.sedeLegale,
				})
				.from(quote)
				.innerJoin(soci, eq(quote.socioId, soci.id))
				.innerJoin(tenants, eq(quote.tenantId, tenants.id))
				.where(and(eq(quote.id, input.quotaId), eq(quote.tenantId, tenantId)))
				.limit(1);
			if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Quota non trovata." });
			if (row.quota.stato !== "pagato") {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "La ricevuta puo' essere generata solo per quote pagate.",
				});
			}

			// TODO: wire into a real PDF generator. For now mark the ricevutaUrl
			// with a placeholder so the UI can render a download button.
			const url = `/api/ricevute/${input.quotaId}.pdf`;
			await ctx.db
				.update(quote)
				.set({ ricevutaUrl: url, updatedAt: new Date() })
				.where(eq(quote.id, input.quotaId));
			return { success: true, url };
		}),

	stats: protectedProcedure.input(statsInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const baseConds = [eq(quote.tenantId, tenantId)];
		if (input.annoSportivoId) baseConds.push(eq(quote.annoSportivoId, input.annoSportivoId));
		if (input.periodoInizio)
			baseConds.push(gte(quote.dataEmissione, new Date(input.periodoInizio)));
		if (input.periodoFine) baseConds.push(lte(quote.dataEmissione, new Date(input.periodoFine)));

		const totals = await ctx.db
			.select({
				stato: quote.stato,
				count: count(),
				totale: sum(quote.importo),
				totalePagato: sum(quote.importoPagato),
			})
			.from(quote)
			.where(and(...baseConds))
			.groupBy(quote.stato);

		const byDisciplina = await ctx.db
			.select({
				disciplina: soci.disciplina,
				count: count(),
				incassato: sum(quote.importoPagato),
			})
			.from(quote)
			.innerJoin(soci, eq(quote.socioId, soci.id))
			.where(and(...baseConds))
			.groupBy(soci.disciplina);

		const byMese = await ctx.db.execute(sql`
			SELECT
				date_trunc('month', data_pagamento) AS mese,
				count(*)::text AS count,
				COALESCE(SUM(importo_pagato), 0)::text AS incassato
			FROM quote
			WHERE tenant_id = ${tenantId}
				AND stato IN ('pagato', 'parziale')
				AND data_pagamento IS NOT NULL
				${input.periodoInizio ? sql`AND data_pagamento >= ${input.periodoInizio}` : sql``}
				${input.periodoFine ? sql`AND data_pagamento <= ${input.periodoFine}` : sql``}
			GROUP BY mese
			ORDER BY mese
		`);

		return {
			totals: totals.map((t) => ({
				stato: t.stato,
				count: Number(t.count),
				totale: Number(t.totale ?? 0),
				totalePagato: Number(t.totalePagato ?? 0),
			})),
			byDisciplina: byDisciplina.map((d) => ({
				disciplina: d.disciplina ?? "Senza disciplina",
				count: Number(d.count),
				incassato: Number(d.incassato ?? 0),
			})),
			byMese: (byMese as unknown as Array<{ mese: string; count: string; incassato: string }>).map(
				(r) => ({
					mese: r.mese,
					count: Number(r.count),
					incassato: Number(r.incassato),
				}),
			),
		};
	}),

	listTipiQuota: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		return ctx.db
			.select()
			.from(tipiQuota)
			.where(and(eq(tipiQuota.tenantId, tenantId), eq(tipiQuota.attivo, true)))
			.orderBy(tipiQuota.nome);
	}),

	listAnniSportivi: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		return ctx.db
			.select()
			.from(anniSportivi)
			.where(eq(anniSportivi.tenantId, tenantId))
			.orderBy(desc(anniSportivi.dataInizio));
	}),
});
