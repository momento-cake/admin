import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  calcularTotalPedido,
  resolvePaymentFields,
  roundCurrency,
  sumPagamentos,
} from '@/lib/payment-logic';
import type { Pagamento, Pedido } from '@/types/pedido';
import type { Handler } from './types';

/**
 * Handler for CONFIRMED-status events (PAYMENT_CONFIRMED, PAYMENT_RECEIVED,
 * etc. — anything that normalizes to NormalizedChargeStatus = 'CONFIRMED').
 *
 * Appends a Pagamento, recomputes payment totals via `resolvePaymentFields`,
 * and flips a pedido in AGUARDANDO_PAGAMENTO to CONFIRMADO when fully paid.
 *
 * Idempotency is handled upstream by the dispatcher's `processedWebhookEventIds`
 * check; this handler just does the recording.
 */
export const handleConfirmedPayment: Handler = ({
  transaction,
  pedidoRef,
  data,
  event,
  sessionPatch,
}) => {
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
};
