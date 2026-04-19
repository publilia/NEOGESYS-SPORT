import { ServerClient } from "postmark";
import type { EmailBatchResult, EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class PostmarkProvider implements EmailProvider {
	private readonly client: ServerClient;
	private readonly defaultFrom: string;

	constructor(serverToken: string, defaultFrom: string) {
		this.client = new ServerClient(serverToken);
		this.defaultFrom = defaultFrom;
	}

	async send(
		to: string | string[],
		subject: string,
		html: string,
		from?: string,
	): Promise<EmailSendResult> {
		const recipients = Array.isArray(to) ? to.join(",") : to;

		const result = await this.client.sendEmail({
			From: from ?? this.defaultFrom,
			To: recipients,
			Subject: subject,
			HtmlBody: html,
			MessageStream: "outbound",
		});

		return {
			id: result.MessageID,
			status: result.ErrorCode === 0 ? "sent" : "error",
		};
	}

	async sendBatch(messages: EmailMessage[]): Promise<EmailBatchResult> {
		const postmarkMessages = messages.map((msg) => ({
			From: msg.from ?? this.defaultFrom,
			To: Array.isArray(msg.to) ? msg.to.join(",") : msg.to,
			Subject: msg.subject,
			HtmlBody: msg.html,
			MessageStream: "outbound" as const,
		}));

		const results = await this.client.sendEmailBatch(postmarkMessages);

		return {
			results: results.map((r) => ({
				id: r.MessageID,
				status: r.ErrorCode === 0 ? "sent" : "error",
				error: r.ErrorCode !== 0 ? r.Message : undefined,
			})),
		};
	}
}
