/**
 * Pure aggregation helpers for the Pedidos → Resumo (production/financial
 * summary) screen. Everything here is framework-free so it can be unit-tested
 * in isolation and reused by both the interactive view and the print view.
 *
 * Scope decisions (see PRD / plan):
 *  - Items are grouped by their `nome` (normalised for case/whitespace), not by
 *    semantic cake-mass/filling categories — those live only in free text.
 *  - Cancelled orders are excluded from the items aggregation (they are not
 *    produced) but still surface in the order list with a CANCELADO tag.
 *  - Orders without a `dataEntrega` collect in a trailing "sem-data" bucket.
 */
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Orcamento, Pedido, PedidoItem } from '@/types/pedido'
import { toCalendarDate } from '@/lib/calendar-date'

// ---------------------------------------------------------------------------
// Date coercion
// ---------------------------------------------------------------------------

/**
 * Coerce the many timestamp shapes a Pedido field can take (Firestore admin
 * Timestamp, client Timestamp, serialized `{_seconds}`/`{seconds}`, Date, ISO
 * string, epoch ms) into a Date — or null when absent/unparseable.
 */
export function toDateOrNull(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  if (typeof value === 'object') {
    const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number }
    if (typeof v.toDate === 'function') {
      const d = v.toDate()
      return d instanceof Date && !isNaN(d.getTime()) ? d : null
    }
    if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
    return null
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Pure BRL formatter. Kept here (rather than reusing recipeSettings) so the
 * Resumo components have no Firebase import side-effects.
 */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export function formatBRL(value: number): string {
  return BRL.format(value)
}

function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// Active orcamento
// ---------------------------------------------------------------------------

export function getActiveOrcamento(pedido: Pedido): Orcamento | undefined {
  return pedido.orcamentos?.find((o) => o.isAtivo)
}

export function getActiveItens(pedido: Pedido): PedidoItem[] {
  return getActiveOrcamento(pedido)?.itens ?? []
}

// ---------------------------------------------------------------------------
// Status tags (reference-style, derived from structured data only)
// ---------------------------------------------------------------------------

export type ResumoTag = 'CANCELADO' | 'ORCAMENTO_A_FAZER' | 'FALTA_SINAL'

export const RESUMO_TAG_LABELS: Record<ResumoTag, string> = {
  CANCELADO: 'Cancelado',
  ORCAMENTO_A_FAZER: 'Orçamento a fazer',
  FALTA_SINAL: 'Falta sinal',
}

export function getResumoTags(pedido: Pedido): ResumoTag[] {
  const tags: ResumoTag[] = []
  const cancelled = pedido.status === 'CANCELADO'
  if (cancelled) tags.push('CANCELADO')

  const active = getActiveOrcamento(pedido)
  const hasOrcamento = !!active && active.itens.length > 0
  if (!hasOrcamento && !cancelled) tags.push('ORCAMENTO_A_FAZER')

  // Only meaningful once there's something to charge for.
  if (hasOrcamento && !cancelled && (pedido.totalPago ?? 0) <= 0) {
    tags.push('FALTA_SINAL')
  }
  return tags
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export interface OrderFinance {
  /** Active orcamento total (after desconto/acrescimo). */
  subtotal: number
  frete: number
  /** subtotal + frete. */
  total: number
  /** Amount actually paid so far (totalPago). */
  sinal: number
  /** max(0, total - sinal). */
  restante: number
  /** Whether any payment has been recorded. */
  sinalPago: boolean
}

export function computeOrderFinance(pedido: Pedido): OrderFinance {
  const subtotal = getActiveOrcamento(pedido)?.total ?? 0
  const frete = pedido.entrega?.freteTotal ?? 0
  const total = subtotal + frete
  const sinal = pedido.totalPago ?? 0
  const restante = Math.max(0, total - sinal)
  return { subtotal, frete, total, sinal, restante, sinalPago: sinal > 0 }
}

// ---------------------------------------------------------------------------
// Grouping by delivery day
// ---------------------------------------------------------------------------

export interface DayGroup {
  /** 'yyyy-MM-dd' for dated groups, or 'sem-data' for the undated bucket. */
  dayKey: string
  /** Start-of-day Date for dated groups, null for the undated bucket. */
  date: Date | null
  pedidos: Pedido[]
}

export const SEM_DATA_KEY = 'sem-data'

/**
 * Group orders by their delivery day (local time), sorted ascending. Orders
 * without a `dataEntrega` are collected into a trailing `sem-data` group, which
 * is omitted entirely when every order is dated.
 */
export function groupPedidosByDeliveryDay(pedidos: Pedido[]): DayGroup[] {
  const map = new Map<string, DayGroup>()
  const semData: Pedido[] = []

  for (const p of pedidos) {
    const d = toCalendarDate(p.dataEntrega)
    if (!d) {
      semData.push(p)
      continue
    }
    const key = ymdLocal(d)
    let group = map.get(key)
    if (!group) {
      group = { dayKey: key, date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), pedidos: [] }
      map.set(key, group)
    }
    group.pedidos.push(p)
  }

  const days = [...map.values()].sort((a, b) => a.dayKey.localeCompare(b.dayKey))
  if (semData.length > 0) {
    days.push({ dayKey: SEM_DATA_KEY, date: null, pedidos: semData })
  }
  return days
}

// ---------------------------------------------------------------------------
// Item aggregation (independent of order)
// ---------------------------------------------------------------------------

export interface ItemContribution {
  pedidoId: string
  numeroPedido: string
  clienteNome: string
  dataEntrega: Date | null
  quantidade: number
}

export interface AggregatedItem {
  /** Display name (first-seen, trimmed). */
  nome: string
  totalQuantidade: number
  contribs: ItemContribution[]
}

function normalizeName(n: string): string {
  return n.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Collapse every active-orcamento line item across the given orders into a
 * single list keyed by normalised name, summing quantities and recording which
 * orders contributed (and how many). Cancelled orders are skipped. Sorted by
 * display name (pt-BR collation).
 */
export function aggregateItems(pedidos: Pedido[]): AggregatedItem[] {
  const map = new Map<string, AggregatedItem>()

  for (const p of pedidos) {
    if (p.status === 'CANCELADO') continue
    const dataEntrega = toCalendarDate(p.dataEntrega)
    for (const it of getActiveItens(p)) {
      const key = normalizeName(it.nome)
      let agg = map.get(key)
      if (!agg) {
        agg = { nome: it.nome.trim(), totalQuantidade: 0, contribs: [] }
        map.set(key, agg)
      }
      agg.totalQuantidade += it.quantidade
      agg.contribs.push({
        pedidoId: p.id,
        numeroPedido: p.numeroPedido,
        clienteNome: p.clienteNome,
        dataEntrega,
        quantidade: it.quantidade,
      })
    }
  }

  return [...map.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// ---------------------------------------------------------------------------
// Display helpers (shared by the interactive view and the print view)
// ---------------------------------------------------------------------------

/** "19/05 — Terça-feira" (weekday capitalised, ptBR). */
export function formatResumoDayHeader(date: Date): string {
  const dm = format(date, 'dd/MM', { locale: ptBR })
  const weekday = format(date, 'EEEE', { locale: ptBR })
  return `${dm} — ${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`
}

export interface EntregaResumo {
  label: 'Entrega' | 'Retirada'
  detail: string
}

/**
 * Build the one-line delivery/pickup summary shown under the client name.
 * Delivery → formatted street address; pickup → the configured pickup
 * location name (free-text scheduling notes live in `observacoes`).
 */
export function formatEntregaResumo(pedido: Pedido): EntregaResumo {
  const e = pedido.entrega
  if (e?.tipo === 'ENTREGA') {
    const a = e.enderecoEntrega
    const parts = a
      ? [a.endereco, a.numero, a.bairro, a.cidade].filter(
          (v): v is string => typeof v === 'string' && v.trim().length > 0
        )
      : []
    return { label: 'Entrega', detail: parts.join(', ') }
  }
  return { label: 'Retirada', detail: e?.enderecoRetiradaNome?.trim() ?? '' }
}
