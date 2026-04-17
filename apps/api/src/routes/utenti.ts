import { z } from "zod";
import { eq, and, desc, count, ilike, sql } from "drizzle-orm";
import { utenti, utenteTenant, auditLog } from "@neogesys/db/schema";
import {
  router,
  protectedProcedure,
  adminProcedure,
} from "../trpc/index";
import { TRPCError } from "@trpc/server";
import {
  RUOLI,
  TENANT_ROLES,
  canAssignRole,
  canTransition,
  availableTransitions,
  classifyTransition,
  type Ruolo,
} from "@neogesys/auth";

const RuoloEnum = z.enum(RUOLI as any);
const TenantRuoloEnum = z.enum(TENANT_ROLES as [Ruolo, ...Ruolo[]]);

export const utentiRouter = router({
  /**
   * List users within current tenant (admin / segreteria).
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        ruolo: TenantRuoloEnum.optional(),
        attivo: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });

      const conditions: any[] = [eq(utenteTenant.tenantId, ctx.tenant.id)];
      if (input.ruolo) conditions.push(eq(utenteTenant.ruolo, input.ruolo));
      if (input.attivo !== undefined) conditions.push(eq(utenteTenant.attivo, input.attivo));
      if (input.search) {
        conditions.push(
          sql`(${utenti.nome} ILIKE ${"%" + input.search + "%"} OR ${utenti.cognome} ILIKE ${"%" + input.search + "%"} OR ${utenti.email} ILIKE ${"%" + input.search + "%"})`,
        );
      }
      const where = and(...conditions);

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: utenti.id,
            email: utenti.email,
            nome: utenti.nome,
            cognome: utenti.cognome,
            telefono: utenti.telefono,
            emailVerified: utenti.emailVerified,
            twoFactorEnabled: utenti.twoFactorEnabled,
            ultimoAccesso: utenti.ultimoAccesso,
            ruolo: utenteTenant.ruolo,
            attivo: utenteTenant.attivo,
            socioId: utenteTenant.socioId,
            permessi: utenteTenant.permessi,
            createdAt: utenti.createdAt,
          })
          .from(utenteTenant)
          .innerJoin(utenti, eq(utenti.id, utenteTenant.utenteId))
          .where(where)
          .limit(input.perPage)
          .offset((input.page - 1) * input.perPage)
          .orderBy(desc(utenti.createdAt)),
        ctx.db.select({ count: count() }).from(utenteTenant).where(where),
      ]);

      return {
        items,
        total: totalResult[0]?.count ?? 0,
        totalPages: Math.ceil((totalResult[0]?.count ?? 0) / input.perPage),
      };
    }),

  /**
   * Invite a new user with a role.
   */
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        nome: z.string().min(1).max(100),
        cognome: z.string().min(1).max(100),
        telefono: z.string().max(20).optional(),
        ruolo: TenantRuoloEnum,
        socioId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });
      const actorRole = ctx.session.user.ruolo as Ruolo;

      // Validate role transition
      const { allowed, reason } = canTransition(null, input.ruolo, actorRole);
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: reason ?? "Non autorizzato" });
      }

      // Find or create user
      let [user] = await ctx.db.select().from(utenti).where(eq(utenti.email, input.email)).limit(1);
      if (!user) {
        [user] = await ctx.db
          .insert(utenti)
          .values({
            email: input.email,
            nome: input.nome,
            cognome: input.cognome,
            telefono: input.telefono,
            emailVerified: false,
          })
          .returning();
      }

      // Check if already linked to this tenant
      const [existingLink] = await ctx.db
        .select()
        .from(utenteTenant)
        .where(
          and(eq(utenteTenant.utenteId, user.id), eq(utenteTenant.tenantId, ctx.tenant.id)),
        )
        .limit(1);

      if (existingLink) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Utente già associato a questo tenant",
        });
      }

      const [link] = await ctx.db
        .insert(utenteTenant)
        .values({
          utenteId: user.id,
          tenantId: ctx.tenant.id,
          ruolo: input.ruolo,
          socioId: input.socioId,
          attivo: true,
        })
        .returning();

      // Audit
      await ctx.db.insert(auditLog).values({
        tenantId: ctx.tenant.id,
        utenteId: ctx.session.user.id,
        azione: "utente.invite",
        risorsa: "utente",
        risorsaId: user.id,
        dettagli: { email: input.email, ruolo: input.ruolo },
      });

      // TODO: send invitation email with setup link

      return { user, link };
    }),

  /**
   * Change user's role (with transition validation).
   */
  changeRole: adminProcedure
    .input(
      z.object({
        utenteId: z.string().uuid(),
        nuovoRuolo: TenantRuoloEnum,
        motivo: z.string().min(3).max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });
      const actorRole = ctx.session.user.ruolo as Ruolo;

      const [current] = await ctx.db
        .select()
        .from(utenteTenant)
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .limit(1);

      if (!current) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utente non trovato in questo tenant" });
      }

      if (current.ruolo === input.nuovoRuolo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Il ruolo è già quello indicato" });
      }

      // Validate transition
      const { allowed, reason } = canTransition(
        current.ruolo as Ruolo,
        input.nuovoRuolo,
        actorRole,
      );
      if (!allowed) {
        throw new TRPCError({ code: "FORBIDDEN", message: reason ?? "Transizione non ammessa" });
      }

      // Prevent removing last admin
      if (current.ruolo === "admin" && input.nuovoRuolo !== "admin") {
        const [{ count: adminCount }] = await ctx.db
          .select({ count: count() })
          .from(utenteTenant)
          .where(
            and(
              eq(utenteTenant.tenantId, ctx.tenant.id),
              eq(utenteTenant.ruolo, "admin"),
              eq(utenteTenant.attivo, true),
            ),
          );
        if (adminCount <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Non puoi rimuovere l'ultimo admin. Promuovi prima un altro utente ad admin.",
          });
        }
      }

      const classification = classifyTransition(current.ruolo as Ruolo, input.nuovoRuolo);

      const [updated] = await ctx.db
        .update(utenteTenant)
        .set({ ruolo: input.nuovoRuolo, updatedAt: new Date() })
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .returning();

      await ctx.db.insert(auditLog).values({
        tenantId: ctx.tenant.id,
        utenteId: ctx.session.user.id,
        azione: `utente.${classification}`,
        risorsa: "utente",
        risorsaId: input.utenteId,
        dettagli: {
          from: current.ruolo,
          to: input.nuovoRuolo,
          motivo: input.motivo,
        },
      });

      return updated;
    }),

  /**
   * Available role transitions for a user (UI helper).
   */
  availableTransitions: adminProcedure
    .input(z.object({ utenteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });
      const actorRole = ctx.session.user.ruolo as Ruolo;

      const [current] = await ctx.db
        .select({ ruolo: utenteTenant.ruolo })
        .from(utenteTenant)
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .limit(1);

      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      return availableTransitions(current.ruolo as Ruolo, actorRole);
    }),

  /**
   * Deactivate user in current tenant (admin only).
   */
  deactivate: adminProcedure
    .input(z.object({ utenteId: z.string().uuid(), motivo: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });

      const [current] = await ctx.db
        .select()
        .from(utenteTenant)
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .limit(1);

      if (!current) throw new TRPCError({ code: "NOT_FOUND" });

      // Prevent self-deactivation
      if (current.utenteId === ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Non puoi disattivare te stesso",
        });
      }

      // Prevent removing last active admin
      if (current.ruolo === "admin") {
        const [{ count: adminCount }] = await ctx.db
          .select({ count: count() })
          .from(utenteTenant)
          .where(
            and(
              eq(utenteTenant.tenantId, ctx.tenant.id),
              eq(utenteTenant.ruolo, "admin"),
              eq(utenteTenant.attivo, true),
            ),
          );
        if (adminCount <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Non puoi disattivare l'ultimo admin.",
          });
        }
      }

      const [updated] = await ctx.db
        .update(utenteTenant)
        .set({ attivo: false, updatedAt: new Date() })
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .returning();

      await ctx.db.insert(auditLog).values({
        tenantId: ctx.tenant.id,
        utenteId: ctx.session.user.id,
        azione: "utente.deactivate",
        risorsa: "utente",
        risorsaId: input.utenteId,
        dettagli: { motivo: input.motivo },
      });

      return updated;
    }),

  /**
   * Reactivate a deactivated user.
   */
  reactivate: adminProcedure
    .input(z.object({ utenteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.tenant) throw new TRPCError({ code: "BAD_REQUEST" });

      const [updated] = await ctx.db
        .update(utenteTenant)
        .set({ attivo: true, updatedAt: new Date() })
        .where(
          and(
            eq(utenteTenant.utenteId, input.utenteId),
            eq(utenteTenant.tenantId, ctx.tenant.id),
          ),
        )
        .returning();

      return updated;
    }),
});
