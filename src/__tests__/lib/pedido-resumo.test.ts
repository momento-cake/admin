/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import {
  getActiveOrcamento,
  getActiveItens,
  getResumoTags,
  computeOrderFinance,
  groupPedidosByDeliveryDay,
  aggregateItems,
  toDateOrNull,
  formatResumoDayHeader,
  formatEntregaResumo,
} from '@/lib/pedido-resumo'
import type { Pedido } from '@/types/pedido'

// --- Fixtures ---------------------------------------------------------------

function ts(d: Date) {
  // Firestore admin Timestamp-like shape.
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}

function item(nome: string, quantidade: number, precoUnitario = 10) {
  return {
    id: `${nome}-${quantidade}`,
    nome,
    precoUnitario,
    quantidade,
    total: precoUnitario * quantidade,
  }
}

function orcamento(overrides: Record<string, any> = {}) {
  return {
    id: 'orc-1',
    versao: 1,
    isAtivo: true,
    status: 'APROVADO',
    itens: [],
    subtotal: 0,
    desconto: 0,
    descontoTipo: 'valor',
    acrescimo: 0,
    total: 0,
    criadoEm: ts(new Date(2026, 4, 1)),
    criadoPor: 'u1',
    ...overrides,
  }
}

function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1',
    numeroPedido: 'PED-0001',
    publicToken: 'tok',
    clienteId: 'c1',
    clienteNome: 'Cliente Um',
    status: 'CONFIRMADO',
    orcamentos: [orcamento()],
    pacotes: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [],
    totalPago: 0,
    dataVencimento: ts(new Date(2026, 4, 1)) as any,
    statusPagamento: 'PENDENTE',
    isActive: true,
    createdAt: ts(new Date(2026, 4, 1)) as any,
    updatedAt: ts(new Date(2026, 4, 1)) as any,
    createdBy: 'u1',
    ...overrides,
  } as Pedido
}

// --- toDateOrNull -----------------------------------------------------------

describe('toDateOrNull', () => {
  it('handles Firestore Timestamp (toDate)', () => {
    const d = new Date(2026, 4, 20)
    expect(toDateOrNull(ts(d))?.getTime()).toBe(d.getTime())
  })
  it('handles {_seconds}', () => {
    const d = new Date(2026, 4, 20)
    expect(toDateOrNull({ _seconds: Math.floor(d.getTime() / 1000) })?.getDate()).toBe(20)
  })
  it('handles {seconds}', () => {
    const d = new Date(2026, 4, 21)
    expect(toDateOrNull({ seconds: Math.floor(d.getTime() / 1000) })?.getDate()).toBe(21)
  })
  it('handles Date and ISO string', () => {
    const d = new Date(2026, 4, 22)
    expect(toDateOrNull(d)?.getTime()).toBe(d.getTime())
    expect(toDateOrNull('2026-05-22')?.getFullYear()).toBe(2026)
  })
  it('returns null for null/undefined/garbage', () => {
    expect(toDateOrNull(null)).toBeNull()
    expect(toDateOrNull(undefined)).toBeNull()
    expect(toDateOrNull('not-a-date')).toBeNull()
    expect(toDateOrNull({})).toBeNull()
  })
})

// --- active orcamento -------------------------------------------------------

describe('getActiveOrcamento / getActiveItens', () => {
  it('returns the active orcamento', () => {
    const p = pedido({
      orcamentos: [
        orcamento({ id: 'old', isAtivo: false, itens: [item('x', 1)] }),
        orcamento({ id: 'cur', isAtivo: true, itens: [item('bolo', 1)] }),
      ],
    })
    expect(getActiveOrcamento(p)?.id).toBe('cur')
    expect(getActiveItens(p).map((i) => i.nome)).toEqual(['bolo'])
  })
  it('returns undefined / [] when there is no active orcamento', () => {
    const p = pedido({ orcamentos: [orcamento({ isAtivo: false })] })
    expect(getActiveOrcamento(p)).toBeUndefined()
    expect(getActiveItens(p)).toEqual([])
  })
  it('tolerates a missing orcamentos array', () => {
    const p = pedido({ orcamentos: undefined as any })
    expect(getActiveItens(p)).toEqual([])
  })
})

// --- getResumoTags ----------------------------------------------------------

