export type {
	EmailProvider,
	EmailMessage,
	EmailSendResult,
	EmailBatchResult,
	EmailProviderType,
} from "./types";
export { getEmailProvider } from "./factory";
export { ResendProvider } from "./resend";
export { PostmarkProvider } from "./postmark";
export { SMTPProvider, type SMTPConfig } from "./smtp";
