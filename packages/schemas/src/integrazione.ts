import { z } from "zod";

/**
 * Stripe integration configuration schema.
 */
export const stripeConfigSchema = z.object({
  secretKey: z.string().min(1, "Stripe secret key obbligatoria"),
  publishableKey: z.string().min(1, "Stripe publishable key obbligatoria"),
  webhookSecret: z.string().optional(),
  accountId: z.string().optional(), // for Connect
});

/**
 * Resend (email) integration configuration schema.
 */
export const resendConfigSchema = z.object({
  apiKey: z.string().min(1, "Resend API key obbligatoria"),
  fromEmail: z.string().email("Email mittente non valida"),
  fromName: z.string().default("NeoGesys Sport"),
  replyTo: z.string().email().optional(),
});

/**
 * Mailgun integration configuration schema.
 */
export const mailgunConfigSchema = z.object({
  apiKey: z.string().min(1, "Mailgun API key obbligatoria"),
  domain: z.string().min(1, "Dominio Mailgun obbligatorio"),
  fromEmail: z.string().email("Email mittente non valida"),
  fromName: z.string().default("NeoGesys Sport"),
  region: z.enum(["eu", "us"]).default("eu"),
});

/**
 * WhatsApp Business integration configuration schema.
 */
export const whatsappConfigSchema = z.object({
  accessToken: z.string().min(1, "WhatsApp access token obbligatorio"),
  phoneNumberId: z.string().min(1, "Phone number ID obbligatorio"),
  businessAccountId: z.string().optional(),
  webhookVerifyToken: z.string().optional(),
});

/**
 * Satispay integration configuration schema.
 */
export const satispayConfigSchema = z.object({
  keyId: z.string().min(1, "Satispay key ID obbligatorio"),
  privateKey: z.string().min(1, "Satispay private key obbligatoria"),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

/**
 * PagoPA integration configuration schema.
 */
export const pagoPaConfigSchema = z.object({
  apiKey: z.string().min(1, "PagoPA API key obbligatoria"),
  fiscalCode: z.string().min(1, "Codice fiscale ente obbligatorio"),
  stationId: z.string().optional(),
  environment: z.enum(["test", "production"]).default("test"),
});

/**
 * S3-compatible storage integration configuration schema.
 */
export const s3ConfigSchema = z.object({
  accessKeyId: z.string().min(1, "Access key ID obbligatorio"),
  secretAccessKey: z.string().min(1, "Secret access key obbligatoria"),
  bucket: z.string().min(1, "Bucket obbligatorio"),
  region: z.string().default("eu-west-1"),
  endpoint: z.string().url().optional(), // for MinIO, R2, etc.
});

/**
 * Supported providers.
 */
export const PROVIDERS = [
  "stripe",
  "resend",
  "mailgun",
  "whatsapp",
  "satispay",
  "pagopa",
  "s3",
] as const;

export type Provider = (typeof PROVIDERS)[number];

/**
 * Map of provider to their configuration schema.
 */
const providerSchemas: Record<string, z.ZodType> = {
  stripe: stripeConfigSchema,
  resend: resendConfigSchema,
  mailgun: mailgunConfigSchema,
  whatsapp: whatsappConfigSchema,
  satispay: satispayConfigSchema,
  pagopa: pagoPaConfigSchema,
  s3: s3ConfigSchema,
};

/**
 * Schema for configuring an integration.
 * Validates provider-specific credentials based on the selected provider.
 */
export const configuraIntegrazioneSchema = z.object({
  provider: z.enum(PROVIDERS, {
    errorMap: () => ({
      message: `Provider deve essere uno tra: ${PROVIDERS.join(", ")}`,
    }),
  }),
  tipo: z.enum(["pagamento", "comunicazione", "storage", "federazione"], {
    errorMap: () => ({
      message: "Tipo deve essere: pagamento, comunicazione, storage o federazione",
    }),
  }),
  credenziali: z.record(z.string()),
  configurazione: z.record(z.unknown()).optional(),
  attivo: z.boolean().default(true),
});

/**
 * Validate credentials against the provider-specific schema.
 * Returns the validated credentials or throws a ZodError.
 */
export function validateProviderCredentials(
  provider: string,
  credentials: Record<string, string>,
): Record<string, string> {
  const schema = providerSchemas[provider];
  if (!schema) {
    throw new Error(`Provider sconosciuto: ${provider}`);
  }
  return schema.parse(credentials) as Record<string, string>;
}

export type ConfiguraIntegrazione = z.infer<typeof configuraIntegrazioneSchema>;
export type StripeConfig = z.infer<typeof stripeConfigSchema>;
export type ResendConfig = z.infer<typeof resendConfigSchema>;
export type MailgunConfig = z.infer<typeof mailgunConfigSchema>;
export type WhatsappConfig = z.infer<typeof whatsappConfigSchema>;
export type SatispayConfig = z.infer<typeof satispayConfigSchema>;
export type PagoPaConfig = z.infer<typeof pagoPaConfigSchema>;
export type S3Config = z.infer<typeof s3ConfigSchema>;
