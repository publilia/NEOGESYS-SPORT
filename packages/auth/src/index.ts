export { createAuthConfig } from "./config";
export type { Auth, UserAdditionalFields } from "./config";

export {
	hasPermission,
	getPermissionsForRole,
	isPlatformRole,
	isTenantRole,
	isStaffRole,
	isMemberRole,
	getRoleLevel,
	canAssignRole,
	RUOLI,
	MODULI,
	AZIONI,
	PLATFORM_ROLES,
	TENANT_ROLES,
	STAFF_ROLES,
	MEMBER_ROLES,
	PLATFORM_MODULI,
	TENANT_MODULI,
	ROLE_HIERARCHY,
} from "./permissions";
export type { Ruolo, Modulo, Azione } from "./permissions";

export {
	canTransition,
	availableTransitions,
	formatTransition,
	requiresMFA,
	classifyTransition,
	TRANSITIONS,
} from "./role-transitions";
export type { RoleTransition, TransitionReason } from "./role-transitions";

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
