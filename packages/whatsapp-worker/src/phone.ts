/**
 * Phone normalization — worker-local copy of `src/lib/phone.ts` from the admin app.
 *
 * Kept self-contained so the worker can be deployed and built independently
 * (no shared module resolution between packages by default).
 *
 * If you change rules here, mirror them in the admin app's `src/lib/phone.ts`.
 */

const BR_COUNTRY_CODE = '55';

export function normalizePhone(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D+/g, '');
  if (digits.length === 0) return null;

  if (hadPlus) {
    if (digits.length < 10 || digits.length > 15) return null;
    return digits;
  }

  if (digits.length === 13 && digits.startsWith(BR_COUNTRY_CODE)) return digits;
  if (digits.length === 12 && digits.startsWith(BR_COUNTRY_CODE)) return digits;
  if (digits.length === 11) return BR_COUNTRY_CODE + digits;
  if (digits.length === 10) return BR_COUNTRY_CODE + digits;

  return null;
}

export function isValidBrazilianMobile(normalized: string): boolean {
  if (typeof normalized !== 'string') return false;
  return /^55\d{2}9\d{8}$/.test(normalized);
}
