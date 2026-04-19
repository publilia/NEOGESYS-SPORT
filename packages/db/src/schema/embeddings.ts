import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { soci } from "./soci";
import { tenants } from "./tenant";

/**
 * AI Embeddings for members.
 *
 * NOTE: The `embedding` vector column is NOT defined here because Drizzle ORM
 * does not natively support pgvector types. It must be added via raw SQL migration:
 *
 *   ALTER TABLE soci_embeddings ADD COLUMN embedding vector(1536);
 *   CREATE INDEX soci_embeddings_embedding_idx ON soci_embeddings
 *     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 *
 * See: src/migrations/0000_rls_setup.sql for the pgvector extension setup.
 */
export const sociEmbeddings = pgTable(
	"soci_embeddings",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		socioId: uuid("socio_id")
			.notNull()
			.references(() => soci.id, { onDelete: "cascade" }),

		testoOriginale: text("testo_originale").notNull(),

		// embedding vector(1536) - added via raw SQL migration (pgvector)

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("soci_embeddings_tenant_idx").on(table.tenantId),
		index("soci_embeddings_tenant_socio_idx").on(table.tenantId, table.socioId),
	],
);

export const sociEmbeddingsRelations = relations(sociEmbeddings, ({ one }) => ({
	tenant: one(tenants, {
		fields: [sociEmbeddings.tenantId],
		references: [tenants.id],
	}),
	socio: one(soci, {
		fields: [sociEmbeddings.socioId],
		references: [soci.id],
	}),
}));
