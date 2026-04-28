import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  PAYMENT_ANOMALY_LABELS,
  type PaymentAnomaly,
  type PaymentAnomalyKind,
} from '@/types/pedido';
import type { AsaasEventType } from '@/lib/payments/types';
import type { Handler, RecordChargeResult } from './types';

/**
 * The Asaas event names this handler is responsible for. The dispatcher uses
 * this set to route events to `handleAnomaly`. Keep in sync with the actual
 * cases the implementation covers (see `ANOMALY_KIND_BY_EVENT` below).
 */
export const ANOMALY_EVENT_TYPES: ReadonlySet<AsaasEventType> = new Set<AsaasEventType>([
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
  'PAYMENT_AWAITING_CHARGEBACK_REVERSAL',
  'PAYMENT_REPROVED_BY_RISK_ANALYSIS',
  'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_RECEIVED_IN_CASH_UNDONE',
]);

/**
 * Asaas event → PaymentAnomaly.kind map. Every entry in `ANOMALY_EVENT_TYPES`
 * MUST be present here; anything not listed falls through to `unhandled_status`.
 */
const ANOMALY_KIND_BY_EVENT: Partial<Record<AsaasEventType, PaymentAnomalyKind>> = {
  PAYMENT_DELETED: 'CHARGE_DELETED',
  PAYMENT_RESTORED: 'CHARGE_RESTORED',
  PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
  PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
  PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'CHARGEBACK_REVERSAL_AWAITING',
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'CARD_REPROVED_BY_RISK',
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'CARD_CAPTURE_REFUSED',
  PAYMENT_RECEIVED_IN_CASH_UNDONE: 'CASH_RECEIPT_UNDONE',
};

/**
 * Handler for operational-signal events that aren't pure money flow:
 *   - Chargeback lifecycle (REQUESTED, DISPUTE, AWAITING_REVERSAL)
 *   - Card pipeline failures (REPROVED_BY_RISK, CAPTURE_REFUSED)
 *   - Charge lifecycle (DELETED, RESTORED)
 *   - Cash-receipt undo
 *
 * Behavior:
 *   - Append a `PaymentAnomaly` to `pedido.paymentAnomalies` (creating the
 *     array if missing). Each event becomes its own row — deduplication is the
 *     dispatcher's job (`processedWebhookEventIds` already filters replays).
 *   - For `PAYMENT_DELETED` only: also clear `paymentSession.chargeId` via
 *     `FieldValue.delete()`. We picked the chargeId-clear approach over wiping
 *     the whole `paymentSession` because:
 *       1. Idempotency tracking (`processedWebhookEventIds`) survives, so a
 *          replayed PAYMENT_DELETED stays a no-op.
 *       2. Customer polling can already detect a dead session by reading
 *          `paymentSession.status === 'DELETED'` (the dispatcher's pre-built
 *          `sessionPatch` writes that status), and the absence of `chargeId`
 *          is an unambiguous "no live charge" signal.
 *       3. The dispatcher's dotted-path `sessionPatch` and a top-level
 *          `paymentSession: null` would conflict in a single Firestore update.
 *   - Status transitions: NONE. These events are observability for ops; the
 *     pedido-status side stays as-is. Refunds (real money flow back) go
 *     through `handleRefund`.
 *
 * Idempotency is handled upstream by the dispatcher's
 * `processedWebhookEventIds` check; this handler just does the recording.
 */
export const handleAnomaly: Handler = ({
  transaction,
  pedidoRef,
  data,
  event,
  sessionPatch,
}): RecordChargeResult => {
  const kind = ANOMALY_KIND_BY_EVENT[event.type];
  if (!kind) {
    // Defensive fall-through — keeps the contract that every event the
    // dispatcher routes here gets at least the session-state patch committed.
    transaction.update(pedidoRef, sessionPatch);
    return {
      kind: 'unhandled_status' as const,
      status: event.status,
    };
  }

  const existing: PaymentAnomaly[] = Array.isArray(data.paymentAnomalies)
    ? (data.paymentAnomalies as PaymentAnomaly[])
    : [];

  const anomalyId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `anom-${event.id}`;
  const now = Timestamp.now();

  // Asaas sends `amount: 0` (or omits it) for events that have no monetary
  // dimension — chargeback lifecycle hops, restorations, etc. Don't store a
  // bogus zero on the anomaly.
  const amount =
    typeof event.amount === 'number' && event.amount > 0
      ? event.amount
      : undefined;

  const anomaly: PaymentAnomaly = {
    id: anomalyId,
    kind,
    sourceEvent: event.type,
    chargeId: event.chargeId,
    ...(amount !== undefined ? { amount } : {}),
    message: PAYMENT_ANOMALY_LABELS[kind],
    recordedAt: now as unknown as PaymentAnomaly['recordedAt'],
  };

  const nextAnomalies = [...existing, anomaly];

  const updatePayload: Record<string, unknown> = {
    ...sessionPatch,
    paymentAnomalies: nextAnomalies,
    updatedAt: FieldValue.serverTimestamp(),
    lastModifiedBy: 'asaas-webhook',
  };

  if (event.type === 'PAYMENT_DELETED') {
    updatePayload['paymentSession.chargeId'] = FieldValue.delete();
  }

  transaction.update(pedidoRef, updatePayload);

  return {
    kind: 'anomaly_recorded' as const,
    eventId: event.id,
    anomalyId,
    kind_: kind,
  };
};
