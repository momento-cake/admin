import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export type PedidoDatePreset =
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'NEXT_2_WEEKS'
  | 'NEXT_MONTH'
  | 'PREVIOUS_MONTH'
  | 'CUSTOM'

export const PEDIDO_DATE_PRESET_LABELS: Record<PedidoDatePreset, string> = {
  THIS_WEEK: 'Esta semana',
  THIS_MONTH: 'Este mês',
  NEXT_2_WEEKS: 'Próximas 2 semanas',
  NEXT_MONTH: 'Próximo mês',
  PREVIOUS_MONTH: 'Mês anterior',
  CUSTOM: 'Personalizado',
}

export interface DateRange {
  start: Date
  end: Date
}

/**
 * Resolve a preset into an inclusive [start, end] Date range, using the ptBR
 * locale (Monday-start week). Throws for CUSTOM — callers handle that variant
 * with explicit dateFrom/dateTo values.
 */
export function getPresetRange(preset: PedidoDatePreset, now: Date = new Date()): DateRange {
  switch (preset) {
    case 'THIS_WEEK':
      // Monday-first: week runs Mon 00:00 → Sun 23:59:59. The ptBR locale in
      // date-fns defaults to Sunday-start; we override so "esta semana" aligns
      // with the business workweek.
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      }
    case 'THIS_MONTH':
      return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'NEXT_2_WEEKS':
      return { start: startOfDay(now), end: endOfDay(addDays(now, 13)) }
    case 'NEXT_MONTH': {
      const next = addMonths(now, 1)
      return { start: startOfMonth(next), end: endOfMonth(next) }
    }
    case 'PREVIOUS_MONTH': {
      const prev = subMonths(now, 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev) }
    }
    case 'CUSTOM':
      throw new Error('getPresetRange does not accept CUSTOM — use explicit dates')
  }
}

/**
 * Short ptBR label for an active range. Examples:
 *   - same day:   "10 de abr"
 *   - same month: "1 – 30 de abr"
 *   - same year:  "28 de mar – 15 de abr"
 *   - cross-year: "28 de dez 2025 – 10 de jan 2026"
 */
export function formatPresetRange({ start, end }: DateRange): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  if (sameDay) {
    return format(start, "d 'de' MMM", { locale: ptBR })
  }

  if (isSameMonth(start, end)) {
    return `${format(start, 'd', { locale: ptBR })} – ${format(end, "d 'de' MMM", { locale: ptBR })}`
  }

  if (isSameYear(start, end)) {
    return `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM", { locale: ptBR })}`
  }

  return `${format(start, "d 'de' MMM yyyy", { locale: ptBR })} – ${format(end, "d 'de' MMM yyyy", { locale: ptBR })}`
}

/** Convert a YYYY-MM-DD string to a local Date at 00:00 (start of day). */
export function parseIsoDateStart(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

/** Convert a YYYY-MM-DD string to a local Date at 23:59:59.999 (end of day). */
export function parseIsoDateEnd(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999)
}

/** Format a Date as YYYY-MM-DD in local time (for <input type="date"> values). */
export function toIsoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}
