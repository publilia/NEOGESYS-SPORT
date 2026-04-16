/**
 * Role-based permission system for the multi-tenant sports platform.
 *
 * RUOLI (roles): super_admin, admin, segreteria, contabile, istruttore, atleta, genitore
 * MODULI (modules): tenant, soci, certificati, corsi, presenze, quote, contabilita,
 *                   eventi, comunicazioni, documenti, ai, impostazioni, integrazioni,
 *                   utenti, audit_log
 * AZIONI (actions): read, create, update, delete
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

export const MODULI = [
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

const PERMISSIONS: PermissionMap = {
  /**
   * Super admin: platform-level administrator.
   * Can manage tenants and all modules (tenant metadata, not direct business data).
   */
  super_admin: {
    tenant: ALL_ACTIONS,
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
   * Admin: tenant-level administrator.
   * Full access to all modules within their tenant.
   */
  admin: {
    tenant: ALL_ACTIONS,
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
   * Manages members, certificates, courses, attendance, fees, communications, documents, events.
   * No delete permission on quotes.
   */
  segreteria: {
    soci: ALL_ACTIONS,
    certificati: ALL_ACTIONS,
    corsi: ALL_ACTIONS,
    presenze: ALL_ACTIONS,
    quote: READ_CREATE_UPDATE,
    eventi: ALL_ACTIONS,
    comunicazioni: ALL_ACTIONS,
    documenti: ALL_ACTIONS,
  },

  /**
   * Contabile: accountant.
   * Full access to accounting, read access to quotes/documents/members.
   */
  contabile: {
    quote: READ_ONLY,
    contabilita: ALL_ACTIONS,
    documenti: READ_ONLY,
    soci: READ_ONLY,
  },

  /**
   * Istruttore: instructor/coach.
   * Read own courses, manage attendance for own courses, read enrolled members,
   * create communications to own course members.
   */
  istruttore: {
    corsi: READ_ONLY,       // own courses only
    presenze: READ_CREATE,  // own courses only
    soci: READ_ONLY,        // enrolled in own courses
    comunicazioni: READ_CREATE, // to own course members
  },

  /**
   * Atleta: athlete/member.
   * Read/update own profile, read enrolled courses, read own quotes,
   * read own documents, read communications.
   */
  atleta: {
    soci: ["read", "update"],       // own profile only
    corsi: READ_ONLY,               // enrolled courses
    quote: READ_ONLY,               // own quotes
    documenti: READ_ONLY,           // own documents
    comunicazioni: READ_ONLY,       // received communications
    certificati: READ_ONLY,         // own certificates
  },

  /**
   * Genitore: parent/guardian.
   * Same as atleta but for linked minors.
   */
  genitore: {
    soci: ["read", "update"],       // linked minors' profiles
    corsi: READ_ONLY,               // linked minors' courses
    quote: READ_ONLY,               // linked minors' quotes
    documenti: READ_ONLY,           // linked minors' documents
    comunicazioni: READ_ONLY,       // communications for linked minors
    certificati: READ_ONLY,         // linked minors' certificates
  },
};

/**
 * Check if a role has permission to perform an action on a module.
 */
export function hasPermission(
  ruolo: string,
  modulo: string,
  azione: string,
): boolean {
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
 * Returns a record mapping each allowed module to its allowed actions.
 */
export function getPermissionsForRole(
  ruolo: string,
): Record<string, string[]> {
  const rolePermissions = PERMISSIONS[ruolo];
  if (!rolePermissions) {
    return {};
  }

  // Return a deep copy to prevent mutation
  const result: Record<string, string[]> = {};
  for (const [modulo, azioni] of Object.entries(rolePermissions)) {
    result[modulo] = [...azioni];
  }
  return result;
}
