import { z } from "zod";

/**
 * Time slot schema for course schedules.
 */
const fasciaOrariaSchema = z.object({
	giorno: z.enum(["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"]),
	oraInizio: z.string().regex(/^\d{2}:\d{2}$/, "Formato ora: HH:MM"),
	oraFine: z.string().regex(/^\d{2}:\d{2}$/, "Formato ora: HH:MM"),
	sala: z.string().optional(),
});

/**
 * Schema for creating a new course.
 */
export const createCorsoSchema = z.object({
	nome: z.string().min(1, "Nome corso obbligatorio").max(200),
	descrizione: z.string().optional(),
	disciplina: z.string().min(1, "Disciplina obbligatoria"),
	istruttoreId: z.string().uuid("ID istruttore non valido").optional(),
	istruttoriIds: z.array(z.string().uuid()).optional(),

	annoSportivoId: z.string().uuid("ID anno sportivo non valido").optional(),

	maxIscritti: z.coerce.number().int().min(1).optional(),
	minIscritti: z.coerce.number().int().min(0).optional(),
	minEta: z.coerce.number().int().min(0).optional(),
	maxEta: z.coerce.number().int().optional(),

	orario: z.array(fasciaOrariaSchema).min(1, "Almeno una fascia oraria richiesta"),

	dataInizio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data inizio: YYYY-MM-DD"),
	dataFine: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data fine: YYYY-MM-DD")
		.optional(),

	quotaIscrizione: z.coerce.number().min(0).optional(),
	quotaMensile: z.coerce.number().min(0).optional(),

	colore: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/, "Colore deve essere un codice esadecimale")
		.optional(),
	note: z.string().optional(),
});

/**
 * Schema for updating an existing course.
 */
export const updateCorsoSchema = createCorsoSchema.partial().extend({
	stato: z.enum(["attivo", "sospeso", "concluso", "programmato"]).optional(),
});

/**
 * Schema for recording attendance.
 */
export const registraPresenzaSchema = z.object({
	corsoId: z.string().uuid("ID corso non valido"),
	data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data: YYYY-MM-DD"),
	presenze: z
		.array(
			z.object({
				socioId: z.string().uuid("ID socio non valido"),
				presente: z.boolean(),
				nota: z.string().optional(),
				oraIngresso: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Formato ora: HH:MM")
					.optional(),
				oraUscita: z
					.string()
					.regex(/^\d{2}:\d{2}$/, "Formato ora: HH:MM")
					.optional(),
			}),
		)
		.min(1, "Almeno una presenza richiesta"),
});

export type CreateCorso = z.infer<typeof createCorsoSchema>;
export type UpdateCorso = z.infer<typeof updateCorsoSchema>;
export type RegistraPresenza = z.infer<typeof registraPresenzaSchema>;
