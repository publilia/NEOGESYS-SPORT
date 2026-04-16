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
import { utenti } from "./utenti";

// ─── Corsi (Courses) ─────────────────────────────────────────────────────────
export const corsi = pgTable(
  "corsi",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    nome: varchar("nome", { length: 200 }).notNull(),
    disciplina: varchar("disciplina", { length: 100 }),
    descrizione: text("descrizione"),

    livello: varchar("livello", { length: 30 }), // principiante | intermedio | avanzato | agonistico
    etaMin: integer("eta_min"),
    etaMax: integer("eta_max"),

    sedeNome: varchar("sede_nome", { length: 200 }),
    capacitaMax: integer("capacita_max"),

    orarioSettimanale: jsonb("orario_settimanale"), // [{ giorno, oraInizio, oraFine }]

    quotaAssociata: numeric("quota_associata", { precision: 10, scale: 2 }),
    stato: varchar("stato", { length: 20 }).default("attivo").notNull(), // attivo | sospeso | chiuso

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("corsi_tenant_idx").on(table.tenantId),
    index("corsi_tenant_disciplina_idx").on(table.tenantId, table.disciplina),
    index("corsi_tenant_stato_idx").on(table.tenantId, table.stato),
  ],
);

// ─── Corsi-Istruttori (Course Instructors, Many-to-Many) ──────────────────────
export const corsiIstruttori = pgTable(
  "corsi_istruttori",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    corsoId: uuid("corso_id")
      .notNull()
      .references(() => corsi.id, { onDelete: "cascade" }),
    utenteId: uuid("utente_id")
      .notNull()
      .references(() => utenti.id, { onDelete: "cascade" }),

    ruolo: varchar("ruolo", { length: 20 }).default("principale").notNull(), // principale | assistente

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("corsi_istruttori_corso_idx").on(table.corsoId),
    index("corsi_istruttori_utente_idx").on(table.utenteId),
  ],
);

// ─── Iscrizioni Corso (Course Enrollments) ────────────────────────────────────
export const iscrizioniCorso = pgTable(
  "iscrizioni_corso",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    corsoId: uuid("corso_id")
      .notNull()
      .references(() => corsi.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),

    dataInizio: timestamp("data_inizio", { withTimezone: true }),
    dataFine: timestamp("data_fine", { withTimezone: true }),

    stato: varchar("stato", { length: 20 }).default("attivo").notNull(), // attivo | sospeso | completato

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("iscrizioni_corso_tenant_idx").on(table.tenantId),
    index("iscrizioni_corso_tenant_corso_idx").on(table.tenantId, table.corsoId),
    index("iscrizioni_corso_tenant_socio_idx").on(table.tenantId, table.socioId),
  ],
);

// ─── Presenze (Attendance) ────────────────────────────────────────────────────
export const presenze = pgTable(
  "presenze",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    corsoId: uuid("corso_id")
      .notNull()
      .references(() => corsi.id, { onDelete: "cascade" }),
    socioId: uuid("socio_id")
      .notNull()
      .references(() => soci.id, { onDelete: "cascade" }),

    dataLezione: timestamp("data_lezione", { withTimezone: true }).notNull(),
    presente: boolean("presente").default(false).notNull(),
    note: text("note"),

    registratoDa: uuid("registrato_da").references(() => utenti.id),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("presenze_tenant_idx").on(table.tenantId),
    index("presenze_tenant_corso_data_idx").on(table.tenantId, table.corsoId, table.dataLezione),
    index("presenze_tenant_socio_idx").on(table.tenantId, table.socioId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const corsiRelations = relations(corsi, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [corsi.tenantId],
    references: [tenants.id],
  }),
  istruttori: many(corsiIstruttori),
  iscrizioni: many(iscrizioniCorso),
  presenze: many(presenze),
}));

export const corsiIstruttoriRelations = relations(corsiIstruttori, ({ one }) => ({
  corso: one(corsi, {
    fields: [corsiIstruttori.corsoId],
    references: [corsi.id],
  }),
  utente: one(utenti, {
    fields: [corsiIstruttori.utenteId],
    references: [utenti.id],
  }),
}));

export const iscrizioniCorsoRelations = relations(iscrizioniCorso, ({ one }) => ({
  tenant: one(tenants, {
    fields: [iscrizioniCorso.tenantId],
    references: [tenants.id],
  }),
  corso: one(corsi, {
    fields: [iscrizioniCorso.corsoId],
    references: [corsi.id],
  }),
  socio: one(soci, {
    fields: [iscrizioniCorso.socioId],
    references: [soci.id],
  }),
}));

export const presenzeRelations = relations(presenze, ({ one }) => ({
  tenant: one(tenants, {
    fields: [presenze.tenantId],
    references: [tenants.id],
  }),
  corso: one(corsi, {
    fields: [presenze.corsoId],
    references: [corsi.id],
  }),
  socio: one(soci, {
    fields: [presenze.socioId],
    references: [soci.id],
  }),
  registratoDaUtente: one(utenti, {
    fields: [presenze.registratoDa],
    references: [utenti.id],
  }),
}));
