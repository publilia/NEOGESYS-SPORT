import { createVault } from "@neogesys/vault";
import { db } from "@neogesys/db";
import { eq, and } from "drizzle-orm";
import { tenantIntegrations } from "@neogesys/db/schema";
import type { GoogleAuthConfig } from "./types";
import { GoogleDriveService } from "./drive";
import { GoogleCalendarService } from "./calendar";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build a GoogleAuthConfig from decrypted vault credentials and the
 * integration's configurazione column.
 */
function buildAuthConfig(
  credentials: Record<string, string>,
  configurazione: Record<string, string> | null,
): GoogleAuthConfig {
  return {
    clientId: credentials.clientId ?? "",
    clientSecret: credentials.clientSecret ?? "",
    redirectUri: credentials.redirectUri ?? configurazione?.redirectUri ?? "",
    refreshToken: credentials.refreshToken ?? "",
    accessToken: credentials.accessToken,
  };
}

// ─── Google Drive Factory ───────────────────────────────────────────────────

/**
 * Retrieve the Google Drive provider for a tenant.
 *
 * Reads the tenant's active google_drive integration from the vault,
 * decrypts the credentials, and returns a GoogleDriveService instance.
 *
 * @throws Error if no active Google Drive integration is found
 */
export async function getGoogleDriveProvider(
  tenantId: string,
): Promise<GoogleDriveService> {
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
        eq(tenantIntegrations.provider, "google_drive"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione Google Drive attiva trovata per il tenant ${tenantId}`,
    );
  }

  const credentials = await vault.getCredentials(tenantId, "google_drive");

  if (!credentials) {
    throw new Error(
      `Credenziali Google Drive non trovate per il tenant ${tenantId}`,
    );
  }

  const config = buildAuthConfig(
    credentials,
    integration.configurazione as Record<string, string> | null,
  );

  return new GoogleDriveService(config);
}

// ─── Google Calendar Factory ────────────────────────────────────────────────

/**
 * Retrieve the Google Calendar provider for a tenant.
 *
 * Reads the tenant's active google_calendar integration from the vault,
 * decrypts the credentials, and returns a GoogleCalendarService instance.
 *
 * @throws Error if no active Google Calendar integration is found
 */
export async function getGoogleCalendarProvider(
  tenantId: string,
): Promise<GoogleCalendarService> {
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
        eq(tenantIntegrations.provider, "google_calendar"),
        eq(tenantIntegrations.attivo, true),
      ),
    )
    .limit(1);

  if (!integration) {
    throw new Error(
      `Nessuna integrazione Google Calendar attiva trovata per il tenant ${tenantId}`,
    );
  }

  const credentials = await vault.getCredentials(tenantId, "google_calendar");

  if (!credentials) {
    throw new Error(
      `Credenziali Google Calendar non trovate per il tenant ${tenantId}`,
    );
  }

  const config = buildAuthConfig(
    credentials,
    integration.configurazione as Record<string, string> | null,
  );

  return new GoogleCalendarService(config);
}
