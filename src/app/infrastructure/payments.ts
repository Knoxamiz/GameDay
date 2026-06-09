import type { RepositoryActor } from "./repositories";

export type PaymentProviderId = "stripe";

export type PaymentCheckoutRequest = {
  amountCents: number;
  athleteId: string;
  cancelUrl: string;
  currency: "usd";
  organizationId: string;
  parentId: string;
  paymentRequirementId: string;
  registrationId: string;
  successUrl: string;
  teamId: string;
};

export type PaymentProviderMetadata = {
  athleteId: string;
  organizationId: string;
  parentId: string;
  paymentRequirementId: string;
  registrationId: string;
  teamId: string;
};

export type PaymentCheckoutSession = {
  expiresAt?: string;
  provider: PaymentProviderId;
  providerSessionId: string;
  url: string;
};

export type PaymentWebhookEvent = {
  metadata: PaymentProviderMetadata;
  provider: PaymentProviderId;
  providerEventId: string;
  providerPaymentId?: string;
  status: "failed" | "paid" | "refunded" | "requires_action";
};

export interface PaymentProvider {
  createCheckoutSession(
    request: PaymentCheckoutRequest,
    actor: RepositoryActor,
  ): Promise<PaymentCheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): Promise<PaymentWebhookEvent>;
}

export function buildPaymentMetadata(
  request: PaymentCheckoutRequest,
): PaymentProviderMetadata {
  return {
    athleteId: request.athleteId,
    organizationId: request.organizationId,
    parentId: request.parentId,
    paymentRequirementId: request.paymentRequirementId,
    registrationId: request.registrationId,
    teamId: request.teamId,
  };
}

export function dollarsToCents(amount: number) {
  return Math.round(amount * 100);
}
