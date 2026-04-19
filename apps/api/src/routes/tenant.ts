import { superAdminAuditLog, tenantUsage, tenants } from "@neogesys/db";
import { TRPCError } from "@trpc/server";
import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router, superAdminProcedure } from "../trpc/index";

// ─── Input Schemas ───────────────────────────────────────────────────────────

const paginationInput = z.object({
	page: z.number().int().min(1).default(1),
	perPage: z.number().int().min(1).max(100).default(20),
	search: z.string().optional(),
	stato: z.enum(["attivo", "sospeso", "trial", "chiuso", "pending_setup"]).optional(),
	piano: z.enum(["trial", "free", "base", "pro", "enterprise"]).optional(),
});

const brandingSchema = z.object({
	logo: z.string().url().optional().nullable(),
	logoDark: z.string().url().optional().nullable(),
	favicon: z.string().url().optional().nullable(),
	nomeVisualizzato: z.string().max(100).optional().nullable(),
	paletteDefault: z
		.enum(["default", "ocean", "forest", "sunset", "monochrome", "vibrant", "corporate", "sport"])
		.optional(),
	paletteCustom: z
		.object({
			primary: z.string(),
			secondary: z.string(),
			accent: z.string(),
			background: z.string().optional(),
		})
		.optional()
		.nullable(),
	customDomain: z
		.string()
		.regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)
		.max(100)
		.optional()
		.nullable(),
});

const createTenantInput = z.object({
	slug: z
		.string()
		.min(3)
		.max(50)
		.regex(/^[a-z0-9-]+$/, "Solo lettere minuscole, numeri e trattini"),
	ragioneSociale: z.string().min(1).max(200),
	tipoEnte: z.enum(["ASD", "SSD", "FED", "PALESTRA", "SCUOLA"]),
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
			nazione: z.string().default("IT"),
		})
		.optional(),
	piano: z.enum(["trial", "free", "base", "pro", "enterprise"]).default("trial"),
	maxSoci: z.string().default("50"),
	maxUtenti: z.string().default("5"),
	trialDays: z.number().int().min(0).max(90).default(30),
	branding: brandingSchema.optional(),
	adminEmail: z.string().email().optional(),
	adminNome: z.string().optional(),
	adminCognome: z.string().optional(),
	discipline: z.array(z.string()).optional(),
	federazioni: z.array(z.object({ nome: z.string(), codice: z.string().optional() })).optional(),
});

