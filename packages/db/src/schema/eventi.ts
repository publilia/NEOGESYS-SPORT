import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
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

// ─── Eventi (Events) ─────────────────────────────────────────────────────────
export const eventi = pgTable(
  "eventi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    nome: varchar("nome", { length: 300 }).notNull(),
    tipo: varchar("tipo", { length: 30 }).notNull(), // gara | torneo | stage | saggio | raduno
    descrizione: text("descrizione"),

    dataInizio: timestamp("data_inizio", { withTimezone: true }).notNull(),
    dataFine: timestamp("data_fine", { withTimezone: true }),

    luogo: varchar("luogo", { length: 300 }),
    disciplina: varchar("disciplina", { length: 100 }),
    categoria: varchar("categoria", { length: 100 }),

    iscrizioniAperte: boolean("iscrizioni_aperte").default(false).notNull(),
    deadlineIscrizione: timestamp("deadline_iscrizione", { withTimezone: true }),

    quotaIscrizione: numeric("quota_iscrizione", { precision: 10, scale: 2 }),
    maxPartecipanti: integer("max_partecipanti"),

    documentiUrls: jsonb("documenti_urls"), // array of document URLs

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("eventi_tenant_idx").on(table.tenantId),
    index("eventi_tenant_tipo_idx").on(table.tenantId, table.tipo),
    index("eventi_tenant_data_idx").on(table.tenantId, table.dataInizio),
  ],
);

// ─── Iscrizioni Evento (Event Enrollments) ────────────────────────────────────
export const iscrizioniEvento = pgTable(
  "iscrizioni_evento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventi.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),

    dataIscrizione: timestamp("data_iscrizione", { withTimezone: true }).defaultNow(),
    stato: varchar("stato", { length: 20 }).default("confermata").notNull(), // confermata | in_attesa | annullata

    pagamentoId: uuid("pagamento_id"), // nullable FK to quote
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("iscrizioni_evento_tenant_idx").on(table.tenantId),
    index("iscrizioni_evento_tenant_evento_idx").on(table.tenantId, table.eventoId),
    index("iscrizioni_evento_tenant_socio_idx").on(table.tenantId, table.socioId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const eventiRelations = relations(eventi, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [eventi.tenantId],
    references: [tenants.id],
  }),
  iscrizioni: many(iscrizioniEvento),
}));

export const iscrizioniEventoRelations = relations(iscrizioniEvento, ({ one }) => ({
  tenant: one(tenants, {
    fields: [iscrizioniEvento.tenantId],
    references: [tenants.id],
  }),
  evento: one(eventi, {
    fields: [iscrizioniEvento.eventoId],
    references: [eventi.id],
  }),
  socio: one(soci, {
    fields: [iscrizioniEvento.socioId],
    references: [soci.id],
  }),
}));
