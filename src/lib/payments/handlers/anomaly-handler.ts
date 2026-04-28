import type { Handler } from './types';
import type { AsaasEventType } from '@/lib/payments/types';

/**
 * The Asaas event names this handler is responsible for. The dispatcher uses
 * this set to route events to `handleAnomaly`. Keep in sync with the actual
 * cases the implementation covers.
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
 * Handler for operational-signal events that aren't pure money flow:
 *   - Chargeback lifecycle (REQUESTED, DISPUTE, AWAITING_REVERSAL)
 *   - Card pipeline failures (REPROVED_BY_RISK, CAPTURE_REFUSED)
 *   - Charge lifecycle (DELETED, RESTORED)
 *   - Cash-receipt undo
 *
 * STUB. The default behavior is to commit the session-status patch and return
 * `unhandled_status` so existing tests keep passing while Agent B implements
 * the real anomaly recording.
 *
 * Agent B: append a `PaymentAnomaly` to `pedido.paymentAnomalies`, optionally
 * clear `paymentSession` for PAYMENT_DELETED, optionally surface the anomaly
 * via the return value so the route can log it. See HandlerContext /
 * RecordChargeResult in ./types.ts.
 */
export const handleAnomaly: Handler = ({
  transaction,
  pedidoRef,
  event,
  sessionPatch,
}) => {
  transaction.update(pedidoRef, sessionPatch);
  return {
    kind: 'unhandled_status' as const,
    status: event.status,
  };
};
