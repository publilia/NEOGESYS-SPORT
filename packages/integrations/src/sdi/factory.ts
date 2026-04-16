import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq, and } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import type { SDIProvider, SDIProviderType } from "./types";

/**
 * Retrieve the active SDI (fatturazione elettronica) provider for a tenant.
 *
 * Reads the tenant's active SDI integration from the vault,
 * decrypts the credentials, and returns the appropriate provider instance.
 *
 * @throws Error if no active SDI integration is found
 */
export async function getSDIProvider(
  tenantId: string,
): Promise<SDIProvider> {
  const vault = createVault();

  const [integration] = await db
    .select({
      provider: tenantIntegrations.provider,
      configurazione: tenantIntegrations.configurazione,
    })
    .from(tenantIntegrations)
    .where(
      and(
        eq(tenantIntegrations.tenantId, tenantId),
        eq(tenantIntegrations.tipo, "sdi"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione SDI attiva trovata per il tenant ${tenantId}`,
    );
  }

  const providerType = integration.provider as SDIProviderType;
  const credentials = await vault.getCredentials(tenantId, providerType);

  if (!credentials) {
    throw new Error(
      `Credenziali non trovate per il provider SDI ${providerType} del tenant ${tenantId}`,
    );
  }

  // SDI provider implementations (aruba, infocert, custom) would be imported
  // and instantiated here once implemented.
  switch (providerType) {
    case "aruba":
      throw new Error("Aruba SDI provider non ancora implementato");

    case "infocert":
      throw new Error("InfoCert SDI provider non ancora implementato");

    case "custom":
      throw new Error("Custom SDI provider non ancora implementato");

    default:
      throw new Error(`Provider SDI sconosciuto: ${providerType}`);
  }
}
