import { extractFeatures, predictChurn } from "@neogesys/ai";
import { db } from "@neogesys/db";
import { sql } from "drizzle-orm";

/**
 * Job: Weekly churn scoring for all active members.
 *
 * Runs weekly (Sunday night). For each active tenant:
 * 1. Calculates engagement features for each active member
 * 2. Calls the AI churn prediction model
 * 3. Updates the soci.churnScore field
 */
export async function runChurnPrediction(): Promise<{
	processed: number;
	updated: number;
	errors: number;
}> {
	let processed = 0;
	let updated = 0;
	let errors = 0;

	// Get all active tenants
	const tenantsResult = await db.execute(sql`
    SELECT id FROM tenants
    WHERE stato IN ('attivo', 'trial')
  `);

	const tenantRows = tenantsResult as unknown as Array<Record<string, unknown>>;

	for (const tenantRow of tenantRows) {
		const tenantId = String(tenantRow.id);

		try {
			// Get all active members with their engagement data
			const sociResult = await db.execute(sql`
        SELECT
          s.id as "socioId",
          s.data_iscrizione as "dataIscrizione",
          -- Attendance data
          (
            SELECT MAX(p.data_lezione)
            FROM presenze p
            WHERE p.socio_id = s.id AND p.presente = true
          ) as "ultimaPresenza",
          (
            SELECT COUNT(*)::int
            FROM presenze p
            WHERE p.socio_id = s.id
              AND p.presente = true
              AND p.data_lezione >= NOW() - INTERVAL '30 days'
          ) as "presenze30g",
          (
            SELECT COUNT(*)::int
            FROM presenze p
            WHERE p.socio_id = s.id
              AND p.presente = true
              AND p.data_lezione >= NOW() - INTERVAL '90 days'
          ) as "presenze90g",
          (
            SELECT COUNT(*)::int
            FROM presenze p
            WHERE p.socio_id = s.id
              AND p.data_lezione >= NOW() - INTERVAL '30 days'
          ) as "lezioniPreviste30g",
          -- Payment data
          (
            SELECT COUNT(*)::int
            FROM quote q
            WHERE q.socio_id = s.id
              AND q.stato IN ('da_pagare', 'parziale')
              AND q.data_scadenza < NOW()
          ) as "quoteInsolute",
          (
            SELECT MAX(q.data_pagamento)
            FROM quote q
            WHERE q.socio_id = s.id AND q.stato = 'pagato'
          ) as "ultimaQuotaPagata",
          (
            SELECT COALESCE(SUM(q.importo::numeric - q.importo_pagato::numeric), 0)
            FROM quote q
            WHERE q.socio_id = s.id
              AND q.stato IN ('da_pagare', 'parziale')
          )::float as "importoInsoluto",
          -- Course data
          (
            SELECT COUNT(*)::int
            FROM iscrizioni_corso ic
            WHERE ic.socio_id = s.id AND ic.stato = 'attivo'
          ) as "corsiAttivi",
          -- Certificate data
          (
            SELECT COUNT(*)::int
            FROM certificati_medici cm
            WHERE cm.socio_id = s.id AND cm.stato = 'valido'
          ) as "certificatiValidi",
          (
            SELECT COUNT(*) > 0
            FROM certificati_medici cm
            WHERE cm.socio_id = s.id
              AND cm.stato IN ('valido', 'in_scadenza')
              AND cm.data_scadenza <= NOW() + INTERVAL '30 days'
          ) as "certificatoInScadenza",
          -- Last login (from utente_tenant via socio link)
          (
            SELECT u.ultimo_accesso
            FROM utente_tenant ut
            JOIN utenti u ON u.id = ut.utente_id
            WHERE ut.socio_id = s.id
            LIMIT 1
          ) as "ultimoAccesso"
        FROM soci s
        WHERE s.tenant_id = ${tenantId}
          AND s.stato = 'attivo'
      `);

			const sociRows = sociResult as unknown as Array<Record<string, unknown>>;

			for (const row of sociRows) {
				processed++;

				try {
					const features = extractFeatures({
						socioId: String(row.socioId),
						tenantId,
						ultimaPresenza: row.ultimaPresenza ? new Date(String(row.ultimaPresenza)) : null,
						presenze30g: Number(row.presenze30g ?? 0),
						presenze90g: Number(row.presenze90g ?? 0),
						lezionePreviste30g: Number(row.lezioniPreviste30g ?? 0),
						quoteInsolute: Number(row.quoteInsolute ?? 0),
						ultimaQuotaPagata: row.ultimaQuotaPagata
							? new Date(String(row.ultimaQuotaPagata))
							: null,
						importoInsoluto: Number(row.importoInsoluto ?? 0),
						dataIscrizione: row.dataIscrizione ? new Date(String(row.dataIscrizione)) : null,
						corsiAttivi: Number(row.corsiAttivi ?? 0),
						certificatiValidi: Number(row.certificatiValidi ?? 0),
						certificatoInScadenza: Boolean(row.certificatoInScadenza),
						ultimoAccesso: row.ultimoAccesso ? new Date(String(row.ultimoAccesso)) : null,
					});

					const prediction = await predictChurn(features);

					// Update the churn score in the database
					await db.execute(sql`
            UPDATE soci
            SET churn_score = ${String(prediction.score)},
                updated_at = NOW()
            WHERE id = ${features.socioId}
          `);

					updated++;
				} catch (error) {
					const msg = error instanceof Error ? error.message : "Errore sconosciuto";
					console.error(`[churn-prediction] Errore per socio ${String(row.socioId)}: ${msg}`);
					errors++;
				}
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Errore sconosciuto";
			console.error(`[churn-prediction] Errore per tenant ${tenantId}: ${msg}`);
			errors++;
		}
	}

	return { processed, updated, errors };
}
