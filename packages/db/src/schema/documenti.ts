import { relations } from "drizzle-orm";
import {
  boolean,
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
import { soci } from "./soci";

// ─── Documenti (Documents) ───────────────────────────────────────────────────
export const documenti = pgTable(
  "documenti",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id").references(() => soci.id), // nullable

    tipo: varchar("tipo", { length: 30 }).notNull(), // certificato | ricevuta | modulo | liberatoria | altro
    nome: varchar("nome", { length: 300 }).notNull(),
    fileUrl: text("file_url").notNull(),
    mimeType: varchar("mime_type", { length: 100 }),
    dimensioneBytes: integer("dimensione_bytes"),

    classificazioneAi: varchar("classificazione_ai", { length: 100 }), // AI-detected document type

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("documenti_tenant_idx").on(table.tenantId),
    index("documenti_tenant_socio_idx").on(table.tenantId, table.socioId),
    index("documenti_tenant_tipo_idx").on(table.tenantId, table.tipo),
  ],
);

// ─── Consensi GDPR (GDPR Consents) ──────────────────────────────────────────
export const consensiGdpr = pgTable(
  "consensi_gdpr",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),

    tipoConsenso: varchar("tipo_consenso", { length: 50 }).notNull(), // privacy | foto | marketing | medico | ...
    acconsentito: boolean("acconsentito").notNull(),
    dataConsenso: timestamp("data_consenso", { withTimezone: true }).notNull(),

    ipAddress: varchar("ip_address", { length: 45 }),
    dettagli: jsonb("dettagli"), // additional consent details / version info

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("consensi_gdpr_tenant_idx").on(table.tenantId),
    index("consensi_gdpr_tenant_socio_idx").on(table.tenantId, table.socioId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const documentiRelations = relations(documenti, ({ one }) => ({
  tenant: one(tenants, {
    fields: [documenti.tenantId],
    references: [tenants.id],
  }),
  socio: one(soci, {
    fields: [documenti.socioId],
    references: [soci.id],
  }),
}));

export const consensiGdprRelations = relations(consensiGdpr, ({ one }) => ({
  tenant: one(tenants, {
    fields: [consensiGdpr.tenantId],
    references: [tenants.id],
  }),
  socio: one(soci, {
    fields: [consensiGdpr.socioId],
    references: [soci.id],
  }),
}));
