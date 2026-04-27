import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidBrazilianMobile } from '../phone.js';

describe('normalizePhone (worker copy)', () => {
  it('normalizes mobile with country code', () => {
    expect(normalizePhone('5511999999999')).toBe('5511999999999');
  });

  it('normalizes formatted mobile with parens and dashes', () => {
    expect(normalizePhone('(11) 99999-9999')).toBe('5511999999999');
  });

  it('normalizes mobile with leading +', () => {
    expect(normalizePhone('+5511999999999')).toBe('5511999999999');
  });

  it('normalizes 10-digit landline', () => {
    expect(normalizePhone('1133333333')).toBe('551133333333');
  });

  it('preserves 12-digit landline already with country code', () => {
    expect(normalizePhone('551133333333')).toBe('551133333333');
  });

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('returns null for too few digits', () => {
    expect(normalizePhone('12345')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(normalizePhone(null as unknown as string)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizePhone(undefined as unknown as string)).toBeNull();
  });

  it('preserves international numbers when explicitly + prefixed', () => {
    expect(normalizePhone('+1 (415) 555-1234')).toBe('14155551234');
  });

  it('rejects ridiculously long input without +', () => {
    expect(normalizePhone('1234567890123456789')).toBeNull();
  });
});

describe('isValidBrazilianMobile (worker copy)', () => {
  it('accepts a normalized BR mobile', () => {
    expect(isValidBrazilianMobile('5511999999999')).toBe(true);
  });

  it('rejects a BR landline', () => {
    expect(isValidBrazilianMobile('551133333333')).toBe(false);
  });

  it('rejects unnormalized input', () => {
    expect(isValidBrazilianMobile('(11) 99999-9999')).toBe(false);
  });

  it('rejects non-string input', () => {
    expect(isValidBrazilianMobile(null as unknown as string)).toBe(false);
  });
});
