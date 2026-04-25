import type { PaymentProvider } from '../provider';
import type {
  BillingInfo,
  CardChargeResult,
  CardPaymentInput,
  ChargeRequest,
  NormalizedChargeStatus,
  PixChargeResult,
  WebhookEvent,
} from '../types';
import { createAsaasClient } from './client';
import { ensureCustomer } from './customer';
import { createCardCharge, createPixCharge, getChargeStatus } from './charge';
import { parseAsaasWebhook } from './webhook';

export interface AsaasProviderConfig {
  apiKey: string;
  baseUrl: string;
  webhookToken?: string;
}

/**
 * Build a {@link PaymentProvider} backed by the Asaas v3 REST API.
 */
export function createAsaasProvider(config: AsaasProviderConfig): PaymentProvider {
  const client = createAsaasClient({ apiKey: config.apiKey, baseUrl: config.baseUrl });

  return {
    name: 'asaas',
    ensureCustomer(billing: BillingInfo) {
      return ensureCustomer(client, billing);
    },
    createPixCharge(req: ChargeRequest): Promise<PixChargeResult> {
      return createPixCharge(client, req);
    },
    createCardCharge(
      req: ChargeRequest,
      card: CardPaymentInput,
      holder: BillingInfo,
    ): Promise<CardChargeResult> {
      return createCardCharge(client, req, card, holder);
    },
    getChargeStatus(chargeId: string): Promise<NormalizedChargeStatus> {
      return getChargeStatus(client, chargeId);
    },
    parseWebhook(rawBody: string, headers: Headers): WebhookEvent | null {
      return parseAsaasWebhook(rawBody, headers, config.webhookToken);
    },
  };
}
