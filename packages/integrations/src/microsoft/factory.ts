import { db } from "@neogesys/db";
import { tenantIntegrations } from "@neogesys/db/schema";
import { createVault } from "@neogesys/vault";
import { and, eq } from "drizzle-orm";
import { OutlookCalendarService } from "./calendar";
import { OneDriveService } from "./onedrive";
import type { MicrosoftAuthConfig } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve Microsoft auth config from the vault for a given tenant and provider key.
 */
async function resolveMicrosoftConfig(
	tenantId: string,
	providerKey: string,
): Promise<{ config: MicrosoftAuthConfig; configurazione: Record<string, unknown> | null }> {
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
				eq(tenantIntegrations.provider, providerKey),
				eq(tenantIntegrations.attivo, true),
			),
		)
		.limit(1);

	if (!integration) {
		throw new Error(`Nessuna integrazione ${providerKey} attiva trovata per il tenant ${tenantId}`);
	}

	const credentials = await vault.getCredentials(tenantId, providerKey);

	if (!credentials) {
		throw new Error(`Credenziali non trovate per ${providerKey} del tenant ${tenantId}`);
	}

	const config: MicrosoftAuthConfig = {
		clientId: credentials.clientId ?? "",
		clientSecret: credentials.clientSecret ?? "",
		tenantId: credentials.azureTenantId ?? "",
		redirectUri: credentials.redirectUri ?? "",
		refreshToken: credentials.refreshToken ?? "",
		accessToken: credentials.accessToken,
	};

	return {
		config,
		configurazione: integration.configurazione as Record<string, unknown> | null,
	};
}

// ─── Factories ──────────────────────────────────────────────────────────────

/**
 * Retrieve the OneDrive provider for a tenant.
 *
 * Reads Microsoft credentials from the vault (provider: 'microsoft_onedrive'),
 * creates and returns an authenticated {@link OneDriveService} instance.
 *
 * @throws Error if no active integration or credentials are found
 */
export async function getOneDriveProvider(tenantId: string): Promise<OneDriveService> {
	const { config, configurazione } = await resolveMicrosoftConfig(tenantId, "microsoft_onedrive");

	const tenantSlug = (configurazione?.tenantSlug as string) ?? tenantId;

	return new OneDriveService(config, tenantSlug);
}

/**
 * Retrieve the Outlook Calendar provider for a tenant.
 *
 * Reads Microsoft credentials from the vault (provider: 'microsoft_calendar'),
 * creates and returns an authenticated {@link OutlookCalendarService} instance.
 *
 * @throws Error if no active integration or credentials are found
 */
export async function getOutlookCalendarProvider(
	tenantId: string,
): Promise<OutlookCalendarService> {
	const { config } = await resolveMicrosoftConfig(tenantId, "microsoft_calendar");

	return new OutlookCalendarService(config);
}
