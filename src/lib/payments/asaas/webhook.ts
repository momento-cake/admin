import type { PaymentMethod, WebhookEvent } from '../types';
import { normalizeAsaasStatus } from './normalize';

/**
 * Verify an Asaas webhook request by comparing the `asaas-access-token`
 * header against the configured token. Fails closed if no `expectedToken`
 * is configured — production must always have a token set.
 */
export function verifyAsaasToken(headers: Headers, expectedToken?: string): boolean {
  if (!expectedToken) return false;
  const got = headers.get('asaas-access-token');
  return got === expectedToken;
}

interface AsaasWebhookPayload {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    value?: number;
    externalReference?: string;
    billingType?: string;
    paymentDate?: string;
  };
}

const EVENT_TYPE_MAP: Record<string, WebhookEvent['type']> = {
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
};

function mapBillingType(billingType?: string): PaymentMethod | undefined {
  if (billingType === 'PIX') return 'PIX';
  if (billingType === 'CREDIT_CARD') return 'CARTAO_CREDITO';
  return undefined;
}

/**
 * Parse and authenticate an Asaas webhook payload.
 * - Returns `null` when the token is missing/invalid or the body is malformed.
 * - Builds a stable idempotency `id` of `${event}:${payment.id}` since Asaas
 *   does not guarantee a unique webhook event id per delivery.
 */
export function parseAsaasWebhook(
  rawBody: string,
  headers: Headers,
  expectedToken?: string,
): WebhookEvent | null {
  if (!verifyAsaasToken(headers, expectedToken)) return null;

  let parsed: AsaasWebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as AsaasWebhookPayload;
  } catch {
    return null;
  }

  const eventName = parsed?.event;
  const payment = parsed?.payment;
  if (!eventName || !payment?.id) return null;

  const type = EVENT_TYPE_MAP[eventName] ?? 'OTHER';

  const event: WebhookEvent = {
    id: `${eventName}:${payment.id}`,
    type,
    chargeId: payment.id,
    externalReference: payment.externalReference,
    status: normalizeAsaasStatus(payment.status),
    amount: typeof payment.value === 'number' ? payment.value : 0,
    paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : undefined,
    paymentMethod: mapBillingType(payment.billingType),
  };

  return event;
}
