export interface CreateCheckoutParams {
  socioId: string;
  quotaId: string;
  importo: number;
  descrizione: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export interface CheckoutResult {
  sessionId: string;
  url: string;
}

export interface PaymentStatus {
  id: string;
  status: "pending" | "completed" | "failed" | "refunded";
  importoPagato: number;
  metodoPagamento: string;
  dataCompletamento?: Date;
}

export interface RefundParams {
  paymentId: string;
  importo?: number; // partial refund if provided
  motivo?: string;
}

export interface RefundResult {
  id: string;
  status: string;
  importo: number;
}

export interface PaymentProvider {
  /**
   * Create a checkout session for a payment.
   */
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutResult>;

  /**
   * Get payment status by external payment ID.
   */
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  /**
   * Process a refund.
   */
  refund(params: RefundParams): Promise<RefundResult>;

  /**
   * Verify a webhook signature and parse the event.
   */
  verifyWebhook(
    payload: string | Buffer,
    signature: string,
  ): Promise<{ type: string; data: Record<string, unknown> }>;
}

export type PaymentProviderType = "stripe" | "satispay";
