import { getAIClient } from "./client";

/**
 * Context provided to the AI assistant for each conversation.
 */
export interface AssistantContext {
	tenantId: string;
	tenantNome: string;
	utenteNome: string;
	ruolo: string;
	lingua?: string;
}

/**
 * Tool definitions available to the AI assistant for function calling.
 */
export const assistantTools = [
	{
		name: "cerca_soci",
		description:
			"Cerca soci nella piattaforma per nome, cognome, codice fiscale, o tessera. " +
			"Usa questo strumento quando l'utente chiede informazioni su un socio specifico.",
		input_schema: {
			type: "object" as const,
			properties: {
				query: {
					type: "string",
					description: "Testo di ricerca (nome, cognome, codice fiscale, tessera)",
				},
				stato: {
					type: "string",
					enum: ["attivo", "sospeso", "dimesso", "scaduto"],
					description: "Filtra per stato del socio",
				},
				limit: {
					type: "number",
					description: "Numero massimo di risultati (default 10)",
				},
			},
			required: ["query"],
		},
	},
	{
		name: "statistiche_dashboard",
		description:
			"Recupera le statistiche generali della dashboard: numero soci attivi, " +
			"certificati in scadenza, quote da pagare, presenze recenti.",
		input_schema: {
			type: "object" as const,
			properties: {
				periodo: {
					type: "string",
					enum: ["settimana", "mese", "trimestre", "anno"],
					description: "Periodo temporale per le statistiche",
				},
			},
		},
	},
	{
		name: "certificati_in_scadenza",
		description:
			"Elenca i certificati medici in scadenza o scaduti. " +
			"Usa quando l'utente chiede dei certificati medici.",
		input_schema: {
			type: "object" as const,
			properties: {
				giorni: {
					type: "number",
					description: "Mostra certificati che scadono entro N giorni (default 30)",
				},
				includiScaduti: {
					type: "boolean",
					description: "Includere anche i certificati gia scaduti",
				},
			},
		},
	},
	{
		name: "quote_insolute",
		description:
			"Elenca le quote (pagamenti) insolute o parzialmente pagate. " +
			"Usa quando l'utente chiede delle quote non pagate o dei solleciti.",
		input_schema: {
			type: "object" as const,
			properties: {
				socioId: {
					type: "string",
					description: "ID del socio specifico (opzionale)",
				},
				tipo: {
					type: "string",
					enum: ["iscrizione", "mensile", "trimestrale", "annuale", "evento"],
					description: "Filtra per tipo di quota",
				},
			},
		},
	},
	{
		name: "presenze_corso",
		description: "Recupera le presenze per un corso specifico o per un socio specifico.",
		input_schema: {
			type: "object" as const,
			properties: {
				corsoId: {
					type: "string",
					description: "ID del corso",
				},
				socioId: {
					type: "string",
					description: "ID del socio",
				},
				dataInizio: {
					type: "string",
					description: "Data inizio periodo (ISO)",
				},
				dataFine: {
					type: "string",
					description: "Data fine periodo (ISO)",
				},
			},
		},
	},
	{
		name: "genera_comunicazione",
		description:
			"Genera una bozza di comunicazione (email/sms) per un gruppo di soci. " +
			"Usa quando l'utente chiede di inviare comunicazioni o avvisi.",
		input_schema: {
			type: "object" as const,
			properties: {
				tipo: {
					type: "string",
					enum: ["email", "sms"],
					description: "Tipo di comunicazione",
				},
				oggetto: {
					type: "string",
					description: "Oggetto della comunicazione (per email)",
				},
				contenuto: {
					type: "string",
					description: "Descrizione del contenuto da generare",
				},
				destinatari: {
					type: "string",
					description:
						"Descrizione del gruppo destinatario (es. 'tutti i soci attivi', 'corsisti del corso di nuoto')",
				},
			},
			required: ["tipo", "contenuto", "destinatari"],
		},
	},
] as const;

const SYSTEM_PROMPT = `Sei l'assistente AI di NeoGesys Sport, una piattaforma gestionale per associazioni e societa sportive italiane.

Contesto:
- Associazione: {tenantNome}
- Utente: {utenteNome} (ruolo: {ruolo})
- Lingua: italiano

Le tue responsabilita:
1. Aiutare nella gestione quotidiana dell'associazione sportiva
2. Rispondere a domande sui soci, certificati medici, quote, corsi e presenze
3. Generare comunicazioni e report
4. Fornire suggerimenti proattivi (es. certificati in scadenza, quote insolute)

Linee guida:
- Rispondi sempre in italiano
- Usa un tono professionale ma amichevole
- Quando possibile, usa gli strumenti disponibili per fornire dati aggiornati
- Se non hai informazioni sufficienti, chiedi chiarimenti
- Rispetta la privacy: non condividere dati sensibili dei soci a ruoli non autorizzati
- Per operazioni sensibili (cancellazione, modifica dati), suggerisci la procedura ma non eseguire direttamente

Terminologia italiana del dominio:
- Soci = membri dell'associazione
- Quote = pagamenti/contributi
- Certificati medici = certificati di idoneita sportiva
- Corsi = attivita sportive organizzate
- Presenze = registro delle partecipazioni
- Tessera = tessera associativa
- ASD = Associazione Sportiva Dilettantistica
- SSD = Societa Sportiva Dilettantistica`;

/**
 * Result of processing an assistant message.
 */
export interface AssistantResponse {
	text: string;
	toolCalls: Array<{
		name: string;
		input: Record<string, unknown>;
	}>;
}

/**
 * Process a user message through the AI assistant.
 *
 * @param message - User's message text
 * @param context - Conversation context (tenant, user info)
 * @returns Assistant response with text and any tool calls
 */
export async function handleAssistantMessage(
	message: string,
	context: AssistantContext,
): Promise<AssistantResponse> {
	const client = await getAIClient(context.tenantId, "fast");

	if (client.provider !== "anthropic" || !client.anthropic) {
		throw new Error("L'assistente AI richiede il provider Anthropic");
	}

	const systemPrompt = SYSTEM_PROMPT.replace("{tenantNome}", context.tenantNome)
		.replace("{utenteNome}", context.utenteNome)
		.replace("{ruolo}", context.ruolo);

	const response = await client.anthropic.messages.create({
		model: client.model,
		max_tokens: 2048,
		system: systemPrompt,
		tools: assistantTools.map((tool) => ({
			name: tool.name,
			description: tool.description,
			input_schema: tool.input_schema,
		})),
		messages: [
			{
				role: "user",
				content: message,
			},
		],
	});

	const textBlocks = response.content
		.filter((block) => block.type === "text")
		.map((block) => {
			if (block.type === "text") return block.text;
			return "";
		});

	const toolCalls = response.content
		.filter((block) => block.type === "tool_use")
		.map((block) => {
			if (block.type === "tool_use") {
				return {
					name: block.name,
					input: block.input as Record<string, unknown>,
				};
			}
			return { name: "", input: {} };
		})
		.filter((tc) => tc.name !== "");

	return {
		text: textBlocks.join("\n"),
		toolCalls,
	};
}
