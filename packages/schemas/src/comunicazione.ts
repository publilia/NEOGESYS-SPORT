import { z } from "zod";

/**
 * Schema for creating a new communication (newsletter, announcement, etc.).
 */
export const createComunicazioneSchema = z.object({
	oggetto: z.string().min(1, "Oggetto obbligatorio").max(300),
	corpo: z.string().min(1, "Corpo del messaggio obbligatorio"),
	tipo: z.enum(["email", "whatsapp", "notifica_app", "sms"], {
		errorMap: () => ({
			message: "Tipo comunicazione deve essere: email, whatsapp, notifica_app o sms",
		}),
	}),

	// Recipients
	destinatariTutti: z.boolean().default(false),
	destinatariCorsoId: z.string().uuid().optional(),
	destinatariSocioIds: z.array(z.string().uuid()).optional(),
	destinatariRuoli: z.array(z.string()).optional(),

	// Scheduling
	programmata: z.boolean().default(false),
	dataInvio: z.string().datetime().optional(),

	// Attachments
	allegati: z
		.array(
			z.object({
				nome: z.string(),
				url: z.string().url(),
				tipo: z.string(), // MIME type
				dimensione: z.coerce.number().optional(), // bytes
			}),
		)
		.optional(),

	// Template
	templateId: z.string().uuid().optional(),
	templateVariabili: z.record(z.string()).optional(),

	priorita: z.enum(["bassa", "normale", "alta"]).default("normale"),
	note: z.string().optional(),
});

/**
 * Schema for sending an email through the platform.
 */
export const inviaEmailSchema = z.object({
	a: z.array(z.string().email("Indirizzo email non valido")).min(1, "Almeno un destinatario"),
	cc: z.array(z.string().email()).optional(),
	bcc: z.array(z.string().email()).optional(),
	oggetto: z.string().min(1, "Oggetto obbligatorio"),
	corpoHtml: z.string().min(1, "Corpo HTML obbligatorio"),
	corpoTesto: z.string().optional(),
	replyTo: z.string().email().optional(),
	allegati: z
		.array(
			z.object({
				filename: z.string(),
				content: z.string(), // base64 encoded
				contentType: z.string(),
			}),
		)
		.optional(),
});

export type CreateComunicazione = z.infer<typeof createComunicazioneSchema>;
export type InviaEmail = z.infer<typeof inviaEmailSchema>;
