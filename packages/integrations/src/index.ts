// Email
export type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
  EmailBatchResult,
  EmailProviderType,
} from "./email/types";
export { getEmailProvider } from "./email/factory";

// Payment
export type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutResult,
  PaymentStatus,
  RefundParams,
  RefundResult,
  PaymentProviderType,
} from "./payment/types";
export { getPaymentProvider } from "./payment/factory";

// SDI (Fatturazione Elettronica)
export type {
  SDIProvider,
  FatturaElettronica,
  SDISendResult,
  SDIStatusResult,
  SDIProviderType,
} from "./sdi/types";
export { getSDIProvider } from "./sdi/factory";

// SMS
export type {
  SMSProvider,
  SMSMessage,
  SMSSendResult,
  SMSBatchResult,
  SMSProviderType,
} from "./sms/types";
export { getSMSProvider } from "./sms/factory";
