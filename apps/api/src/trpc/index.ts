import { initTRPC, TRPCError } from "@trpc/server";
import type { TRPCContext } from "./context";

/**
 * tRPC initialization for the NEOGESYS Sport API.
 *
 * Provides four procedure levels:
 *  - publicProcedure   : no auth required
 *  - protectedProcedure: requires a valid session (any role)
 *  - adminProcedure    : requires admin or super_admin role
 *  - superAdminProcedure: requires super_admin role
 */
const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // In production, hide internal error details
        stack:
          process.env.NODE_ENV === "development" ? error.cause?.stack : undefined,
      },
    };
  },
});

export const router = t.router;
export const middleware = t.middleware;

// ─── Middlewares ──────────────────────────────────────────────────────────────

/** Ensures the request has a valid authenticated user. */
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Autenticazione richiesta.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // narrowed to non-null
      role: ctx.user.ruolo,
    },
  });
});

/** Ensures the user has at least the `admin` role within the tenant. */
const isAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Autenticazione richiesta.",
    });
  }

  const adminRoles = new Set(["admin", "super_admin"]);
  if (!adminRoles.has(ctx.user.ruolo)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permessi di amministratore richiesti.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      role: ctx.user.ruolo,
    },
  });
});

/** Ensures the user is a super_admin (platform-level administrator). */
const isSuperAdmin = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Autenticazione richiesta.",
    });
  }

  if (ctx.user.ruolo !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Permessi di super amministratore richiesti.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      role: ctx.user.ruolo as "super_admin",
    },
  });
});

// ─── Procedures ──────────────────────────────────────────────────────────────

/** Public procedure - no authentication required. */
export const publicProcedure = t.procedure;

/** Protected procedure - requires any authenticated user. */
export const protectedProcedure = t.procedure.use(isAuthed);

/** Admin procedure - requires admin or super_admin role. */
export const adminProcedure = t.procedure.use(isAdmin);

/** Super admin procedure - requires super_admin role (platform-level). */
export const superAdminProcedure = t.procedure.use(isSuperAdmin);

// Re-export the router type
export type { TRPCContext };
