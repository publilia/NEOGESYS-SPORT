import { z } from "zod";
import { eq, desc, sql, count, gte, and } from "drizzle-orm";
import {
  planiAbbonamento,
  fatturePiattaforma,
  tenantUsage,
  superAdminAuditLog,
  tenants,
} from "@neogesys/db";
import { router, superAdminProcedure, protectedProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Piani Router ─────────────────────────────────────────────────────────────

const planInput = z.object({
  codice: z.string().min(2).max(30),
  nome: z.string().min(1).max(100),
  descrizione: z.string().optional(),
  prezzoMensile: z.number().min(0),
  prezzoAnnuale: z.number().min(0),
  valuta: z.string().default("EUR"),
  maxSoci: z.number().int().min(0),
  maxUtenti: z.number().int().min(0),
  maxStorageMb: z.number().int().min(0),
  maxCorsi: z.number().int().optional(),
  maxEventi: z.number().int().optional(),
  aiAbilitato: z.boolean().default(false),
  integrazioniGoogle: z.boolean().default(false),
  integrazioniMicrosoft: z.boolean().default(false),
  customDomain: z.boolean().default(false),
  customPalette: z.boolean().default(false),
  fatturazioneSDI: z.boolean().default(false),
  exportAvanzato: z.boolean().default(false),
  supportoPrioritario: z.boolean().default(false),
  whiteLabel: z.boolean().default(false),
  ordine: z.number().int().default(0),
  colore: z.string().optional(),
  highlighted: z.boolean().default(false),
  attivo: z.boolean().default(true),
});

export const pianiRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db
      .select()
      .from(planiAbbonamento)
      .where(eq(planiAbbonamento.attivo, true))
      .orderBy(planiAbbonamento.ordine);
    return items;
  }),

  listAll: superAdminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(planiAbbonamento).orderBy(planiAbbonamento.ordine);
  }),

  getByCode: protectedProcedure
    .input(z.object({ codice: z.string() }))
    .query(async ({ ctx, input }) => {
      const [plan] = await ctx.db
        .select()
        .from(planiAbbonamento)
        .where(eq(planiAbbonamento.codice, input.codice))
        .limit(1);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
      return plan;
    }),

  create: superAdminProcedure.input(planInput).mutation(async ({ ctx, input }) => {
    const [exists] = await ctx.db
      .select({ id: planiAbbonamento.id })
      .from(planiAbbonamento)
      .where(eq(planiAbbonamento.codice, input.codice))
      .limit(1);
    if (exists) throw new TRPCError({ code: "CONFLICT", message: "Codice piano già esistente" });

    const [plan] = await ctx.db
      .insert(planiAbbonamento)
      .values({
        ...input,
        prezzoMensile: input.prezzoMensile.toString(),
        prezzoAnnuale: input.prezzoAnnuale.toString(),
      })
      .returning();
    return plan;
  }),

  update: superAdminProcedure
    .input(planInput.partial().extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data, updatedAt: new Date() };
      if (data.prezzoMensile !== undefined) updateData.prezzoMensile = data.prezzoMensile.toString();
      if (data.prezzoAnnuale !== undefined) updateData.prezzoAnnuale = data.prezzoAnnuale.toString();

      const [plan] = await ctx.db
        .update(planiAbbonamento)
        .set(updateData)
        .where(eq(planiAbbonamento.id, id))
        .returning();
      if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
      return plan;
    }),

  disable: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [plan] = await ctx.db
        .update(planiAbbonamento)
        .set({ attivo: false, updatedAt: new Date() })
        .where(eq(planiAbbonamento.id, input.id))
        .returning();
      return plan;
    }),
});

// ─── Fatture Router ───────────────────────────────────────────────────────────

export const fattureRouter = router({
  listAll: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        stato: z.enum(["bozza", "emessa", "pagata", "scaduta", "annullata"]).optional(),
        tenantId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, perPage, stato, tenantId } = input;
      const conditions: any[] = [];
      if (stato) conditions.push(eq(fatturePiattaforma.stato, stato));
      if (tenantId) conditions.push(eq(fatturePiattaforma.tenantId, tenantId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select()
          .from(fatturePiattaforma)
          .where(where)
          .limit(perPage)
          .offset((page - 1) * perPage)
          .orderBy(desc(fatturePiattaforma.dataEmissione)),
        ctx.db.select({ count: count() }).from(fatturePiattaforma).where(where),
      ]);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        page,
        perPage,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / perPage),
      };
    }),

  revenue: superAdminProcedure.query(async ({ ctx }) => {
    const [mrr] = await ctx.db
      .select({
        totale: sql<string>`COALESCE(SUM(${fatturePiattaforma.totale}), '0')`,
      })
      .from(fatturePiattaforma)
      .where(
        and(
          eq(fatturePiattaforma.stato, "pagata"),
          gte(
            fatturePiattaforma.dataEmissione,
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          ),
        ),
      );

    const [pending] = await ctx.db
      .select({
        totale: sql<string>`COALESCE(SUM(${fatturePiattaforma.totale}), '0')`,
      })
      .from(fatturePiattaforma)
      .where(eq(fatturePiattaforma.stato, "emessa"));

    return {
      mrr: parseFloat(mrr?.totale ?? "0"),
      pendingRevenue: parseFloat(pending?.totale ?? "0"),
    };
  }),
});

// ─── Audit Log Router ─────────────────────────────────────────────────────────

export const auditRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(50),
        azione: z.string().optional(),
        target: z.string().optional(),
        superAdminId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions: any[] = [];
      if (input.azione) conditions.push(eq(superAdminAuditLog.azione, input.azione));
      if (input.target) conditions.push(eq(superAdminAuditLog.target, input.target));
      if (input.superAdminId) conditions.push(eq(superAdminAuditLog.superAdminId, input.superAdminId));
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select()
          .from(superAdminAuditLog)
          .where(where)
          .limit(input.perPage)
          .offset((input.page - 1) * input.perPage)
          .orderBy(desc(superAdminAuditLog.createdAt)),
        ctx.db.select({ count: count() }).from(superAdminAuditLog).where(where),
      ]);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / input.perPage),
      };
    }),
});

// ─── Sistema Router (platform health) ─────────────────────────────────────────

export const sistemaRouter = router({
  health: superAdminProcedure.query(async ({ ctx }) => {
    const checks: Array<{ name: string; status: "ok" | "warn" | "down"; details?: string }> = [];

    try {
      await ctx.db.execute(sql`SELECT 1`);
      checks.push({ name: "Database", status: "ok" });
    } catch (e: any) {
      checks.push({ name: "Database", status: "down", details: e.message });
    }

    const [activeTenants] = await ctx.db
      .select({ count: count() })
      .from(tenants)
      .where(eq(tenants.stato, "attivo"));

    return {
      checks,
      summary: {
        activeTenants: activeTenants?.count ?? 0,
        uptime: process.uptime(),
        version: process.env.npm_package_version ?? "0.0.0",
      },
    };
  }),
});
