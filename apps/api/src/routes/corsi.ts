import { corsi, iscrizioniCorso, presenze, soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	disciplina: z.string().optional(),
	stato: z.enum(["attivo", "sospeso", "chiuso"]).optional(),
});

const orarioSchema = z.object({
	giorno: z.string(),
	oraInizio: z.string(),
	oraFine: z.string(),
});

const createCorsoInput = z.object({
	nome: z.string().min(1).max(200),
	disciplina: z.string().max(100).optional(),
	descrizione: z.string().optional(),
	livello: z.enum(["principiante", "intermedio", "avanzato", "agonistico"]).optional(),
	etaMin: z.number().int().min(0).optional(),
	etaMax: z.number().int().min(0).optional(),
	sedeNome: z.string().max(200).optional(),
	capacitaMax: z.number().int().min(1).optional(),
	orarioSettimanale: orarioSchema.array().optional(),
	quotaAssociata: z.number().min(0).optional(),
	stato: z.enum(["attivo", "sospeso", "chiuso"]).default("attivo"),
});

const updateCorsoInput = createCorsoInput.partial().extend({
	id: z.string().uuid(),
});

const iscriviInput = z.object({
	corsoId: z.string().uuid(),
	socioId: z.string().uuid(),
	dataInizio: z.string().datetime().optional(),
});

const registraPresenzaInput = z.object({
	corsoId: z.string().uuid(),
	socioId: z.string().uuid(),
	dataLezione: z.string().datetime(),
	presente: z.boolean(),
	note: z.string().optional(),
});

const getPresenzeInput = z.object({
	corsoId: z.string().uuid(),
	dataInizio: z.string().datetime().optional(),
	dataFine: z.string().datetime().optional(),
});

