import Stripe from "stripe";
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutResult,
  PaymentStatus,
  RefundParams,
  RefundResult,
} from "./types";

export class StripeProvider implements PaymentProvider {
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.client = new Stripe(secretKey, {
      apiVersion: "2025-03-31.basil",
      typescript: true,
    });
    this.webhookSecret = webhookSecret;
  }

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult> {
    const session = await this.client.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: params.descrizione,
            },
            unit_amount: Math.round(params.importo * 100), // Stripe expects cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        socioId: params.socioId,
        quotaId: params.quotaId,
        ...params.metadata,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url ?? "",
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const paymentIntent = await this.client.paymentIntents.retrieve(paymentId);

    const statusMap: Record<string, PaymentStatus["status"]> = {
      succeeded: "completed",
      processing: "pending",
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending",
      canceled: "failed",
    };

    return {
      id: paymentIntent.id,
      status: statusMap[paymentIntent.status] ?? "pending",
      importoPagato: paymentIntent.amount_received / 100,
      metodoPagamento:
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : "stripe",
      dataCompletamento:
        paymentIntent.status === "succeeded" && paymentIntent.created
          ? new Date(paymentIntent.created * 1000)
          : undefined,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const refund = await this.client.refunds.create({
      payment_intent: params.paymentId,
      amount: params.importo ? Math.round(params.importo * 100) : undefined,
      reason: "requested_by_customer",
    });

    return {
      id: refund.id,
      status: refund.status ?? "pending",
      importo: (refund.amount ?? 0) / 100,
    };
  }

  async verifyWebhook(
    payload: string | Buffer,
    signature: string,
  ): Promise<{ type: string; data: Record<string, unknown> }> {
    const event = this.client.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );

    return {
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
    };
  }
}
