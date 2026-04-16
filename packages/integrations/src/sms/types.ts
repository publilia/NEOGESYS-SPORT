export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface SMSSendResult {
  id: string;
  status: string;
}

export interface SMSBatchResult {
  results: Array<{
    id: string;
    status: string;
    error?: string;
  }>;
}

export interface SMSProvider {
  /**
   * Send a single SMS.
   */
  send(to: string, body: string, from?: string): Promise<SMSSendResult>;

  /**
   * Send multiple SMS messages in a batch.
   */
  sendBatch(messages: SMSMessage[]): Promise<SMSBatchResult>;

  /**
   * Check remaining SMS credits / balance (if supported).
   */
  getBalance?(): Promise<{ credits: number; currency?: string }>;
}

export type SMSProviderType = "twilio" | "vonage" | "skebby";