const calendarioInput = z.object({
	start: z.string().datetime(),
	end: z.string().datetime(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const corsiRouter = router({
	/**
	 * List corsi with pagination and filters.
	 */
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const whereConds = [eq(corsi.tenantId, tenantId)];
		if (input.disciplina) whereConds.push(eq(corsi.disciplina, input.disciplina));
		if (input.stato) whereConds.push(eq(corsi.stato, input.stato));

		const [items, totalRows] = await Promise.all([
			ctx.db
				.select()
				.from(corsi)
				.where(and(...whereConds))
				.orderBy(desc(corsi.createdAt))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(corsi)
				.where(and(...whereConds)),
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

	/**
	 * Get a single corso by ID.
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [corso] = await ctx.db
				.select()
				.from(corsi)
				.where(and(eq(corsi.id, input.id), eq(corsi.tenantId, tenantId)))
				.limit(1);

			if (!corso) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
			}

			// Count current enrollments
			const countRows = await ctx.db
				.select({ value: count() })
				.from(iscrizioniCorso)
				.where(eq(iscrizioniCorso.corsoId, corso.id));
			const iscrittiCount = countRows[0]?.value ?? 0;

			return { ...corso, iscrittiCount: Number(iscrittiCount) };
		}),

	/**
	 * Create a new corso.
	 */
	create: protectedProcedure.input(createCorsoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const [corso] = await ctx.db
			.insert(corsi)
			.values({
				tenantId,
				nome: input.nome,
				disciplina: input.disciplina ?? null,
				descrizione: input.descrizione ?? null,
				livello: input.livello ?? null,
				etaMin: input.etaMin ?? null,
				etaMax: input.etaMax ?? null,
				sedeNome: input.sedeNome ?? null,
				capacitaMax: input.capacitaMax ?? null,
				orarioSettimanale: input.orarioSettimanale ?? null,
				quotaAssociata: input.quotaAssociata != null ? String(input.quotaAssociata) : null,
				stato: input.stato,
			})
			.returning();
		return corso;
	}),

	/**
	 * Update an existing corso.
	 */
	update: protectedProcedure.input(updateCorsoInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;

		const updateData: Record<string, unknown> = { updatedAt: new Date() };
		if (data.nome !== undefined) updateData.nome = data.nome;
		if (data.disciplina !== undefined) updateData.disciplina = data.disciplina;
		if (data.descrizione !== undefined) updateData.descrizione = data.descrizione;
		if (data.livello !== undefined) updateData.livello = data.livello;
		if (data.etaMin !== undefined) updateData.etaMin = data.etaMin;
		if (data.etaMax !== undefined) updateData.etaMax = data.etaMax;
		if (data.sedeNome !== undefined) updateData.sedeNome = data.sedeNome;
		if (data.capacitaMax !== undefined) updateData.capacitaMax = data.capacitaMax;
		if (data.orarioSettimanale !== undefined) updateData.orarioSettimanale = data.orarioSettimanale;
		if (data.quotaAssociata !== undefined)
			updateData.quotaAssociata = data.quotaAssociata != null ? String(data.quotaAssociata) : null;
		if (data.stato !== undefined) updateData.stato = data.stato;

		const [updated] = await ctx.db
			.update(corsi)
			.set(updateData)
			.where(and(eq(corsi.id, id), eq(corsi.tenantId, tenantId)))
			.returning();

		if (!updated) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
		}
		return updated;
	}),

	/**
	 * Delete a corso (cascade removes iscrizioni and presenze).
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(corsi)
				.where(and(eq(corsi.id, input.id), eq(corsi.tenantId, tenantId)))
				.returning({ id: corsi.id });
			if (!deleted) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
			}
			return { success: true };
		}),

	/**
	 * Enroll a socio in a corso.
	 */
	iscrivi: protectedProcedure.input(iscriviInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		// Verify corso and socio belong to tenant + not already enrolled
		const [corso] = await ctx.db
			.select({ id: corsi.id, capacitaMax: corsi.capacitaMax })
			.from(corsi)
			.where(and(eq(corsi.id, input.corsoId), eq(corsi.tenantId, tenantId)))
			.limit(1);
		if (!corso) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Corso non trovato." });
		}

		const [socio] = await ctx.db
			.select({ id: soci.id })
			.from(soci)
			.where(and(eq(soci.id, input.socioId), eq(soci.tenantId, tenantId)))
			.limit(1);
		if (!socio) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Socio non trovato." });
		}

		const [existing] = await ctx.db
			.select({ id: iscrizioniCorso.id })
			.from(iscrizioniCorso)
			.where(
				and(eq(iscrizioniCorso.corsoId, input.corsoId), eq(iscrizioniCorso.socioId, input.socioId)),
			)
			.limit(1);
		if (existing) {
			throw new TRPCError({ code: "CONFLICT", message: "Socio gia' iscritto al corso." });
		}

		if (corso.capacitaMax) {
			const iscrittiRows = await ctx.db
				.select({ value: count() })
				.from(iscrizioniCorso)
				.where(eq(iscrizioniCorso.corsoId, corso.id));
			const iscritti = iscrittiRows[0]?.value ?? 0;
			if (Number(iscritti) >= corso.capacitaMax) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Capacita' massima raggiunta." });
			}
		}

		const [iscrizione] = await ctx.db
			.insert(iscrizioniCorso)
			.values({
				tenantId,
				corsoId: input.corsoId,
				socioId: input.socioId,
				dataInizio: input.dataInizio ? new Date(input.dataInizio) : new Date(),
				stato: "attivo",
			})
			.returning();
		return iscrizione;
	}),

	/**
	 * Unenroll a socio from a corso.
	 */
	disiscrivi: protectedProcedure
		.input(z.object({ corsoId: z.string().uuid(), socioId: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(iscrizioniCorso)
				.where(
					and(
						eq(iscrizioniCorso.corsoId, input.corsoId),
						eq(iscrizioniCorso.socioId, input.socioId),
						eq(iscrizioniCorso.tenantId, tenantId),
					),
				)
				.returning({ id: iscrizioniCorso.id });

			if (!deleted) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Iscrizione non trovata." });
			}
			return { success: true };
		}),

	/**
	 * List enrollments for a corso.
	 */
	listIscritti: protectedProcedure
		.input(z.object({ corsoId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			return ctx.db
				.select({
					id: iscrizioniCorso.id,
					socioId: iscrizioniCorso.socioId,
					dataInizio: iscrizioniCorso.dataInizio,
					dataFine: iscrizioniCorso.dataFine,
					stato: iscrizioniCorso.stato,
					nome: soci.nome,
					cognome: soci.cognome,
					codiceTessera: soci.codiceTessera,
				})
				.from(iscrizioniCorso)
				.innerJoin(soci, eq(iscrizioniCorso.socioId, soci.id))
				.where(
					and(eq(iscrizioniCorso.corsoId, input.corsoId), eq(iscrizioniCorso.tenantId, tenantId)),
				)
				.orderBy(asc(soci.cognome), asc(soci.nome));
		}),

	/**
	 * Register attendance for a lesson.
	 */
	registraPresenza: protectedProcedure
		.input(registraPresenzaInput)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);

			const [inserted] = await ctx.db
				.insert(presenze)
				.values({
					tenantId,
					corsoId: input.corsoId,
					socioId: input.socioId,
					dataLezione: new Date(input.dataLezione),
					presente: input.presente,
					note: input.note ?? null,
					registratoDa: ctx.user?.id ?? null,
				})
				.returning();
			return inserted;
		}),

	/**
	 * Get attendance report for a corso.
	 */
	getPresenze: protectedProcedure.input(getPresenzeInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const conds = [eq(presenze.corsoId, input.corsoId), eq(presenze.tenantId, tenantId)];
		if (input.dataInizio) conds.push(gte(presenze.dataLezione, new Date(input.dataInizio)));
		if (input.dataFine) conds.push(lte(presenze.dataLezione, new Date(input.dataFine)));

		return ctx.db
			.select({
				id: presenze.id,
				dataLezione: presenze.dataLezione,
				presente: presenze.presente,
				note: presenze.note,
				socioId: presenze.socioId,
				socioNome: soci.nome,
				socioCognome: soci.cognome,
			})
			.from(presenze)
			.innerJoin(soci, eq(presenze.socioId, soci.id))
			.where(and(...conds))
			.orderBy(desc(presenze.dataLezione), asc(soci.cognome));
	}),

	/**
	 * Get calendar data for FullCalendar integration.
	 * Expands orarioSettimanale patterns into concrete events within the range.
	 */
	getCalendario: protectedProcedure.input(calendarioInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const rows = await ctx.db
			.select({
				id: corsi.id,
				nome: corsi.nome,
				disciplina: corsi.disciplina,
				sedeNome: corsi.sedeNome,
				orarioSettimanale: corsi.orarioSettimanale,
				stato: corsi.stato,
			})
			.from(corsi)
			.where(and(eq(corsi.tenantId, tenantId), eq(corsi.stato, "attivo")));

		const weekDayMap: Record<string, number> = {
			lunedi: 1,
			martedi: 2,
			mercoledi: 3,
			giovedi: 4,
			venerdi: 5,
			sabato: 6,
			domenica: 0,
		};

		const start = new Date(input.start);
		const end = new Date(input.end);
		const events: Array<Record<string, unknown>> = [];

		for (const c of rows) {
			const orari = Array.isArray(c.orarioSettimanale)
				? (c.orarioSettimanale as Array<{ giorno: string; oraInizio: string; oraFine: string }>)
				: [];
			for (const o of orari) {
				const targetDay = weekDayMap[o.giorno.toLowerCase()] ?? -1;
				if (targetDay < 0) continue;
				const cursor = new Date(start);
				while (cursor <= end) {
					if (cursor.getDay() === targetDay) {
						const y = cursor.getFullYear();
						const m = String(cursor.getMonth() + 1).padStart(2, "0");
						const d = String(cursor.getDate()).padStart(2, "0");
						events.push({
							id: `${c.id}-${y}${m}${d}-${o.oraInizio}`,
							corsoId: c.id,
							title: `${c.nome} · ${o.giorno}`,
							disciplina: c.disciplina,
							sede: c.sedeNome,
							start: `${y}-${m}-${d}T${o.oraInizio}:00`,
							end: `${y}-${m}-${d}T${o.oraFine}:00`,
						});
					}
					cursor.setDate(cursor.getDate() + 1);
				}
			}
		}

		return events;
	}),

	/**
	 * Simple list of disciplines for filters.
	 */
	disciplines: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const rows = await ctx.db
			.selectDistinct({ disciplina: corsi.disciplina })
			.from(corsi)
			.where(eq(corsi.tenantId, tenantId));
		return rows
			.map((r) => r.disciplina)
			.filter((d): d is string => d != null && d.length > 0)
			.sort();
	}),
});

// Silence unused sql import (kept in case the router grows raw queries later).
void sql;
