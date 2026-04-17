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

// ─── Calendar Sync (Sync State) ─────────────────────────────────────────────

export const calendarSync = pgTable(
  "calendar_sync",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    provider: varchar("provider", { length: 30 }).notNull(), // google_calendar | microsoft_calendar
    externalCalendarId: varchar("external_calendar_id", { length: 255 }).notNull(),
    calendarName: varchar("calendar_name", { length: 200 }).notNull(),

    syncDirection: varchar("sync_direction", { length: 20 }).notNull(), // push | pull | bidirectional

    syncEnabled: boolean("sync_enabled").default(true).notNull(),

    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
    lastSyncStatus: varchar("last_sync_status", { length: 20 }), // success | error | partial
    lastSyncMessage: text("last_sync_message"),

    webhookChannelId: varchar("webhook_channel_id", { length: 255 }),
    webhookExpiry: timestamp("webhook_expiry", { withTimezone: true }),

    configurazione: jsonb("configurazione"), // sync filters, color mappings, etc.

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("calendar_sync_tenant_idx").on(table.tenantId),
    index("calendar_sync_tenant_provider_idx").on(table.tenantId, table.provider),
    index("calendar_sync_webhook_channel_idx").on(table.webhookChannelId),
    unique("calendar_sync_tenant_external_unique").on(
      table.tenantId,
      table.provider,
      table.externalCalendarId,
    ),
  ],
);

// ─── Calendar Sync Items (Individual Synced Events) ─────────────────────────

export const calendarSyncItems = pgTable(
  "calendar_sync_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    calendarSyncId: uuid("calendar_sync_id")
      .notNull()
      .references(() => calendarSync.id, { onDelete: "cascade" }),

    entityType: varchar("entity_type", { length: 30 }).notNull(), // corso | lezione | evento
    entityId: uuid("entity_id").notNull(),

    externalEventId: varchar("external_event_id", { length: 255 }).notNull(),

    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull(),
    syncHash: varchar("sync_hash", { length: 64 }).notNull(), // hash of synced data to detect changes

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("calendar_sync_items_tenant_idx").on(table.tenantId),
    index("calendar_sync_items_tenant_sync_idx").on(table.tenantId, table.calendarSyncId),
    index("calendar_sync_items_tenant_entity_idx").on(
      table.tenantId,
      table.entityType,
      table.entityId,
    ),
    unique("calendar_sync_items_sync_entity_unique").on(
      table.calendarSyncId,
      table.entityType,
      table.entityId,
    ),
  ],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const calendarSyncRelations = relations(calendarSync, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [calendarSync.tenantId],
    references: [tenants.id],
  }),
  items: many(calendarSyncItems),
}));

export const calendarSyncItemsRelations = relations(calendarSyncItems, ({ one }) => ({
  tenant: one(tenants, {
    fields: [calendarSyncItems.tenantId],
    references: [tenants.id],
  }),
  calendarSync: one(calendarSync, {
    fields: [calendarSyncItems.calendarSyncId],
    references: [calendarSync.id],
  }),
}));
