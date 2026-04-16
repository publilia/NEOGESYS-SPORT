import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq, and } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import type { PaymentProvider, PaymentProviderType } from "./types";
import { StripeProvider } from "./stripe";

/**
 * Retrieve the active payment provider for a tenant.
 *
 * Reads the tenant's active payment integration from the vault,
 * decrypts the credentials, and returns the appropriate provider instance.
 *
 * @throws Error if no active payment integration is found
 */
export async function getPaymentProvider(
  tenantId: string,
): Promise<PaymentProvider> {
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
        eq(tenantIntegrations.tipo, "pagamento"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione pagamento attiva trovata per il tenant ${tenantId}`,
    );
  }

  const providerType = integration.provider as PaymentProviderType;
  const credentials = await vault.getCredentials(tenantId, providerType);

  if (!credentials) {
    throw new Error(
      `Credenziali non trovate per il provider pagamento ${providerType} del tenant ${tenantId}`,
    );
  }

  switch (providerType) {
    case "stripe":
      return new StripeProvider(
        credentials.secretKey ?? "",
        credentials.webhookSecret ?? "",
      );

    case "satispay":
      throw new Error("Satispay provider non ancora implementato");

    default:
      throw new Error(`Provider pagamento sconosciuto: ${providerType}`);
  }
}
