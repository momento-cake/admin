import { describe, it, expect } from 'vitest'
import {
  getPresetRange,
  formatPresetRange,
  parseIsoDateEnd,
  parseIsoDateStart,
  toIsoDate,
  PEDIDO_DATE_PRESET_LABELS,
  type PedidoDatePreset,
} from '@/lib/pedido-date-presets'

// Fixed reference: Wednesday, April 15 2026 14:30 local time.
// Using this date deterministically, we can assert every preset boundary.
const FIXED_NOW = new Date(2026, 3, 15, 14, 30, 0, 0) // month is 0-indexed

function iso(d: Date) {
  return d.toISOString()
}

describe('pedido-date-presets', () => {
  describe('PEDIDO_DATE_PRESET_LABELS', () => {
    it('includes a pt-BR label for every preset', () => {
      const keys: PedidoDatePreset[] = [
        'THIS_WEEK',
        'THIS_MONTH',
        'NEXT_2_WEEKS',
        'NEXT_MONTH',
        'PREVIOUS_MONTH',
        'CUSTOM',
      ]
      keys.forEach((k) => {
        expect(PEDIDO_DATE_PRESET_LABELS[k]).toBeTruthy()
        expect(typeof PEDIDO_DATE_PRESET_LABELS[k]).toBe('string')
      })
    })
  })

  describe('getPresetRange', () => {
    it('THIS_WEEK: Monday 00:00 to Sunday 23:59:59.999', () => {
      // April 15 2026 is a Wednesday. Week (ptBR, Monday-start) is Apr 13 to Apr 19.
      const { start, end } = getPresetRange('THIS_WEEK', FIXED_NOW)
      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(3)
      expect(start.getDate()).toBe(13)
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(end.getDate()).toBe(19)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })

    it('THIS_MONTH: first day 00:00 to last day 23:59:59.999', () => {
      const { start, end } = getPresetRange('THIS_MONTH', FIXED_NOW)
      expect(start.getMonth()).toBe(3)
      expect(start.getDate()).toBe(1)
      expect(start.getHours()).toBe(0)
      expect(end.getMonth()).toBe(3)
      expect(end.getDate()).toBe(30) // April has 30 days
      expect(end.getHours()).toBe(23)
    })

    it('NEXT_2_WEEKS: today 00:00 to today+13 23:59:59.999', () => {
      const { start, end } = getPresetRange('NEXT_2_WEEKS', FIXED_NOW)
      expect(start.getDate()).toBe(15)
      expect(start.getHours()).toBe(0)
      expect(end.getDate()).toBe(28) // Apr 15 + 13 = Apr 28
      expect(end.getMonth()).toBe(3)
      expect(end.getHours()).toBe(23)
    })

    it('NEXT_MONTH: next month first day 00:00 to last day 23:59:59.999', () => {
      const { start, end } = getPresetRange('NEXT_MONTH', FIXED_NOW)
      expect(start.getMonth()).toBe(4) // May
      expect(start.getDate()).toBe(1)
      expect(end.getMonth()).toBe(4)
      expect(end.getDate()).toBe(31) // May has 31 days
    })

    it('PREVIOUS_MONTH: previous month first day 00:00 to last day 23:59:59.999', () => {
      const { start, end } = getPresetRange('PREVIOUS_MONTH', FIXED_NOW)
      expect(start.getMonth()).toBe(2) // March
      expect(start.getDate()).toBe(1)
      expect(end.getMonth()).toBe(2)
      expect(end.getDate()).toBe(31) // March has 31 days
    })

    it('NEXT_MONTH correctly rolls into next year at December', () => {
      const dec = new Date(2026, 11, 10) // Dec 10 2026
      const { start, end } = getPresetRange('NEXT_MONTH', dec)
      expect(start.getFullYear()).toBe(2027)
      expect(start.getMonth()).toBe(0) // January
      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(0)
      expect(end.getDate()).toBe(31)
    })

    it('PREVIOUS_MONTH correctly rolls into previous year at January', () => {
      const jan = new Date(2026, 0, 10) // Jan 10 2026
      const { start, end } = getPresetRange('PREVIOUS_MONTH', jan)
      expect(start.getFullYear()).toBe(2025)
      expect(start.getMonth()).toBe(11) // December
      expect(end.getFullYear()).toBe(2025)
      expect(end.getMonth()).toBe(11)
      expect(end.getDate()).toBe(31)
    })

    it('throws for CUSTOM (callers must supply explicit dates)', () => {
      expect(() => getPresetRange('CUSTOM', FIXED_NOW)).toThrow()
    })

    it('uses current system time when now is omitted', () => {
      const { start, end } = getPresetRange('THIS_MONTH')
      expect(iso(start).length).toBeGreaterThan(0)
      expect(end.getTime()).toBeGreaterThan(start.getTime())
    })
  })

  describe('formatPresetRange', () => {
    it('returns a short ptBR label covering start and end', () => {
      const start = new Date(2026, 3, 1)
      const end = new Date(2026, 3, 30, 23, 59, 59, 999)
      const label = formatPresetRange({ start, end })
      expect(label).toContain('1')
      expect(label).toContain('30')
      // Month should render in Portuguese (month name or abbreviation)
      expect(label.toLowerCase()).toMatch(/abr|abril/)
    })

    it('renders a single-day range compactly', () => {
      const d = new Date(2026, 3, 10)
      const end = new Date(2026, 3, 10, 23, 59, 59, 999)
      const label = formatPresetRange({ start: d, end })
      expect(label).toContain('10')
    })

    it('renders cross-year range with year on both sides', () => {
      const start = new Date(2025, 11, 28)
      const end = new Date(2026, 0, 10, 23, 59, 59, 999)
      const label = formatPresetRange({ start, end })
      expect(label).toContain('2025')
      expect(label).toContain('2026')
    })

    it('renders cross-month same-year range without year', () => {
      const start = new Date(2026, 2, 28)
      const end = new Date(2026, 3, 15, 23, 59, 59, 999)
      const label = formatPresetRange({ start, end })
      expect(label).toContain('28')
      expect(label).toContain('15')
    })
  })

  describe('ISO date helpers', () => {
    it('parseIsoDateStart: returns local midnight', () => {
      const d = parseIsoDateStart('2026-04-15')
      expect(d.getFullYear()).toBe(2026)
      expect(d.getMonth()).toBe(3)
      expect(d.getDate()).toBe(15)
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(d.getSeconds()).toBe(0)
      expect(d.getMilliseconds()).toBe(0)
    })

    it('parseIsoDateEnd: returns end of day 23:59:59.999', () => {
      const d = parseIsoDateEnd('2026-04-15')
      expect(d.getHours()).toBe(23)
      expect(d.getMinutes()).toBe(59)
      expect(d.getSeconds()).toBe(59)
      expect(d.getMilliseconds()).toBe(999)
    })

    it('toIsoDate: YYYY-MM-DD local format', () => {
      expect(toIsoDate(new Date(2026, 3, 5))).toBe('2026-04-05')
      expect(toIsoDate(new Date(2026, 11, 31))).toBe('2026-12-31')
    })

    it('parseIsoDateStart handles single-digit month/day defensively', () => {
      const d = parseIsoDateStart('2026-1-5')
      expect(d.getMonth()).toBe(0)
      expect(d.getDate()).toBe(5)
    })

    it('parse helpers tolerate partial strings with year only', () => {
      // Missing month/day pieces fall back to 1 — mainly a belt-and-suspenders
      // guard so a bad URL param doesn't crash the filter pipeline.
      const start = parseIsoDateStart('2026')
      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(0)
      expect(start.getDate()).toBe(1)

      const end = parseIsoDateEnd('2026')
      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(0)
      expect(end.getDate()).toBe(1)
      expect(end.getHours()).toBe(23)
    })
  })
})
