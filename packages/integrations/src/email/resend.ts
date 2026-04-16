import { Resend } from "resend";
import type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
  EmailBatchResult,
} from "./types";

export class ResendProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult> {
    const { data, error } = await this.client.emails.send({
      from: from ?? this.defaultFrom,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return {
      id: data?.id ?? "unknown",
      status: "sent",
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailBatchResult> {
    const { data, error } = await this.client.batch.send(
      messages.map((msg) => ({
        from: msg.from ?? this.defaultFrom,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
      })),
    );

    if (error) {
      throw new Error(`Resend batch error: ${error.message}`);
    }

    return {
      results: (data?.data ?? []).map((item) => ({
        id: item.id,
        status: "sent",
      })),
    };
  }
}
