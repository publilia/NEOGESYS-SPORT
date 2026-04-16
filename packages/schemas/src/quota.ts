import { z } from "zod";

/**
 * Schema for creating a new quota (fee) type or record.
 */
export const createQuotaSchema = z.object({
  socioId: z.string().uuid("ID socio non valido"),
  tipoQuotaId: z.string().uuid("ID tipo quota non valido").optional(),
  annoSportivoId: z.string().uuid("ID anno sportivo non valido").optional(),

  descrizione: z.string().min(1, "Descrizione obbligatoria"),
  importo: z.coerce.number().positive("Importo deve essere positivo"),
  importoScontato: z.coerce.number().min(0).optional(),
  scadenza: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Formato data scadenza: YYYY-MM-DD",
  ),

  tipoRateizzazione: z
    .enum(["unica", "mensile", "trimestrale", "semestrale"])
    .default("unica"),
  numeroRate: z.coerce.number().int().min(1).default(1),

  note: z.string().optional(),
});

/**
 * Schema for issuing/emitting a quota (generating the actual payment request).
 */
export const emettiQuotaSchema = z.object({
  quotaId: z.string().uuid("ID quota non valido"),
  metodoNotifica: z.enum(["email", "whatsapp", "entrambi", "nessuno"]).default("email"),
  messaggioPersonalizzato: z.string().optional(),
  dataEmissione: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Formato data emissione: YYYY-MM-DD",
  ).optional(),
});

/**
 * Schema for recording a payment against a quota.
 */
export const registraPagamentoSchema = z.object({
  quotaId: z.string().uuid("ID quota non valido"),
  importoPagato: z.coerce.number().positive("Importo pagato deve essere positivo"),
  dataPagamento: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Formato data pagamento: YYYY-MM-DD",
  ),
  metodoPagamento: z.enum([
    "contanti",
    "bonifico",
    "carta",
    "satispay",
    "stripe",
    "assegno",
    "rid",
    "altro",
  ]),
  riferimentoPagamento: z.string().optional(), // transaction ID, check number, etc.
  note: z.string().optional(),
  ricevutaNumero: z.string().optional(),
});

export type CreateQuota = z.infer<typeof createQuotaSchema>;
export type EmettiQuota = z.infer<typeof emettiQuotaSchema>;
export type RegistraPagamento = z.infer<typeof registraPagamentoSchema>;