describe('getResumoTags', () => {
  it('flags ORCAMENTO_A_FAZER when there is no active orcamento with items', () => {
    const p = pedido({ orcamentos: [orcamento({ itens: [] })] })
    expect(getResumoTags(p)).toContain('ORCAMENTO_A_FAZER')
  })
  it('flags FALTA_SINAL when there is an orcamento with items but nothing paid', () => {
    const p = pedido({ orcamentos: [orcamento({ itens: [item('bolo', 1)], total: 100 })], totalPago: 0 })
    expect(getResumoTags(p)).toContain('FALTA_SINAL')
  })
  it('does NOT flag FALTA_SINAL once a payment exists', () => {
    const p = pedido({ orcamentos: [orcamento({ itens: [item('bolo', 1)], total: 100 })], totalPago: 50 })
    expect(getResumoTags(p)).not.toContain('FALTA_SINAL')
  })
  it('does NOT flag FALTA_SINAL for an order that still needs an orcamento', () => {
    const p = pedido({ orcamentos: [], totalPago: 0 })
    const tags = getResumoTags(p)
    expect(tags).toContain('ORCAMENTO_A_FAZER')
    expect(tags).not.toContain('FALTA_SINAL')
  })
  it('flags CANCELADO and suppresses FALTA_SINAL', () => {
    const p = pedido({ status: 'CANCELADO', orcamentos: [orcamento({ itens: [item('bolo', 1)] })], totalPago: 0 })
    const tags = getResumoTags(p)
    expect(tags).toContain('CANCELADO')
    expect(tags).not.toContain('FALTA_SINAL')
  })
})

// --- computeOrderFinance ----------------------------------------------------

describe('computeOrderFinance', () => {
  it('sums orcamento total + frete and derives restante', () => {
    const p = pedido({
      orcamentos: [orcamento({ itens: [item('bolo', 1, 195)], total: 195 })],
      entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 23 },
      totalPago: 118,
    })
    const f = computeOrderFinance(p)
    expect(f.subtotal).toBe(195)
    expect(f.frete).toBe(23)
    expect(f.total).toBe(218)
    expect(f.sinal).toBe(118)
    expect(f.restante).toBe(100)
    expect(f.sinalPago).toBe(true)
  })
  it('never returns a negative restante', () => {
    const p = pedido({ orcamentos: [orcamento({ total: 50 })], totalPago: 80 })
    expect(computeOrderFinance(p).restante).toBe(0)
  })
  it('treats a missing active orcamento as zero', () => {
    const p = pedido({ orcamentos: [], totalPago: 0 })
    const f = computeOrderFinance(p)
    expect(f.total).toBe(0)
    expect(f.sinalPago).toBe(false)
  })
})

// --- groupPedidosByDeliveryDay ---------------------------------------------

describe('groupPedidosByDeliveryDay', () => {
  it('groups by delivery day, sorted ascending', () => {
    const a = pedido({ id: 'a', dataEntrega: ts(new Date(2026, 4, 20)) as any })
    const b = pedido({ id: 'b', dataEntrega: ts(new Date(2026, 4, 19)) as any })
    const c = pedido({ id: 'c', dataEntrega: ts(new Date(2026, 4, 20)) as any })
    const groups = groupPedidosByDeliveryDay([a, b, c])
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-05-19', '2026-05-20'])
    expect(groups[1].pedidos.map((p) => p.id)).toEqual(['a', 'c']) // input order preserved within a day
  })
  it('puts undated orders in a trailing sem-data bucket', () => {
    const a = pedido({ id: 'a', dataEntrega: ts(new Date(2026, 4, 20)) as any })
    const u = pedido({ id: 'u', dataEntrega: null as any })
    const groups = groupPedidosByDeliveryDay([u, a])
    const last = groups[groups.length - 1]
    expect(last.dayKey).toBe('sem-data')
    expect(last.date).toBeNull()
    expect(last.pedidos.map((p) => p.id)).toEqual(['u'])
  })
  it('returns no sem-data bucket when every order is dated', () => {
    const a = pedido({ id: 'a', dataEntrega: ts(new Date(2026, 4, 20)) as any })
    const groups = groupPedidosByDeliveryDay([a])
    expect(groups.some((g) => g.dayKey === 'sem-data')).toBe(false)
  })
  it('groups a legacy UTC-midnight delivery date under its own calendar day (no off-by-one)', () => {
    // Orders saved before the timezone fix stored dataEntrega as UTC midnight.
    // Grouping in local time (UTC-3) used to bucket this under 2026-05-19.
    const a = pedido({ id: 'a', dataEntrega: '2026-05-20T00:00:00.000Z' as any })
    const groups = groupPedidosByDeliveryDay([a])
    expect(groups.map((g) => g.dayKey)).toEqual(['2026-05-20'])
  })
})

