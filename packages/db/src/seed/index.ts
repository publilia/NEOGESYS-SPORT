import { client, db } from "../client";
import * as schema from "../schema";

/**
 * Pre-computed bcrypt hash for "password123".
 */
const DEMO_PASSWORD_HASH = "$2b$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXehVzJptJ/op0lSsvqNu9mu";

async function seed() {
	await db.delete(schema.quote);
	await db.delete(schema.tipiQuota);
	await db.delete(schema.anniSportivi);
	await db.delete(schema.iscrizioniCorso);
	await db.delete(schema.corsiIstruttori);
	await db.delete(schema.corsi);
	await db.delete(schema.iscrizioniEvento);
	await db.delete(schema.eventi);
	await db.delete(schema.certificatiMedici);
	await db.delete(schema.primaNotaMovimenti);
	await db.delete(schema.documenti);
	await db.delete(schema.comunicazioniDestinatari);
	await db.delete(schema.comunicazioni);
	await db.delete(schema.soci);
	await db.delete(schema.utenteTenant);
	await db.delete(schema.utenti);
	await db.delete(schema.fatturePiattaforma);
	await db.delete(schema.tenantUsage);
	await db.delete(schema.tenants);
	await db.delete(schema.planiAbbonamento);

	// ── 1. Piani Abbonamento ──────────────────────────────────────────────────
	await db
		.insert(schema.planiAbbonamento)
		.values([
			{
				codice: "free",
				nome: "Free",
				descrizione: "Piano gratuito",
				prezzoMensile: "0.00",
				prezzoAnnuale: "0.00",
				valuta: "EUR",
				maxSoci: 50,
				maxUtenti: 2,
				maxStorageMb: 100,
				maxCorsi: 3,
				maxEventi: 2,
				aiAbilitato: false,
				integrazioniGoogle: false,
				integrazioniMicrosoft: false,
				customDomain: false,
				customPalette: false,
				fatturazioneSDI: false,
				exportAvanzato: false,
				supportoPrioritario: false,
				whiteLabel: false,
				ordine: 1,
				colore: "gray",
				highlighted: false,
				attivo: true,
			},
			{
				codice: "base",
				nome: "Base",
				descrizione: "Piano per piccole società",
				prezzoMensile: "49.00",
				prezzoAnnuale: "490.00",
				valuta: "EUR",
				maxSoci: 200,
				maxUtenti: 5,
				maxStorageMb: 500,
				maxCorsi: 10,
				maxEventi: 10,
				aiAbilitato: false,
				integrazioniGoogle: true,
				integrazioniMicrosoft: true,
				customDomain: false,
				customPalette: true,
				fatturazioneSDI: true,
				exportAvanzato: false,
				supportoPrioritario: false,
				whiteLabel: false,
				ordine: 2,
				colore: "blue",
				highlighted: false,
				attivo: true,
			},
			{
				codice: "pro",
				nome: "Pro",
				descrizione: "Piano professionale completo",
				prezzoMensile: "149.00",
				prezzoAnnuale: "1490.00",
				valuta: "EUR",
				maxSoci: 1000,
				maxUtenti: 20,
				maxStorageMb: 5000,
				maxCorsi: 50,
				maxEventi: 50,
				aiAbilitato: true,
				integrazioniGoogle: true,
				integrazioniMicrosoft: true,
				customDomain: true,
				customPalette: true,
				fatturazioneSDI: true,
				exportAvanzato: true,
				supportoPrioritario: true,
				whiteLabel: false,
				ordine: 3,
				colore: "indigo",
				highlighted: true,
				attivo: true,
			},
			{
				codice: "enterprise",
				nome: "Enterprise",
				descrizione: "Per grandi società e polisportive",
				prezzoMensile: "399.00",
				prezzoAnnuale: "3990.00",
				valuta: "EUR",
				maxSoci: 99999,
				maxUtenti: 999,
				maxStorageMb: 50000,
				maxCorsi: 999,
				maxEventi: 999,
				aiAbilitato: true,
				integrazioniGoogle: true,
				integrazioniMicrosoft: true,
				customDomain: true,
				customPalette: true,
				fatturazioneSDI: true,
				exportAvanzato: true,
				supportoPrioritario: true,
				whiteLabel: true,
				ordine: 4,
				colore: "purple",
				highlighted: false,
				attivo: true,
			},
		])
		.returning();

	// ── 2. Tenants (8 società) ────────────────────────────────────────────────
	const tenantsData = [
		{
			slug: "demo-asd",
			ragioneSociale: "ASD Demo Sport",
			tipoEnte: "ASD",
			piano: "pro" as const,
			stato: "attivo" as const,
			discipline: ["Atletica Leggera", "Nuoto", "Pallavolo"],
			citta: "Roma",
			maxSoci: "1000",
		},
		{
			slug: "tennis-club-roma",
			ragioneSociale: "Tennis Club Roma",
			tipoEnte: "ASD",
			piano: "base" as const,
			stato: "attivo" as const,
			discipline: ["Tennis"],
			citta: "Roma",
			maxSoci: "200",
		},
		{
			slug: "judo-academy-milano",
			ragioneSociale: "Judo Academy Milano",
			tipoEnte: "SSD",
			piano: "pro" as const,
			stato: "attivo" as const,
			discipline: ["Judo", "Karate"],
			citta: "Milano",
			maxSoci: "1000",
		},
		{
			slug: "basket-giovani",
			ragioneSociale: "Basket Giovani Torino",
			tipoEnte: "ASD",
			piano: "base" as const,
			stato: "attivo" as const,
			discipline: ["Basket"],
			citta: "Torino",
			maxSoci: "200",
		},
		{
			slug: "pallavolo-bresciana",
			ragioneSociale: "Pallavolo Bresciana",
			tipoEnte: "ASD",
			piano: "free" as const,
			stato: "sospeso" as const,
			discipline: ["Pallavolo"],
			citta: "Brescia",
			maxSoci: "50",
		},
		{
			slug: "atletica-leggera-fi",
			ragioneSociale: "Atletica Leggera Firenze",
			tipoEnte: "ASD",
			piano: "enterprise" as const,
			stato: "attivo" as const,
			discipline: ["Atletica Leggera"],
			citta: "Firenze",
			maxSoci: "99999",
		},
		{
			slug: "polisportiva-vigne",
			ragioneSociale: "Polisportiva Vigne",
			tipoEnte: "ASD",
			piano: "pro" as const,
			stato: "attivo" as const,
			discipline: ["Calcio", "Pallavolo", "Nuoto"],
			citta: "Napoli",
			maxSoci: "1000",
		},
		{
			slug: "scherma-nord",
			ragioneSociale: "Scherma Nord Milano",
			tipoEnte: "SSD",
			piano: "base" as const,
			stato: "attivo" as const,
			discipline: ["Scherma"],
			citta: "Milano",
			maxSoci: "200",
		},
	];

	const tenants = await db
		.insert(schema.tenants)
		.values(
			tenantsData.map((t) => ({
				slug: t.slug,
				ragioneSociale: t.ragioneSociale,
				tipoEnte: t.tipoEnte,
				piano: t.piano,
				maxSoci: t.maxSoci,
				stato: t.stato,
				partitaIva: "01234567890",
				codiceFiscale: "01234567890",
				pec: `${t.slug}@pec.it`,
				sedeLegale: { via: "Via dello Sport 42", cap: "00100", citta: t.citta, provincia: "XX" },
				federazioni: [{ sigla: "CONI", nome: "Comitato Olimpico Nazionale Italiano" }],
				discipline: t.discipline,
				impostazioni: { layout_menu: "sidebar", palette_default: "indigo" },
			})),
		)
		.returning();
	const demoTenant = tenants[0]!;

	// ── 3. Utenti per tutti i ruoli (demo-asd) ────────────────────────────────
	const utentiData = [
		{
			email: "admin@neogesys.sport",
			nome: "Platform",
			cognome: "Admin",
			role: "super_admin" as const,
		},
		{
			email: "admin@demo-asd.gestionale.sport",
			nome: "Mario",
			cognome: "Rossi",
			role: "admin_tenant" as const,
		},
		{
			email: "coord@demo-asd.gestionale.sport",
			nome: "Luigi",
			cognome: "Verdi",
			role: "coordinatore" as const,
		},
		{
			email: "segreteria@demo-asd.gestionale.sport",
			nome: "Claudia",
			cognome: "Neri",
			role: "operatore" as const,
		},
		{
			email: "tesoreria@demo-asd.gestionale.sport",
			nome: "Giulia",
			cognome: "Conti",
			role: "tesoriere" as const,
		},
		{
			email: "atletica@demo-asd.gestionale.sport",
			nome: "Paolo",
			cognome: "Bianchi",
			role: "istruttore" as const,
		},
		{
			email: "anna.bianchi@demo-asd.gestionale.sport",
			nome: "Anna",
			cognome: "Bianchi",
			role: "user" as const,
		},
	];

	const utenti = await db
		.insert(schema.utenti)
		.values(
			utentiData.map((u) => ({
				email: u.email,
				passwordHash: DEMO_PASSWORD_HASH,
				nome: u.nome,
				cognome: u.cognome,
				emailVerified: true,
			})),
		)
		.returning();

	// ── 4. Utente-Tenant membership (tutti tranne super_admin) ────────────────
	// Mapping ruolo dev → ruolo DB (enum: super_admin|admin|segreteria|contabile|istruttore|atleta|genitore)
	const roleMap: Record<
		string,
		"admin" | "segreteria" | "contabile" | "istruttore" | "atleta" | "super_admin"
	> = {
		admin_tenant: "admin",
		coordinatore: "admin", // alias: coordinatore → admin
		operatore: "segreteria",
		tesoriere: "contabile",
		istruttore: "istruttore",
		user: "atleta",
	};

	await db.insert(schema.utenteTenant).values(
		utentiData
			.map((u, i) => {
				if (u.role === "super_admin") return null;
				return {
					utenteId: utenti[i]!.id,
					tenantId: demoTenant.id,
					ruolo: roleMap[u.role] ?? "atleta",
					attivo: true,
				};
			})
			.filter((v): v is NonNullable<typeof v> => v !== null),
	);

	// ── 5. Soci per demo-asd (12 soci) ────────────────────────────────────────
	const sociData = [
		{
			nome: "Luca",
			cognome: "Bianchi",
			cf: "BNCLCU90A01H501Z",
			email: "luca.bianchi@example.com",
			tipologia: "atleta" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
			sesso: "M" as const,
		},
		{
			nome: "Giulia",
			cognome: "Verdi",
			cf: "VRDGLI92B41H501A",
			email: "giulia.verdi@example.com",
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "attivo" as const,
			sesso: "F" as const,
		},
		{
			nome: "Marco",
			cognome: "Neri",
			cf: "NRIMRC88C01H501B",
			email: "marco.neri@example.com",
			tipologia: "istruttore" as const,
			disciplina: "Pallavolo",
			stato: "attivo" as const,
			sesso: "M" as const,
		},
		{
			nome: "Sara",
			cognome: "Russo",
			cf: "RSSSRA95D41H501C",
			email: "sara.russo@example.com",
			tipologia: "socio" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
			sesso: "F" as const,
		},
		{
			nome: "Andrea",
			cognome: "Ferrari",
			cf: "FRRNDR91E01H501D",
			email: "andrea.ferrari@example.com",
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "sospeso" as const,
			sesso: "M" as const,
		},
		{
			nome: "Chiara",
			cognome: "Romano",
			cf: "RMNCHR93F41H501E",
			email: "chiara.romano@example.com",
			tipologia: "atleta" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
			sesso: "F" as const,
		},
		{
			nome: "Francesco",
			cognome: "Colombo",
			cf: "CLMFNC87G01H501F",
			email: "francesco.colombo@example.com",
			tipologia: "dirigente" as const,
			disciplina: null,
			stato: "attivo" as const,
			sesso: "M" as const,
		},
		{
			nome: "Elena",
			cognome: "Ricci",
			cf: "RCCLNE96H41H501G",
			email: "elena.ricci@example.com",
			tipologia: "atleta" as const,
			disciplina: "Pallavolo",
			stato: "attivo" as const,
			sesso: "F" as const,
		},
		{
			nome: "Davide",
			cognome: "Moretti",
			cf: "MRTDVD89I01H501H",
			email: "davide.moretti@example.com",
			tipologia: "volontario" as const,
			disciplina: null,
			stato: "attivo" as const,
			sesso: "M" as const,
		},
		{
			nome: "Alessia",
			cognome: "Conti",
			cf: "CNTLSS94L41H501I",
			email: "alessia.conti@example.com",
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "scaduto" as const,
			sesso: "F" as const,
		},
		{
			nome: "Simone",
			cognome: "Esposito",
			cf: "SPSSMN85M01F205L",
			email: "simone.esposito@example.com",
			tipologia: "atleta" as const,
			disciplina: "Atletica Leggera",
			stato: "attivo" as const,
			sesso: "M" as const,
		},
		{
			nome: "Francesca",
			cognome: "Marino",
			cf: "MRNFNC97N41F205M",
			email: "francesca.marino@example.com",
			tipologia: "atleta" as const,
			disciplina: "Nuoto",
			stato: "attivo" as const,
			sesso: "F" as const,
		},
	];

	const soci = await db
		.insert(schema.soci)
		.values(
			sociData.map((s) => ({
				tenantId: demoTenant.id,
				nome: s.nome,
				cognome: s.cognome,
				codiceFiscale: s.cf,
				email: s.email,
				telefono: `+39 333 ${Math.floor(1000000 + Math.random() * 9000000)}`,
				sesso: s.sesso,
				tipologia: s.tipologia,
				disciplina: s.disciplina,
				stato: s.stato,
				consensoGdpr: true,
				dataIscrizione: new Date(
					`2024-${String(Math.floor(Math.random() * 12) + 1).padStart(2, "0")}-01`,
				),
				indirizzo: { via: "Via Roma 1", cap: "00100", citta: "Roma", provincia: "RM" },
			})),
		)
		.returning();

	// ── 6. Corsi (4 per demo-asd) ─────────────────────────────────────────────
	await db
		.insert(schema.corsi)
		.values([
			{
				tenantId: demoTenant.id,
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
				stato: "attivo",
			},
			{
				tenantId: demoTenant.id,
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
				stato: "attivo",
			},
			{
				tenantId: demoTenant.id,
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
				stato: "attivo",
			},
			{
				tenantId: demoTenant.id,
				nome: "Nuoto Baby",
				disciplina: "Nuoto",
				descrizione: "Ambientamento acquatico 3-6 anni",
				livello: "principiante",
				etaMin: 3,
				etaMax: 6,
				sedeNome: "Piscina olimpica",
				capacitaMax: 10,
				quotaAssociata: "180.00",
				orarioSettimanale: [{ giorno: "sabato", oraInizio: "10:00", oraFine: "11:00" }],
				stato: "attivo",
			},
		])
		.returning();

	// ── 7. Eventi ─────────────────────────────────────────────────────────────
	await db
		.insert(schema.eventi)
		.values([
			{
				tenantId: demoTenant.id,
				nome: "Gara Regionale Atletica",
				tipo: "gara",
				descrizione: "Gara regionale di atletica leggera categoria Under 18",
				dataInizio: new Date("2026-05-15T09:00:00"),
				dataFine: new Date("2026-05-15T18:00:00"),
				luogo: "Stadio Olimpico - Roma",
				disciplina: "Atletica Leggera",
				categoria: "Under 18",
				iscrizioniAperte: true,
				deadlineIscrizione: new Date("2026-05-10"),
				quotaIscrizione: "25.00",
				maxPartecipanti: 200,
			},
			{
				tenantId: demoTenant.id,
				nome: "Torneo Pallavolo",
				tipo: "torneo",
				descrizione: "Torneo primaverile amatoriale",
				dataInizio: new Date("2026-06-10T08:00:00"),
				dataFine: new Date("2026-06-12T20:00:00"),
				luogo: "Palestra polivalente",
				disciplina: "Pallavolo",
				categoria: "Mista",
				iscrizioniAperte: true,
				deadlineIscrizione: new Date("2026-06-05"),
				quotaIscrizione: "15.00",
				maxPartecipanti: 60,
			},
			{
				tenantId: demoTenant.id,
				nome: "Stage di Nuoto",
				tipo: "stage",
				descrizione: "Stage tecnico di perfezionamento stile",
				dataInizio: new Date("2026-07-01T09:00:00"),
				dataFine: new Date("2026-07-05T18:00:00"),
				luogo: "Piscina olimpica",
				disciplina: "Nuoto",
				categoria: "Agonistico",
				iscrizioniAperte: true,
				deadlineIscrizione: new Date("2026-06-25"),
				quotaIscrizione: "120.00",
				maxPartecipanti: 20,
			},
		])
		.returning();

	// ── 8. Anno Sportivo + Tipi Quota + Quote ────────────────────────────────
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
	if (!annoSportivo) throw new Error("Failed anno sportivo");

	const tipiQuota = await db
		.insert(schema.tipiQuota)
		.values([
			{
				tenantId: demoTenant.id,
				nome: "Quota iscrizione annuale",
				tipo: "iscrizione",
				importo: "100.00",
				descrizione: "Quota associativa annuale",
				attivo: true,
			},
			{
				tenantId: demoTenant.id,
				nome: "Quota mensile corso",
				tipo: "mensile",
				importo: "40.00",
				descrizione: "Mensilità corso",
				attivo: true,
			},
			{
				tenantId: demoTenant.id,
				nome: "Quota trimestrale",
				tipo: "trimestrale",
				importo: "110.00",
				descrizione: "Tariffa trimestrale",
				attivo: true,
			},
		])
		.returning();

	// Quote per tutti i soci attivi
	const activeSoci = soci.filter((s) => s.stato === "attivo");
	const quoteValues = activeSoci.map((socio, i) => ({
		tenantId: demoTenant.id,
		socioId: socio.id,
		tipoQuotaId: tipiQuota[0]!.id,
		annoSportivoId: annoSportivo.id,
		importo: "100.00",
		importoPagato: i < 5 ? "100.00" : i < 7 ? "50.00" : "0.00",
		stato: (i < 5 ? "pagato" : i < 7 ? "parziale" : "da_pagare") as
			| "pagato"
			| "parziale"
			| "da_pagare",
		dataEmissione: new Date("2025-09-15"),
		dataScadenza: new Date("2025-10-15"),
		dataPagamento: i < 5 ? new Date("2025-09-20") : null,
		metodoPagamento: (i < 5 ? "bonifico" : null) as "bonifico" | null,
	}));
	await db.insert(schema.quote).values(quoteValues);

	// ── 9. Certificati Medici ────────────────────────────────────────────────
	await db
		.insert(schema.certificatiMedici)
		.values(
			activeSoci.slice(0, 8).map((s, i) => ({
				tenantId: demoTenant.id,
				socioId: s.id,
				tipo: (i % 2 === 0 ? "agonistico" : "non_agonistico") as "agonistico" | "non_agonistico",
				dataRilascio: new Date("2025-09-01"),
				dataScadenza: new Date("2026-09-01"),
				medicoNome: "Dott. Verdi",
				strutturaRilascio: "Centro Medico Sportivo Roma",
				stato: (i < 6 ? "valido" : "in_scadenza") as "valido" | "in_scadenza" | "scaduto",
			})),
		)
		.returning();

	// ── 10. Prima Nota / Movimenti Contabilità ───────────────────────────────
	await db
		.insert(schema.primaNotaMovimenti)
		.values([
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-01"),
				tipo: "entrata",
				causale: "Quote associative",
				descrizione: "Quote associative aprile",
				importo: "2400.00",
				categoriaContabile: "quote",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-02"),
				tipo: "uscita",
				causale: "Utenze",
				descrizione: "Bolletta energia elettrica",
				importo: "180.00",
				categoriaContabile: "utenze",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-05"),
				tipo: "entrata",
				causale: "Corsi",
				descrizione: "Iscrizioni corso nuoto",
				importo: "600.00",
				categoriaContabile: "corsi",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-07"),
				tipo: "uscita",
				causale: "Materiale",
				descrizione: "Attrezzatura sportiva",
				importo: "450.00",
				categoriaContabile: "materiale",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-10"),
				tipo: "uscita",
				causale: "Personale",
				descrizione: "Compenso istruttori marzo",
				importo: "1800.00",
				categoriaContabile: "personale",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-12"),
				tipo: "entrata",
				causale: "Eventi",
				descrizione: "Iscrizioni torneo primaverile",
				importo: "320.00",
				categoriaContabile: "eventi",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-15"),
				tipo: "uscita",
				causale: "Affitto",
				descrizione: "Affitto palestra aprile",
				importo: "800.00",
				categoriaContabile: "affitto",
			},
			{
				tenantId: demoTenant.id,
				data: new Date("2026-04-18"),
				tipo: "entrata",
				causale: "Sponsor",
				descrizione: "Sponsorizzazione",
				importo: "1000.00",
				categoriaContabile: "sponsor",
			},
		])
		.returning();

	// ── 11. Comunicazioni ────────────────────────────────────────────────────
	await db
		.insert(schema.comunicazioni)
		.values([
			{
				tenantId: demoTenant.id,
				tipo: "email",
				oggetto: "Benvenuti nel nuovo anno sportivo",
				corpo: "Carissimi soci, la nuova stagione parte il 1° settembre...",
				stato: "inviata",
				dataInvio: new Date("2025-09-01"),
			},
			{
				tenantId: demoTenant.id,
				tipo: "email",
				oggetto: "Promemoria scadenza certificati medici",
				corpo: "Ti ricordiamo che il tuo certificato medico scade...",
				stato: "inviata",
				dataInvio: new Date("2026-03-15"),
			},
			{
				tenantId: demoTenant.id,
				tipo: "sms",
				oggetto: "Annullo lezione odierna",
				corpo: "Per motivi tecnici la lezione di oggi è annullata",
				stato: "inviata",
				dataInvio: new Date("2026-04-01"),
			},
			{
				tenantId: demoTenant.id,
				tipo: "email",
				oggetto: "Torneo pallavolo giugno",
				corpo: "Iscrizioni aperte al torneo...",
				stato: "bozza",
				dataInvio: null,
			},
		])
		.returning();

	// ── 12. Documenti ────────────────────────────────────────────────────────
	await db
		.insert(schema.documenti)
		.values([
			{
				tenantId: demoTenant.id,
				nome: "Statuto ASD 2024.pdf",
				tipo: "altro",
				fileUrl: "docs/statuto-2024.pdf",
				mimeType: "application/pdf",
				dimensioneBytes: 450000,
			},
			{
				tenantId: demoTenant.id,
				nome: "Informativa GDPR.pdf",
				tipo: "liberatoria",
				fileUrl: "docs/gdpr.pdf",
				mimeType: "application/pdf",
				dimensioneBytes: 220000,
			},
			{
				tenantId: demoTenant.id,
				nome: "Bilancio 2024.xlsx",
				tipo: "altro",
				fileUrl: "docs/bilancio-2024.xlsx",
				mimeType: "application/vnd.ms-excel",
				dimensioneBytes: 380000,
			},
			{
				tenantId: demoTenant.id,
				nome: "Modulo iscrizione.docx",
				tipo: "modulo",
				fileUrl: "docs/modulo.docx",
				mimeType: "application/msword",
				dimensioneBytes: 95000,
			},
			{
				tenantId: demoTenant.id,
				nome: "Verbale assemblea.pdf",
				tipo: "altro",
				fileUrl: "docs/verbale-04-2026.pdf",
				mimeType: "application/pdf",
				dimensioneBytes: 180000,
			},
		])
		.returning();

	// ── 13. Fatture Piattaforma (billing super_admin) ────────────────────────
	await db
		.insert(schema.fatturePiattaforma)
		.values([
			{
				tenantId: tenants[0]!.id,
				numero: "2026-001",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Pro aprile 2026",
				pianoCodice: "pro",
				periodo: "mensile",
				imponibile: "122.13",
				iva: "26.87",
				totale: "149.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-03"),
			},
			{
				tenantId: tenants[1]!.id,
				numero: "2026-002",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Base aprile 2026",
				pianoCodice: "base",
				periodo: "mensile",
				imponibile: "40.16",
				iva: "8.84",
				totale: "49.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-03"),
			},
			{
				tenantId: tenants[2]!.id,
				numero: "2026-003",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Pro aprile 2026",
				pianoCodice: "pro",
				periodo: "mensile",
				imponibile: "122.13",
				iva: "26.87",
				totale: "149.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-04"),
			},
			{
				tenantId: tenants[3]!.id,
				numero: "2026-004",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Base aprile 2026",
				pianoCodice: "base",
				periodo: "mensile",
				imponibile: "40.16",
				iva: "8.84",
				totale: "49.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-05"),
			},
			{
				tenantId: tenants[5]!.id,
				numero: "2026-005",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Enterprise aprile 2026",
				pianoCodice: "enterprise",
				periodo: "mensile",
				imponibile: "327.05",
				iva: "71.95",
				totale: "399.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-02"),
			},
			{
				tenantId: tenants[6]!.id,
				numero: "2026-006",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Pro aprile 2026",
				pianoCodice: "pro",
				periodo: "mensile",
				imponibile: "122.13",
				iva: "26.87",
				totale: "149.00",
				valuta: "EUR",
				stato: "emessa",
			},
			{
				tenantId: tenants[7]!.id,
				numero: "2026-007",
				annoFattura: 2026,
				dataEmissione: new Date("2026-04-01"),
				dataScadenza: new Date("2026-04-30"),
				descrizione: "Abbonamento Base aprile 2026",
				pianoCodice: "base",
				periodo: "mensile",
				imponibile: "40.16",
				iva: "8.84",
				totale: "49.00",
				valuta: "EUR",
				stato: "pagata",
				dataPagamento: new Date("2026-04-06"),
			},
		]);
}

seed()
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	})
	.finally(async () => {
		await client.end();
	});
