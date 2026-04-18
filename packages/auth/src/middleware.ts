import { hasPermission } from "./permissions";

/**
 * Represents a user session with tenant context.
 */
export interface SessionUser {
	id: string;
	email: string;
	nome: string;
	cognome: string;
	telefono?: string;
	emailVerified: boolean;
}

export interface TenantContext {
	tenantId: string;
	ruolo: string;
}

export interface AuthSession {
	user: SessionUser;
	tenant: TenantContext | null;
}

/**
 * Generic request object that middleware can work with.
 * Designed to be framework-agnostic (works with Express, Hono, etc.).
 */
export interface AuthRequest {
	session: AuthSession | null;
}

/**
 * Result of an auth check. Either success with the session or failure with an error.
 */
export type AuthResult =
	| { success: true; session: AuthSession }
	| { success: false; error: string; status: number };

/**
 * Verify that a valid session exists on the request.
 * Returns the session if valid, or an error result.
 */
export function requireAuth(request: AuthRequest): AuthResult {
	if (!request.session) {
		return {
			success: false,
			error: "Autenticazione richiesta",
			status: 401,
		};
	}

	if (!request.session.user.emailVerified) {
		return {
			success: false,
			error: "Email non verificata",
			status: 403,
		};
	}

	return {
		success: true,
		session: request.session,
	};
}

/**
 * Verify that the user has one of the required roles in the current tenant.
 * Must be called after requireAuth.
 */
export function requireRole(request: AuthRequest, ...ruoli: string[]): AuthResult {
	const authResult = requireAuth(request);
	if (!authResult.success) {
		return authResult;
	}

	const { session } = authResult;

	if (!session.tenant) {
		return {
			success: false,
			error: "Contesto tenant non disponibile",
			status: 403,
		};
	}

	if (!ruoli.includes(session.tenant.ruolo)) {
		return {
			success: false,
			error: `Ruolo richiesto: ${ruoli.join(" o ")}. Ruolo attuale: ${session.tenant.ruolo}`,
			status: 403,
		};
	}

	return {
		success: true,
		session,
	};
}

/**
 * Verify that the user has permission for a specific module+action in the current tenant.
 * Must be called after requireAuth.
 */
export function requirePermission(
	request: AuthRequest,
	modulo: string,
	azione: string,
): AuthResult {
	const authResult = requireAuth(request);
	if (!authResult.success) {
		return authResult;
	}

	const { session } = authResult;

	if (!session.tenant) {
		return {
			success: false,
			error: "Contesto tenant non disponibile",
			status: 403,
		};
	}

	if (!hasPermission(session.tenant.ruolo, modulo, azione)) {
		return {
			success: false,
			error: `Permesso negato: ${azione} su ${modulo}`,
			status: 403,
		};
	}

	return {
		success: true,
		session,
	};
}
