import { eventi, iscrizioniEvento, soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	tipo: z.enum(["gara", "torneo", "stage", "saggio", "raduno"]).optional(),
	disciplina: z.string().optional(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
});

const createEventoInput = z.object({
	nome: z.string().min(1).max(300),
	tipo: z.enum(["gara", "torneo", "stage", "saggio", "raduno"]),
	descrizione: z.string().optional(),
	dataInizio: z.string().datetime(),
	dataFine: z.string().datetime().optional(),
	luogo: z.string().max(300).optional(),
	disciplina: z.string().max(100).optional(),
	categoria: z.string().max(100).optional(),
	iscrizioniAperte: z.boolean().default(false),
	deadlineIscrizione: z.string().datetime().optional(),
	quotaIscrizione: z.number().min(0).optional(),
	maxPartecipanti: z.number().int().min(1).optional(),
});

const updateEventoInput = createEventoInput.partial().extend({
	id: z.string().uuid(),
});

const iscriviInput = z.object({
	eventoId: z.string().uuid(),
	socioId: z.string().uuid(),
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

export const eventiRouter = router({
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const conds = [eq(eventi.tenantId, tenantId)];
		if (input.tipo) conds.push(eq(eventi.tipo, input.tipo));
		if (input.disciplina) conds.push(eq(eventi.disciplina, input.disciplina));
		if (input.dataInizio) conds.push(gte(eventi.dataInizio, new Date(input.dataInizio)));
		if (input.dataFine) conds.push(lte(eventi.dataInizio, new Date(input.dataFine)));

		const [items, totalRows] = await Promise.all([
			ctx.db
				.select()
				.from(eventi)
				.where(and(...conds))
				.orderBy(desc(eventi.dataInizio))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(eventi)
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
			const [evento] = await ctx.db
				.select()
				.from(eventi)
				.where(and(eq(eventi.id, input.id), eq(eventi.tenantId, tenantId)))
				.limit(1);
			if (!evento) throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });

			const countRows = await ctx.db
				.select({ value: count() })
				.from(iscrizioniEvento)
				.where(eq(iscrizioniEvento.eventoId, evento.id));
			const iscrittiCount = countRows[0]?.value ?? 0;
			return { ...evento, iscrittiCount: Number(iscrittiCount) };
		}),

	create: protectedProcedure.input(createEventoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const [evento] = await ctx.db
			.insert(eventi)
			.values({
				tenantId,
				nome: input.nome,
				tipo: input.tipo,
				descrizione: input.descrizione ?? null,
				dataInizio: new Date(input.dataInizio),
				dataFine: input.dataFine ? new Date(input.dataFine) : null,
				luogo: input.luogo ?? null,
				disciplina: input.disciplina ?? null,
				categoria: input.categoria ?? null,
				iscrizioniAperte: input.iscrizioniAperte,
				deadlineIscrizione: input.deadlineIscrizione ? new Date(input.deadlineIscrizione) : null,
				quotaIscrizione: input.quotaIscrizione != null ? String(input.quotaIscrizione) : null,
				maxPartecipanti: input.maxPartecipanti ?? null,
			})
			.returning();
		return evento;
	}),

	update: protectedProcedure.input(updateEventoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;
		const patch: Record<string, unknown> = { updatedAt: new Date() };
		if (data.nome !== undefined) patch.nome = data.nome;
		if (data.tipo !== undefined) patch.tipo = data.tipo;
		if (data.descrizione !== undefined) patch.descrizione = data.descrizione;
		if (data.dataInizio !== undefined) patch.dataInizio = new Date(data.dataInizio);
		if (data.dataFine !== undefined)
			patch.dataFine = data.dataFine ? new Date(data.dataFine) : null;
		if (data.luogo !== undefined) patch.luogo = data.luogo;
		if (data.disciplina !== undefined) patch.disciplina = data.disciplina;
		if (data.categoria !== undefined) patch.categoria = data.categoria;
		if (data.iscrizioniAperte !== undefined) patch.iscrizioniAperte = data.iscrizioniAperte;
		if (data.deadlineIscrizione !== undefined)
			patch.deadlineIscrizione = data.deadlineIscrizione ? new Date(data.deadlineIscrizione) : null;
		if (data.quotaIscrizione !== undefined)
			patch.quotaIscrizione = data.quotaIscrizione != null ? String(data.quotaIscrizione) : null;
		if (data.maxPartecipanti !== undefined) patch.maxPartecipanti = data.maxPartecipanti;

		const [updated] = await ctx.db
			.update(eventi)
			.set(patch)
			.where(and(eq(eventi.id, id), eq(eventi.tenantId, tenantId)))
			.returning();
		if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });
		return updated;
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(eventi)
				.where(and(eq(eventi.id, input.id), eq(eventi.tenantId, tenantId)))
				.returning({ id: eventi.id });
			if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });
			return { success: true };
		}),

	iscrivi: protectedProcedure.input(iscriviInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const [evento] = await ctx.db
			.select({ id: eventi.id, maxPartecipanti: eventi.maxPartecipanti })
			.from(eventi)
			.where(and(eq(eventi.id, input.eventoId), eq(eventi.tenantId, tenantId)))
			.limit(1);
		if (!evento) throw new TRPCError({ code: "NOT_FOUND", message: "Evento non trovato." });

		const [existing] = await ctx.db
			.select({ id: iscrizioniEvento.id })
			.from(iscrizioniEvento)
			.where(
				and(
					eq(iscrizioniEvento.eventoId, input.eventoId),
					eq(iscrizioniEvento.socioId, input.socioId),
				),
			)
			.limit(1);
		if (existing)
			throw new TRPCError({ code: "CONFLICT", message: "Socio gia' iscritto all'evento." });

		if (evento.maxPartecipanti) {
			const iscrittiRows = await ctx.db
				.select({ value: count() })
				.from(iscrizioniEvento)
				.where(eq(iscrizioniEvento.eventoId, evento.id));
			const iscritti = iscrittiRows[0]?.value ?? 0;
			if (Number(iscritti) >= evento.maxPartecipanti) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Evento al completo." });
			}
		}

		const [created] = await ctx.db
			.insert(iscrizioniEvento)
			.values({
				tenantId,
				eventoId: input.eventoId,
				socioId: input.socioId,
				stato: "confermata",
				note: input.note ?? null,
			})
			.returning();
		return created;
	}),

	disiscrivi: protectedProcedure
		.input(z.object({ eventoId: z.string().uuid(), socioId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(iscrizioniEvento)
				.where(
					and(
						eq(iscrizioniEvento.eventoId, input.eventoId),
						eq(iscrizioniEvento.socioId, input.socioId),
						eq(iscrizioniEvento.tenantId, tenantId),
					),
				)
				.returning({ id: iscrizioniEvento.id });
			if (!deleted)
				throw new TRPCError({ code: "NOT_FOUND", message: "Iscrizione non trovata." });
			return { success: true };
		}),

	listIscritti: protectedProcedure
		.input(z.object({ eventoId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			return ctx.db
				.select({
					id: iscrizioniEvento.id,
					socioId: iscrizioniEvento.socioId,
					dataIscrizione: iscrizioniEvento.dataIscrizione,
					stato: iscrizioniEvento.stato,
					note: iscrizioniEvento.note,
					nome: soci.nome,
					cognome: soci.cognome,
					codiceTessera: soci.codiceTessera,
				})
				.from(iscrizioniEvento)
				.innerJoin(soci, eq(iscrizioniEvento.socioId, soci.id))
				.where(
					and(
						eq(iscrizioniEvento.eventoId, input.eventoId),
						eq(iscrizioniEvento.tenantId, tenantId),
					),
				)
				.orderBy(asc(soci.cognome));
		}),

	getCalendario: protectedProcedure
		.input(z.object({ start: z.string().datetime(), end: z.string().datetime() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const rows = await ctx.db
				.select()
				.from(eventi)
				.where(
					and(
						eq(eventi.tenantId, tenantId),
						gte(eventi.dataInizio, new Date(input.start)),
						lte(eventi.dataInizio, new Date(input.end)),
					),
				)
				.orderBy(asc(eventi.dataInizio));
			return rows.map((e) => ({
				id: e.id,
				title: e.nome,
				tipo: e.tipo,
				luogo: e.luogo,
				start: e.dataInizio,
				end: e.dataFine ?? e.dataInizio,
				disciplina: e.disciplina,
			}));
		}),
});
