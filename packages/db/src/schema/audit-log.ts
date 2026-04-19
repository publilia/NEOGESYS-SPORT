import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "./tenant";
import { utenti } from "./utenti";

export const auditLog = pgTable(
	"audit_log",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }), // nullable for super-admin actions
		utenteId: uuid("utente_id")
			.notNull()
			.references(() => utenti.id),

		azione: varchar("azione", { length: 30 }).notNull(), // create | update | delete | login | logout | export | vault_access
		entita: varchar("entita", { length: 100 }).notNull(), // table/entity name
		entitaId: uuid("entita_id"), // nullable, references the affected entity

		dettagli: jsonb("dettagli"), // { before, after } - NO credentials stored here

		ipAddress: varchar("ip_address", { length: 45 }),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("audit_log_tenant_idx").on(table.tenantId),
		index("audit_log_tenant_utente_idx").on(table.tenantId, table.utenteId),
		index("audit_log_tenant_azione_idx").on(table.tenantId, table.azione),
		index("audit_log_tenant_entita_idx").on(table.tenantId, table.entita),
		index("audit_log_created_idx").on(table.createdAt),
	],
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
	tenant: one(tenants, {
		fields: [auditLog.tenantId],
		references: [tenants.id],
	}),
	utente: one(utenti, {
		fields: [auditLog.utenteId],
		references: [utenti.id],
	}),
}));
