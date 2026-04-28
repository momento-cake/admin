import type { Handler } from './types';

/**
 * Handler for refund-class events:
 *   - PAYMENT_REFUNDED            (full refund — event.status === 'REFUNDED')
 *   - PAYMENT_PARTIALLY_REFUNDED  (partial refund — event.status === 'PARTIALLY_REFUNDED')
 *   - PAYMENT_REFUND_IN_PROGRESS  (in-progress; observability only)
 *   - PAYMENT_RECEIVED_IN_CASH_UNDONE (admin undid a manual cash receipt)
 *
 * STUB. The default behavior is to commit the session-status patch and return
 * `unhandled_status` so existing tests keep passing while Agent A implements
 * the real refund-reversal logic in this file.
 *
 * Agent A: implement append-negative-Pagamento + recompute totals + revert
 * pedido.status from CONFIRMADO -> AGUARDANDO_PAGAMENTO when balance becomes
 * unpaid. See HandlerContext / RecordChargeResult in ./types.ts.
 */
export const handleRefund: Handler = ({
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
