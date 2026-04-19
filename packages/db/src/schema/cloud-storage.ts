import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "./tenant";
import { utenti } from "./utenti";

// ─── Cloud Storage Links ────────────────────────────────────────────────────

export const cloudStorageLinks = pgTable(
	"cloud_storage_links",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),

		provider: varchar("provider", { length: 30 }).notNull(), // google_drive | microsoft_onedrive
		entityType: varchar("entity_type", { length: 30 }).notNull(), // socio | certificato | documento | evento | comunicazione
		entityId: uuid("entity_id").notNull(),

		externalFileId: varchar("external_file_id", { length: 255 }).notNull(),
		fileName: varchar("file_name", { length: 255 }).notNull(),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		fileSize: integer("file_size"),

		externalUrl: text("external_url"), // web view URL
		externalFolderId: varchar("external_folder_id", { length: 255 }),

		uploadedBy: uuid("uploaded_by").references(() => utenti.id),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("cloud_storage_links_tenant_idx").on(table.tenantId),
		index("cloud_storage_links_tenant_entity_idx").on(
			table.tenantId,
			table.entityType,
			table.entityId,
		),
		index("cloud_storage_links_tenant_provider_idx").on(table.tenantId, table.provider),
		index("cloud_storage_links_external_file_idx").on(table.externalFileId),
	],
);

// ─── Relations ──────────────────────────────────────────────────────────────

export const cloudStorageLinksRelations = relations(cloudStorageLinks, ({ one }) => ({
	tenant: one(tenants, {
		fields: [cloudStorageLinks.tenantId],
		references: [tenants.id],
	}),
	uploadedByUtente: one(utenti, {
		fields: [cloudStorageLinks.uploadedBy],
		references: [utenti.id],
	}),
}));
