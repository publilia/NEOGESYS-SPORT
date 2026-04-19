import { getAIClient } from "./client";

/**
 * Schema for the OCR result of a certificato medico.
 */
export interface CertificatoOcrResult {
	tipo: "non_agonistico" | "agonistico" | "idoneita_sportiva" | "sconosciuto";
	nomePaziente: string | null;
	cognomePaziente: string | null;
	codiceFiscale: string | null;
	dataNascita: string | null;
	dataRilascio: string | null;
	dataScadenza: string | null;
	medicoNome: string | null;
	strutturaRilascio: string | null;
	disciplinaSportiva: string | null;
	idoneo: boolean | null;
	note: string | null;
	confidenza: number; // 0-100
}

const OCR_SYSTEM_PROMPT = `Sei un sistema OCR specializzato nell'estrazione di dati da certificati medici sportivi italiani.

Analizza l'immagine del certificato medico e restituisci un oggetto JSON con i seguenti campi:
- tipo: "non_agonistico" | "agonistico" | "idoneita_sportiva" | "sconosciuto"
- nomePaziente: nome del paziente (stringa o null)
- cognomePaziente: cognome del paziente (stringa o null)
- codiceFiscale: codice fiscale del paziente (stringa o null)
- dataNascita: data di nascita in formato ISO YYYY-MM-DD (stringa o null)
- dataRilascio: data di rilascio del certificato in formato ISO YYYY-MM-DD (stringa o null)
- dataScadenza: data di scadenza del certificato in formato ISO YYYY-MM-DD (stringa o null)
- medicoNome: nome del medico che ha rilasciato il certificato (stringa o null)
- strutturaRilascio: nome della struttura sanitaria (stringa o null)
- disciplinaSportiva: disciplina sportiva indicata (stringa o null)
- idoneo: true se il certificato indica idoneita, false se non idoneo, null se non determinabile
- note: eventuali note o limitazioni (stringa o null)
- confidenza: livello di confidenza complessivo da 0 a 100

Rispondi SOLO con il JSON, senza markdown o testo aggiuntivo.`;

/**
 * Process a medical certificate image using Claude Vision to extract structured data.
 *
 * @param imageUrl - URL of the certificate image to process
 * @param tenantId - Tenant ID for API key resolution and rate limiting
 * @returns Typed OCR result with extracted certificate fields
 */
export async function processCertificato(
	imageUrl: string,
	tenantId: string,
): Promise<CertificatoOcrResult> {
	const client = await getAIClient(tenantId, "standard");

	if (client.provider !== "anthropic" || !client.anthropic) {
		throw new Error("OCR dei certificati richiede Claude Vision (provider Anthropic)");
	}

	const response = await client.anthropic.messages.create({
		model: client.model,
		max_tokens: 1024,
		system: OCR_SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: [
					{
						type: "image",
						source: {
							type: "url",
							url: imageUrl,
						},
					},
					{
						type: "text",
						text: "Estrai i dati da questo certificato medico sportivo.",
					},
				],
			},
		],
	});

	const textBlock = response.content.find((block) => block.type === "text");

	if (!textBlock || textBlock.type !== "text") {
		throw new Error("Nessuna risposta testuale ricevuta dal modello OCR");
	}

	try {
		const parsed = JSON.parse(textBlock.text) as CertificatoOcrResult;
		return parsed;
	} catch {
		throw new Error(`Errore nel parsing della risposta OCR: ${textBlock.text.substring(0, 200)}`);
	}
}
