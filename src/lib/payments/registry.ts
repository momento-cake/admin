import type { PaymentProvider } from './provider';
import type { PaymentProviderName } from './types';
import { createAsaasProvider } from './asaas';

let cached: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  const name = (process.env.PAYMENT_PROVIDER || 'asaas') as PaymentProviderName;

  switch (name) {
    case 'asaas': {
      const apiKey = process.env.ASAAS_API_KEY;
      const baseUrl = process.env.ASAAS_BASE_URL || 'https://api-sandbox.asaas.com/v3';
      const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
      if (!apiKey) {
        throw new Error('ASAAS_API_KEY is not configured');
      }
      // Production must always have a webhook token: without it the webhook
      // verifier fails closed and Asaas can never reconcile payments. In dev
      // and test the token is optional so contributors can run locally.
      if (process.env.NODE_ENV === 'production' && !webhookToken) {
        throw new Error('ASAAS_WEBHOOK_TOKEN is required in production');
      }
      cached = createAsaasProvider({ apiKey, baseUrl, webhookToken });
      return cached;
    }
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}

export function resetPaymentProviderForTesting() {
  cached = null;
}

