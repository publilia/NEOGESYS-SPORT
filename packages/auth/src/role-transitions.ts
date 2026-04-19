/**
 * Role transition state machine.
 *
 * Definisce quali transizioni di ruolo sono ammesse e sotto quali condizioni.
 * Ogni transizione richiede un attore autorizzato (chi può eseguirla).
 */

import type { Ruolo } from "./permissions";
import { canAssignRole, getRoleLevel } from "./permissions";

export type TransitionReason =
	| "promotion"
	| "demotion"
	| "delegation"
	| "role_change"
	| "activation"
	| "suspension"
	| "tenant_creation"
	| "parent_link";

export interface RoleTransition {
	from: Ruolo | null; // null = initial role (user creation)
	to: Ruolo;
	allowedActors: Ruolo[]; // which roles can trigger this
	reason: TransitionReason;
	requiresConfirmation?: boolean;
	requires2FA?: boolean;
	description: string;
}

/**
 * Matrice delle transizioni ammesse.
 */
export const TRANSITIONS: RoleTransition[] = [
	/* ============ PLATFORM-LEVEL ============ */
	{
		from: null,
		to: "super_admin",
		allowedActors: ["super_admin"],
		reason: "tenant_creation",
		requiresConfirmation: true,
		requires2FA: true,
		description: "Creazione nuovo super admin (solo altro super admin)",
	},

	/* ============ TENANT CREATION ============ */
	{
		from: null,
		to: "admin",
		allowedActors: ["super_admin"],
		reason: "tenant_creation",
		description: "Super admin crea tenant e assegna primo admin",
	},

	/* ============ ADMIN → STAFF DELEGATION ============ */
	{
		from: null,
		to: "segreteria",
		allowedActors: ["admin", "super_admin"],
		reason: "delegation",
		description: "Admin invita nuovo membro segreteria",
	},
	{
		from: null,
		to: "contabile",
		allowedActors: ["admin", "super_admin"],
		reason: "delegation",
		description: "Admin invita nuovo contabile",
	},
	{
		from: null,
		to: "istruttore",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "delegation",
		description: "Admin/segreteria invita istruttore",
	},
	{
		from: null,
		to: "atleta",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "activation",
		description: "Registrazione nuovo socio/atleta",
	},
	{
		from: null,
		to: "genitore",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "parent_link",
		description: "Registrazione genitore collegato a minore",
	},

	/* ============ PROMOTIONS ============ */
	{
		from: "atleta",
		to: "istruttore",
		allowedActors: ["admin", "super_admin"],
		reason: "promotion",
		requiresConfirmation: true,
		description: "Promozione atleta a istruttore (tesseramento tecnico)",
	},
	{
		from: "istruttore",
		to: "segreteria",
		allowedActors: ["admin", "super_admin"],
		reason: "promotion",
		requiresConfirmation: true,
		description: "Promozione istruttore a segreteria",
	},
	{
		from: "segreteria",
		to: "admin",
		allowedActors: ["admin", "super_admin"],
		reason: "promotion",
		requiresConfirmation: true,
		requires2FA: true,
		description: "Promozione segreteria ad admin (richiede conferma admin uscente)",
	},
	{
		from: "contabile",
		to: "admin",
		allowedActors: ["admin", "super_admin"],
		reason: "promotion",
		requiresConfirmation: true,
		requires2FA: true,
		description: "Promozione contabile ad admin",
	},

	/* ============ DEMOTIONS ============ */
	{
		from: "admin",
		to: "segreteria",
		allowedActors: ["admin", "super_admin"],
		reason: "demotion",
		requiresConfirmation: true,
		description: "Demozione admin a segreteria (se più admin presenti)",
	},
	{
		from: "admin",
		to: "contabile",
		allowedActors: ["admin", "super_admin"],
		reason: "demotion",
		requiresConfirmation: true,
		description: "Demozione admin a contabile",
	},
	{
		from: "segreteria",
		to: "istruttore",
		allowedActors: ["admin", "super_admin"],
		reason: "demotion",
		description: "Demozione segreteria a istruttore",
	},
	{
		from: "segreteria",
		to: "atleta",
		allowedActors: ["admin", "super_admin"],
		reason: "demotion",
		description: "Demozione segreteria a atleta",
	},
	{
		from: "istruttore",
		to: "atleta",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "demotion",
		description: "Demozione istruttore a atleta",
	},
	{
		from: "contabile",
		to: "atleta",
		allowedActors: ["admin", "super_admin"],
		reason: "demotion",
		description: "Demozione contabile a atleta",
	},

	/* ============ ROLE SWAP (stesso livello) ============ */
	{
		from: "segreteria",
		to: "contabile",
		allowedActors: ["admin", "super_admin"],
		reason: "role_change",
		description: "Cambio ruolo: segreteria → contabile",
	},
	{
		from: "contabile",
		to: "segreteria",
		allowedActors: ["admin", "super_admin"],
		reason: "role_change",
		description: "Cambio ruolo: contabile → segreteria",
	},
	{
		from: "atleta",
		to: "genitore",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "role_change",
		description: "Cambio ruolo: atleta → genitore (se collegato a minore)",
	},
	{
		from: "genitore",
		to: "atleta",
		allowedActors: ["admin", "segreteria", "super_admin"],
		reason: "role_change",
		description: "Cambio ruolo: genitore → atleta",
	},
];

/**
 * Check if a role transition is allowed.
 */
export function canTransition(
	from: Ruolo | null,
	to: Ruolo,
	actor: Ruolo,
): { allowed: boolean; reason?: string; transition?: RoleTransition } {
	// Super admin assignment: always requires another super_admin
	if (to === "super_admin" && actor !== "super_admin") {
		return { allowed: false, reason: "Solo un super_admin può creare altri super_admin" };
	}

	// Must be able to assign the target role based on hierarchy
	if (!canAssignRole(actor, to)) {
		return {
			allowed: false,
			reason: `Il ruolo ${actor} non può assegnare il ruolo ${to} (gerarchia insufficiente)`,
		};
	}

	// Find matching transition
	const transition = TRANSITIONS.find(
		(t) => t.from === from && t.to === to && t.allowedActors.includes(actor),
	);

	if (!transition) {
		return {
			allowed: false,
			reason: `Transizione non definita: ${from ?? "null"} → ${to} da parte di ${actor}`,
		};
	}

	return { allowed: true, transition };
}

/**
 * List all transitions available from a given role, for a given actor.
 */
export function availableTransitions(from: Ruolo | null, actor: Ruolo): RoleTransition[] {
	return TRANSITIONS.filter(
		(t) => t.from === from && t.allowedActors.includes(actor) && canAssignRole(actor, t.to),
	);
}

/**
 * Format transition as human-readable string.
 */
export function formatTransition(t: RoleTransition): string {
	const fromStr = t.from ?? "nuovo";
	return `${fromStr} → ${t.to} (${t.reason}): ${t.description}`;
}

/**
 * Check if transition requires MFA.
 */
export function requiresMFA(from: Ruolo | null, to: Ruolo): boolean {
	const t = TRANSITIONS.find((x) => x.from === from && x.to === to);
	return t?.requires2FA ?? false;
}

/**
 * Detect if a role change is a promotion, demotion, or lateral move.
 */
export function classifyTransition(from: Ruolo, to: Ruolo): "promotion" | "demotion" | "lateral" {
	const fromLevel = getRoleLevel(from);
	const toLevel = getRoleLevel(to);
	if (toLevel > fromLevel) return "promotion";
	if (toLevel < fromLevel) return "demotion";
	return "lateral";
}