const updateTenantInput = z
	.object({
		id: z.string().uuid(),
		ragioneSociale: z.string().min(1).max(200).optional(),
		tipoEnte: z.enum(["ASD", "SSD", "FED", "PALESTRA", "SCUOLA"]).optional(),
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
				nazione: z.string().default("IT"),
			})
			.optional(),
		piano: z.enum(["trial", "free", "base", "pro", "enterprise"]).optional(),
		maxSoci: z.string().optional(),
		maxUtenti: z.string().optional(),
		discipline: z.array(z.string()).optional(),
		federazioni: z.array(z.object({ nome: z.string(), codice: z.string().optional() })).optional(),
	})
	.merge(brandingSchema);

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function logSuperAdminAction(
	ctx: any,
	azione: string,
	target: string,
	targetId: string | null,
	dettagli: Record<string, unknown>,
) {
	await ctx.db.insert(superAdminAuditLog).values({
		superAdminId: ctx.session.user.id,
		superAdminEmail: ctx.session.user.email,
		azione,
		target,
		targetId,
		dettagli,
		ipAddress: ctx.req?.ip ?? null,
		userAgent: ctx.req?.headers?.["user-agent"] ?? null,
	});
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const tenantRouter = router({
	/**
	 * List all tenants (super_admin only).
	 * Returns only metadata — no member business data.
	 */
	list: superAdminProcedure.input(paginationInput).query(async ({ ctx, input }) => {
		const { page, perPage, search, stato, piano } = input;
		const offset = (page - 1) * perPage;

		const conditions: any[] = [];
		if (search) conditions.push(ilike(tenants.ragioneSociale, `%${search}%`));
		if (stato) conditions.push(eq(tenants.stato, stato));
		if (piano) conditions.push(eq(tenants.piano, piano));
		const where = conditions.length > 0 ? and(...conditions) : undefined;

		const [items, totalResult] = await Promise.all([
			ctx.db
				.select({
					id: tenants.id,
					slug: tenants.slug,
					ragioneSociale: tenants.ragioneSociale,
					tipoEnte: tenants.tipoEnte,
					logo: tenants.logo,
					nomeVisualizzato: tenants.nomeVisualizzato,
					piano: tenants.piano,
					stato: tenants.stato,
					maxSoci: tenants.maxSoci,
					customDomain: tenants.customDomain,
					customDomainVerified: tenants.customDomainVerified,
					trialEnd: tenants.trialEnd,
					prossimaFatturazione: tenants.prossimaFatturazione,
					createdAt: tenants.createdAt,
				})
				.from(tenants)
				.where(where)
				.limit(perPage)
				.offset(offset)
				.orderBy(desc(tenants.createdAt)),
			ctx.db.select({ count: count() }).from(tenants).where(where),
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
	 * Get tenant metadata by ID (super_admin only).
	 * NO access to member data — only tenant configuration.
	 */
	getById: superAdminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const [tenant] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);
			if (!tenant) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
			}
			return tenant;
		}),

	/**
	 * Platform overview dashboard (super_admin).
	 */
	overview: superAdminProcedure.query(async ({ ctx }) => {
		const [totals, byStato, byPiano] = await Promise.all([
			ctx.db.select({ count: count() }).from(tenants),
			ctx.db.select({ stato: tenants.stato, count: count() }).from(tenants).groupBy(tenants.stato),
			ctx.db.select({ piano: tenants.piano, count: count() }).from(tenants).groupBy(tenants.piano),
		]);

		return {
			total: totals[0]?.count ?? 0,
			byStato: Object.fromEntries(byStato.map((r) => [r.stato, r.count])),
			byPiano: Object.fromEntries(byPiano.map((r) => [r.piano, r.count])),
		};
	}),

	/**
	 * Create a new tenant (super_admin only).
	 * Triggers audit log.
	 */
	create: superAdminProcedure.input(createTenantInput).mutation(async ({ ctx, input }) => {
		const [existing] = await ctx.db
			.select({ id: tenants.id })
			.from(tenants)
			.where(eq(tenants.slug, input.slug))
			.limit(1);

		if (existing) {
			throw new TRPCError({
				code: "CONFLICT",
				message: `Slug '${input.slug}' già in uso.`,
			});
		}

		const trialEnd =
			input.trialDays > 0 ? new Date(Date.now() + input.trialDays * 24 * 60 * 60 * 1000) : null;

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
				maxUtenti: input.maxUtenti,
				stato: input.piano === "trial" ? "trial" : "pending_setup",
				trialEnd,
				logo: input.branding?.logo ?? null,
				logoDark: input.branding?.logoDark ?? null,
				favicon: input.branding?.favicon ?? null,
				nomeVisualizzato: input.branding?.nomeVisualizzato ?? input.ragioneSociale,
				paletteDefault: input.branding?.paletteDefault ?? "default",
				paletteCustom: input.branding?.paletteCustom ?? null,
				customDomain: input.branding?.customDomain ?? null,
				discipline: input.discipline ?? [],
				federazioni: input.federazioni ?? [],
				impostazioni: {
					layout_menu: "sidebar",
					cert_alert_days: 30,
					ai_enabled: input.piano === "pro" || input.piano === "enterprise",
					lingua: "it",
					timezone: "Europe/Rome",
				},
				creatoDa: ctx.user.id,
			})
			.returning();

		if (!tenant) {
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Creazione tenant fallita." });
		}

		await logSuperAdminAction(ctx, "tenant.create", "tenant", tenant.id, {
			slug: tenant.slug,
			piano: tenant.piano,
			adminEmail: input.adminEmail,
		});

		// TODO: send welcome email with admin creation link if adminEmail provided

		return tenant;
	}),

	/**
	 * Update tenant metadata (super_admin only).
	 */
	update: superAdminProcedure.input(updateTenantInput).mutation(async ({ ctx, input }) => {
		const { id, ...data } = input;

		const [before] = await ctx.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
		if (!before) {
			throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });
		}

		const [tenant] = await ctx.db
			.update(tenants)
			.set({ ...data, updatedAt: new Date() })
			.where(eq(tenants.id, id))
			.returning();

		await logSuperAdminAction(ctx, "tenant.update", "tenant", id, {
			changes: Object.keys(data),
		});

		return tenant;
	}),

	/**
	 * Update branding only (tenant admin OR super_admin).
	 */
	updateBranding: adminProcedure.input(brandingSchema).mutation(async ({ ctx, input }) => {
		if (!ctx.tenant) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Contesto tenant mancante." });
		}

		const [tenant] = await ctx.db
			.update(tenants)
			.set({
				...input,
				updatedAt: new Date(),
			})
			.where(eq(tenants.id, ctx.tenant.id))
			.returning();

		return tenant;
	}),

	/**
	 * Change tenant subscription plan (super_admin only).
	 */
	changePlan: superAdminProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				piano: z.enum(["trial", "free", "base", "pro", "enterprise"]),
				maxSoci: z.string().optional(),
				maxUtenti: z.string().optional(),
				prorate: z.boolean().default(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [before] = await ctx.db.select().from(tenants).where(eq(tenants.id, input.id)).limit(1);
			if (!before) throw new TRPCError({ code: "NOT_FOUND" });

			const [after] = await ctx.db
				.update(tenants)
				.set({
					piano: input.piano,
					maxSoci: input.maxSoci ?? before.maxSoci,
					maxUtenti: input.maxUtenti ?? before.maxUtenti,
					updatedAt: new Date(),
				})
				.where(eq(tenants.id, input.id))
				.returning();

			await logSuperAdminAction(ctx, "tenant.plan_change", "tenant", input.id, {
				from: before.piano,
				to: input.piano,
				prorate: input.prorate,
			});

			return after;
		}),

	/**
	 * Suspend a tenant (super_admin only).
	 */
	suspend: superAdminProcedure
		.input(z.object({ id: z.string().uuid(), motivo: z.string().min(3).max(500) }))
		.mutation(async ({ ctx, input }) => {
			const [tenant] = await ctx.db
				.update(tenants)
				.set({
					stato: "sospeso",
					sospensioneMotivo: input.motivo,
					sospensioneData: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(tenants.id, input.id))
				.returning();

			if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

			await logSuperAdminAction(ctx, "tenant.suspend", "tenant", input.id, {
				motivo: input.motivo,
			});

			return tenant;
		}),

	/**
	 * Reactivate a tenant (super_admin only).
	 */
	reactivate: superAdminProcedure
		.input(z.object({ id: z.string().uuid() }))
		.mutation(async ({ ctx, input }) => {
			const [tenant] = await ctx.db
				.update(tenants)
				.set({
					stato: "attivo",
					sospensioneMotivo: null,
					sospensioneData: null,
					updatedAt: new Date(),
				})
				.where(eq(tenants.id, input.id))
				.returning();

			if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

			await logSuperAdminAction(ctx, "tenant.reactivate", "tenant", input.id, {});

			return tenant;
		}),

	/**
	 * Soft-close a tenant (super_admin only).
	 */
	close: superAdminProcedure
		.input(z.object({ id: z.string().uuid(), motivo: z.string().min(3) }))
		.mutation(async ({ ctx, input }) => {
			const [tenant] = await ctx.db
				.update(tenants)
				.set({
					stato: "chiuso",
					chiusuraData: new Date(),
					sospensioneMotivo: input.motivo,
					updatedAt: new Date(),
				})
				.where(eq(tenants.id, input.id))
				.returning();

			if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });

			await logSuperAdminAction(ctx, "tenant.close", "tenant", input.id, {
				motivo: input.motivo,
			});

			return tenant;
		}),

	/**
	 * Get usage for a tenant (super_admin + tenant admin).
	 */
	usage: superAdminProcedure
		.input(z.object({ id: z.string().uuid(), periodoFrom: z.string().optional() }))
		.query(async ({ ctx, input }) => {
			const items = await ctx.db
				.select()
				.from(tenantUsage)
				.where(eq(tenantUsage.tenantId, input.id))
				.orderBy(desc(tenantUsage.periodo))
				.limit(12);
			return items;
		}),

	/**
	 * Current tenant context (any authenticated user in tenant).
	 * Returns ONLY branding + plan features, not sensitive metadata.
	 */
	getCurrent: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.tenant) {
			throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun tenant nel contesto." });
		}

		const [tenant] = await ctx.db
			.select({
				id: tenants.id,
				slug: tenants.slug,
				ragioneSociale: tenants.ragioneSociale,
				nomeVisualizzato: tenants.nomeVisualizzato,
				logo: tenants.logo,
				logoDark: tenants.logoDark,
				favicon: tenants.favicon,
				paletteDefault: tenants.paletteDefault,
				paletteCustom: tenants.paletteCustom,
				customDomain: tenants.customDomain,
				piano: tenants.piano,
				stato: tenants.stato,
				trialEnd: tenants.trialEnd,
				maxSoci: tenants.maxSoci,
				maxUtenti: tenants.maxUtenti,
				impostazioni: tenants.impostazioni,
			})
			.from(tenants)
			.where(eq(tenants.id, ctx.tenant.id))
			.limit(1);

		if (!tenant) {
			throw new TRPCError({ code: "NOT_FOUND" });
		}

		return tenant;
	}),

	/**
	 * Self-service plan change (tenant admin, super_admin).
	 * ──────────────────────────────────────────────────────
	 * Lets a tenant admin request an upgrade/downgrade for their own
	 * tenant. The limits (maxSoci, maxUtenti) are copied from the
	 * target plan so the tenant doesn't need to set them manually.
	 *
	 * ⚠️ MVP: applies the change immediately. Once Stripe is wired in,
	 * this should instead create a checkout session and only finalize
	 * the switch once payment is confirmed.
	 */
	requestPlanChange: adminProcedure
		.input(z.object({ piano: z.enum(["trial", "free", "base", "pro", "enterprise"]) }))
		.mutation(async ({ ctx, input }) => {
			if (!ctx.tenant) {
				throw new TRPCError({ code: "BAD_REQUEST", message: "Nessun tenant nel contesto." });
			}

			const [before] = await ctx.db
				.select()
				.from(tenants)
				.where(eq(tenants.id, ctx.tenant.id))
				.limit(1);
			if (!before) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant non trovato." });

			if (before.piano === input.piano) {
				// No-op: user asked for the same plan they already have.
				return { tenant: before, changed: false as const };
			}

			// Default quotas per tier (used when the target plan doesn't exist
			// yet in piani_abbonamento — keeps the UX resilient during seeding).
			const defaultLimits: Record<string, { maxSoci: string; maxUtenti: string }> = {
				trial: { maxSoci: "50", maxUtenti: "3" },
				free: { maxSoci: "20", maxUtenti: "1" },
				base: { maxSoci: "200", maxUtenti: "5" },
				pro: { maxSoci: "2000", maxUtenti: "25" },
				enterprise: { maxSoci: "999999", maxUtenti: "999999" },
			};
			const limits = defaultLimits[input.piano] ?? {
				maxSoci: before.maxSoci,
				maxUtenti: before.maxUtenti,
			};

			const [after] = await ctx.db
				.update(tenants)
				.set({
					piano: input.piano,
					maxSoci: limits.maxSoci,
					maxUtenti: limits.maxUtenti,
					// When moving OUT of trial, activate the tenant.
					stato: before.stato === "trial" && input.piano !== "trial" ? "attivo" : before.stato,
					updatedAt: new Date(),
				})
				.where(eq(tenants.id, ctx.tenant.id))
				.returning();

			// Audit trail — reuse superAdminAuditLog, flagged as tenant-initiated.
			await ctx.db.insert(superAdminAuditLog).values({
				superAdminId: ctx.user.id,
				superAdminEmail: ctx.user.email,
				azione: "tenant.self_plan_change",
				target: "tenant",
				targetId: ctx.tenant.id,
				dettagli: {
					from: before.piano,
					to: input.piano,
					initiatedBy: "tenant_admin",
				},
			});

			return { tenant: after, changed: true as const };
		}),
});
