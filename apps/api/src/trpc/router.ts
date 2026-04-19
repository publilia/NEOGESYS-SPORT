import { aiRouter } from "../routes/ai";
import { certificatiRouter } from "../routes/certificati";
import { comunicazioniRouter } from "../routes/comunicazioni";
import { contabilitaRouter } from "../routes/contabilita";
import { corsiRouter } from "../routes/corsi";
import { dashboardRouter } from "../routes/dashboard";
import { documentiRouter } from "../routes/documenti";
import { ecosystemRouter } from "../routes/ecosystem";
import { eventiRouter } from "../routes/eventi";
import { googleCalendarRouter } from "../routes/google-calendar";
import { impostazioniRouter } from "../routes/impostazioni";
import { integrazioniRouter } from "../routes/integrazioni";
import { microsoftCalendarRouter } from "../routes/microsoft-calendar";
import { microsoftOneDriveRouter } from "../routes/microsoft-onedrive";
import { auditRouter, fattureRouter, pianiRouter, sistemaRouter } from "../routes/piattaforma";
import { quoteRouter } from "../routes/quote";
import { sociRouter } from "../routes/soci";
import { tenantRouter } from "../routes/tenant";
import { utentiRouter } from "../routes/utenti";
import { verificaRouter } from "../routes/verifica";
import { router } from "./index";

/**
 * Root tRPC router for the NEOGESYS Sport API.
 *
 * Merges all domain-specific sub-routers under a single namespace.
 * Each sub-router groups related procedures (queries and mutations)
 * for its domain.
 */
export const appRouter = router({
	// ── Tenant-level (usato dagli utenti del tenant) ─────────────
	tenant: tenantRouter,
	utenti: utentiRouter,
	soci: sociRouter,
	certificati: certificatiRouter,
	corsi: corsiRouter,
	quote: quoteRouter,
	eventi: eventiRouter,
	comunicazioni: comunicazioniRouter,
	contabilita: contabilitaRouter,
	documenti: documentiRouter,
	ai: aiRouter,
	impostazioni: impostazioniRouter,
	integrazioni: integrazioniRouter,
	dashboard: dashboardRouter,
	googleCalendar: googleCalendarRouter,
	microsoftOneDrive: microsoftOneDriveRouter,
	microsoftCalendar: microsoftCalendarRouter,

	// ── Ecosistema NEOGESYS (cross-gestionale) ──────────────────
	// Contratto d'interoperabilità fra tutti i gestionali della suite
	// (Sport, CRM, Proloco, Farmacie, Estetica, HR). Permette a gestionali
	// futuri di registrarsi, fare discovery delle app installate per un
	// tenant e orchestrare l'hand-off SSO. Dettagli in routes/ecosystem.ts.
	ecosystem: ecosystemRouter,

	// ── Public (nessuna autenticazione) ──────────────────────────
	verifica: verificaRouter,

	// ── Platform-level (solo super_admin) ────────────────────────
	piattaforma: router({
		piani: pianiRouter,
		fatture: fattureRouter,
		audit: auditRouter,
		sistema: sistemaRouter,
	}),
});

/** The type of the root router -- used by tRPC clients for type inference. */
export type AppRouter = typeof appRouter;
