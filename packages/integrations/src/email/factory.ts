import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq, and } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import type { EmailProvider, EmailProviderType } from "./types";
import { ResendProvider } from "./resend";
import { PostmarkProvider } from "./postmark";
import { SMTPProvider } from "./smtp";

/**
 * Retrieve the active email provider for a tenant.
 *
 * Reads the tenant's active email integration from the vault,
 * decrypts the credentials, and returns the appropriate provider instance.
 *
 * @throws Error if no active email integration is found
 */
export async function getEmailProvider(
  tenantId: string,
): Promise<EmailProvider> {
  const vault = createVault();

  // Find the active email integration for this tenant
  const [integration] = await db
    .select({
      provider: tenantIntegrations.provider,
      configurazione: tenantIntegrations.configurazione,
    })
    .from(tenantIntegrations)
    .where(
      and(
        eq(tenantIntegrations.tenantId, tenantId),
        eq(tenantIntegrations.tipo, "email"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione email attiva trovata per il tenant ${tenantId}`,
    );
  }

  const providerType = integration.provider as EmailProviderType;
  const credentials = await vault.getCredentials(tenantId, providerType);

  if (!credentials) {
    throw new Error(
      `Credenziali non trovate per il provider email ${providerType} del tenant ${tenantId}`,
    );
  }

  const config = integration.configurazione as Record<string, string> | null;
  const defaultFrom =
    config?.defaultFrom ?? credentials.defaultFrom ?? "noreply@neogesys.sport";

  switch (providerType) {
    case "resend":
      return new ResendProvider(
        credentials.apiKey ?? "",
        defaultFrom,
      );

    case "postmark":
      return new PostmarkProvider(
        credentials.serverToken ?? "",
        defaultFrom,
      );

    case "smtp":
      return new SMTPProvider({
        host: credentials.host ?? "",
        port: credentials.port ?? "587",
        user: credentials.user ?? "",
        pass: credentials.pass ?? "",
        secure: credentials.secure,
        defaultFrom,
      });

    case "ses":
      // SES would be implemented similarly with @aws-sdk/client-ses
      throw new Error("SES provider non ancora implementato");

    default:
      throw new Error(`Provider email sconosciuto: ${providerType}`);
  }
}
