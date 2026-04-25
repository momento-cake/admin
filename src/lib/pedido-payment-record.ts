import { adminDb } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type {
  DocumentReference,
  Transaction,
} from 'firebase-admin/firestore';
import {
  calcularTotalPedido,
  resolvePaymentFields,
  roundCurrency,
  sumPagamentos,
} from '@/lib/payment-logic';
import type { Pagamento, Pedido } from '@/types/pedido';
import type { WebhookEvent } from '@/lib/payments/types';

/**
 * Result of recording a charge confirmation against a pedido.
 *
 * The route layer maps this to an HTTP response. Tests can also assert directly
 * against the discriminated union.
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
    };

/**
 * Idempotently records a webhook charge event onto a pedido.
 *
 * The behavior is:
 *   1. CONFIRMED  → append a Pagamento, recompute totals via `resolvePaymentFields`,
 *                   and (if fully paid) flip a pedido in `AGUARDANDO_PAGAMENTO`
 *                   to `CONFIRMADO`.
 *   2. Any other status (FAILED, EXPIRED, REFUNDED, PENDING) → only update the
 *                   `paymentSession.status` so the customer's polling endpoint
 *                   reflects the new state. We don't touch `pagamentos`.
 *
 * Idempotency is provided by `paymentSession.processedWebhookEventIds`: if the
 * event id has already been processed, we no-op. The list is capped at the most
 * recent 50 ids.
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

    // Always update the session state — even non-CONFIRMED events should
    // flip the visible status (e.g. PENDING → EXPIRED) so customers see it.
    const nextProcessed = [...processed, event.id].slice(-50);
    const sessionPatch: Record<string, unknown> = {
      'paymentSession.status': event.status,
      'paymentSession.lastWebhookAt': FieldValue.serverTimestamp(),
      'paymentSession.processedWebhookEventIds': nextProcessed,
    };

    if (event.status !== 'CONFIRMED') {
      transaction.update(pedidoRef, sessionPatch);
      return {
        kind: 'unhandled_status' as const,
        status: event.status,
      };
    }

    // CONFIRMED → append a Pagamento and recompute the pedido's payment fields.
    const partialPedido = {
      id: pedidoRef.id,
      orcamentos: data.orcamentos || [],
      entrega: data.entrega,
    } as Pedido;
    const total = calcularTotalPedido(partialPedido);

    const existingPagamentos: Pagamento[] = Array.isArray(data.pagamentos)
      ? (data.pagamentos as Pagamento[])
      : [];

    const paymentDate = event.paymentDate ?? new Date();
    const now = Timestamp.now();
    const pagamentoId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `asaas-${event.id}`;

    const pagamento: Pagamento = {
      id: pagamentoId,
      data: Timestamp.fromDate(paymentDate) as unknown as Pagamento['data'],
      valor: roundCurrency(event.amount),
      metodo: event.paymentMethod || 'PIX',
      observacao: 'Pagamento online',
      comprovanteUrl: null,
      comprovantePath: null,
      comprovanteTipo: null,
      createdAt: now as unknown as Pagamento['createdAt'],
      createdBy: 'asaas-webhook',
    };

    const updatedPagamentos = [...existingPagamentos, pagamento];
    const totalPago = sumPagamentos(updatedPagamentos);

    const resolved = resolvePaymentFields({
      pagamentos: updatedPagamentos,
      totalPago,
      dataVencimento: data.dataVencimento as unknown as Timestamp,
      dataEntrega: data.dataEntrega as unknown as Timestamp,
      createdAt: data.createdAt as unknown as Timestamp,
      total,
    });

    const dataVencimentoWrite =
      (data.dataVencimento as unknown as Timestamp | undefined) ??
      Timestamp.fromDate(resolved.dataVencimentoDate);

    const updatePayload: Record<string, unknown> = {
      ...sessionPatch,
      pagamentos: updatedPagamentos,
      totalPago,
      statusPagamento: resolved.statusPagamento,
      dataVencimento: dataVencimentoWrite,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: 'asaas-webhook',
    };

    const transitionedToConfirmado =
      resolved.statusPagamento === 'PAGO' &&
      data.status === 'AGUARDANDO_PAGAMENTO';
    if (transitionedToConfirmado) {
      updatePayload.status = 'CONFIRMADO';
    }

    transaction.update(pedidoRef, updatePayload);

    return {
      kind: 'recorded' as const,
      eventId: event.id,
      pagamentoId,
      totalPago,
      statusPagamento: resolved.statusPagamento,
      transitionedToConfirmado,
    };
  });
}
