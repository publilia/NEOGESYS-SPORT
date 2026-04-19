/**
 * Role-based permission system for the multi-tenant sports platform.
 *
 * RUOLI (roles): super_admin, admin, segreteria, contabile, istruttore, atleta, genitore
 *
 * MODULI (modules):
 *   Platform-level (super_admin only):
 *     - piattaforma_tenants, piattaforma_piani, piattaforma_fatture,
 *       piattaforma_usage, piattaforma_utenti, piattaforma_audit
 *   Tenant-level (tenant users):
 *     - tenant, soci, certificati, corsi, presenze, quote, contabilita,
 *       eventi, comunicazioni, documenti, ai, impostazioni, integrazioni,
 *       utenti, audit_log
 *
 * AZIONI (actions): read, create, update, delete
 *
 * IMPORTANT: super_admin does NOT have access to member-data modules
 * (soci, certificati, presenze, quote, contabilita, etc.) of individual tenants.
 * This is enforced both at the permission layer AND at the database RLS layer.
 */

export const RUOLI = [
	"super_admin",
	"admin",
	"segreteria",
	"contabile",
	"istruttore",
	"atleta",
	"genitore",
] as const;

export type Ruolo = (typeof RUOLI)[number];

/**
 * Gerarchia ruoli (maggiore = più potere).
 * Usata per role transitions e delegation.
 */
export const ROLE_HIERARCHY: Record<Ruolo, number> = {
	super_admin: 100,
	admin: 80,
	segreteria: 60,
	contabile: 60,
	istruttore: 40,
	genitore: 20,
	atleta: 10,
};

/**
 * Ruoli PLATFORM-LEVEL (cross-tenant).
 * Non sono legati ad uno specifico tenant.
 */
export const PLATFORM_ROLES: Ruolo[] = ["super_admin"];

/**
 * Ruoli TENANT-LEVEL (scoped a un singolo tenant).
 */
export const TENANT_ROLES: Ruolo[] = [
	"admin",
	"segreteria",
	"contabile",
	"istruttore",
	"atleta",
	"genitore",
];

/**
 * Ruoli STAFF (vedono dati di tutti i soci del tenant).
 */
export const STAFF_ROLES: Ruolo[] = ["admin", "segreteria", "contabile", "istruttore"];

/**
 * Ruoli MEMBER-SELF (vedono solo dati propri).
 */
export const MEMBER_ROLES: Ruolo[] = ["atleta", "genitore"];

/**
 * Moduli PLATFORM (visibili solo a super_admin).
 */
export const PLATFORM_MODULI = [
	"piattaforma_tenants",
	"piattaforma_piani",
	"piattaforma_fatture",
	"piattaforma_usage",
	"piattaforma_utenti",
	"piattaforma_audit",
	"piattaforma_branding",
	"piattaforma_sistema",
] as const;

/**
 * Moduli TENANT (visibili agli utenti del tenant).
 */
export const TENANT_MODULI = [
	"tenant",
	"soci",
	"certificati",
	"corsi",
	"presenze",
	"quote",
	"contabilita",
	"eventi",
	"comunicazioni",
	"documenti",
	"ai",
	"impostazioni",
	"integrazioni",
	"utenti",
	"audit_log",
] as const;

export const MODULI = [...PLATFORM_MODULI, ...TENANT_MODULI] as const;

export type Modulo = (typeof MODULI)[number];

export const AZIONI = ["read", "create", "update", "delete"] as const;

export type Azione = (typeof AZIONI)[number];

/**
 * Permission map: role -> module -> allowed actions.
 */
type PermissionMap = Record<string, Record<string, string[]>>;

const ALL_ACTIONS: string[] = ["read", "create", "update", "delete"];
const READ_ONLY: string[] = ["read"];
const READ_CREATE: string[] = ["read", "create"];
const READ_CREATE_UPDATE: string[] = ["read", "create", "update"];
const READ_UPDATE: string[] = ["read", "update"];

