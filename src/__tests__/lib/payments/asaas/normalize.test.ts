import { describe, expect, it } from 'vitest';
import { normalizeAsaasStatus } from '@/lib/payments/asaas/normalize';

describe('normalizeAsaasStatus', () => {
  it.each([
    ['PENDING', 'PENDING'],
    ['AWAITING_RISK_ANALYSIS', 'PENDING_RISK_ANALYSIS'],
    ['RECEIVED', 'CONFIRMED'],
    ['CONFIRMED', 'CONFIRMED'],
    ['RECEIVED_IN_CASH', 'CONFIRMED'],
    ['OVERDUE', 'EXPIRED'],
    ['REFUNDED', 'REFUNDED'],
    ['REFUND_REQUESTED', 'REFUNDED'],
    ['REFUND_IN_PROGRESS', 'REFUNDED'],
    ['PARTIALLY_REFUNDED', 'PARTIALLY_REFUNDED'],
    ['CHARGEBACK_REQUESTED', 'CHARGEBACK_REQUESTED'],
    ['CHARGEBACK_DISPUTE', 'CHARGEBACK_DISPUTE'],
    ['AWAITING_CHARGEBACK_REVERSAL', 'CHARGEBACK_DISPUTE'],
    ['DELETED', 'DELETED'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeAsaasStatus(input)).toBe(expected);
  });

  it('falls back to FAILED for unknown / nullish status', () => {
    expect(normalizeAsaasStatus('SOMETHING_NEW')).toBe('FAILED');
    expect(normalizeAsaasStatus(undefined)).toBe('FAILED');
    expect(normalizeAsaasStatus(null)).toBe('FAILED');
    expect(normalizeAsaasStatus('')).toBe('FAILED');
  });
});
