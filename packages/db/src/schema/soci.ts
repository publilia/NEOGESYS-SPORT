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
import { certificatiMedici } from "./certificati";
import { comunicazioniDestinatari } from "./comunicazioni";
import { primaNotaMovimenti } from "./contabilita";
import { iscrizioniCorso, presenze } from "./corsi";
import { consensiGdpr, documenti } from "./documenti";
import { sociEmbeddings } from "./embeddings";
import { iscrizioniEvento } from "./eventi";
import { quote } from "./quote";
import { tenants } from "./tenant";

export const soci = pgTable(
	"soci",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		tenantId: uuid("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		codiceTessera: varchar("codice_tessera", { length: 20 }),

		nome: varchar("nome", { length: 100 }).notNull(),
		cognome: varchar("cognome", { length: 100 }).notNull(),
		codiceFiscale: varchar("codice_fiscale", { length: 16 }),

		dataNascita: timestamp("data_nascita", { withTimezone: true }),
		luogoNascita: varchar("luogo_nascita", { length: 200 }),
		sesso: varchar("sesso", { length: 1 }), // M | F

		email: varchar("email", { length: 200 }),
		telefono: varchar("telefono", { length: 30 }),
		indirizzo: jsonb("indirizzo"), // { via, cap, citta, provincia }
		tutoreDati: jsonb("tutore_dati"), // { nome, cognome, codiceFiscale, telefono, email, relazione }

		fotoUrl: text("foto_url"),
		docIdentitaUrl: text("doc_identita_url"),

		tipologia: varchar("tipologia", { length: 30 }).notNull(), // socio | atleta | istruttore | dirigente | volontario
		disciplina: varchar("disciplina", { length: 100 }),
		numeroTesseraFed: varchar("numero_tessera_fed", { length: 50 }),
		federazione: varchar("federazione", { length: 100 }),

		stato: varchar("stato", { length: 20 }).default("attivo").notNull(), // attivo | sospeso | dimesso | scaduto

		consensoGdpr: boolean("consenso_gdpr").default(false).notNull(),
		consensoFoto: boolean("consenso_foto").default(false).notNull(),
		consensoMarketing: boolean("consenso_marketing").default(false).notNull(),

		dataIscrizione: timestamp("data_iscrizione", { withTimezone: true }),
		churnScore: varchar("churn_score", { length: 10 }), // AI-computed churn risk

		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [
		index("soci_tenant_idx").on(table.tenantId),
		index("soci_tenant_cognome_idx").on(table.tenantId, table.cognome),
		index("soci_tenant_stato_idx").on(table.tenantId, table.stato),
		index("soci_tenant_cf_idx").on(table.tenantId, table.codiceFiscale),
		index("soci_tenant_tessera_idx").on(table.tenantId, table.codiceTessera),
	],
);

export const sociRelations = relations(soci, ({ one, many }) => ({
	tenant: one(tenants, {
		fields: [soci.tenantId],
		references: [tenants.id],
	}),
	certificatiMedici: many(certificatiMedici),
	iscrizioniCorso: many(iscrizioniCorso),
	presenze: many(presenze),
	quote: many(quote),
	iscrizioniEvento: many(iscrizioniEvento),
	documenti: many(documenti),
	consensiGdpr: many(consensiGdpr),
	comunicazioniDestinatari: many(comunicazioniDestinatari),
	primaNotaMovimenti: many(primaNotaMovimenti),
	sociEmbeddings: many(sociEmbeddings),
}));