const PERMISSIONS: PermissionMap = {
	/**
	 * Super admin: platform-level administrator.
	 *
	 * CAN: Manage tenants, plans, invoices, usage, platform users.
	 * CAN: Configure tenant branding (logo, name, custom domain).
	 * CAN: Suspend/reactivate tenants, create tenants, set plan.
	 * CANNOT: See member data (soci, certificati, presenze, quote, contabilita).
	 * CANNOT: Access tenant business data (comunicazioni, documenti contents).
	 *
	 * Cross-tenant metadata only. Member privacy is enforced.
	 */
	super_admin: {
		piattaforma_tenants: ALL_ACTIONS,
		piattaforma_piani: ALL_ACTIONS,
		piattaforma_fatture: ALL_ACTIONS,
		piattaforma_usage: READ_ONLY,
		piattaforma_utenti: ALL_ACTIONS,
		piattaforma_audit: READ_ONLY,
		piattaforma_branding: ALL_ACTIONS,
		piattaforma_sistema: READ_ONLY,
		// NO access to tenant business modules
	},

	/**
	 * Admin: tenant-level administrator.
	 * Full access to all tenant modules within their own tenant.
	 */
	admin: {
		tenant: READ_UPDATE,
		soci: ALL_ACTIONS,
		certificati: ALL_ACTIONS,
		corsi: ALL_ACTIONS,
		presenze: ALL_ACTIONS,
		quote: ALL_ACTIONS,
		contabilita: ALL_ACTIONS,
		eventi: ALL_ACTIONS,
		comunicazioni: ALL_ACTIONS,
		documenti: ALL_ACTIONS,
		ai: ALL_ACTIONS,
		impostazioni: ALL_ACTIONS,
		integrazioni: ALL_ACTIONS,
		utenti: ALL_ACTIONS,
		audit_log: READ_ONLY,
	},

	/**
	 * Segreteria: office/secretary staff.
	 * Operational management of members, certificates, courses, events, communications.
	 */
	segreteria: {
		tenant: READ_ONLY,
		soci: ALL_ACTIONS,
		certificati: ALL_ACTIONS,
		corsi: ALL_ACTIONS,
		presenze: ALL_ACTIONS,
		quote: READ_CREATE_UPDATE,
		eventi: ALL_ACTIONS,
		comunicazioni: ALL_ACTIONS,
		documenti: ALL_ACTIONS,
		ai: READ_CREATE,
		utenti: READ_ONLY,
	},

	/**
	 * Contabile: accountant.
	 * Full accounting access, read-only on related member/quota data.
	 */
	contabile: {
		tenant: READ_ONLY,
		soci: READ_ONLY,
		quote: READ_CREATE_UPDATE,
		contabilita: ALL_ACTIONS,
		documenti: READ_UPDATE,
		ai: READ_ONLY,
	},

	/**
	 * Istruttore: instructor/coach.
	 * Limited to own courses and their enrolled members.
	 */
	istruttore: {
		tenant: READ_ONLY,
		corsi: READ_UPDATE, // own courses only (enforced at data layer)
		presenze: READ_CREATE_UPDATE, // own courses only
		soci: READ_ONLY, // enrolled in own courses only
		certificati: READ_ONLY, // enrolled in own courses only
		comunicazioni: READ_CREATE, // to own course members only
		eventi: READ_ONLY,
		documenti: READ_ONLY,
	},

	/**
	 * Atleta: athlete / registered member.
	 * Self-service access to personal data.
	 */
	atleta: {
		tenant: READ_ONLY,
		soci: READ_UPDATE, // own profile only
		corsi: READ_ONLY, // enrolled courses only
		quote: READ_ONLY, // own quotes only
		documenti: READ_ONLY, // own documents only
		comunicazioni: READ_ONLY, // received comms only
		certificati: READ_ONLY, // own certificates only
		eventi: READ_ONLY,
	},

	/**
	 * Genitore: parent/guardian.
	 * Proxy access for linked minor athletes.
	 */
	genitore: {
		tenant: READ_ONLY,
		soci: READ_UPDATE, // linked minors' profiles
		corsi: READ_ONLY, // linked minors' courses
		quote: READ_ONLY, // linked minors' quotes
		documenti: READ_ONLY, // linked minors' documents
		comunicazioni: READ_ONLY, // comms for linked minors
		certificati: READ_ONLY, // linked minors' certificates
		eventi: READ_ONLY,
	},
};

/**
 * Check if a role has permission to perform an action on a module.
 */
export function hasPermission(ruolo: string, modulo: string, azione: string): boolean {
	const rolePermissions = PERMISSIONS[ruolo];
	if (!rolePermissions) {
		return false;
	}

	const moduleActions = rolePermissions[modulo];
	if (!moduleActions) {
		return false;
	}

	return moduleActions.includes(azione);
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(ruolo: string): Record<string, string[]> {
	const rolePermissions = PERMISSIONS[ruolo];
	if (!rolePermissions) {
		return {};
	}

	const result: Record<string, string[]> = {};
	for (const [modulo, azioni] of Object.entries(rolePermissions)) {
		result[modulo] = [...azioni];
	}
	return result;
}

/**
 * Check if a role is platform-level (super_admin).
 */
export function isPlatformRole(ruolo: string): boolean {
	return PLATFORM_ROLES.includes(ruolo as Ruolo);
}

/**
 * Check if a role is tenant-level.
 */
export function isTenantRole(ruolo: string): boolean {
	return TENANT_ROLES.includes(ruolo as Ruolo);
}

/**
 * Check if a role is staff (sees all members of tenant).
 */
export function isStaffRole(ruolo: string): boolean {
	return STAFF_ROLES.includes(ruolo as Ruolo);
}

/**
 * Check if a role is member-level (sees only own data).
 */
export function isMemberRole(ruolo: string): boolean {
	return MEMBER_ROLES.includes(ruolo as Ruolo);
}

/**
 * Returns the hierarchy level for a role.
 */
export function getRoleLevel(ruolo: string): number {
	return ROLE_HIERARCHY[ruolo as Ruolo] ?? 0;
}

/**
 * Check if `fromRole` can assign/modify `toRole`.
 * Rule: you can only assign roles strictly below your own.
 * Exception: super_admin can assign any role.
 */
export function canAssignRole(fromRole: string, toRole: string): boolean {
	if (fromRole === "super_admin") return true;
	if (toRole === "super_admin") return false; // never delegate super_admin
	const fromLevel = getRoleLevel(fromRole);
	const toLevel = getRoleLevel(toRole);
	return fromLevel > toLevel;
}
