import { timingSafeEqual } from 'node:crypto';
import type { PaymentMethod, WebhookEvent } from '../types';
import { normalizeAsaasStatus } from './normalize';

/**
 * Verify an Asaas webhook request by comparing the `asaas-access-token`
 * header against the configured token. Fails closed if no `expectedToken`
 * is configured — production must always have a token set.
 *
 * Uses `crypto.timingSafeEqual` so a network attacker cannot use response
 * timing to recover the token byte-by-byte. `timingSafeEqual` THROWS on
 * length mismatch, so we fast-fail when lengths differ before calling it.
 */
export function verifyAsaasToken(headers: Headers, expectedToken?: string): boolean {
  if (!expectedToken) return false;
  const got = headers.get('asaas-access-token');
  if (!got) return false;
  const a = Buffer.from(got, 'utf8');
  const b = Buffer.from(expectedToken, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
  // Lifecycle
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_DELETED: 'PAYMENT_DELETED',
  PAYMENT_RESTORED: 'PAYMENT_RESTORED',
  // Money landed
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_ANTICIPATED: 'PAYMENT_ANTICIPATED',
  // Card risk pipeline
  PAYMENT_AWAITING_RISK_ANALYSIS: 'PAYMENT_AWAITING_RISK_ANALYSIS',
  PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'PAYMENT_APPROVED_BY_RISK_ANALYSIS',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  // Negative / reversal
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_PARTIALLY_REFUNDED: 'PAYMENT_PARTIALLY_REFUNDED',
  PAYMENT_REFUND_IN_PROGRESS: 'PAYMENT_REFUND_IN_PROGRESS',
  PAYMENT_RECEIVED_IN_CASH_UNDONE: 'PAYMENT_RECEIVED_IN_CASH_UNDONE',
  // Chargebacks
  PAYMENT_CHARGEBACK_REQUESTED: 'PAYMENT_CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'PAYMENT_CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  // Collection
  PAYMENT_DUNNING_RECEIVED: 'PAYMENT_DUNNING_RECEIVED',
  PAYMENT_DUNNING_REQUESTED: 'PAYMENT_DUNNING_REQUESTED',
  // Splits
  PAYMENT_SPLIT_CANCELLED: 'PAYMENT_SPLIT_CANCELLED',
  PAYMENT_SPLIT_DIVERGENCE_BLOCK: 'PAYMENT_SPLIT_DIVERGENCE_BLOCK',
  PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED: 'PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED',
  // Analytics
  PAYMENT_CHECKOUT_VIEWED: 'PAYMENT_CHECKOUT_VIEWED',
  PAYMENT_BANK_SLIP_VIEWED: 'PAYMENT_BANK_SLIP_VIEWED',
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
