import { client, db } from "../client";
import * as schema from "../schema";

/**
 * Pre-computed bcrypt hash for "password123".
 * In production, use a proper hashing library (e.g. @node-rs/argon2, bcrypt).
 */
const DEMO_PASSWORD_HASH = "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu9mu";

async function seed() {
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("Seeding database...\n");

	// ── 1. Demo Tenant ─────────────────────────────────────────────────────────
	const [demoTenant] = await db
		.insert(schema.tenants)
		.values({
			slug: "demo-asd",
			ragioneSociale: "ASD Demo Sport",
			tipoEnte: "ASD",
			piano: "pro",
			maxSoci: "1000",
			stato: "attivo",
			partitaIva: "01234567890",
			codiceFiscale: "01234567890",
			pec: "demo-asd@pec.it",
			sedeLegale: {
				via: "Via dello Sport 42",
				cap: "00100",
				citta: "Roma",
				provincia: "RM",
			},
			federazioni: [{ sigla: "FIDAL", nome: "Federazione Italiana di Atletica Leggera" }],
			discipline: ["Atletica Leggera", "Nuoto", "Pallavolo"],
			impostazioni: {
				layout_menu: "sidebar",
				palette_default: "indigo",
			},
		})
		.returning();
	if (!demoTenant) throw new Error("Seed: failed to create demo tenant");

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Tenant created: ${demoTenant.ragioneSociale} (${demoTenant.slug})`);

	// ── 2. Super Admin User ────────────────────────────────────────────────────
	const [superAdmin] = await db
		.insert(schema.utenti)
		.values({
			email: "admin@neogesys.sport",
			passwordHash: DEMO_PASSWORD_HASH,
			nome: "Super",
			cognome: "Admin",
			emailVerified: true,
		})
		.returning();
	if (!superAdmin) throw new Error("Seed: failed to create super admin");

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Super admin created: ${superAdmin.email}`);

	// ── 3. Tenant Admin User ───────────────────────────────────────────────────
	const [tenantAdmin] = await db
		.insert(schema.utenti)
		.values({
			email: "admin@demo-asd.gestionale.sport",
			passwordHash: DEMO_PASSWORD_HASH,
			nome: "Mario",
			cognome: "Rossi",
			emailVerified: true,
		})
		.returning();
	if (!tenantAdmin) throw new Error("Seed: failed to create tenant admin");

	await db.insert(schema.utenteTenant).values({
		utenteId: tenantAdmin.id,
		tenantId: demoTenant.id,
		ruolo: "admin",
		attivo: true,
	});

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Tenant admin created: ${tenantAdmin.email}`);

	// ── 4. Sample Soci (10 members) ────────────────────────────────────────────
	const sociData = [
		{
			nome: "Luca",
			cognome: "Bianchi",
			codiceFiscale: "BNCLCU90A01H501Z",
			email: "luca.bianchi@example.com",
			telefono: "+39 333 1111111",
			sesso: "M" as const,
			tipologia: "atleta" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
		},
		{
			nome: "Giulia",
			cognome: "Verdi",
			codiceFiscale: "VRDGLI92B41H501A",
			email: "giulia.verdi@example.com",
			telefono: "+39 333 2222222",
			sesso: "F" as const,
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "attivo" as const,
		},
		{
			nome: "Marco",
			cognome: "Neri",
			codiceFiscale: "NRIMRC88C01H501B",
			email: "marco.neri@example.com",
			telefono: "+39 333 3333333",
			sesso: "M" as const,
			tipologia: "istruttore" as const,
			disciplina: "Pallavolo",
			stato: "attivo" as const,
		},
		{
			nome: "Sara",
			cognome: "Russo",
			codiceFiscale: "RSSSRA95D41H501C",
			email: "sara.russo@example.com",
			telefono: "+39 333 4444444",
			sesso: "F" as const,
			tipologia: "socio" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
		},
		{
			nome: "Andrea",
			cognome: "Ferrari",
			codiceFiscale: "FRRNDR91E01H501D",
			email: "andrea.ferrari@example.com",
			telefono: "+39 333 5555555",
			sesso: "M" as const,
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "sospeso" as const,
		},
		{
			nome: "Chiara",
			cognome: "Romano",
			codiceFiscale: "RMNCHR93F41H501E",
			email: "chiara.romano@example.com",
			telefono: "+39 333 6666666",
			sesso: "F" as const,
			tipologia: "atleta" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
		},
		{
			nome: "Francesco",
			cognome: "Colombo",
			codiceFiscale: "CLMFNC87G01H501F",
			email: "francesco.colombo@example.com",
			telefono: "+39 333 7777777",
			sesso: "M" as const,
			tipologia: "dirigente" as const,
			disciplina: null,
			stato: "attivo" as const,
		},
		{
			nome: "Elena",
			cognome: "Ricci",
			codiceFiscale: "RCCLNE96H41H501G",
			email: "elena.ricci@example.com",
			telefono: "+39 333 8888888",
			sesso: "F" as const,
			tipologia: "atleta" as const,
			disciplina: "Pallavolo",
			stato: "attivo" as const,
		},
		{
			nome: "Davide",
			cognome: "Moretti",
			codiceFiscale: "MRTDVD89I01H501H",
			email: "davide.moretti@example.com",
			telefono: "+39 333 9999999",
			sesso: "M" as const,
			tipologia: "volontario" as const,
			disciplina: null,
			stato: "attivo" as const,
		},
		{
			nome: "Alessia",
			cognome: "Conti",
			codiceFiscale: "CNTLSS94L41H501I",
			email: "alessia.conti@example.com",
			telefono: "+39 333 0000000",
			sesso: "F" as const,
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "scaduto" as const,
		},
	];

	const insertedSoci = await db
		.insert(schema.soci)
		.values(
			sociData.map((s) => ({
				tenantId: demoTenant.id,
				nome: s.nome,
				cognome: s.cognome,
				codiceFiscale: s.codiceFiscale,
				email: s.email,
				telefono: s.telefono,
				sesso: s.sesso,
				tipologia: s.tipologia,
				disciplina: s.disciplina,
				stato: s.stato,
				consensoGdpr: true,
				dataIscrizione: new Date(),
				indirizzo: {
					via: "Via Roma 1",
					cap: "00100",
					citta: "Roma",
					provincia: "RM",
				},
			})),
		)
		.returning();

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Soci created: ${insertedSoci.length}`);

	// ── 5. Sample Corsi (3 courses) ────────────────────────────────────────────
	const corsiData = [
		{
			nome: "Atletica Under 16",
			disciplina: "Atletica Leggera",
			descrizione: "Corso di atletica leggera per ragazzi fino a 16 anni",
			livello: "principiante",
			etaMin: 10,
			etaMax: 16,
			sedeNome: "Campo sportivo comunale",
			capacitaMax: 25,
			quotaAssociata: "150.00",
			orarioSettimanale: [
				{ giorno: "martedi", oraInizio: "16:00", oraFine: "18:00" },
				{ giorno: "giovedi", oraInizio: "16:00", oraFine: "18:00" },
			],
		},
		{
			nome: "Nuoto Avanzato",
			disciplina: "Nuoto",
			descrizione: "Corso di nuoto livello avanzato per adulti",
			livello: "avanzato",
			etaMin: 18,
			etaMax: null,
			sedeNome: "Piscina olimpica",
			capacitaMax: 15,
			quotaAssociata: "200.00",
			orarioSettimanale: [
				{ giorno: "lunedi", oraInizio: "19:00", oraFine: "20:30" },
				{ giorno: "mercoledi", oraInizio: "19:00", oraFine: "20:30" },
				{ giorno: "venerdi", oraInizio: "19:00", oraFine: "20:30" },
			],
		},
		{
			nome: "Pallavolo Agonistica",
			disciplina: "Pallavolo",
			descrizione: "Squadra agonistica di pallavolo - Serie D",
			livello: "agonistico",
			etaMin: 16,
			etaMax: 35,
			sedeNome: "Palestra polivalente",
			capacitaMax: 18,
			quotaAssociata: "350.00",
			orarioSettimanale: [
				{ giorno: "lunedi", oraInizio: "20:00", oraFine: "22:00" },
				{ giorno: "mercoledi", oraInizio: "20:00", oraFine: "22:00" },
				{ giorno: "sabato", oraInizio: "10:00", oraFine: "12:00" },
			],
		},
	];

	const insertedCorsi = await db
		.insert(schema.corsi)
		.values(
			corsiData.map((c) => ({
				tenantId: demoTenant.id,
				nome: c.nome,
				disciplina: c.disciplina,
				descrizione: c.descrizione,
				livello: c.livello,
				etaMin: c.etaMin,
				etaMax: c.etaMax,
				sedeNome: c.sedeNome,
				capacitaMax: c.capacitaMax,
				quotaAssociata: c.quotaAssociata,
				orarioSettimanale: c.orarioSettimanale,
				stato: "attivo",
			})),
		)
		.returning();

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Corsi created: ${insertedCorsi.length}`);

	// ── 6. Anno Sportivo + Tipo Quota + Sample Quote ───────────────────────────
	const [annoSportivo] = await db
		.insert(schema.anniSportivi)
		.values({
			tenantId: demoTenant.id,
			nome: "2025/2026",
			dataInizio: new Date("2025-09-01"),
			dataFine: new Date("2026-08-31"),
			attivo: true,
		})
		.returning();
	if (!annoSportivo) throw new Error("Seed: failed to create anno sportivo");

	const [tipoQuotaIscrizione] = await db
		.insert(schema.tipiQuota)
		.values({
			tenantId: demoTenant.id,
			nome: "Quota iscrizione annuale",
			tipo: "annuale",
			importo: "100.00",
			descrizione: "Quota associativa annuale obbligatoria",
			attivo: true,
		})
		.returning();
	if (!tipoQuotaIscrizione) throw new Error("Seed: failed to create tipo quota");

	// Create quotes for the first 5 active soci
	const activeSoci = insertedSoci.filter((s) => s.stato === "attivo").slice(0, 5);
	const quoteValues = activeSoci.map((socio, i) => ({
		tenantId: demoTenant.id,
		socioId: socio.id,
		tipoQuotaId: tipoQuotaIscrizione.id,
		annoSportivoId: annoSportivo.id,
		importo: "100.00",
		importoPagato: i < 3 ? "100.00" : "0.00",
		stato: i < 3 ? ("pagato" as const) : ("da_pagare" as const),
		dataEmissione: new Date("2025-09-15"),
		dataScadenza: new Date("2025-10-15"),
		dataPagamento: i < 3 ? new Date("2025-09-20") : null,
		metodoPagamento: i < 3 ? "bonifico" : null,
	}));

	const insertedQuote = await db.insert(schema.quote).values(quoteValues).returning();

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`Quote created: ${insertedQuote.length}`);

	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("\nSeed completed successfully!");
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("─".repeat(50));
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("Demo credentials:");
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("  Super Admin:  admin@neogesys.sport / password123");
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("  Tenant Admin: admin@demo-asd.gestionale.sport / password123");
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log(`  Tenant slug:  ${demoTenant.slug}`);
	// biome-ignore lint/suspicious/noConsoleLog: seed script output
	console.log("─".repeat(50));
}

seed()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await client.end();
	});
