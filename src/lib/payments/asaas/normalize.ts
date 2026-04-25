import type { NormalizedChargeStatus } from '../types';

/**
 * Normalize an Asaas payment status string to our internal NormalizedChargeStatus.
 * Asaas reference: https://docs.asaas.com/reference/listar-cobrancas
 */
export function normalizeAsaasStatus(status: string | null | undefined): NormalizedChargeStatus {
  switch (status) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'PENDING';
    case 'RECEIVED':
    case 'CONFIRMED':
    case 'RECEIVED_IN_CASH':
      return 'CONFIRMED';
    case 'OVERDUE':
      return 'EXPIRED';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
      return 'REFUNDED';
    default:
      return 'FAILED';
  }
}
