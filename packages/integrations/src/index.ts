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

// Calendar (unified)
export type {
	CalendarProvider,
	CalendarProviderType,
	UnifiedCalendar,
	UnifiedCalendarEvent,
	UnifiedCalendarEventList,
	UnifiedCalendarList,
	CreateUnifiedEvent,
	SyncInfo,
} from "./calendar/types";
export { getCalendarProvider } from "./calendar/factory";
export { CalendarSyncService } from "./calendar/sync-service";

// Storage (unified)
export type {
	CloudStorageProvider,
	StorageProviderType,
	UnifiedFile,
	UnifiedFileList,
	StorageQuota,
	ShareResult,
} from "./storage/types";
export { getStorageProvider } from "./storage/factory";
export { LocalStorageProvider } from "./storage/local";
