import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import { router, protectedProcedure, adminProcedure } from "../trpc/index";
import { TRPCError } from "@trpc/server";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Available integration providers by type. */
const PROVIDERS = {
  pagamento: [
    { provider: "stripe", nome: "Stripe", descrizione: "Pagamenti con carta di credito" },
    { provider: "satispay", nome: "Satispay", descrizione: "Pagamenti mobili Satispay" },
    { provider: "paypal", nome: "PayPal", descrizione: "Pagamenti PayPal" },
  ],
  comunicazione: [
    { provider: "mailgun", nome: "Mailgun", descrizione: "Invio email transazionali" },
    { provider: "sendgrid", nome: "SendGrid", descrizione: "Email marketing e transazionali" },
    { provider: "whatsapp", nome: "WhatsApp Business", descrizione: "Messaggi WhatsApp" },
    { provider: "twilio", nome: "Twilio", descrizione: "SMS e messaggistica" },
  ],
  federazione: [
    { provider: "coni", nome: "CONI / Sport e Salute", descrizione: "Registro CONI" },
    { provider: "asi", nome: "ASI", descrizione: "Ente di promozione sportiva ASI" },
    { provider: "acsi", nome: "ACSI", descrizione: "Ente di promozione sportiva ACSI" },
  ],
  storage: [
    { provider: "s3", nome: "Amazon S3", descrizione: "Archiviazione documenti cloud" },
    { provider: "minio", nome: "MinIO", descrizione: "Object storage self-hosted" },
  ],
} as const;

// ─── Input Schemas ───────────────────────────────────────────────────────────

const configureInput = z.object({
  provider: z.string().min(1).max(50),
  tipo: z.enum(["pagamento", "comunicazione", "federazione", "storage"]),
  credentials: z.record(z.string(), z.string()),
  configurazione: z.record(z.string(), z.unknown()).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
  }
  return tenantId;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const integrazioniRouter = router({
  /**
   * List all integrations for the current tenant.
   * Credentials are NEVER returned.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    const items = await ctx.db
      .select({
        id: tenantIntegrations.id,
        provider: tenantIntegrations.provider,
        tipo: tenantIntegrations.tipo,
        attivo: tenantIntegrations.attivo,
        configurazione: tenantIntegrations.configurazione,
        ultimoTest: tenantIntegrations.ultimoTest,
        ultimoTestEsito: tenantIntegrations.ultimoTestEsito,
        ultimoTestMessaggio: tenantIntegrations.ultimoTestMessaggio,
        createdAt: tenantIntegrations.createdAt,
        updatedAt: tenantIntegrations.updatedAt,
        // NOTE: credenziali is intentionally excluded
      })
      .from(tenantIntegrations)
      .where(eq(tenantIntegrations.tenantId, tenantId))
      .orderBy(tenantIntegrations.tipo, tenantIntegrations.provider);

    return items;
  }),

  /**
   * Configure credentials for a provider. Encrypts via vault.
   * Admin only.
   */
  configure: adminProcedure.input(configureInput).mutation(async ({ ctx, input }) => {
    const tenantId = requireTenant(ctx.tenant?.id);

    await ctx.vault.setCredentials(
      tenantId,
      input.provider,
      input.tipo,
      input.credentials,
      input.configurazione as Record<string, unknown> | undefined,
    );

    return { success: true, provider: input.provider };
  }),

  /**
   * Test a provider's credentials. Admin only.
   */
  testConnection: adminProcedure
    .input(z.object({ provider: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const result = await ctx.vault.testConnection(tenantId, input.provider);

      return result;
    }),

  /**
   * Enable an integration. Admin only.
   */
  enable: adminProcedure
    .input(z.object({ provider: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const [integration] = await ctx.db
        .update(tenantIntegrations)
        .set({ attivo: true, updatedAt: new Date() })
        .where(
          and(
            eq(tenantIntegrations.tenantId, tenantId),
            eq(tenantIntegrations.provider, input.provider),
          ),
        )
        .returning({ id: tenantIntegrations.id });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integrazione non trovata. Configura prima le credenziali.",
        });
      }

      return { success: true, provider: input.provider };
    }),

  /**
   * Disable an integration. Admin only.
   */
  disable: adminProcedure
    .input(z.object({ provider: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = requireTenant(ctx.tenant?.id);

      const [integration] = await ctx.db
        .update(tenantIntegrations)
        .set({ attivo: false, updatedAt: new Date() })
        .where(
          and(
            eq(tenantIntegrations.tenantId, tenantId),
            eq(tenantIntegrations.provider, input.provider),
          ),
        )
        .returning({ id: tenantIntegrations.id });

      if (!integration) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Integrazione non trovata." });
      }

      return { success: true, provider: input.provider };
    }),

  /**
   * Get available providers grouped by tipo.
   */
  getProviders: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["pagamento", "comunicazione", "federazione", "storage"]).optional(),
      }),
    )
    .query(({ input }) => {
      if (input.tipo) {
        return { [input.tipo]: PROVIDERS[input.tipo] };
      }
      return PROVIDERS;
    }),
});
