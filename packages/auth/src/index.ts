export { createAuthConfig } from "./config";
export type { Auth, UserAdditionalFields } from "./config";

export {
  hasPermission,
  getPermissionsForRole,
  RUOLI,
  MODULI,
  AZIONI,
} from "./permissions";
export type { Ruolo, Modulo, Azione } from "./permissions";

export {
  requireAuth,
  requireRole,
  requirePermission,
} from "./middleware";
export type {
  SessionUser,
  TenantContext,
  AuthSession,
  AuthRequest,
  AuthResult,
} from "./middleware";
