import { z } from "zod";

/**
 * Italian Codice Fiscale validation regex.
 * Format: 6 letters + 2 digits + 1 letter + 2 digits + 1 letter + 3 digits + 1 letter
 * Example: RSSMRA85M01H501Z
 */
const CODICE_FISCALE_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;

/**
 * Schema for creating a new socio (member).
 */
export const createSocioSchema = z.object({
	nome: z.string().min(1, "Nome obbligatorio").max(100),
	cognome: z.string().min(1, "Cognome obbligatorio").max(100),
	codiceFiscale: z
		.string()
		.regex(CODICE_FISCALE_REGEX, "Codice fiscale non valido")
		.transform((v) => v.toUpperCase()),
	dataNascita: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data nascita: YYYY-MM-DD"),
	luogoNascita: z.string().min(1, "Luogo di nascita obbligatorio").optional(),
	sesso: z.enum(["M", "F"], {
		errorMap: () => ({ message: "Sesso deve essere M o F" }),
	}),
	indirizzo: z
		.object({
			via: z.string().min(1),
			cap: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre"),
			citta: z.string().min(1),
			provincia: z.string().length(2).toUpperCase(),
		})
		.optional(),
	telefono: z.string().optional(),
	email: z.string().email("Email non valida").optional(),
	pec: z.string().email("PEC non valida").optional(),

	// Sport-specific fields
	tesseraNumero: z.string().optional(),
	dataIscrizione: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data iscrizione: YYYY-MM-DD")
		.optional(),
	categoriaEta: z.string().optional(),
	gruppoSanguigno: z.string().optional(),
	allergie: z.string().optional(),
	notemediche: z.string().optional(),

	// Parent/guardian for minors
	genitoreId: z.string().uuid().optional(),
	minorenne: z.boolean().default(false),

	// Contact preferences
	consensoEmail: z.boolean().default(false),
	consensoWhatsapp: z.boolean().default(false),
	consensoFoto: z.boolean().default(false),
});

/**
 * Schema for updating an existing socio.
 */
export const updateSocioSchema = createSocioSchema.partial().extend({
	stato: z.enum(["attivo", "sospeso", "cessato", "in_attesa"]).optional(),
});

/**
 * Schema for filtering/searching soci list.
 */
export const socioFilterSchema = z.object({
	search: z.string().optional(),
	stato: z.enum(["attivo", "sospeso", "cessato", "in_attesa"]).optional(),
	categoriaEta: z.string().optional(),
	corsoId: z.string().uuid().optional(),
	certificatoScaduto: z.boolean().optional(),
	quotaNonPagata: z.boolean().optional(),
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(100).default(25),
	sortBy: z.enum(["cognome", "nome", "dataIscrizione", "createdAt"]).default("cognome"),
	sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateSocio = z.infer<typeof createSocioSchema>;
export type UpdateSocio = z.infer<typeof updateSocioSchema>;
export type SocioFilter = z.infer<typeof socioFilterSchema>;
