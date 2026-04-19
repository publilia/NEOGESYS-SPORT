import { db } from "@neogesys/db";
import { utenteTenant, utenti } from "@neogesys/db";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
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
export async function resolveUser(req: FastifyRequest): Promise<UserContext | null> {
	const sessionToken =
		(req.cookies as Record<string, string>)?.[SESSION_COOKIE_NAME] ??
		extractBearerToken(req.headers.authorization);

	// Dev-mode fallback: allow x-dev-role header to impersonate a role
	// without requiring a real session. Used by the web app's role switcher.
	if (!sessionToken && process.env.NODE_ENV !== "production") {
		const devRole = req.headers["x-dev-role"];
		if (devRole && typeof devRole === "string") {
			return await resolveDevUser(devRole, req);
		}
	}

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
			.where(and(eq(utenteTenant.utenteId, userId), eq(utenteTenant.tenantId, tenantId)))
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
 * Dev-only user resolver. Creates a UserContext from the `x-dev-role` header.
 * Looks up an existing utente matching the role's demo email, falls back to
 * returning a synthetic context when the user doesn't exist.
 */
async function resolveDevUser(role: string, req: FastifyRequest): Promise<UserContext | null> {
	const tenantReq = req as FastifyRequest & { tenant?: TenantInfo };
	const tenantId = tenantReq.tenant?.id;

	// Map of role → demo email (matches seed data)
	const demoEmails: Record<string, string> = {
		super_admin: "admin@neogesys.sport",
		admin_tenant: "admin@demo-asd.gestionale.sport",
		coordinatore: "coord@demo-asd.gestionale.sport",
		operatore: "segreteria@demo-asd.gestionale.sport",
		tesoriere: "tesoreria@demo-asd.gestionale.sport",
		istruttore: "atletica@demo-asd.gestionale.sport",
		user: "anna.bianchi@demo-asd.gestionale.sport",
	};

	const email = demoEmails[role];
	if (!email) {
		return null;
	}

	// Try to find existing user
	const [user] = await db
		.select({
			id: utenti.id,
			email: utenti.email,
			nome: utenti.nome,
			cognome: utenti.cognome,
		})
		.from(utenti)
		.where(eq(utenti.email, email))
		.limit(1);

	if (user) {
		// Load tenant-specific role if we have tenant context
		let actualRole = role;
		let permessi: Record<string, boolean> | null = null;
		let socioId: string | null = null;

		if (tenantId && role !== "super_admin") {
			const [membership] = await db
				.select({
					ruolo: utenteTenant.ruolo,
					permessi: utenteTenant.permessi,
					socioId: utenteTenant.socioId,
					attivo: utenteTenant.attivo,
				})
				.from(utenteTenant)
				.where(and(eq(utenteTenant.utenteId, user.id), eq(utenteTenant.tenantId, tenantId)))
				.limit(1);

			if (membership?.attivo) {
				actualRole = membership.ruolo;
				permessi = membership.permessi as Record<string, boolean> | null;
				socioId = membership.socioId;
			}
		}

		return {
			id: user.id,
			email: user.email,
			nome: user.nome,
			cognome: user.cognome,
			ruolo: actualRole,
			permessi,
			socioId,
		};
	}

	// Synthetic fallback: user doesn't exist in DB but we allow the call
	// to proceed with a fake identity. Useful for initial development.
	return {
		id: "00000000-0000-0000-0000-000000000000",
		email,
		nome: "Dev",
		cognome: role,
		ruolo: role,
		permessi: null,
		socioId: null,
	};
}

/**
 * Validates a session token against the Better Auth sessions table.
 *
 * Better Auth stores sessions in the "session" table with token + expires_at.
 * The session's user_id links to the Better Auth "user" table (by email we
 * cross-reference into our custom utenti table).
 */
async function validateSessionToken(token: string): Promise<string | null> {
	try {
		// 1. Look up the session token in Better Auth's session table
		const sessionResult = await db.execute(sql`
      SELECT s.user_id, s.expires_at, u.email
      FROM "session" s
      JOIN "user" u ON u.id = s.user_id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
      LIMIT 1
    `);

		const rows = sessionResult as unknown as Array<Record<string, unknown>>;
		if (rows.length === 0) {
			return null;
		}

		const sessionRow = rows[0]!;
		const email = String(sessionRow.email ?? "");

		if (!email) {
			return null;
		}

		// 2. Resolve the email to our utenti table
		const [utente] = await db
			.select({ id: utenti.id })
			.from(utenti)
			.where(eq(utenti.email, email))
			.limit(1);

		return utente?.id ?? null;
	} catch {
		// If Better Auth session tables don't exist yet (dev without migration),
		// fall back to accepting a UUID directly as user ID for local development.
		if (process.env.NODE_ENV !== "production") {
			const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
			if (uuidRegex.test(token)) {
				return token;
			}
		}
		return null;
	}
}
