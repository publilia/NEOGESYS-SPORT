import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

export const tenantIntegrations = pgTable(
  "tenant_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 50 }).notNull(), // e.g. stripe, satispay, mailgun, whatsapp
    tipo: varchar("tipo", { length: 30 }).notNull(), // e.g. pagamento, comunicazione, federazione

    attivo: boolean("attivo").default(false).notNull(),
    credenziali: text("credenziali"), // encrypted credentials
    configurazione: jsonb("configurazione"), // provider-specific config

    ultimoTest: timestamp("ultimo_test", { withTimezone: true }),
    ultimoTestEsito: varchar("ultimo_test_esito", { length: 20 }), // ok | errore
    ultimoTestMessaggio: text("ultimo_test_messaggio"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("tenant_provider_unique").on(table.tenantId, table.provider),
    index("tenant_integrations_tenant_idx").on(table.tenantId),
  ],
);

export const tenantIntegrationsRelations = relations(tenantIntegrations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantIntegrations.tenantId],
    references: [tenants.id],
  }),
}));
