import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq, and } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import type { SMSProvider, SMSProviderType } from "./types";

/**
 * Retrieve the active SMS provider for a tenant.
 *
 * Reads the tenant's active SMS integration from the vault,
 * decrypts the credentials, and returns the appropriate provider instance.
 *
 * @throws Error if no active SMS integration is found
 */
export async function getSMSProvider(
  tenantId: string,
): Promise<SMSProvider> {
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
        eq(tenantIntegrations.tipo, "sms"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione SMS attiva trovata per il tenant ${tenantId}`,
    );
  }

  const providerType = integration.provider as SMSProviderType;
  const credentials = await vault.getCredentials(tenantId, providerType);

  if (!credentials) {
    throw new Error(
      `Credenziali non trovate per il provider SMS ${providerType} del tenant ${tenantId}`,
    );
  }

  // SMS provider implementations (twilio, vonage, skebby) would be imported
  // and instantiated here once implemented.
  switch (providerType) {
    case "twilio":
      throw new Error("Twilio SMS provider non ancora implementato");

    case "vonage":
      throw new Error("Vonage SMS provider non ancora implementato");

    case "skebby":
      throw new Error("Skebby SMS provider non ancora implementato");

    default:
      throw new Error(`Provider SMS sconosciuto: ${providerType}`);
  }
}
