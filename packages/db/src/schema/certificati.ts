import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";
import { soci } from "./soci";

export const certificatiMedici = pgTable(
  "certificati_medici",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),

    tipo: varchar("tipo", { length: 30 }).notNull(), // non_agonistico | agonistico | idoneita_sportiva
    dataRilascio: timestamp("data_rilascio", { withTimezone: true }),
    dataScadenza: timestamp("data_scadenza", { withTimezone: true }),

    medicoNome: varchar("medico_nome", { length: 200 }),
    strutturaRilascio: varchar("struttura_rilascio", { length: 300 }),

    fileUrl: text("file_url"),
    ocrConfidenza: numeric("ocr_confidenza", { precision: 5, scale: 2 }), // 0-100
    ocrDati: jsonb("ocr_dati"), // extracted OCR data

    stato: varchar("stato", { length: 20 }).default("valido").notNull(), // valido | scaduto | in_scadenza

    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("certificati_tenant_idx").on(table.tenantId),
    index("certificati_tenant_socio_idx").on(table.tenantId, table.socioId),
    index("certificati_tenant_scadenza_idx").on(table.tenantId, table.dataScadenza),
    index("certificati_tenant_stato_idx").on(table.tenantId, table.stato),
  ],
);

export const certificatiMediciRelations = relations(certificatiMedici, ({ one }) => ({
  tenant: one(tenants, {
    fields: [certificatiMedici.tenantId],
    references: [tenants.id],
  }),
  socio: one(soci, {
    fields: [certificatiMedici.socioId],
    references: [soci.id],
  }),
}));
