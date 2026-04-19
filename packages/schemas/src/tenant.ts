import { z } from "zod";

/**
 * Address schema used for sede legale.
 */
const indirizzoSchema = z.object({
	via: z.string().min(1, "Via obbligatoria"),
	cap: z.string().regex(/^\d{5}$/, "CAP deve essere di 5 cifre"),
	citta: z.string().min(1, "Citta obbligatoria"),
	provincia: z.string().length(2, "Provincia deve essere di 2 caratteri").toUpperCase(),
});

/**
 * Federation object schema.
 */
const federazioneSchema = z.object({
	nome: z.string().min(1),
	codice: z.string().min(1),
	numeroAffiliazione: z.string().optional(),
	dataAffiliazione: z.string().optional(),
});

/**
 * Schema for creating a new tenant.
 */
export const createTenantSchema = z.object({
	slug: z
		.string()
		.min(3, "Slug deve avere almeno 3 caratteri")
		.max(50, "Slug deve avere al massimo 50 caratteri")
		.regex(
			/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
			"Slug deve contenere solo lettere minuscole, numeri e trattini",
		),
	ragioneSociale: z
		.string()
		.min(1, "Ragione sociale obbligatoria")
		.max(200, "Ragione sociale troppo lunga"),
	tipoEnte: z.enum(["ASD", "SSD", "FED"], {
		errorMap: () => ({ message: "Tipo ente deve essere ASD, SSD o FED" }),
	}),
	partitaIva: z
		.string()
		.regex(/^\d{11}$/, "Partita IVA deve essere di 11 cifre")
		.optional(),
	codiceFiscale: z
		.string()
		.regex(/^\d{11}$/, "Codice fiscale ente deve essere di 11 cifre")
		.optional(),
	pec: z.string().email("PEC non valida").optional(),
	codiceSDI: z.string().max(10, "Codice SDI troppo lungo").optional(),
	sedeLegale: indirizzoSchema.optional(),
	logo: z.string().url("URL logo non valido").optional(),
	federazioni: z.array(federazioneSchema).optional(),
	discipline: z.array(z.string()).optional(),
});

/**
 * Schema for updating an existing tenant.
 */
export const updateTenantSchema = createTenantSchema.partial().extend({
	stato: z.enum(["attivo", "sospeso", "trial", "chiuso"]).optional(),
	piano: z.enum(["free", "base", "pro", "enterprise"]).optional(),
	maxSoci: z.string().optional(),
	trialEnd: z.string().datetime().optional(),
});

/**
 * Schema for tenant settings (impostazioni).
 */
export const tenantSettingsSchema = z.object({
	layoutMenu: z.enum(["sidebar", "top", "compact"]).default("sidebar"),
	paletteDefault: z.string().default("blue"),
	paletteCustom: z
		.object({
			primary: z.string(),
			secondary: z.string(),
			accent: z.string(),
		})
		.optional(),
	lingua: z.enum(["it", "en"]).default("it"),
	formatoData: z.enum(["DD/MM/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
	notificheEmail: z.boolean().default(true),
	notificheWhatsapp: z.boolean().default(false),
	moduliAttivi: z.array(z.string()).optional(),
});

export type CreateTenant = z.infer<typeof createTenantSchema>;
export type UpdateTenant = z.infer<typeof updateTenantSchema>;
export type TenantSettings = z.infer<typeof tenantSettingsSchema>;
