import { db } from "@neogesys/db";
import { getCalendarProvider } from "@neogesys/integrations";
import type { SyncInfo } from "@neogesys/integrations";
import { sql } from "drizzle-orm";

// ─── Constants ─────────────────────────────────────────────────────────────

/** Refresh webhooks when they expire within 2 hours. */
const WEBHOOK_REFRESH_THRESHOLD_MS = 2 * 60 * 60 * 1000;

// ─── Types ─────────────────────────────────────────────────────────────────

interface SyncJobResult {
	tenantsProcessed: number;
	eventsRefreshed: number;
	webhooksRefreshed: number;
	errors: number;
}

// ─── Job ───────────────────────────────────────────────────────────────────

/**
 * Job: Calendar Sync
 *
 * Runs every 15 minutes. For each tenant with an active calendar integration:
 * 1. Checks if any webhook subscriptions are about to expire and renews them.
 * 2. Performs an incremental sync of calendar events for tenants with
 *    active subscriptions.
 *
 * This ensures that even if a webhook notification is missed, the system
 * stays in sync within a 15-minute window.
 */
export async function runCalendarSync(): Promise<SyncJobResult> {
	let tenantsProcessed = 0;
	let eventsRefreshed = 0;
	let webhooksRefreshed = 0;
	let errors = 0;

	try {
		// Find all tenants with active calendar integrations
		const activeIntegrations = await db.execute(sql`
      SELECT
        ti.tenant_id as "tenantId",
        ti.provider,
        ti.configurazione
      FROM tenant_integrations ti
      WHERE ti.attivo = true
        AND ti.provider IN ('google_calendar', 'microsoft_calendar')
        AND ti.tenant_id IN (
          SELECT id FROM tenants WHERE stato IN ('attivo', 'trial')
        )
    `);

		const rows = activeIntegrations as unknown as Array<Record<string, unknown>>;

		for (const row of rows) {
			const tenantId = String(row.tenantId);
			const provider = String(row.provider);
			const config = (row.configurazione ?? {}) as Record<string, unknown>;

			tenantsProcessed++;

			try {
				const calendarProvider = await getCalendarProvider(tenantId);

				// Check webhook expiration and refresh if needed
				const webhookExpiration = config.webhookExpiration
					? new Date(String(config.webhookExpiration))
					: null;

				const webhookUrl = config.webhookUrl as string | undefined;
				const calendarId = config.calendarId as string | undefined;

				if (webhookUrl && calendarId && webhookExpiration) {
					const timeUntilExpiry = webhookExpiration.getTime() - Date.now();

					if (timeUntilExpiry < WEBHOOK_REFRESH_THRESHOLD_MS) {
						try {
							// Stop old subscription
							const oldSyncInfo: SyncInfo = {
								channelId: config.channelId as string | undefined,
								resourceId: config.resourceId as string | undefined,
								subscriptionId: config.subscriptionId as string | undefined,
								expiration: webhookExpiration,
							};

							await calendarProvider.stopSync(oldSyncInfo);

							// Setup new subscription
							const newSyncInfo = await calendarProvider.setupSync(calendarId, webhookUrl);

							// Update config with new subscription info
							await db.execute(sql`
                UPDATE tenant_integrations
                SET configurazione = configurazione || ${JSON.stringify({
									channelId: newSyncInfo.channelId,
									resourceId: newSyncInfo.resourceId,
									subscriptionId: newSyncInfo.subscriptionId,
									webhookExpiration: newSyncInfo.expiration.toISOString(),
								})}::jsonb,
                updated_at = NOW()
                WHERE tenant_id = ${tenantId}
                  AND provider = ${provider}
              `);

							webhooksRefreshed++;
						} catch (error) {
							const msg = error instanceof Error ? error.message : "Errore sconosciuto";
							console.error(`[calendar-sync] Errore rinnovo webhook tenant ${tenantId}: ${msg}`);
							errors++;
						}
					}
				}

				// Incremental sync: fetch recent events
				if (calendarId) {
					try {
						const timeMin = new Date();
						timeMin.setDate(timeMin.getDate() - 1); // Last 24 hours

						const timeMax = new Date();
						timeMax.setMonth(timeMax.getMonth() + 3); // Next 3 months

						const events = await calendarProvider.listEvents(calendarId, timeMin, timeMax);

						eventsRefreshed += events.events.length;
					} catch (error) {
						const msg = error instanceof Error ? error.message : "Errore sconosciuto";
						console.error(`[calendar-sync] Errore sync eventi tenant ${tenantId}: ${msg}`);
						errors++;
					}
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Errore sconosciuto";
				console.error(`[calendar-sync] Errore elaborazione tenant ${tenantId}: ${msg}`);
				errors++;
			}
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Errore sconosciuto";
		console.error(`[calendar-sync] Errore fatale: ${msg}`);
		errors++;
	}

	return { tenantsProcessed, eventsRefreshed, webhooksRefreshed, errors };
}
