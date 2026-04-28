import { describe, expect, it } from 'vitest';
import { normalizeAsaasStatus } from '@/lib/payments/asaas/normalize';

describe('normalizeAsaasStatus', () => {
  it.each([
    ['PENDING', 'PENDING'],
    ['AWAITING_RISK_ANALYSIS', 'PENDING'],
    ['RECEIVED', 'CONFIRMED'],
    ['CONFIRMED', 'CONFIRMED'],
    ['RECEIVED_IN_CASH', 'CONFIRMED'],
    ['OVERDUE', 'EXPIRED'],
    ['REFUNDED', 'REFUNDED'],
    ['REFUND_REQUESTED', 'REFUNDED'],
    ['REFUND_IN_PROGRESS', 'REFUNDED'],
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
