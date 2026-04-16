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

// ─── Utenti (Users) ──────────────────────────────────────────────────────────
export const utenti = pgTable(
  "utenti",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 200 }).unique().notNull(),
    passwordHash: text("password_hash"),

    nome: varchar("nome", { length: 100 }),
    cognome: varchar("cognome", { length: 100 }),
    telefono: varchar("telefono", { length: 30 }),

    twoFactorSecret: text("two_factor_secret"),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    ultimoAccesso: timestamp("ultimo_accesso", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("utenti_email_idx").on(table.email),
  ],
);

// ─── User Preferences ────────────────────────────────────────────────────────
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utenteId: uuid("utente_id")
      .notNull()
      .references(() => utenti.id, { onDelete: "cascade" }),

    tema: varchar("tema", { length: 20 }).default("system").notNull(), // light | dark | system
    palette: varchar("palette", { length: 50 }).default("default").notNull(),
    sidebarCollassata: boolean("sidebar_collassata").default(false).notNull(),
    linguaPreferita: varchar("lingua_preferita", { length: 10 }).default("it").notNull(),
    timezone: varchar("timezone", { length: 50 }).default("Europe/Rome").notNull(),

    notifiche: jsonb("notifiche"), // { email: true, push: false, sms: false, ... }
    dashboardLayout: jsonb("dashboard_layout"), // custom dashboard widget config

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("user_preferences_utente_idx").on(table.utenteId),
  ],
);

// ─── Utente-Tenant (Many-to-Many) ────────────────────────────────────────────
export const utenteTenant = pgTable(
  "utente_tenant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    utenteId: uuid("utente_id")
      .notNull()
      .references(() => utenti.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    ruolo: varchar("ruolo", { length: 30 }).notNull(), // super_admin | admin | segreteria | contabile | istruttore | atleta | genitore
    permessi: jsonb("permessi"), // fine-grained permissions override
    socioId: uuid("socio_id"), // nullable FK, linked member profile
    attivo: boolean("attivo").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("utente_tenant_unique").on(table.utenteId, table.tenantId),
    index("utente_tenant_tenant_idx").on(table.tenantId),
    index("utente_tenant_utente_idx").on(table.utenteId),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const utentiRelations = relations(utenti, ({ many, one }) => ({
  preferences: one(userPreferences, {
    fields: [utenti.id],
    references: [userPreferences.utenteId],
  }),
  tenants: many(utenteTenant),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  utente: one(utenti, {
    fields: [userPreferences.utenteId],
    references: [utenti.id],
  }),
}));

export const utenteTenantRelations = relations(utenteTenant, ({ one }) => ({
  utente: one(utenti, {
    fields: [utenteTenant.utenteId],
    references: [utenti.id],
  }),
  tenant: one(tenants, {
    fields: [utenteTenant.tenantId],
    references: [tenants.id],
  }),
}));
