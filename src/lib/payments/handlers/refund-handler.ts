import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  calcularTotalPedido,
  resolvePaymentFields,
  roundCurrency,
  sumPagamentos,
} from '@/lib/payment-logic';
import type { Pagamento, Pedido } from '@/types/pedido';
import type { Handler, RecordChargeResult } from './types';

/**
 * Handler for refund-class events:
 *   - PAYMENT_REFUNDED            (full refund — event.status === 'REFUNDED')
 *   - PAYMENT_PARTIALLY_REFUNDED  (partial refund — event.amount carries the
 *                                  refunded portion)
 *   - PAYMENT_REFUND_IN_PROGRESS  (Asaas hasn't actually moved the money yet —
 *                                  observability only, no Pagamento appended)
 *
 * NOTE: PAYMENT_RECEIVED_IN_CASH_UNDONE is owned by `anomaly-handler` via the
 * dispatcher's anomaly-routing check (it runs BEFORE the refund branch), so
 * that event never reaches this handler.
 *
 * Behavior for actual refunds (PAYMENT_REFUNDED, PAYMENT_PARTIALLY_REFUNDED):
 *   - Append a NEGATIVE Pagamento with `valor = -roundCurrency(event.amount)`.
 *   - Recompute totalPago via `sumPagamentos` and `statusPagamento` via
 *     `resolvePaymentFields` (same shape as confirmed-handler).
 *   - If pedido.status === 'CONFIRMADO' AND statusPagamento !== 'PAGO',
 *     revert pedido.status -> 'AGUARDANDO_PAGAMENTO'. Other statuses
 *     (EM_PRODUCAO / PRONTO / ENTREGUE / CANCELADO / etc.) are left alone.
 *
 * Edge cases:
 *   - event.amount === 0  → no Pagamento appended (don't pollute the log),
 *                            session-state patch still committed, returns
 *                            unhandled_status.
 *   - PAYMENT_REFUND_IN_PROGRESS → session-state patch only, returns
 *                                   unhandled_status.
 *   - Refund on a pedido with no pagamentos → still creates the negative
 *     Pagamento (shows as a credit balance). statusPagamento will resolve to
 *     PARCIAL (negative totalPago) or PENDENTE depending on dates.
 *
 * Idempotency is handled upstream by the dispatcher's `processedWebhookEventIds`
 * check; this handler just does the recording.
 */
export const handleRefund: Handler = ({
  transaction,
  pedidoRef,
  data,
  event,
  sessionPatch,
}): RecordChargeResult => {
  // PAYMENT_REFUND_IN_PROGRESS — observability only. Asaas hasn't actually
  // moved the money yet, so we don't touch pagamentos / totals.
  if (event.type === 'PAYMENT_REFUND_IN_PROGRESS') {
    transaction.update(pedidoRef, sessionPatch);
    return {
      kind: 'unhandled_status' as const,
      status: event.status,
    };
  }

  const refundAmount = roundCurrency(event.amount);

  // Zero-value refund event — don't pollute the pagamentos log with a 0 entry,
  // but still commit the session-state update so we record that we saw it.
  if (refundAmount === 0) {
    transaction.update(pedidoRef, sessionPatch);
    return {
      kind: 'unhandled_status' as const,
      status: event.status,
    };
  }

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

  const refundPagamento: Pagamento = {
    id: pagamentoId,
    data: Timestamp.fromDate(paymentDate) as unknown as Pagamento['data'],
    valor: -refundAmount,
    metodo: event.paymentMethod || 'PIX',
    observacao: 'Estorno via Asaas',
    comprovanteUrl: null,
    comprovantePath: null,
    comprovanteTipo: null,
    createdAt: now as unknown as Pagamento['createdAt'],
    createdBy: 'asaas-webhook',
  };

  const updatedPagamentos = [...existingPagamentos, refundPagamento];
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

  // Only revert from CONFIRMADO when the balance is no longer fully paid.
  // Other statuses (EM_PRODUCAO / PRONTO / ENTREGUE / CANCELADO / etc.) are
  // left untouched — once the order moved past CONFIRMADO, the payment side
  // is bookkeeping; ops handles it.
  const revertedToAguardandoPagamento =
    data.status === 'CONFIRMADO' && resolved.statusPagamento !== 'PAGO';
  if (revertedToAguardandoPagamento) {
    updatePayload.status = 'AGUARDANDO_PAGAMENTO';
  }

  transaction.update(pedidoRef, updatePayload);

  return {
    kind: 'refund_recorded' as const,
    eventId: event.id,
    pagamentoId,
    refundAmount,
    totalPago,
    statusPagamento: resolved.statusPagamento,
    revertedToAguardandoPagamento,
  };
};
