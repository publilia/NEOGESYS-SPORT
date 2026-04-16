import { z } from "zod";
import { eq, ilike, sql, and, count } from "drizzle-orm";
import { tenants } from "@neogesys/db/schema";
import {
  router,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
  superAdminProcedure,
} from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const paginationInput = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const createTenantInput = z.object({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Lo slug deve contenere solo lettere minuscole, numeri e trattini"),
  ragioneSociale: z.string().min(1).max(200),
  tipoEnte: z.enum(["ASD", "SSD", "FED"]),
  partitaIva: z.string().max(20).optional(),
  codiceFiscale: z.string().max(20).optional(),
  pec: z.string().email().optional(),
  codiceSDI: z.string().max(10).optional(),
  sedeLegale: z
    .object({
      via: z.string(),
      cap: z.string(),
      citta: z.string(),
      provincia: z.string(),
    })
    .optional(),
  piano: z.enum(["free", "base", "pro", "enterprise"]).default("free"),
  maxSoci: z.string().default("50"),
  discipline: z.array(z.string()).optional(),
  federazioni: z
    .array(
      z.object({
        nome: z.string(),
        codice: z.string().optional(),
      }),
    )
    .optional(),
});

const updateTenantInput = z.object({
  id: z.string().uuid(),
  ragioneSociale: z.string().min(1).max(200).optional(),
  tipoEnte: z.enum(["ASD", "SSD", "FED"]).optional(),
  partitaIva: z.string().max(20).optional(),
  codiceFiscale: z.string().max(20).optional(),
  pec: z.string().email().optional(),
  codiceSDI: z.string().max(10).optional(),
  sedeLegale: z
    .object({
      via: z.string(),
      cap: z.string(),
      citta: z.string(),
      provincia: z.string(),
    })
    .optional(),
  piano: z.enum(["free", "base", "pro", "enterprise"]).optional(),
  maxSoci: z.string().optional(),
  discipline: z.array(z.string()).optional(),
  federazioni: z
    .array(
      z.object({
        nome: z.string(),
        codice: z.string().optional(),
      }),
    )
    .optional(),
  logo: z.string().url().optional(),
});

const updateSettingsInput = z.object({
  layout_menu: z.enum(["sidebar", "topbar"]).optional(),
  palette_default: z.string().optional(),
  palette_custom: z
    .object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    })
    .optional(),
  cert_alert_days: z.number().int().min(1).max(180).optional(),
  ai_enabled: z.boolean().optional(),
  lingua: z.string().max(10).optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const tenantRouter = router({
  /**
   * List all tenants with pagination and optional search.
   * Super-admin only.
   */
  list: superAdminProcedure.input(paginationInput).query(async ({ ctx, input }) => {
    const { page, perPage, search } = input;
    const offset = (page - 1) * perPage;

    const conditions = search
      ? ilike(tenants.ragioneSociale, `%${search}%`)
      : undefined;

    const [items, totalResult] = await Promise.all([
      ctx.db
        .select()
        .from(tenants)
        .where(conditions)
        .limit(perPage)
        .offset(offset)
        .orderBy(tenants.ragioneSociale),
      ctx.db
        .select({ count: count() })
        .from(tenants)
        .where(conditions),
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
   * Get a single tenant by ID. Super-admin only.
   */
  getById: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [tenant] = await ctx.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, input.id))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
      }

      return tenant;
    }),

  /**
   * Create a new tenant. Super-admin only.
   */
  create: superAdminProcedure.input(createTenantInput).mutation(async ({ ctx, input }) => {
    // Check slug uniqueness
    const [existing] = await ctx.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, input.slug))
      .limit(1);

    if (existing) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "Slug gia' in uso. Scegli un altro slug.",
      });
    }

    const [tenant] = await ctx.db
      .insert(tenants)
      .values({
        slug: input.slug,
        ragioneSociale: input.ragioneSociale,
        tipoEnte: input.tipoEnte,
        partitaIva: input.partitaIva,
        codiceFiscale: input.codiceFiscale,
        pec: input.pec,
        codiceSDI: input.codiceSDI,
        sedeLegale: input.sedeLegale,
        piano: input.piano,
        maxSoci: input.maxSoci,
        stato: "trial",
        trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
        discipline: input.discipline ?? [],
        federazioni: input.federazioni ?? [],
        impostazioni: {
          layout_menu: "sidebar",
          palette_default: "blue",
          cert_alert_days: 30,
          ai_enabled: false,
          lingua: "it",
        },
      })
      .returning();

    return tenant;
  }),

  /**
   * Update tenant details. Super-admin only.
   */
  update: superAdminProcedure.input(updateTenantInput).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;

    const [tenant] = await ctx.db
      .update(tenants)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
    }

    return tenant;
  }),

  /**
   * Update tenant settings (layout, palette, etc.). Admin role within tenant.
   */
  updateSettings: adminProcedure.input(updateSettingsInput).mutation(async ({ ctx, input }) => {
    if (!ctx.tenant) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
    }

    const currentSettings = (ctx.tenant.impostazioni ?? {}) as Record<string, unknown>;
    const mergedSettings = { ...currentSettings, ...input };

    const [tenant] = await ctx.db
      .update(tenants)
      .set({
        impostazioni: mergedSettings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, ctx.tenant.id))
      .returning();

    return tenant;
  }),

  /**
   * Suspend a tenant. Super-admin only.
   */
  suspend: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [tenant] = await ctx.db
        .update(tenants)
        .set({ stato: "sospeso", updatedAt: new Date() })
        .where(eq(tenants.id, input.id))
        .returning();

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
      }

      return tenant;
    }),

  /**
   * Reactivate a suspended tenant. Super-admin only.
   */
  reactivate: superAdminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [tenant] = await ctx.db
        .update(tenants)
        .set({ stato: "attivo", updatedAt: new Date() })
        .where(eq(tenants.id, input.id))
        .returning();

      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
      }

      return tenant;
    }),

  /**
   * Get current tenant info. Any authenticated user.
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenant) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nessun tenant nel contesto corrente.",
      });
    }

    const [tenant] = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenant.id))
      .limit(1);

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
    }

    return tenant;
  }),
});
