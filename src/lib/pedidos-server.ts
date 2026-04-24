import {
  calcularTotalPedido,
  resolvePaymentFields,
} from '@/lib/payment-logic';
import type { Pedido } from '@/types/pedido';

/**
 * Backfills missing payment fields on raw Firestore pedido data.
 *
 * Legacy pedidos written before the payment feature don't have `pagamentos`,
 * `totalPago`, `dataVencimento`, or `statusPagamento`. This helper computes
 * them on read so the UI can rely on those fields always being present.
 *
 * Returns plain JSON-serializable values. `dataVencimento` becomes an ISO
 * string when defaulted; existing Firestore Timestamps pass through as-is.
 */
export function withPaymentDefaults(
  raw: Pedido & Record<string, unknown>
): Pedido & Record<string, unknown> {
  const partial = {
    id: raw.id,
    orcamentos: raw.orcamentos || [],
    entrega: raw.entrega,
  } as Pedido;
  const total = calcularTotalPedido(partial);

  const resolved = resolvePaymentFields({
    pagamentos: raw.pagamentos,
    totalPago: raw.totalPago,
    dataVencimento: raw.dataVencimento as never,
    dataEntrega: raw.dataEntrega as never,
    createdAt: raw.createdAt as never,
    total,
  });

  return {
    ...raw,
    pagamentos: resolved.pagamentos,
    totalPago: resolved.totalPago,
    statusPagamento: resolved.statusPagamento,
    dataVencimento:
      raw.dataVencimento ??
      (resolved.dataVencimentoDate.toISOString() as unknown as Pedido['dataVencimento']),
  };
}
