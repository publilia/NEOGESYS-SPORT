import { db } from "@neogesys/db";
import { sql, eq, and, lte, gte, inArray } from "drizzle-orm";
import { certificatiMedici } from "@neogesys/db/schema";
import { getEmailProvider } from "@neogesys/integrations";

/**
 * Alert thresholds in days before certificate expiry.
 */
const ALERT_THRESHOLDS = [60, 30, 15, 0] as const;

interface CertificatoAlert {
  socioId: string;
  socioNome: string;
  socioCognome: string;
  socioEmail: string | null;
  certificatoId: string;
  tipo: string;
  dataScadenza: Date;
  giorniAllaScadenza: number;
  tenantId: string;
  tenantNome: string;
}

/**
 * Build the HTML email body for a certificate expiry alert.
 */
function buildAlertEmail(alert: CertificatoAlert): string {
  const isExpired = alert.giorniAllaScadenza <= 0;
  const tipoLabel =
    alert.tipo === "agonistico"
      ? "Agonistico"
      : alert.tipo === "non_agonistico"
        ? "Non Agonistico"
        : "Idoneita Sportiva";

  const scadenzaFormatted = alert.dataScadenza.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (isExpired) {
    return `
<!DOCTYPE html>
<html lang="it">
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #dc2626;">Certificato Medico Scaduto</h2>
  <p>Gentile ${alert.socioNome} ${alert.socioCognome},</p>
  <p>Ti informiamo che il tuo <strong>certificato medico ${tipoLabel}</strong>
     e <strong>scaduto il ${scadenzaFormatted}</strong>.</p>
  <p>Per continuare a partecipare alle attivita sportive presso <strong>${alert.tenantNome}</strong>,
     e necessario presentare un nuovo certificato medico valido il prima possibile.</p>
  <p>Cordiali saluti,<br/>${alert.tenantNome}</p>
</body>
</html>`;
  }

  return `
<!DOCTYPE html>
<html lang="it">
<body style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #f59e0b;">Certificato Medico in Scadenza</h2>
  <p>Gentile ${alert.socioNome} ${alert.socioCognome},</p>
  <p>Ti informiamo che il tuo <strong>certificato medico ${tipoLabel}</strong>
     scadra tra <strong>${alert.giorniAllaScadenza} giorni</strong>
     (il ${scadenzaFormatted}).</p>
  <p>Ti consigliamo di prenotare per tempo la visita medica per il rinnovo del certificato
     presso il tuo medico sportivo di fiducia.</p>
  <p>Cordiali saluti,<br/>${alert.tenantNome}</p>
</body>
</html>`;
}

/**
 * Job: Check certificate expiry and send email alerts.
 *
 * Runs daily. Finds certificates expiring at 60, 30, 15, and 0 days
 * and sends email alerts to the corresponding members via the tenant's
 * configured email provider.
 */
export async function runCertificatiAlerts(): Promise<{
  processed: number;
  sent: number;
  errors: number;
}> {
  console.log("[certificati-alerts] Avvio job controllo scadenze certificati...");

  let processed = 0;
  let sent = 0;
  let errors = 0;

  const now = new Date();

  // For each threshold, find certificates expiring exactly on that day (+/- 12 hours)
  for (const threshold of ALERT_THRESHOLDS) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + threshold);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query certificates expiring on this threshold date with socio and tenant info
    const expiringCerts = await db.execute(sql`
      SELECT
        cm.id as "certificatoId",
        cm.tenant_id as "tenantId",
        cm.socio_id as "socioId",
        cm.tipo,
        cm.data_scadenza as "dataScadenza",
        s.nome as "socioNome",
        s.cognome as "socioCognome",
        s.email as "socioEmail",
        t.ragione_sociale as "tenantNome"
      FROM certificati_medici cm
      JOIN soci s ON s.id = cm.socio_id
      JOIN tenants t ON t.id = cm.tenant_id
      WHERE cm.data_scadenza >= ${startOfDay.toISOString()}
        AND cm.data_scadenza <= ${endOfDay.toISOString()}
        AND cm.stato IN ('valido', 'in_scadenza')
        AND s.stato = 'attivo'
        AND t.stato IN ('attivo', 'trial')
    `);

    const rows = (expiringCerts.rows ?? []) as Array<Record<string, unknown>>;

    // Group by tenant for batch email sending
    const byTenant = new Map<string, CertificatoAlert[]>();

    for (const row of rows) {
      const alert: CertificatoAlert = {
        socioId: String(row.socioId),
        socioNome: String(row.socioNome),
        socioCognome: String(row.socioCognome),
        socioEmail: row.socioEmail ? String(row.socioEmail) : null,
        certificatoId: String(row.certificatoId),
        tipo: String(row.tipo),
        dataScadenza: new Date(String(row.dataScadenza)),
        giorniAllaScadenza: threshold,
        tenantId: String(row.tenantId),
        tenantNome: String(row.tenantNome),
      };

      if (!alert.socioEmail) continue;

      processed++;

      const existing = byTenant.get(alert.tenantId) ?? [];
      existing.push(alert);
      byTenant.set(alert.tenantId, existing);
    }

    // Send emails grouped by tenant
    for (const [tenantId, alerts] of byTenant) {
      try {
        const emailProvider = await getEmailProvider(tenantId);

        const messages = alerts
          .filter((a) => a.socioEmail)
          .map((alert) => ({
            to: alert.socioEmail!,
            subject:
              threshold === 0
                ? `Certificato Medico Scaduto - ${alert.tenantNome}`
                : `Certificato Medico in Scadenza (${threshold} giorni) - ${alert.tenantNome}`,
            html: buildAlertEmail(alert),
          }));

        if (messages.length > 0) {
          const result = await emailProvider.sendBatch(messages);
          sent += result.results.filter((r) => r.status === "sent").length;
          errors += result.results.filter((r) => r.error).length;
        }

        // Update certificate status in the database
        if (threshold === 0) {
          const certIds = alerts.map((a) => a.certificatoId);
          await db.execute(sql`
            UPDATE certificati_medici
            SET stato = 'scaduto', updated_at = NOW()
            WHERE id = ANY(${certIds})
          `);
        } else if (threshold <= 30) {
          const certIds = alerts.map((a) => a.certificatoId);
          await db.execute(sql`
            UPDATE certificati_medici
            SET stato = 'in_scadenza', updated_at = NOW()
            WHERE id = ANY(${certIds})
              AND stato = 'valido'
          `);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Errore sconosciuto";
        console.error(
          `[certificati-alerts] Errore invio email per tenant ${tenantId}: ${msg}`,
        );
        errors += alerts.length;
      }
    }
  }

  console.log(
    `[certificati-alerts] Completato: ${processed} processati, ${sent} inviati, ${errors} errori`,
  );

  return { processed, sent, errors };
}
