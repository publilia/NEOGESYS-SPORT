"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Ruoli gerarchici del gestionale.
 * hierarchyLevel: 0 = massimo privilegio (super_admin), alto = ruolo più ristretto.
 */
export type UserRole =
	| "super_admin"
	| "admin_tenant"
	| "coordinatore"
	| "operatore"
	| "tesoriere"
	| "istruttore"
	| "user";

export interface RoleInfo {
	id: UserRole;
	label: string;
	badgeCls: string;
	hierarchyLevel: number;
	description: string;
}

export const ROLES: Record<UserRole, RoleInfo> = {
	super_admin: {
		id: "super_admin",
		label: "Super Admin",
		badgeCls: "badge-destructive",
		hierarchyLevel: 0,
		description: "Gestione piattaforma, tenant, billing",
	},
	admin_tenant: {
		id: "admin_tenant",
		label: "Admin Tenant",
		badgeCls: "badge-primary",
		hierarchyLevel: 1,
		description: "Accesso completo società",
	},
	coordinatore: {
		id: "coordinatore",
		label: "Coordinatore",
		badgeCls: "badge-warning",
		hierarchyLevel: 2,
		description: "Gestione operativa soci e corsi",
	},
	operatore: {
		id: "operatore",
		label: "Operatore",
		badgeCls: "badge-success",
		hierarchyLevel: 3,
		description: "Segreteria e iscrizioni",
	},
	tesoriere: {
		id: "tesoriere",
		label: "Tesoriere",
		badgeCls: "badge-warning",
		hierarchyLevel: 3,
		description: "Quote e contabilità",
	},
	istruttore: {
		id: "istruttore",
		label: "Istruttore",
		badgeCls: "badge",
		hierarchyLevel: 4,
		description: "Gestione corsi assegnati",
	},
	user: {
		id: "user",
		label: "Socio",
		badgeCls: "badge-outline",
		hierarchyLevel: 5,
		description: "Profilo, corsi iscritti, quote personali",
	},
};

export interface CurrentUser {
	role: UserRole;
	name: string;
	email: string;
	initials: string;
	tenant: string;
}

export const USERS_BY_ROLE: Record<UserRole, CurrentUser> = {
	super_admin: {
		role: "super_admin",
		name: "Platform Admin",
		email: "platform@neogesys.it",
		initials: "PA",
		tenant: "NEOGESYS Platform",
	},
	admin_tenant: {
		role: "admin_tenant",
		name: "Mario Rossi",
		email: "admin@demo-asd.sport",
		initials: "MR",
		tenant: "ASD Demo Sport",
	},
	coordinatore: {
		role: "coordinatore",
		name: "Luigi Verdi",
		email: "coord@demo-asd.sport",
		initials: "LV",
		tenant: "ASD Demo Sport",
	},
	operatore: {
		role: "operatore",
		name: "Claudia Neri",
		email: "segreteria@demo-asd.sport",
		initials: "CN",
		tenant: "ASD Demo Sport",
	},
	tesoriere: {
		role: "tesoriere",
		name: "Giulia Conti",
		email: "tesoreria@demo-asd.sport",
		initials: "GC",
		tenant: "ASD Demo Sport",
	},
	istruttore: {
		role: "istruttore",
		name: "Paolo Bianchi",
		email: "atletica@demo-asd.sport",
		initials: "PB",
		tenant: "ASD Demo Sport",
	},
	user: {
		role: "user",
		name: "Anna Bianchi",
		email: "anna.bianchi@demo-asd.sport",
		initials: "AB",
		tenant: "ASD Demo Sport",
	},
};

/**
 * Nav items disponibili per ogni ruolo.
 * Le path sono gli href delle pagine dashboard.
 */
/**
 * Path riservati al super_admin (platform-level).
 * Admin tenant e tutti gli altri ruoli NON devono vederli né accedervi.
 */
export const PLATFORM_ONLY_PATHS = ["/tenants", "/billing", "/system", "/audit"] as const;

export const ROLE_NAV_PERMISSIONS: Record<UserRole, string[]> = {
	// Super admin = platform-level + override su tutto tenant (per impersonation)
	super_admin: [
		"/",
		"/tenants",
		"/billing",
		"/system",
		"/audit",
		"/soci",
		"/tessera",
		"/quote",
		"/calendario",
		"/corsi",
		"/eventi",
		"/documenti",
		"/comunicazioni",
		"/contabilita",
		"/integrazioni",
		"/impostazioni",
		"/utenti",
	],
	admin_tenant: [
		"/",
		"/soci",
		"/tessera",
		"/quote",
		"/calendario",
		"/corsi",
		"/eventi",
		"/documenti",
		"/comunicazioni",
		"/contabilita",
		"/integrazioni",
		"/impostazioni",
		"/utenti",
	],
	coordinatore: [
		"/",
		"/soci",
		"/tessera",
		"/quote",
		"/calendario",
		"/corsi",
		"/eventi",
		"/comunicazioni",
		"/documenti",
	],
	operatore: [
		"/",
		"/soci",
		"/tessera",
		"/quote",
		"/calendario",
		"/corsi",
		"/eventi",
		"/comunicazioni",
	],
	tesoriere: ["/", "/quote", "/contabilita", "/documenti"],
	istruttore: ["/", "/corsi", "/calendario", "/soci", "/tessera", "/documenti"],
	user: ["/", "/tessera", "/corsi", "/quote", "/documenti", "/comunicazioni"],
};

interface CurrentUserStore {
	current: CurrentUser;
	setRole: (role: UserRole) => void;
}

export const useCurrentUser = create<CurrentUserStore>()(
	persist(
		(set) => ({
			current: USERS_BY_ROLE.admin_tenant,
			setRole: (role) => set({ current: USERS_BY_ROLE[role] }),
		}),
		{ name: "neogesys-current-user" },
	),
);

export function getRoleInfo(role: UserRole): RoleInfo {
	return ROLES[role];
}

export function getUserForRole(role: UserRole): CurrentUser {
	return USERS_BY_ROLE[role];
}

export function canAccessRoute(role: UserRole, path: string): boolean {
	// Super admin bypassa ogni filtro: vede qualunque pagina.
	if (role === "super_admin") return true;
	const allowed = ROLE_NAV_PERMISSIONS[role];
	if (allowed.includes(path)) return true;
	// Match prefix for sub-routes (es. /soci/123)
	return allowed.some((p) => p !== "/" && path.startsWith(`${p}/`));
}
