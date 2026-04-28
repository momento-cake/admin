import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  DocumentReference,
  Transaction,
} from 'firebase-admin/firestore';
import type { Pedido } from '@/types/pedido';
import type { WebhookEvent } from '@/lib/payments/types';
import { handleConfirmedPayment } from '@/lib/payments/handlers/confirmed-handler';
import { handleRefund } from '@/lib/payments/handlers/refund-handler';
import {
  ANOMALY_EVENT_TYPES,
  handleAnomaly,
} from '@/lib/payments/handlers/anomaly-handler';
import type { HandlerContext, RecordChargeResult } from '@/lib/payments/handlers/types';

export type { RecordChargeResult } from '@/lib/payments/handlers/types';

/**
 * Idempotently records an Asaas webhook event onto a pedido.
 *
 * The transaction body:
 *   1. Reads the pedido and short-circuits if the event id has already been
 *      processed (`processedWebhookEventIds`, capped at 50 most-recent ids).
 *   2. Builds a default session-state patch (status, lastWebhookAt,
 *      processedWebhookEventIds).
 *   3. Dispatches to a per-event handler:
 *        - Anomaly events (chargebacks, deletions, card declines after approval,
 *          etc.)                                       → handleAnomaly
 *        - Refund-class status (REFUNDED, PARTIALLY_REFUNDED, etc.) →
 *          handleRefund
 *        - CONFIRMED status                            → handleConfirmedPayment
 *        - Anything else                               → default: commit session
 *          patch only and return `unhandled_status`.
 *
 * Each handler runs inside the same Firestore transaction the dispatcher
 * opened, so all writes commit atomically.
 *
 * Both the webhook route AND the immediate-confirmation path used by card
 * charges call this helper, so the rules live in exactly one place.
 */
export async function recordChargeConfirmation(
  pedidoRef: DocumentReference,
  event: WebhookEvent,
): Promise<RecordChargeResult> {
  return adminDb.runTransaction(async (transaction: Transaction) => {
    const snap = await transaction.get(pedidoRef);
    if (!snap.exists) return { kind: 'not_found' as const };

    const data = snap.data() as Pedido & Record<string, unknown>;
    const session = (data.paymentSession ?? null) as
      | (Pedido['paymentSession'] & {
          processedWebhookEventIds?: string[];
        })
      | null;

    const processed = Array.isArray(session?.processedWebhookEventIds)
      ? (session!.processedWebhookEventIds as string[])
      : [];
    if (processed.includes(event.id)) {
      return { kind: 'idempotent' as const, eventId: event.id };
    }

    const nextProcessed = [...processed, event.id].slice(-50);
    const sessionPatch: Record<string, unknown> = {
      'paymentSession.status': event.status,
      'paymentSession.lastWebhookAt': FieldValue.serverTimestamp(),
      'paymentSession.processedWebhookEventIds': nextProcessed,
    };

    const ctx: HandlerContext = {
      transaction,
      pedidoRef,
      snap,
      data,
      event,
      sessionPatch,
    };

    // 1) Operational anomalies — chargebacks, deletions, card declines, etc.
    if (ANOMALY_EVENT_TYPES.has(event.type)) {
      return handleAnomaly(ctx);
    }

    // 2) Refund-class events — full or partial refund, refund-in-progress.
    if (
      event.status === 'REFUNDED' ||
      event.status === 'PARTIALLY_REFUNDED' ||
      event.type === 'PAYMENT_PARTIALLY_REFUNDED' ||
      event.type === 'PAYMENT_REFUND_IN_PROGRESS'
    ) {
      return handleRefund(ctx);
    }

    // 3) Money landed.
    if (event.status === 'CONFIRMED') {
      return handleConfirmedPayment(ctx);
    }

    // Default: commit session-state update + log unhandled.
    transaction.update(pedidoRef, sessionPatch);
    console.warn('[asaas-webhook] status_mismatch', {
      pedidoId: pedidoRef.id,
      currentStatus: data.status,
      eventId: event.id,
      eventType: event.type,
    });
    return {
      kind: 'unhandled_status' as const,
      status: event.status,
    };
  });
}
