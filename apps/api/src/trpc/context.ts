import type { CreateFastifyContextOptions } from "@trpc/server/adapters/fastify";
import { db, type Database } from "@neogesys/db";
import { createVault, type TenantVault } from "@neogesys/vault";
import { resolveUser, type UserContext } from "../middleware/auth";
import type { TenantInfo } from "../middleware/tenant";

export interface TRPCContext {
  /** Current tenant info, null if no tenant resolved (e.g. super-admin routes). */
  tenant: TenantInfo | null;
  /** Authenticated user with tenant-specific role, null if unauthenticated. */
  user: UserContext | null;
  /** Shorthand for user.ruolo */
  role: string | null;
  /** User's fine-grained permissions */
  permissions: Record<string, boolean> | null;
  /** Drizzle database instance */
  db: Database;
  /** Vault for credential encryption/decryption */
  vault: TenantVault;
}

let vaultInstance: TenantVault | null = null;

function getVault(): TenantVault {
  if (!vaultInstance) {
    vaultInstance = createVault();
  }
  return vaultInstance;
}

/**
 * Creates the tRPC context from a Fastify request.
 *
 * This function is called for every incoming tRPC request and assembles
 * the context object that is available in every procedure.
 */
export async function createTRPCContext({
  req,
}: CreateFastifyContextOptions): Promise<TRPCContext> {
  const tenantReq = req as typeof req & { tenant?: TenantInfo };
  const tenant = tenantReq.tenant ?? null;

  // Resolve authenticated user from session cookie / bearer token
  const user = await resolveUser(req);

  return {
    tenant,
    user,
    role: user?.ruolo ?? null,
    permissions: user?.permessi ?? null,
    db,
    vault: getVault(),
  };
}
