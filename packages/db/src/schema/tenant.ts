import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenantIntegrations } from "./tenant-integrations";
import { utenteTenant } from "./utenti";
import { soci } from "./soci";
import { corsi } from "./corsi";
import { eventi } from "./eventi";
import { anniSportivi, quote, tipiQuota } from "./quote";
import { comunicazioni } from "./comunicazioni";
import { documenti, consensiGdpr } from "./documenti";
import { primaNotaMovimenti } from "./contabilita";
import { certificatiMedici } from "./certificati";
import { auditLog } from "./audit-log";
import { sociEmbeddings } from "./embeddings";

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 50 }).unique().notNull(),
    ragioneSociale: varchar("ragione_sociale", { length: 200 }).notNull(),
    tipoEnte: varchar("tipo_ente", { length: 20 }).notNull(), // ASD | SSD | FED | PALESTRA | SCUOLA

    partitaIva: varchar("partita_iva", { length: 20 }),
    codiceFiscale: varchar("codice_fiscale", { length: 20 }),
    pec: varchar("pec", { length: 200 }),
    codiceSDI: varchar("codice_sdi", { length: 10 }),

    sedeLegale: jsonb("sede_legale"), // { via, cap, citta, provincia, nazione }

    /* ========== BRANDING ========== */
    logo: text("logo"), // URL to logo (light)
    logoDark: text("logo_dark"), // Optional dark mode logo
    favicon: text("favicon"), // Favicon URL
    nomeVisualizzato: varchar("nome_visualizzato", { length: 100 }), // Custom display name
    paletteDefault: varchar("palette_default", { length: 30 }).default("default"),
    paletteCustom: jsonb("palette_custom"), // { primary, secondary, accent, background } HSL/hex
    customDomain: varchar("custom_domain", { length: 100 }).unique(), // e.g. "gestionale.aquilasport.it"
    customDomainVerified: boolean("custom_domain_verified").default(false).notNull(),

    /* ========== SUBSCRIPTION ========== */
    piano: varchar("piano", { length: 20 }).default("trial").notNull(), // trial | free | base | pro | enterprise
    maxSoci: varchar("max_soci", { length: 10 }).default("50").notNull(),
    maxUtenti: varchar("max_utenti", { length: 10 }).default("5").notNull(),
    maxStorageMb: varchar("max_storage_mb", { length: 10 }).default("500").notNull(),

    /* ========== STATUS ========== */
    stato: varchar("stato", { length: 20 }).default("trial").notNull(), // attivo | sospeso | trial | chiuso | pending_setup
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    sospensioneMotivo: text("sospensione_motivo"),
    sospensioneData: timestamp("sospensione_data", { withTimezone: true }),
    chiusuraData: timestamp("chiusura_data", { withTimezone: true }),

    /* ========== BILLING (Stripe / Satispay) ========== */
    stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
    abbonamentoInizio: timestamp("abbonamento_inizio", { withTimezone: true }),
    abbonamentoFine: timestamp("abbonamento_fine", { withTimezone: true }),
    prossimaFatturazione: timestamp("prossima_fatturazione", { withTimezone: true }),
    metodoFatturazione: varchar("metodo_fatturazione", { length: 20 }), // stripe | bonifico | satispay

    /* ========== CONFIG ========== */
    federazioni: jsonb("federazioni"), // [{ sigla, codiceAffiliazione, validitaFino }]
    discipline: jsonb("discipline"), // ["atletica","nuoto",...]
    impostazioni: jsonb("impostazioni"), // { layout_menu, cert_alert_days, ai_enabled, lingua, timezone }

    /* ========== AUDIT ========== */
    creatoDa: uuid("creato_da"), // super_admin user id
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("tenants_slug_idx").on(t.slug),
    index("tenants_stato_idx").on(t.stato),
    index("tenants_piano_idx").on(t.piano),
    index("tenants_custom_domain_idx").on(t.customDomain),
  ],
);

export const tenantsRelations = relations(tenants, ({ many }) => ({
  integrations: many(tenantIntegrations),
  utenteTenant: many(utenteTenant),
  soci: many(soci),
  corsi: many(corsi),
  eventi: many(eventi),
  anniSportivi: many(anniSportivi),
  tipiQuota: many(tipiQuota),
  quote: many(quote),
  comunicazioni: many(comunicazioni),
  documenti: many(documenti),
  consensiGdpr: many(consensiGdpr),
  primaNotaMovimenti: many(primaNotaMovimenti),
  certificatiMedici: many(certificatiMedici),
  auditLog: many(auditLog),
  sociEmbeddings: many(sociEmbeddings),
}));
