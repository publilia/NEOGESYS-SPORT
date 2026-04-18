import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { soci } from "./soci";
import { tenants } from "./tenant";
import { utenti } from "./utenti";

// ─── Comunicazioni (Communications) ──────────────────────────────────────────
export const comunicazioni = pgTable(
	"comunicazioni",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),

		tipo: varchar("tipo", { length: 20 }).notNull(), // email | sms | whatsapp | push
		oggetto: varchar("oggetto", { length: 500 }),
		corpo: text("corpo"),
		templateId: varchar("template_id", { length: 100 }),

		mittente: varchar("mittente", { length: 200 }),
		destinatariQuery: jsonb("destinatari_query"), // audience filter definition

		stato: varchar("stato", { length: 20 }).default("bozza").notNull(), // bozza | inviata | in_corso | errore

		inviataDa: uuid("inviata_da").references(() => utenti.id),
		dataInvio: timestamp("data_invio", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("comunicazioni_tenant_idx").on(table.tenantId),
		index("comunicazioni_tenant_stato_idx").on(table.tenantId, table.stato),
		index("comunicazioni_tenant_tipo_idx").on(table.tenantId, table.tipo),
	],
);

// ─── Comunicazioni Destinatari (Communication Recipients) ─────────────────────
export const comunicazioniDestinatari = pgTable(
	"comunicazioni_destinatari",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		comunicazioneId: uuid("comunicazione_id")
			.notNull()
			.references(() => comunicazioni.id, { onDelete: "cascade" }),
		socioId: uuid("socio_id")
			.notNull()
			.references(() => soci.id),

		canale: varchar("canale", { length: 20 }).notNull(), // email | sms | whatsapp | push
		indirizzo: varchar("indirizzo", { length: 200 }).notNull(), // email address or phone number

		stato: varchar("stato", { length: 20 }).default("pending").notNull(), // pending | sent | delivered | failed | bounced
		statoDettaglio: text("stato_dettaglio"),

		inviatoAt: timestamp("inviato_at", { withTimezone: true }),
		consegnatoAt: timestamp("consegnato_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("comunicazioni_dest_comunicazione_idx").on(table.comunicazioneId),
		index("comunicazioni_dest_socio_idx").on(table.socioId),
		index("comunicazioni_dest_stato_idx").on(table.stato),
	],
);

// ─── Relations ───────────────────────────────────────────────────────────────
export const comunicazioniRelations = relations(comunicazioni, ({ one, many }) => ({
	tenant: one(tenants, {
		fields: [comunicazioni.tenantId],
		references: [tenants.id],
	}),
	inviataDaUtente: one(utenti, {
		fields: [comunicazioni.inviataDa],
		references: [utenti.id],
	}),
	destinatari: many(comunicazioniDestinatari),
}));

export const comunicazioniDestinatariRelations = relations(comunicazioniDestinatari, ({ one }) => ({
	comunicazione: one(comunicazioni, {
		fields: [comunicazioniDestinatari.comunicazioneId],
		references: [comunicazioni.id],
	}),
	socio: one(soci, {
		fields: [comunicazioniDestinatari.socioId],
		references: [soci.id],
	}),
}));
