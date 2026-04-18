import { tenants } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../trpc/index";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TenantSettings {
	layout_menu: "sidebar" | "topbar";
	palette_default: string;
	palette_custom?: {
		primary: string;
		secondary: string;
		accent: string;
	};
	cert_alert_days: number;
	ai_enabled: boolean;
	lingua: string;
	[key: string]: unknown;
}

const DEFAULT_SETTINGS: TenantSettings = {
	layout_menu: "sidebar",
	palette_default: "blue",
	cert_alert_days: 30,
	ai_enabled: false,
	lingua: "it",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireTenant(tenantId: string | undefined): string {
	if (!tenantId) {
		throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
	}
	return tenantId;
}

async function getCurrentSettings(
	db: typeof import("@neogesys/db").db,
	tenantId: string,
): Promise<TenantSettings> {
	const [tenant] = await db
		.select({ impostazioni: tenants.impostazioni })
		.from(tenants)
		.where(eq(tenants.id, tenantId))
		.limit(1);

	if (!tenant) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
	}

	return {
		...DEFAULT_SETTINGS,
		...(tenant.impostazioni as Partial<TenantSettings> | null),
	};
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const impostazioniRouter = router({
	/**
	 * Get current tenant settings.
	 */
	get: protectedProcedure.query(async ({ ctx }) => {
		const tenantId = requireTenant(ctx.tenant?.id);
		return getCurrentSettings(ctx.db, tenantId);
	}),

	/**
	 * Update layout_menu setting. Admin only.
	 */
	updateLayout: adminProcedure
		.input(
			z.object({
				layout_menu: z.enum(["sidebar", "topbar"]),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const current = await getCurrentSettings(ctx.db, tenantId);

			const updated = { ...current, layout_menu: input.layout_menu };

			await ctx.db
				.update(tenants)
				.set({ impostazioni: updated, updatedAt: new Date() })
				.where(eq(tenants.id, tenantId));

			return updated;
		}),

	/**
	 * Update palette settings. Admin only.
	 */
	updatePalette: adminProcedure
		.input(
			z.object({
				palette_default: z.string().optional(),
				palette_custom: z
					.object({
						primary: z.string(),
						secondary: z.string(),
						accent: z.string(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const current = await getCurrentSettings(ctx.db, tenantId);

			const updated = { ...current };
			if (input.palette_default !== undefined) {
				updated.palette_default = input.palette_default;
			}
			if (input.palette_custom !== undefined) {
				updated.palette_custom = input.palette_custom;
			}

			await ctx.db
				.update(tenants)
				.set({ impostazioni: updated, updatedAt: new Date() })
				.where(eq(tenants.id, tenantId));

			return updated;
		}),

	/**
	 * Update general settings (cert alerts, AI, lingua, etc.). Admin only.
	 */
	updateGeneral: adminProcedure
		.input(
			z.object({
				cert_alert_days: z.number().int().min(1).max(180).optional(),
				ai_enabled: z.boolean().optional(),
				lingua: z.string().max(10).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const tenantId = requireTenant(ctx.tenant?.id);
			const current = await getCurrentSettings(ctx.db, tenantId);

			const updated = { ...current };
			if (input.cert_alert_days !== undefined) {
				updated.cert_alert_days = input.cert_alert_days;
			}
			if (input.ai_enabled !== undefined) {
				updated.ai_enabled = input.ai_enabled;
			}
			if (input.lingua !== undefined) {
				updated.lingua = input.lingua;
			}

			await ctx.db
				.update(tenants)
				.set({ impostazioni: updated, updatedAt: new Date() })
				.where(eq(tenants.id, tenantId));

			return updated;
		}),
});
