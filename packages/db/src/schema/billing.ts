import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

/**
 * Piani di abbonamento disponibili sulla piattaforma.
 * Gestiti dal super_admin.
 */
export const planiAbbonamento = pgTable(
  "piani_abbonamento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codice: varchar("codice", { length: 30 }).unique().notNull(), // free | base | pro | enterprise
    nome: varchar("nome", { length: 100 }).notNull(),
    descrizione: text("descrizione"),

    prezzoMensile: decimal("prezzo_mensile", { precision: 10, scale: 2 }).notNull(),
    prezzoAnnuale: decimal("prezzo_annuale", { precision: 10, scale: 2 }).notNull(),
    valuta: varchar("valuta", { length: 3 }).default("EUR").notNull(),

    maxSoci: integer("max_soci").notNull(),
    maxUtenti: integer("max_utenti").notNull(),
    maxStorageMb: integer("max_storage_mb").notNull(),
    maxCorsi: integer("max_corsi"),
    maxEventi: integer("max_eventi"),

    /* Feature flags */
    aiAbilitato: boolean("ai_abilitato").default(false).notNull(),
    integrazioniGoogle: boolean("integrazioni_google").default(false).notNull(),
    integrazioniMicrosoft: boolean("integrazioni_microsoft").default(false).notNull(),
    customDomain: boolean("custom_domain").default(false).notNull(),
    customPalette: boolean("custom_palette").default(false).notNull(),
    fatturazioneSDI: boolean("fatturazione_sdi").default(false).notNull(),
    exportAvanzato: boolean("export_avanzato").default(false).notNull(),
    supportoPrioritario: boolean("supporto_prioritario").default(false).notNull(),
    whiteLabel: boolean("white_label").default(false).notNull(),

    /* Display */
    ordine: integer("ordine").default(0).notNull(),
    colore: varchar("colore", { length: 20 }), // display color
    highlighted: boolean("highlighted").default(false).notNull(), // "most popular"
    attivo: boolean("attivo").default(true).notNull(),

    stripePriceIdMensile: varchar("stripe_price_id_mensile", { length: 100 }),
    stripePriceIdAnnuale: varchar("stripe_price_id_annuale", { length: 100 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("piani_codice_idx").on(t.codice),
    index("piani_attivo_idx").on(t.attivo),
  ],
);

/**
 * Fatture emesse dalla piattaforma al tenant per l'abbonamento.
 * Il super_admin gestisce, il tenant vede solo le proprie.
 */
export const fatturePiattaforma = pgTable(
  "fatture_piattaforma",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),

    numero: varchar("numero", { length: 50 }).notNull(),
    annoFattura: integer("anno_fattura").notNull(),

    dataEmissione: timestamp("data_emissione", { withTimezone: true }).notNull(),
    dataScadenza: timestamp("data_scadenza", { withTimezone: true }).notNull(),
    dataPagamento: timestamp("data_pagamento", { withTimezone: true }),

    descrizione: text("descrizione").notNull(), // "Abbonamento Pro - Aprile 2026"
    pianoCodice: varchar("piano_codice", { length: 30 }).notNull(),
    periodo: varchar("periodo", { length: 20 }).notNull(), // mensile | annuale

    imponibile: decimal("imponibile", { precision: 10, scale: 2 }).notNull(),
    iva: decimal("iva", { precision: 10, scale: 2 }).notNull(),
    totale: decimal("totale", { precision: 10, scale: 2 }).notNull(),
    valuta: varchar("valuta", { length: 3 }).default("EUR").notNull(),

    stato: varchar("stato", { length: 20 }).default("emessa").notNull(), // bozza | emessa | pagata | scaduta | annullata

    stripeInvoiceId: varchar("stripe_invoice_id", { length: 100 }),
    pdfUrl: text("pdf_url"),
    xmlSDI: text("xml_sdi"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("fatture_tenant_idx").on(t.tenantId),
    index("fatture_stato_idx").on(t.stato),
    index("fatture_anno_idx").on(t.annoFattura),
  ],
);

/**
 * Usage tracking per tenant (monitorato dal super_admin per billing e per quote).
 */
export const tenantUsage = pgTable(
  "tenant_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),

    periodo: varchar("periodo", { length: 7 }).notNull(), // YYYY-MM

    numSoci: integer("num_soci").default(0).notNull(),
    numUtenti: integer("num_utenti").default(0).notNull(),
    numCorsi: integer("num_corsi").default(0).notNull(),
    numEventi: integer("num_eventi").default(0).notNull(),
    numComunicazioni: integer("num_comunicazioni").default(0).notNull(),
    numDocumenti: integer("num_documenti").default(0).notNull(),
    storageUsedMb: integer("storage_used_mb").default(0).notNull(),
    numAiCall: integer("num_ai_call").default(0).notNull(),
    numApiCall: integer("num_api_call").default(0).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("usage_tenant_periodo_idx").on(t.tenantId, t.periodo),
  ],
);

/**
 * Log delle azioni super_admin (visibili solo ad altri super_admin).
 * NO tenantId = azione a livello piattaforma.
 */
export const superAdminAuditLog = pgTable(
  "super_admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    superAdminId: uuid("super_admin_id").notNull(),
    superAdminEmail: varchar("super_admin_email", { length: 200 }).notNull(),

    azione: varchar("azione", { length: 100 }).notNull(), // tenant.create | tenant.suspend | plan.update | ...
    target: varchar("target", { length: 50 }), // tenant | plan | user
    targetId: uuid("target_id"),

    dettagli: jsonb("dettagli"), // { before, after, reason, ... }
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sa_audit_action_idx").on(t.azione),
    index("sa_audit_target_idx").on(t.target, t.targetId),
    index("sa_audit_created_idx").on(t.createdAt),
  ],
);

export const planiAbbonamentoRelations = relations(planiAbbonamento, () => ({}));

export const fatturePiattaformaRelations = relations(fatturePiattaforma, ({ one }) => ({
  tenant: one(tenants, {
    fields: [fatturePiattaforma.tenantId],
    references: [tenants.id],
  }),
}));

export const tenantUsageRelations = relations(tenantUsage, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantUsage.tenantId],
    references: [tenants.id],
  }),
}));
