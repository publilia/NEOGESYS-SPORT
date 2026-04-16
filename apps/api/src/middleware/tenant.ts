import type { FastifyRequest, FastifyReply } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "@neogesys/db";
import { tenants } from "@neogesys/db/schema";

export interface TenantInfo {
  id: string;
  slug: string;
  ragioneSociale: string;
  tipoEnte: string;
  piano: string;
  stato: string;
  impostazioni: Record<string, unknown> | null;
}

/** Routes that skip tenant resolution entirely. */
const SKIP_PATHS = new Set(["/health", "/healthz", "/ready"]);

/**
 * Extracts the subdomain from the Host header.
 * Expected format: <slug>.gestionale.sport or localhost:<port>
 */
function extractSubdomain(host: string | undefined): string | null {
  if (!host) return null;

  // Remove port if present
  const hostname = host.split(":")[0]!;

  // localhost / IP -> no subdomain
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  // <slug>.gestionale.sport -> slug
  const parts = hostname.split(".");
  if (parts.length >= 3) {
    return parts[0]!;
  }

  return null;
}

/**
 * Global preHandler hook that resolves the current tenant from the Host header.
 *
 * - Skips health-check routes.
 * - Skips "admin.*" subdomain (super-admin panel has its own auth flow).
 * - Looks up the tenant by slug; returns 404 / 403 when appropriate.
 * - Decorates `req.tenant` and sets the PostgreSQL session variable
 *   `app.current_tenant` so that RLS policies can reference it.
 */
export async function tenantMiddleware(
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Skip health checks
  if (SKIP_PATHS.has(req.url)) {
    return;
  }

  const host = req.headers.host;
  const subdomain = extractSubdomain(host);

  // If no subdomain (e.g. localhost dev), check for x-tenant-slug header (dev only)
  const slug =
    subdomain ?? (req.headers["x-tenant-slug"] as string | undefined) ?? null;

  // Skip super-admin subdomain -- those routes handle their own auth/tenant logic
  if (slug === "admin") {
    return;
  }

  // If still no slug and not a skippable path, reject
  if (!slug) {
    // In development, allow requests without a tenant slug for tRPC introspection etc.
    if (process.env.NODE_ENV === "development") {
      return;
    }
    reply.code(400).send({ error: "Tenant non identificato. Controlla il dominio." });
    return;
  }

  // Look up tenant by slug
  const [tenant] = await db
    .select({
      id: tenants.id,
      slug: tenants.slug,
      ragioneSociale: tenants.ragioneSociale,
      tipoEnte: tenants.tipoEnte,
      piano: tenants.piano,
      stato: tenants.stato,
      impostazioni: tenants.impostazioni,
    })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    reply.code(404).send({ error: "Tenant non trovato." });
    return;
  }

  if (tenant.stato === "sospeso" || tenant.stato === "chiuso") {
    reply.code(403).send({
      error: "Tenant sospeso o chiuso. Contatta l'amministratore.",
    });
    return;
  }

  // Set PostgreSQL session variable for RLS
  // The db connection runs SET LOCAL inside the current transaction/session
  await db.execute(
    `SELECT set_config('app.current_tenant', '${tenant.id}', true)`,
  );

  // Decorate request with tenant info
  (req as FastifyRequest & { tenant: TenantInfo }).tenant = {
    id: tenant.id,
    slug: tenant.slug,
    ragioneSociale: tenant.ragioneSociale,
    tipoEnte: tenant.tipoEnte,
    piano: tenant.piano,
    stato: tenant.stato,
    impostazioni: tenant.impostazioni as Record<string, unknown> | null,
  };
}
