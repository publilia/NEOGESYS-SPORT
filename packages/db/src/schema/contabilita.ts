import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { quote } from "./quote";
import { soci } from "./soci";
import { tenants } from "./tenant";

// ─── Prima Nota Movimenti (Accounting Entries) ───────────────────────────────
export const primaNotaMovimenti = pgTable(
	"prima_nota_movimenti",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),

		tipo: varchar("tipo", { length: 20 }).notNull(), // entrata | uscita
		causale: varchar("causale", { length: 200 }).notNull(),
		descrizione: text("descrizione"),

		importo: numeric("importo", { precision: 12, scale: 2 }).notNull(),
		data: timestamp("data", { withTimezone: true }).notNull(),

		categoriaContabile: varchar("categoria_contabile", { length: 100 }),

		quotaId: uuid("quota_id").references(() => quote.id),
		socioId: uuid("socio_id").references(() => soci.id),

		documentoUrl: text("documento_url"),
		note: text("note"),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("prima_nota_tenant_idx").on(table.tenantId),
		index("prima_nota_tenant_data_idx").on(table.tenantId, table.data),
		index("prima_nota_tenant_tipo_idx").on(table.tenantId, table.tipo),
		index("prima_nota_tenant_categoria_idx").on(table.tenantId, table.categoriaContabile),
	],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const primaNotaMovimentiRelations = relations(primaNotaMovimenti, ({ one }) => ({
	tenant: one(tenants, {
		fields: [primaNotaMovimenti.tenantId],
		references: [tenants.id],
	}),
	quota: one(quote, {
		fields: [primaNotaMovimenti.quotaId],
		references: [quote.id],
	}),
	socio: one(soci, {
		fields: [primaNotaMovimenti.socioId],
		references: [soci.id],
	}),
}));
