/**
 * Calendar-date helpers for order dates (`dataEntrega` / `dataVencimento`).
 *
 * These fields represent a *calendar day* with no time-of-day — a cake due on
 * 17/07 is due on the 17th in every timezone. They are persisted as an instant
 * (historically UTC midnight; noon UTC for values written through
 * `calendarDateToISO`), so formatting that instant in local time — UTC-3 in
 * Brazil — would shift the displayed day back by one (17/07 prints as 16/07).
 *
 * The rule these helpers enforce: the stored instant's **UTC** calendar day is
 * the intended date. `toCalendarDate` re-anchors it onto a *local* Date at that
 * day's midnight so downstream local formatters (`date-fns` `format`,
 * `Intl.DateTimeFormat`) render the right day; `calendarDateToISO` writes a
 * timezone-stable instant; `calendarInputValue` reads one back for a date input.
 */

const MS_PER_SECOND = 1000

/** Coerce the timestamp shapes a stored order-date field can take into a Date instant, or null. */
function toInstant(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number }
    if (typeof v.toDate === 'function') {
      const d = v.toDate()
      return d instanceof Date && !isNaN(d.getTime()) ? d : null
    }
    if (typeof v._seconds === 'number') return new Date(v._seconds * MS_PER_SECOND)
    if (typeof v.seconds === 'number') return new Date(v.seconds * MS_PER_SECOND)
    return null
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Re-anchor a stored calendar-date value onto a local Date at midnight of its
 * UTC calendar day, so local-time formatters render the intended day regardless
 * of the viewer's timezone. Returns null for absent/unparseable input.
 */
export function toCalendarDate(value: unknown): Date | null {
  const d = toInstant(value)
  if (!d) return null
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

/**
 * Convert a `YYYY-MM-DD` value from an `<input type="date">` into the ISO
 * instant to persist. Anchored at **noon UTC** so it stays on the same calendar
 * day when later read in any Brazilian timezone — even by a code path that
 * still formats in local time. Returns null for empty or malformed input.
 */
export function calendarDateToISO(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim())
  if (!match) return null
  return `${match[1]}-${match[2]}-${match[3]}T12:00:00.000Z`
}

/**
 * Convert a stored calendar-date value back into a `YYYY-MM-DD` string for an
 * `<input type="date">`, using the UTC calendar day. Returns '' when
 * absent/unparseable.
 */
export function calendarInputValue(value: unknown): string {
  const d = toInstant(value)
  if (!d) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
