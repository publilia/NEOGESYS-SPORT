export {
  createTenantSchema,
  updateTenantSchema,
  tenantSettingsSchema,
} from "./tenant";
export type { CreateTenant, UpdateTenant, TenantSettings } from "./tenant";

export {
  createSocioSchema,
  updateSocioSchema,
  socioFilterSchema,
} from "./socio";
export type { CreateSocio, UpdateSocio, SocioFilter } from "./socio";

export {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  changeTenantSchema,
} from "./auth";
export type { Login, Register, ResetPassword, ChangeTenant } from "./auth";

export {
  createCertificatoSchema,
  certificatoOcrResultSchema,
} from "./certificato";
export type { CreateCertificato, CertificatoOcrResult } from "./certificato";

export {
  createCorsoSchema,
  updateCorsoSchema,
  registraPresenzaSchema,
} from "./corso";
export type { CreateCorso, UpdateCorso, RegistraPresenza } from "./corso";

export {
  createQuotaSchema,
  emettiQuotaSchema,
  registraPagamentoSchema,
} from "./quota";
export type { CreateQuota, EmettiQuota, RegistraPagamento } from "./quota";

export {
  createComunicazioneSchema,
  inviaEmailSchema,
} from "./comunicazione";
export type { CreateComunicazione, InviaEmail } from "./comunicazione";

export {
  configuraIntegrazioneSchema,
  stripeConfigSchema,
  resendConfigSchema,
  mailgunConfigSchema,
  whatsappConfigSchema,
  satispayConfigSchema,
  pagoPaConfigSchema,
  s3ConfigSchema,
  PROVIDERS,
  validateProviderCredentials,
} from "./integrazione";
export type {
  ConfiguraIntegrazione,
  Provider,
  StripeConfig,
  ResendConfig,
  MailgunConfig,
  WhatsappConfig,
  SatispayConfig,
  PagoPaConfig,
  S3Config,
} from "./integrazione";
