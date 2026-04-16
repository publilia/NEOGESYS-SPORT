import { createTransport, type Transporter } from "nodemailer";
import type {
  EmailProvider,
  EmailMessage,
  EmailSendResult,
  EmailBatchResult,
} from "./types";

export interface SMTPConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  secure?: string;
  defaultFrom: string;
}

export class SMTPProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;

  constructor(config: SMTPConfig) {
    this.defaultFrom = config.defaultFrom;
    this.transporter = createTransport({
      host: config.host,
      port: Number(config.port),
      secure: config.secure === "true",
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async send(
    to: string | string[],
    subject: string,
    html: string,
    from?: string,
  ): Promise<EmailSendResult> {
    const recipients = Array.isArray(to) ? to.join(",") : to;

    const info = await this.transporter.sendMail({
      from: from ?? this.defaultFrom,
      to: recipients,
      subject,
      html,
    });

    return {
      id: info.messageId ?? "unknown",
      status: "sent",
    };
  }

  async sendBatch(messages: EmailMessage[]): Promise<EmailBatchResult> {
    const results = await Promise.allSettled(
      messages.map(async (msg) => {
        const info = await this.transporter.sendMail({
          from: msg.from ?? this.defaultFrom,
          to: Array.isArray(msg.to) ? msg.to.join(",") : msg.to,
          subject: msg.subject,
          html: msg.html,
        });
        return info;
      }),
    );

    return {
      results: results.map((r) => {
        if (r.status === "fulfilled") {
          return {
            id: r.value.messageId ?? "unknown",
            status: "sent",
          };
        }
        return {
          id: "unknown",
          status: "error",
          error: r.reason instanceof Error ? r.reason.message : "Unknown error",
        };
      }),
    };
  }
}
