import type {
  DocumentReference,
  DocumentSnapshot,
  Transaction,
} from 'firebase-admin/firestore';
import type { Pedido } from '@/types/pedido';
import type { WebhookEvent } from '@/lib/payments/types';

/**
 * Result returned by `recordChargeConfirmation` (and by individual handlers
 * when they short-circuit early). The route layer maps this to an HTTP
 * response.
 */
export type RecordChargeResult =
  | { kind: 'idempotent'; eventId: string }
  | { kind: 'not_found' }
  | { kind: 'unhandled_status'; status: WebhookEvent['status'] }
  | {
      kind: 'recorded';
      eventId: string;
      pagamentoId: string;
      totalPago: number;
      statusPagamento: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'VENCIDO';
      transitionedToConfirmado: boolean;
    }
  | {
      kind: 'refund_recorded';
      eventId: string;
      pagamentoId: string;
      refundAmount: number;
      totalPago: number;
      statusPagamento: 'PAGO' | 'PARCIAL' | 'PENDENTE' | 'VENCIDO';
      revertedToAguardandoPagamento: boolean;
    }
  | {
      kind: 'anomaly_recorded';
      eventId: string;
      anomalyId: string;
      kind_: 'CHARGEBACK_REQUESTED' | 'CHARGEBACK_DISPUTE' | 'CHARGEBACK_REVERSAL_AWAITING' | 'CARD_REPROVED_BY_RISK' | 'CARD_CAPTURE_REFUSED' | 'CHARGE_DELETED' | 'CHARGE_RESTORED' | 'CASH_RECEIPT_UNDONE';
    };

/**
 * Context passed to every handler. The `sessionPatch` already carries the
 * status / lastWebhookAt / processedWebhookEventIds updates, so a handler
 * that only wants to update session state can just commit it as-is.
 */
export interface HandlerContext {
  transaction: Transaction;
  pedidoRef: DocumentReference;
  snap: DocumentSnapshot;
  data: Pedido & Record<string, unknown>;
  event: WebhookEvent;
  /** Pre-populated session-update patch (status, lastWebhookAt, processedWebhookEventIds). */
  sessionPatch: Record<string, unknown>;
}

export type Handler = (ctx: HandlerContext) => Promise<RecordChargeResult> | RecordChargeResult;
