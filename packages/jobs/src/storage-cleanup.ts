import { db } from "@neogesys/db";
import { getStorageProvider } from "@neogesys/integrations";
import { sql } from "drizzle-orm";

// ─── Types ─────────────────────────────────────────────────────────────────

interface CleanupResult {
	tenantsChecked: number;
	orphanedLinksFound: number;
	orphanedLinksCleaned: number;
	totalUsageMB: number;
	errors: number;
	tenantUsage: Array<{
		tenantId: string;
		tenantNome: string;
		provider: string;
		usedMB: number;
		totalMB: number;
		percentUsed: number;
	}>;
}

// ─── Job ───────────────────────────────────────────────────────────────────

/**
 * Job: Storage Cleanup
 *
 * Runs daily. For each tenant with an active storage integration:
 * 1. Checks for orphaned cloud storage links (documents in DB that no
 *    longer exist in the cloud provider).
 * 2. Reports storage usage per tenant.
 * 3. Cleans up stale references.
 *
 * This keeps the document references in sync with actual cloud storage
 * and provides usage analytics for billing.
 */
export async function runStorageCleanup(): Promise<CleanupResult> {
	let tenantsChecked = 0;
	let orphanedLinksFound = 0;
	let orphanedLinksCleaned = 0;
	let totalUsageMB = 0;
	let errors = 0;
	const tenantUsage: CleanupResult["tenantUsage"] = [];

	try {
		// Find all tenants with active storage integrations
		const activeIntegrations = await db.execute(sql`
      SELECT
        ti.tenant_id as "tenantId",
        ti.provider,
        t.ragione_sociale as "tenantNome"
      FROM tenant_integrations ti
      JOIN tenants t ON t.id = ti.tenant_id
      WHERE ti.attivo = true
        AND ti.provider IN ('google_drive', 'microsoft_onedrive')
        AND t.stato IN ('attivo', 'trial')
    `);

		const rows = activeIntegrations as unknown as Array<Record<string, unknown>>;

		for (const row of rows) {
			const tenantId = String(row.tenantId);
			const provider = String(row.provider);
			const tenantNome = String(row.tenantNome);

			tenantsChecked++;

			try {
				const storageProvider = await getStorageProvider(tenantId);

				// 1. Check storage quota / usage
				try {
					const quota = await storageProvider.getQuota();
					const usedMB = Math.round(quota.used / (1024 * 1024));
					const totalMB = Math.round(quota.total / (1024 * 1024));
					const percentUsed = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0;

					totalUsageMB += usedMB;

					tenantUsage.push({
						tenantId,
						tenantNome,
						provider,
						usedMB,
						totalMB,
						percentUsed,
					});

					// Warn if usage is above 80%
					if (percentUsed >= 80) {
						console.warn(
							`[storage-cleanup] Attenzione: tenant ${tenantNome} (${tenantId}) usa ${percentUsed}% dello storage (${usedMB} MB / ${totalMB} MB)`,
						);
					}
				} catch (error) {
					const msg = error instanceof Error ? error.message : "Errore sconosciuto";
					console.error(`[storage-cleanup] Errore lettura quota tenant ${tenantId}: ${msg}`);
					errors++;
				}

				// 2. Check for orphaned document references
				try {
					const documentRefs = await db.execute(sql`
            SELECT
              id,
              cloud_file_id as "cloudFileId",
              cloud_provider as "cloudProvider",
              nome_file as "nomeFile"
            FROM documenti
            WHERE tenant_id = ${tenantId}
              AND cloud_file_id IS NOT NULL
              AND stato = 'attivo'
            LIMIT 100
          `);

					const docRows = documentRefs as unknown as Array<Record<string, unknown>>;

					for (const doc of docRows) {
						const cloudFileId = String(doc.cloudFileId);

						try {
							// Try to download (or just check existence) by listing
							// In a real implementation, we'd use a HEAD/metadata check
							await storageProvider.downloadFile(cloudFileId);
						} catch {
							// File not found in cloud storage - it's an orphan
							orphanedLinksFound++;

							// Mark document as orphaned in DB
							await db.execute(sql`
                UPDATE documenti
                SET stato = 'orfano',
                    note = COALESCE(note, '') || ' [Auto: file cloud non trovato - ' || NOW()::text || ']',
                    updated_at = NOW()
                WHERE id = ${String(doc.id)}
              `);

							orphanedLinksCleaned++;
						}
					}
				} catch (error) {
					const msg = error instanceof Error ? error.message : "Errore sconosciuto";
					console.error(`[storage-cleanup] Errore controllo orfani tenant ${tenantId}: ${msg}`);
					errors++;
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Errore sconosciuto";
				console.error(`[storage-cleanup] Errore elaborazione tenant ${tenantId}: ${msg}`);
				errors++;
			}
		}

		// Also check tenants with local S3 fallback (no cloud integration)
		const localTenants = await db.execute(sql`
      SELECT
        t.id as "tenantId",
        t.ragione_sociale as "tenantNome"
      FROM tenants t
      WHERE t.stato IN ('attivo', 'trial')
        AND t.id NOT IN (
          SELECT tenant_id FROM tenant_integrations
          WHERE provider IN ('google_drive', 'microsoft_onedrive')
            AND attivo = true
        )
    `);

		const localRows = localTenants as unknown as Array<Record<string, unknown>>;

		for (const row of localRows) {
			const tenantId = String(row.tenantId);
			const tenantNome = String(row.tenantNome);

			tenantsChecked++;

			try {
				const storageProvider = await getStorageProvider(tenantId);
				const quota = await storageProvider.getQuota();
				const usedMB = Math.round(quota.used / (1024 * 1024));
				const totalMB = Math.round(quota.total / (1024 * 1024));

				tenantUsage.push({
					tenantId,
					tenantNome,
					provider: "local_s3",
					usedMB,
					totalMB,
					percentUsed: totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0,
				});
			} catch (error) {
				const msg = error instanceof Error ? error.message : "Errore sconosciuto";
				console.error(`[storage-cleanup] Errore quota locale tenant ${tenantId}: ${msg}`);
				errors++;
			}
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : "Errore sconosciuto";
		console.error(`[storage-cleanup] Errore fatale: ${msg}`);
		errors++;
	}

	return {
		tenantsChecked,
		orphanedLinksFound,
		orphanedLinksCleaned,
		totalUsageMB,
		errors,
		tenantUsage,
	};
}
