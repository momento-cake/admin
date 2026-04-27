/**
 * Phone number normalization utilities shared by admin app and WhatsApp worker.
 *
 * Goals:
 * - Convert any user-typed Brazilian phone into a single canonical form
 *   (digits only, country code prefixed, no '+').
 * - Return `null` on invalid input rather than throwing — callers decide.
 * - Tolerate formatted and partial inputs (with/without DDD, with/without 9 prefix).
 * - Preserve non-BR numbers when the user explicitly used a + prefix.
 */

const BR_COUNTRY_CODE = '55';

/**
 * Strips formatting and returns the canonical digit-only phone string.
 *
 * Rules:
 * - 13 digits starting with 55: returned as-is (BR mobile with 9-prefix).
 * - 12 digits starting with 55: returned as-is (BR landline).
 * - 11 digits not starting with 55: assumed local BR mobile, "55" prepended.
 * - 10 digits: assumed local BR landline, "55" prepended.
 * - Input starting with `+`: country code preserved, only `+` stripped, range 10-15 digits.
 * - Anything else (too short, too long, non-digits only): returns null.
 */
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

/**
 * Formats a normalized phone for display. Best-effort:
 * - 5511999999999 -> "+55 (11) 99999-9999"
 * - 551133333333  -> "+55 (11) 3333-3333"
 * - Unknown shape  -> "+<countrycode> <rest>" if input parses, else original input.
 */
export function formatPhoneForDisplay(input: string): string {
  if (!input) return '';
  const normalized = normalizePhone(input);
  if (!normalized) return input;

  if (normalized.length === 13 && normalized.startsWith(BR_COUNTRY_CODE)) {
    const ddd = normalized.slice(2, 4);
    const part1 = normalized.slice(4, 9);
    const part2 = normalized.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  if (normalized.length === 12 && normalized.startsWith(BR_COUNTRY_CODE)) {
    const ddd = normalized.slice(2, 4);
    const part1 = normalized.slice(4, 8);
    const part2 = normalized.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }

  const cc = normalized.slice(0, normalized.length - 10);
  const rest = normalized.slice(cc.length);
  return `+${cc} ${rest}`;
}

/**
 * True iff the input is already in normalized form AND looks like a Brazilian mobile.
 */
export function isValidBrazilianMobile(normalized: string): boolean {
  if (typeof normalized !== 'string') return false;
  return /^55\d{2}9\d{8}$/.test(normalized);
}
