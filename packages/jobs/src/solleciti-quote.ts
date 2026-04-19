import { db } from "@neogesys/db";
import { getEmailProvider } from "@neogesys/integrations";
import { sql } from "drizzle-orm";

interface QuotaInsoluta {
	quotaId: string;
	tenantId: string;
	tenantNome: string;
	socioId: string;
	socioNome: string;
	socioCognome: string;
	socioEmail: string | null;
	tipoQuota: string;
	importo: string;
	importoPagato: string;
	stato: string;
	dataScadenza: Date | null;
	giorniScaduti: number;
}

/**
 * Build the HTML email body for a payment reminder.
 */
function buildSollecitoEmail(
	socioNome: string,
	socioCognome: string,
	tenantNome: string,
	quoteInsolute: QuotaInsoluta[],
): string {
	const importoTotale = quoteInsolute.reduce((sum, q) => {
		const dovuto = Number.parseFloat(q.importo) - Number.parseFloat(q.importoPagato);
		return sum + dovuto;
	}, 0);

	const righeQuote = quoteInsolute
		.map((q) => {
			const dovuto = Number.parseFloat(q.importo) - Number.parseFloat(q.importoPagato);
			const scadenza = q.dataScadenza
				? q.dataScadenza.toLocaleDateString("it-IT", {
						day: "2-digit",
						month: "long",
						year: "numeric",
					})
				: "N/D";

			return `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${q.tipoQuota}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${scadenza}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">
          &euro; ${dovuto.toFixed(2)}
        </td>
      </tr>`;
		})
		.join("");

	return `
<!DOCTYPE html>
<html lang="it">
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #f59e0b;">Promemoria Quote in Sospeso</h2>
  <p>Gentile ${socioNome} ${socioCognome},</p>
  <p>Ti informiamo che risultano delle quote ancora da saldare presso <strong>${tenantNome}</strong>:</p>

  <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <thead>
      <tr style="background: #f3f4f6;">
        <th style="padding: 8px; text-align: left;">Tipo</th>
        <th style="padding: 8px; text-align: left;">Scadenza</th>
        <th style="padding: 8px; text-align: right;">Importo Dovuto</th>
      </tr>
    </thead>
    <tbody>
      ${righeQuote}
    </tbody>
    <tfoot>
      <tr style="font-weight: bold;">
        <td colspan="2" style="padding: 8px;">Totale</td>
        <td style="padding: 8px; text-align: right;">&euro; ${importoTotale.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <p>Ti preghiamo di provvedere al pagamento il prima possibile.
     Per qualsiasi chiarimento, non esitare a contattare la segreteria.</p>
  <p>Cordiali saluti,<br/>${tenantNome}</p>
</body>
</html>`;
}

/**
 * Job: Send payment reminders for overdue quotes.
 *
 * Runs weekly. Finds quotes that are overdue (past their due date
 * and not fully paid) and sends reminder emails to the members
 * via each tenant's configured email provider.
 */
export async function runSollecitiQuote(): Promise<{
	processed: number;
	sent: number;
	errors: number;
}> {
	let processed = 0;
	let sent = 0;
	let errors = 0;

	// Find all overdue quotes with socio and tenant info
	const overdueQuotes = await db.execute(sql`
    SELECT
      q.id as "quotaId",
      q.tenant_id as "tenantId",
      q.socio_id as "socioId",
      q.importo,
      q.importo_pagato as "importoPagato",
      q.stato,
      q.data_scadenza as "dataScadenza",
      EXTRACT(DAY FROM NOW() - q.data_scadenza)::int as "giorniScaduti",
      tq.nome as "tipoQuota",
      s.nome as "socioNome",
      s.cognome as "socioCognome",
      s.email as "socioEmail",
      t.ragione_sociale as "tenantNome"
    FROM quote q
    JOIN tipi_quota tq ON tq.id = q.tipo_quota_id
    JOIN soci s ON s.id = q.socio_id
    JOIN tenants t ON t.id = q.tenant_id
    WHERE q.stato IN ('da_pagare', 'parziale')
      AND q.data_scadenza < NOW()
      AND s.stato = 'attivo'
      AND s.email IS NOT NULL
      AND t.stato IN ('attivo', 'trial')
    ORDER BY q.tenant_id, q.socio_id
  `);

	const rows = overdueQuotes as unknown as Array<Record<string, unknown>>;

	// Group by tenant and then by socio (one email per socio with all their overdue quotes)
	const byTenantSocio = new Map<string, Map<string, QuotaInsoluta[]>>();

	for (const row of rows) {
		const q: QuotaInsoluta = {
			quotaId: String(row.quotaId),
			tenantId: String(row.tenantId),
			tenantNome: String(row.tenantNome),
			socioId: String(row.socioId),
			socioNome: String(row.socioNome),
			socioCognome: String(row.socioCognome),
			socioEmail: row.socioEmail ? String(row.socioEmail) : null,
			tipoQuota: String(row.tipoQuota),
			importo: String(row.importo),
			importoPagato: String(row.importoPagato),
			stato: String(row.stato),
			dataScadenza: row.dataScadenza ? new Date(String(row.dataScadenza)) : null,
			giorniScaduti: Number(row.giorniScaduti),
		};

		if (!q.socioEmail) continue;

		let tenantMap = byTenantSocio.get(q.tenantId);
		if (!tenantMap) {
			tenantMap = new Map();
			byTenantSocio.set(q.tenantId, tenantMap);
		}

		let socioQuote = tenantMap.get(q.socioId);
		if (!socioQuote) {
			socioQuote = [];
			tenantMap.set(q.socioId, socioQuote);
		}

		socioQuote.push(q);
		processed++;
	}

	// Send emails grouped by tenant
	for (const [tenantId, socioMap] of byTenantSocio) {
		try {
			const emailProvider = await getEmailProvider(tenantId);

			const messages: Array<{
				to: string;
				subject: string;
				html: string;
			}> = [];

			for (const [_socioId, quoteList] of socioMap) {
				const first = quoteList[0];
				if (!first?.socioEmail) continue;

				messages.push({
					to: first.socioEmail,
					subject: `Promemoria Quote in Sospeso - ${first.tenantNome}`,
					html: buildSollecitoEmail(
						first.socioNome,
						first.socioCognome,
						first.tenantNome,
						quoteList,
					),
				});
			}

			if (messages.length > 0) {
				const result = await emailProvider.sendBatch(messages);
				sent += result.results.filter((r) => r.status === "sent").length;
				errors += result.results.filter((r) => r.error).length;
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : "Errore sconosciuto";
			console.error(`[solleciti-quote] Errore invio solleciti per tenant ${tenantId}: ${msg}`);
			errors += socioMap.size;
		}
	}

	return { processed, sent, errors };
}
