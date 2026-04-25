import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhoneForDisplay, isValidBrazilianMobile } from '@/lib/phone';

describe('normalizePhone', () => {
  describe('Brazilian numbers', () => {
    it('normalizes mobile with country code already present', () => {
      expect(normalizePhone('5511999999999')).toBe('5511999999999');
    });

    it('normalizes mobile with leading +', () => {
      expect(normalizePhone('+5511999999999')).toBe('5511999999999');
    });

    it('normalizes formatted mobile with parens and dashes', () => {
      expect(normalizePhone('(11) 99999-9999')).toBe('5511999999999');
    });

    it('normalizes formatted mobile with country code', () => {
      expect(normalizePhone('+55 (11) 99999-9999')).toBe('5511999999999');
    });

    it('normalizes mobile with extra spaces', () => {
      expect(normalizePhone('  11 9 9999 9999  ')).toBe('5511999999999');
    });

    it('normalizes 11-digit local mobile (DDD + 9-prefix)', () => {
      expect(normalizePhone('11999999999')).toBe('5511999999999');
    });

    it('normalizes 10-digit local landline', () => {
      expect(normalizePhone('1133333333')).toBe('551133333333');
    });

    it('normalizes formatted landline', () => {
      expect(normalizePhone('(11) 3333-3333')).toBe('551133333333');
    });

    it('preserves country code prefix in 12-digit landline with country code', () => {
      expect(normalizePhone('551133333333')).toBe('551133333333');
    });

    it('strips non-digits aggressively', () => {
      expect(normalizePhone('11.99999.9999')).toBe('5511999999999');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(normalizePhone('')).toBeNull();
    });

    it('returns null for whitespace only', () => {
      expect(normalizePhone('   ')).toBeNull();
    });

    it('returns null for too few digits (under 10)', () => {
      expect(normalizePhone('99999999')).toBeNull();
    });

    it('returns null for letters only', () => {
      expect(normalizePhone('abcdefg')).toBeNull();
    });

    it('returns null for ridiculously long input', () => {
      expect(normalizePhone('1234567890123456789')).toBeNull();
    });

    it('returns null for null/undefined-like inputs', () => {
      expect(normalizePhone(null as unknown as string)).toBeNull();
      expect(normalizePhone(undefined as unknown as string)).toBeNull();
    });
  });

  describe('non-Brazilian numbers', () => {
    it('preserves a US-style 11-digit number when prefixed with +1', () => {
      expect(normalizePhone('+1 (415) 555-1234')).toBe('14155551234');
    });

    it('preserves international numbers when explicitly prefixed', () => {
      expect(normalizePhone('+351 912 345 678')).toBe('351912345678');
    });
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats a Brazilian mobile with country code', () => {
    expect(formatPhoneForDisplay('5511999999999')).toBe('+55 (11) 99999-9999');
  });

  it('formats a Brazilian landline with country code', () => {
    expect(formatPhoneForDisplay('551133333333')).toBe('+55 (11) 3333-3333');
  });

  it('formats US-style numbers with country-code/rest fallback', () => {
    expect(formatPhoneForDisplay('+14155551234')).toBe('+1 4155551234');
  });

  it('returns empty string for empty input', () => {
    expect(formatPhoneForDisplay('')).toBe('');
  });

  it('handles already-formatted input by re-normalizing first', () => {
    expect(formatPhoneForDisplay('+55 (11) 99999-9999')).toBe('+55 (11) 99999-9999');
  });
});

describe('isValidBrazilianMobile', () => {
  it('accepts a normalized BR mobile', () => {
    expect(isValidBrazilianMobile('5511999999999')).toBe(true);
  });

  it('rejects a BR landline', () => {
    expect(isValidBrazilianMobile('551133333333')).toBe(false);
  });

  it('rejects non-BR numbers', () => {
    expect(isValidBrazilianMobile('14155551234')).toBe(false);
  });

  it('rejects unnormalized input', () => {
    expect(isValidBrazilianMobile('(11) 99999-9999')).toBe(false);
  });
});
