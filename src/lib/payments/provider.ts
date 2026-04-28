import type {
  BillingInfo,
  CardChargeResult,
  CardPaymentInput,
  ChargeRequest,
  NormalizedChargeStatus,
  PaymentProviderName,
  PixChargeResult,
  WebhookEvent,
} from './types';

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  ensureCustomer(billing: BillingInfo): Promise<{ providerCustomerId: string }>;

  createPixCharge(req: ChargeRequest): Promise<PixChargeResult>;

  createCardCharge(
    req: ChargeRequest,
    card: CardPaymentInput,
    holder: BillingInfo,
  ): Promise<CardChargeResult>;

  getChargeStatus(chargeId: string): Promise<NormalizedChargeStatus>;

  parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null;
}
