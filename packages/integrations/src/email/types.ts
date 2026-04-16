export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailSendResult {
  id: string;
  status: string;
}

export interface EmailBatchResult {
  results: Array<{
    id: string;
    status: string;
    error?: string;
  }>;
}

export interface EmailProvider {
  /**
   * Send a single email.
   */
  send(
    to: string | string[],
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult>;

  /**
   * Send multiple emails in a batch.
   */
  sendBatch(messages: EmailMessage[]): Promise<EmailBatchResult>;
}

export type EmailProviderType = "resend" | "ses" | "postmark" | "smtp";
