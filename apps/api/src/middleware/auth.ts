import type { FastifyRequest, FastifyReply } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "@neogesys/db";
import { utenti, utenteTenant } from "@neogesys/db";
import type { TenantInfo } from "./tenant";

export interface UserContext {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  ruolo: string;
  permessi: Record<string, boolean> | null;
  socioId: string | null;
}

export type AuthenticatedRequest = FastifyRequest & {
  tenant: TenantInfo;
  user: UserContext;
};

const SESSION_COOKIE_NAME = "neogesys_session";

/**
 * Validates the session cookie or Authorization header,
 * loads the user from the DB and attaches their tenant-specific role.
 *
 * Returns the UserContext or null if unauthenticated.
 */
export async function resolveUser(
  req: FastifyRequest,
): Promise<UserContext | null> {
  const sessionToken =
    (req.cookies as Record<string, string>)?.[SESSION_COOKIE_NAME] ??
    extractBearerToken(req.headers.authorization);

  if (!sessionToken) {
    return null;
  }

  // TODO: Replace with proper session validation from @neogesys/auth
  // For now we decode the token to get the user ID.
  // In production this should verify the session against the sessions table.
  const userId = await validateSessionToken(sessionToken);
  if (!userId) {
    return null;
  }

  const tenantReq = req as FastifyRequest & { tenant?: TenantInfo };
  const tenantId = tenantReq.tenant?.id;

  // Load user
  const [user] = await db
    .select({
      id: utenti.id,
      email: utenti.email,
      nome: utenti.nome,
      cognome: utenti.cognome,
    })
    .from(utenti)
    .where(eq(utenti.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  // If we have a tenant context, load the tenant-specific role
  let ruolo = "atleta"; // default role
  let permessi: Record<string, boolean> | null = null;
  let socioId: string | null = null;

  if (tenantId) {
    const [membership] = await db
      .select({
        ruolo: utenteTenant.ruolo,
        permessi: utenteTenant.permessi,
        socioId: utenteTenant.socioId,
        attivo: utenteTenant.attivo,
      })
      .from(utenteTenant)
      .where(
        and(
          eq(utenteTenant.utenteId, userId),
          eq(utenteTenant.tenantId, tenantId),
        ),
      )
      .limit(1);

    if (!membership || !membership.attivo) {
      return null; // user is not a member of this tenant
    }

    ruolo = membership.ruolo;
    permessi = membership.permessi as Record<string, boolean> | null;
    socioId = membership.socioId;
  }

  return {
    id: user.id,
    email: user.email,
    nome: user.nome,
    cognome: user.cognome,
    ruolo,
    permessi,
    socioId,
  };
}

/**
 * Extracts a Bearer token from the Authorization header.
 */
function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7);
}

/**
 * Validates a session token and returns the user ID.
 *
 * TODO: Integrate with @neogesys/auth session validation.
 * This should check the sessions table, verify expiry, etc.
 */
async function validateSessionToken(token: string): Promise<string | null> {
  // TODO: Implement proper session validation via @neogesys/auth
  // For now, we treat the token as a user ID for development purposes.
  // In production, this should:
  // 1. Look up the session by token hash
  // 2. Check session expiry
  // 3. Return the associated user ID
  try {
    // Placeholder: attempt to use the token as a UUID user ID (dev only)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(token)) {
      return token;
    }
    return null;
  } catch {
    return null;
  }
}
