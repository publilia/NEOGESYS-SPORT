import { z } from "zod";

/**
 * Types of medical certificates in Italian sports.
 */
const TIPI_CERTIFICATO = [
  "agonistico",
  "non_agonistico",
  "ludico_motoria",
] as const;

/**
 * Schema for creating a new medical certificate.
 */
export const createCertificatoSchema = z.object({
  socioId: z.string().uuid("ID socio non valido"),
  tipo: z.enum(TIPI_CERTIFICATO, {
    errorMap: () => ({
      message: "Tipo certificato deve essere: agonistico, non_agonistico o ludico_motoria",
    }),
  }),
  dataEmissione: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Formato data emissione: YYYY-MM-DD",
  ),
  dataScadenza: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Formato data scadenza: YYYY-MM-DD",
  ),
  medicoNome: z.string().min(1, "Nome medico obbligatorio").optional(),
  medicoStruttura: z.string().optional(),
  note: z.string().optional(),
  documentoUrl: z.string().url("URL documento non valido").optional(),
  sport: z.string().optional(),
  idoneita: z.enum(["idoneo", "non_idoneo", "in_attesa"]).default("in_attesa"),
});

/**
 * Schema for AI OCR result from a scanned medical certificate.
 * Represents the structured data extracted from the document image.
 */
export const certificatoOcrResultSchema = z.object({
  tipo: z.enum(TIPI_CERTIFICATO).optional(),
  dataEmissione: z.string().optional(),
  dataScadenza: z.string().optional(),
  medicoNome: z.string().optional(),
  medicoStruttura: z.string().optional(),
  sport: z.string().optional(),
  idoneita: z.enum(["idoneo", "non_idoneo"]).optional(),
  nomePaziente: z.string().optional(),
  cognomePaziente: z.string().optional(),
  codiceFiscalePaziente: z.string().optional(),
  dataNascitaPaziente: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawText: z.string().optional(),
});

export type CreateCertificato = z.infer<typeof createCertificatoSchema>;
export type CertificatoOcrResult = z.infer<typeof certificatoOcrResultSchema>;
