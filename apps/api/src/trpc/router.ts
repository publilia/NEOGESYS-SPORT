import { router } from "./index";
import { tenantRouter } from "../routes/tenant";
import { sociRouter } from "../routes/soci";
import { certificatiRouter } from "../routes/certificati";
import { corsiRouter } from "../routes/corsi";
import { quoteRouter } from "../routes/quote";
import { eventiRouter } from "../routes/eventi";
import { comunicazioniRouter } from "../routes/comunicazioni";
import { contabilitaRouter } from "../routes/contabilita";
import { documentiRouter } from "../routes/documenti";
import { aiRouter } from "../routes/ai";
import { impostazioniRouter } from "../routes/impostazioni";
import { integrazioniRouter } from "../routes/integrazioni";
import { dashboardRouter } from "../routes/dashboard";
import { googleCalendarRouter } from "../routes/google-calendar";
import { microsoftOneDriveRouter } from "../routes/microsoft-onedrive";
import { microsoftCalendarRouter } from "../routes/microsoft-calendar";

/**
 * Root tRPC router for the NEOGESYS Sport API.
 *
 * Merges all domain-specific sub-routers under a single namespace.
 * Each sub-router groups related procedures (queries and mutations)
 * for its domain.
 */
export const appRouter = router({
  tenant: tenantRouter,
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
});

/** The type of the root router -- used by tRPC clients for type inference. */
export type AppRouter = typeof appRouter;