// --- aggregateItems ---------------------------------------------------------

describe('aggregateItems', () => {
  it('sums quantities of items sharing a name (case/space-insensitive)', () => {
    const a = pedido({ id: 'a', clienteNome: 'Fernanda', numeroPedido: 'PED-1', dataEntrega: ts(new Date(2026, 4, 20)) as any, orcamentos: [orcamento({ itens: [item('Brigadeiro ao leite', 25)] })] })
    const b = pedido({ id: 'b', clienteNome: 'Viviane', numeroPedido: 'PED-2', dataEntrega: ts(new Date(2026, 4, 22)) as any, orcamentos: [orcamento({ itens: [item('brigadeiro ao leite ', 50)] })] })
    const agg = aggregateItems([a, b])
    expect(agg).toHaveLength(1)
    expect(agg[0].totalQuantidade).toBe(75)
    expect(agg[0].contribs).toHaveLength(2)
    expect(agg[0].contribs.map((c) => `${c.clienteNome}:${c.quantidade}`)).toEqual(['Fernanda:25', 'Viviane:50'])
  })
  it('keeps distinct item names separate, sorted by name', () => {
    const p = pedido({ orcamentos: [orcamento({ itens: [item('Pão de mel', 6), item('Beijinho', 25)] })] })
    const agg = aggregateItems([p])
    expect(agg.map((a) => a.nome)).toEqual(['Beijinho', 'Pão de mel'])
  })
  it('excludes items from cancelled orders', () => {
    const ok = pedido({ id: 'ok', orcamentos: [orcamento({ itens: [item('Bolo', 1)] })] })
    const cancelled = pedido({ id: 'x', status: 'CANCELADO', orcamentos: [orcamento({ itens: [item('Bolo', 5)] })] })
    const agg = aggregateItems([ok, cancelled])
    expect(agg).toHaveLength(1)
    expect(agg[0].totalQuantidade).toBe(1)
  })
  it('records the contributing order delivery date (or null)', () => {
    const p = pedido({ id: 'p', dataEntrega: null as any, orcamentos: [orcamento({ itens: [item('Bolo', 1)] })] })
    const agg = aggregateItems([p])
    expect(agg[0].contribs[0].dataEntrega).toBeNull()
  })
})

// --- display helpers --------------------------------------------------------

describe('formatResumoDayHeader', () => {
  it('formats as "dd/MM — Weekday" with a capitalised weekday', () => {
    // 2026-05-19 is a Tuesday.
    expect(formatResumoDayHeader(new Date(2026, 4, 19))).toBe('19/05 — Terça-feira')
  })
})

describe('formatEntregaResumo', () => {
  it('builds a delivery address line for ENTREGA', () => {
    const p = pedido({
      entrega: {
        tipo: 'ENTREGA',
        custoPorKm: 0,
        taxaExtra: 0,
        freteTotal: 0,
        enderecoEntrega: { id: 'a', endereco: 'Rua Malie Brenner', numero: '341', bairro: 'Centro' } as any,
      } as any,
    })
    const r = formatEntregaResumo(p)
    expect(r.label).toBe('Entrega')
    expect(r.detail).toBe('Rua Malie Brenner, 341, Centro')
  })

  it('uses the pickup location name for RETIRADA', () => {
    const p = pedido({
      entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0, enderecoRetiradaNome: 'Loja Sorella' } as any,
    })
    const r = formatEntregaResumo(p)
    expect(r.label).toBe('Retirada')
    expect(r.detail).toBe('Loja Sorella')
  })

  it('returns an empty detail when address data is missing', () => {
    const p = pedido({ entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 } as any })
    expect(formatEntregaResumo(p).detail).toBe('')
  })
})
