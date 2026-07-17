import { describe, it, expect } from 'vitest'
import { format } from 'date-fns'
import {
  toCalendarDate,
  calendarDateToISO,
  calendarInputValue,
} from '@/lib/calendar-date'

/**
 * These assertions read the *local* calendar components of the returned Date
 * (getFullYear/getMonth/getDate) or compare fixed strings, so they hold
 * regardless of the timezone the test runner happens to use.
 */
describe('calendar-date helpers', () => {
  describe('calendarDateToISO', () => {
    it('anchors a picked YYYY-MM-DD at noon UTC', () => {
      expect(calendarDateToISO('2026-07-17')).toBe('2026-07-17T12:00:00.000Z')
    })

    it('trims surrounding whitespace before converting', () => {
      expect(calendarDateToISO('  2026-07-17  ')).toBe('2026-07-17T12:00:00.000Z')
    })

    it('returns null for empty, nullish, or malformed input', () => {
      expect(calendarDateToISO('')).toBeNull()
      expect(calendarDateToISO(null)).toBeNull()
      expect(calendarDateToISO(undefined)).toBeNull()
      expect(calendarDateToISO('17/07/2026')).toBeNull()
      expect(calendarDateToISO('2026-7-5')).toBeNull()
    })
  })

  describe('toCalendarDate', () => {
    it('keeps the picked day when read back (the reported off-by-one bug)', () => {
      // Full round trip: pick 17/07 -> persist -> re-read for display.
      const stored = calendarDateToISO('2026-07-17')!
      const d = toCalendarDate(stored)!
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(6) // July (0-indexed)
      expect(d.getDate()).toBe(17)
      // And it formats as the intended day, not the day before.
      expect(format(d, 'dd/MM/yyyy')).toBe('17/07/2026')
    })

    it('reads legacy values stored at UTC midnight without shifting the day', () => {
      // Orders saved before the fix were stored as UTC midnight.
      const legacy = '2026-07-17T00:00:00.000Z'
      expect(format(toCalendarDate(legacy)!, 'dd/MM/yyyy')).toBe('17/07/2026')
    })

    it('reads a Firestore Timestamp shape ({ _seconds })', () => {
      // 2026-07-17T12:00:00Z in epoch seconds.
      const ts = { _seconds: Date.UTC(2026, 6, 17, 12) / 1000, _nanoseconds: 0 }
      expect(format(toCalendarDate(ts)!, 'dd/MM/yyyy')).toBe('17/07/2026')
    })

    it('reads a Timestamp-like object exposing toDate()', () => {
      const ts = { toDate: () => new Date(Date.UTC(2026, 6, 17, 12)) }
      expect(format(toCalendarDate(ts)!, 'dd/MM/yyyy')).toBe('17/07/2026')
    })

    it('returns null for absent or unparseable input', () => {
      expect(toCalendarDate(null)).toBeNull()
      expect(toCalendarDate(undefined)).toBeNull()
      expect(toCalendarDate('not-a-date')).toBeNull()
      expect(toCalendarDate({})).toBeNull()
    })
  })

  describe('calendarInputValue', () => {
    it('round-trips a written value back to the same YYYY-MM-DD', () => {
      const stored = calendarDateToISO('2026-07-18')!
      expect(calendarInputValue(stored)).toBe('2026-07-18')
    })

    it('reads legacy UTC-midnight values back to the correct day', () => {
      expect(calendarInputValue('2026-07-18T00:00:00.000Z')).toBe('2026-07-18')
    })

    it('returns an empty string for absent input', () => {
      expect(calendarInputValue(null)).toBe('')
      expect(calendarInputValue(undefined)).toBe('')
      expect(calendarInputValue('nope')).toBe('')
    })
  })
})
