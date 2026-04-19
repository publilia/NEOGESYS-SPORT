import { comunicazioni, comunicazioniDestinatari, soci } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const listInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	tipo: z.enum(["email", "sms", "whatsapp", "push"]).optional(),
	stato: z.enum(["bozza", "inviata", "in_corso", "errore"]).optional(),
});

const createInput = z.object({
	oggetto: z.string().min(1).max(500),
	corpo: z.string().min(1),
	tipo: z.enum(["email", "sms", "whatsapp", "push"]),
	mittente: z.string().max(200).optional(),
	destinatariSoci: z.array(z.string().uuid()).default([]),
	destinatariQuery: z.record(z.unknown()).optional(),
	templateId: z.string().max(100).optional(),
	stato: z.enum(["bozza", "inviata", "in_corso", "errore"]).default("bozza"),
});

const updateInput = z.object({
	id: z.string().uuid(),
	oggetto: z.string().min(1).max(500).optional(),
	corpo: z.string().min(1).optional(),
	tipo: z.enum(["email", "sms", "whatsapp", "push"]).optional(),
	mittente: z.string().max(200).optional(),
	stato: z.enum(["bozza", "inviata", "in_corso", "errore"]).optional(),
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
	list: protectedProcedure.input(listInput).query(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { page, perPage } = input;
		const offset = (page - 1) * perPage;

		const conds = [eq(comunicazioni.tenantId, tenantId)];
		if (input.tipo) conds.push(eq(comunicazioni.tipo, input.tipo));
		if (input.stato) conds.push(eq(comunicazioni.stato, input.stato));

		const [items, totalRows] = await Promise.all([
			ctx.db
				.select()
				.from(comunicazioni)
				.where(and(...conds))
				.orderBy(desc(comunicazioni.createdAt))
				.limit(perPage)
				.offset(offset),
			ctx.db
				.select({ value: count() })
				.from(comunicazioni)
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
				.select()
				.from(comunicazioni)
				.where(and(eq(comunicazioni.id, input.id), eq(comunicazioni.tenantId, tenantId)))
				.limit(1);
			if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
			const destinatari = await ctx.db
				.select({
					id: comunicazioniDestinatari.id,
					socioId: comunicazioniDestinatari.socioId,
					canale: comunicazioniDestinatari.canale,
					indirizzo: comunicazioniDestinatari.indirizzo,
					stato: comunicazioniDestinatari.stato,
					inviatoAt: comunicazioniDestinatari.inviatoAt,
					nome: soci.nome,
					cognome: soci.cognome,
				})
				.from(comunicazioniDestinatari)
				.innerJoin(soci, eq(comunicazioniDestinatari.socioId, soci.id))
				.where(eq(comunicazioniDestinatari.comunicazioneId, row.id));
			return { ...row, destinatari };
		}),

	create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);

		const [created] = await ctx.db
			.insert(comunicazioni)
			.values({
				tenantId,
				tipo: input.tipo,
				oggetto: input.oggetto,
				corpo: input.corpo,
				mittente: input.mittente ?? null,
				destinatariQuery: input.destinatariQuery ?? null,
				templateId: input.templateId ?? null,
				stato: input.stato,
				inviataDa: ctx.user?.id ?? null,
			})
			.returning();
		if (!created) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Comunicazione non creata.",
			});
		}

		// Attach destinatari rows
		if (input.destinatariSoci.length > 0) {
			const sociRows = await ctx.db
				.select({ id: soci.id, email: soci.email, telefono: soci.telefono })
				.from(soci)
				.where(and(eq(soci.tenantId, tenantId), inArray(soci.id, input.destinatariSoci)));
			if (sociRows.length > 0) {
				await ctx.db.insert(comunicazioniDestinatari).values(
					sociRows.map((s) => ({
						comunicazioneId: created.id,
						socioId: s.id,
						canale: input.tipo,
						indirizzo: input.tipo === "email" ? (s.email ?? "") : (s.telefono ?? ""),
						stato: "pending" as const,
					})),
				);
			}
		}

		return created;
	}),

	update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		const { id, ...data } = input;
		const patch: Record<string, unknown> = {};
		if (data.oggetto !== undefined) patch.oggetto = data.oggetto;
		if (data.corpo !== undefined) patch.corpo = data.corpo;
		if (data.tipo !== undefined) patch.tipo = data.tipo;
		if (data.mittente !== undefined) patch.mittente = data.mittente;
		if (data.stato !== undefined) patch.stato = data.stato;

		if (Object.keys(patch).length === 0) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun campo da aggiornare." });
		}

		const [updated] = await ctx.db
			.update(comunicazioni)
			.set(patch)
			.where(and(eq(comunicazioni.id, id), eq(comunicazioni.tenantId, tenantId)))
			.returning();
		if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
		return updated;
	}),

	delete: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [deleted] = await ctx.db
				.delete(comunicazioni)
				.where(and(eq(comunicazioni.id, input.id), eq(comunicazioni.tenantId, tenantId)))
				.returning({ id: comunicazioni.id });
			if (!deleted)
				throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
			return { success: true };
		}),

	/**
	 * Mark a draft communication as sent. In dev this is a stub that just
	 * updates the stato and dataInvio; in prod this would call a real
	 * email/SMS provider.
	 */
	invia: protectedProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const [com] = await ctx.db
				.select()
				.from(comunicazioni)
				.where(and(eq(comunicazioni.id, input.id), eq(comunicazioni.tenantId, tenantId)))
				.limit(1);
			if (!com) throw new TRPCError({ code: "NOT_FOUND", message: "Comunicazione non trovata." });
			if (com.stato !== "bozza") {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Solo bozze possono essere inviate." });
			}

			const now = new Date();
			const [updated] = await ctx.db
				.update(comunicazioni)
				.set({ stato: "inviata", dataInvio: now })
				.where(eq(comunicazioni.id, input.id))
				.returning();
			await ctx.db
				.update(comunicazioniDestinatari)
				.set({ stato: "sent", inviatoAt: now })
				.where(eq(comunicazioniDestinatari.comunicazioneId, input.id));
			return updated;
		}),
});
