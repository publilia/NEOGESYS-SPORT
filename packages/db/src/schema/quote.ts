import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";
import { soci } from "./soci";

// ─── Anni Sportivi (Sports Seasons) ──────────────────────────────────────────
export const anniSportivi = pgTable(
  "anni_sportivi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    nome: varchar("nome", { length: 50 }).notNull(), // e.g. "2025/2026"
    dataInizio: timestamp("data_inizio", { withTimezone: true }).notNull(),
    dataFine: timestamp("data_fine", { withTimezone: true }).notNull(),
    attivo: boolean("attivo").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("anni_sportivi_tenant_idx").on(table.tenantId),
    index("anni_sportivi_tenant_attivo_idx").on(table.tenantId, table.attivo),
  ],
);

// ─── Tipi Quota (Fee Types) ──────────────────────────────────────────────────
export const tipiQuota = pgTable(
  "tipi_quota",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    nome: varchar("nome", { length: 200 }).notNull(),
    tipo: varchar("tipo", { length: 30 }).notNull(), // iscrizione | mensile | trimestrale | annuale | evento
    importo: numeric("importo", { precision: 10, scale: 2 }).notNull(),
    disciplina: varchar("disciplina", { length: 100 }),
    descrizione: text("descrizione"),
    attivo: boolean("attivo").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tipi_quota_tenant_idx").on(table.tenantId),
    index("tipi_quota_tenant_tipo_idx").on(table.tenantId, table.tipo),
  ],
);

// ─── Quote (Payments/Fees) ───────────────────────────────────────────────────
export const quote = pgTable(
  "quote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),
    tipoQuotaId: uuid("tipo_quota_id")
      .notNull()
      .references(() => tipiQuota.id),
    annoSportivoId: uuid("anno_sportivo_id")
      .references(() => anniSportivi.id),

    importo: numeric("importo", { precision: 10, scale: 2 }).notNull(),
    importoPagato: numeric("importo_pagato", { precision: 10, scale: 2 }).default("0").notNull(),

    stato: varchar("stato", { length: 20 }).default("da_pagare").notNull(), // da_pagare | parziale | pagato | esonerato

    dataEmissione: timestamp("data_emissione", { withTimezone: true }),
    dataScadenza: timestamp("data_scadenza", { withTimezone: true }),
    dataPagamento: timestamp("data_pagamento", { withTimezone: true }),

    metodoPagamento: varchar("metodo_pagamento", { length: 30 }), // contanti | bonifico | pos | stripe | satispay
    stripePaymentId: varchar("stripe_payment_id", { length: 200 }),
    ricevutaUrl: text("ricevuta_url"),

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("quote_tenant_idx").on(table.tenantId),
    index("quote_tenant_socio_idx").on(table.tenantId, table.socioId),
    index("quote_tenant_stato_idx").on(table.tenantId, table.stato),
    index("quote_tenant_scadenza_idx").on(table.tenantId, table.dataScadenza),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const anniSportiviRelations = relations(anniSportivi, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [anniSportivi.tenantId],
    references: [tenants.id],
  }),
  quote: many(quote),
}));

export const tipiQuotaRelations = relations(tipiQuota, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tipiQuota.tenantId],
    references: [tenants.id],
  }),
  quote: many(quote),
}));

export const quoteRelations = relations(quote, ({ one }) => ({
  tenant: one(tenants, {
    fields: [quote.tenantId],
    references: [tenants.id],
  }),
  socio: one(soci, {
    fields: [quote.socioId],
    references: [soci.id],
  }),
  tipoQuota: one(tipiQuota, {
    fields: [quote.tipoQuotaId],
    references: [tipiQuota.id],
  }),
  annoSportivo: one(anniSportivi, {
    fields: [quote.annoSportivoId],
    references: [anniSportivi.id],
  }),
}));
