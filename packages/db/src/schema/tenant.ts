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
    tipoEnte: varchar("tipo_ente", { length: 20 }).notNull(), // ASD | SSD | FED

    partitaIva: varchar("partita_iva", { length: 20 }),
    codiceFiscale: varchar("codice_fiscale", { length: 20 }),
    pec: varchar("pec", { length: 200 }),
    codiceSDI: varchar("codice_sdi", { length: 10 }),

    sedeLegale: jsonb("sede_legale"), // { via, cap, citta, provincia }
    logo: text("logo"), // URL

    piano: varchar("piano", { length: 20 }).default("free").notNull(), // free | base | pro | enterprise
    maxSoci: varchar("max_soci", { length: 10 }).default("50").notNull(),

    stato: varchar("stato", { length: 20 }).default("trial").notNull(), // attivo | sospeso | trial | chiuso
    trialEnd: timestamp("trial_end", { withTimezone: true }),

    federazioni: jsonb("federazioni"), // array of federation objects
    discipline: jsonb("discipline"), // array of discipline strings

    impostazioni: jsonb("impostazioni"), // { layout_menu, palette_default, palette_custom, ... }

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
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
