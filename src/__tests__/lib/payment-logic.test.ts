import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  deriveStatusPagamento,
  calcularTotalPedido,
  defaultDataVencimento,
  roundCurrency,
  sumPagamentos,
  resolvePaymentFields,
} from '@/lib/payment-logic'
import type {
  Pagamento,
  Pedido,
  Orcamento,
} from '@/types/pedido'

const ts = (d: Date): Timestamp =>
  ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
  } as unknown as Timestamp)

describe('roundCurrency', () => {
  it('rounds to two decimals', () => {
    expect(roundCurrency(10.555)).toBe(10.56)
    expect(roundCurrency(10.554)).toBe(10.55)
    expect(roundCurrency(0.1 + 0.2)).toBe(0.3)
  })
})

describe('deriveStatusPagamento', () => {
  const vencFuture = new Date(2026, 5, 1) // June 1, 2026
  const vencPast = new Date(2026, 1, 1) // Feb 1, 2026
  const now = new Date(2026, 3, 15) // Apr 15, 2026

  it('returns PAGO when totalPago >= total', () => {
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 100, dataVencimento: vencFuture, now })
    ).toBe('PAGO')
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 101, dataVencimento: vencPast, now })
    ).toBe('PAGO')
  })

  it('returns PARCIAL when 0 < totalPago < total and not past vencimento', () => {
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 50, dataVencimento: vencFuture, now })
    ).toBe('PARCIAL')
  })

  it('returns VENCIDO when partially paid and past vencimento', () => {
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 50, dataVencimento: vencPast, now })
    ).toBe('VENCIDO')
  })

  it('returns VENCIDO when no payments and past vencimento', () => {
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 0, dataVencimento: vencPast, now })
    ).toBe('VENCIDO')
  })

  it('returns PENDENTE when no payments and before vencimento', () => {
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 0, dataVencimento: vencFuture, now })
    ).toBe('PENDENTE')
  })

  it('treats same-day vencimento as not vencido', () => {
    // vencimento === today: pedido is due TODAY, not yet overdue.
    const today = new Date(2026, 3, 15, 12, 0)
    const venc = new Date(2026, 3, 15, 0, 0)
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 0, dataVencimento: venc, now: today })
    ).toBe('PENDENTE')
  })

  it('returns PAGO even if past vencimento', () => {
    // Fully paid beats overdue.
    expect(
      deriveStatusPagamento({ total: 100, totalPago: 100, dataVencimento: vencPast, now })
    ).toBe('PAGO')
  })

  it('handles floating-point precision for fully-paid edge case', () => {
    const total = 0.1 + 0.2 // 0.30000000000000004
    const totalPago = 0.3
    expect(
      deriveStatusPagamento({ total, totalPago, dataVencimento: vencFuture, now })
    ).toBe('PAGO')
  })
})

// ---------------------------------------------------------------------------

describe('calcularTotalPedido', () => {
  const makeOrcamento = (total: number, isAtivo = true): Orcamento => ({
    id: 'o1',
    versao: 1,
    isAtivo,
    status: 'APROVADO',
    itens: [],
    subtotal: total,
    desconto: 0,
    descontoTipo: 'valor',
    acrescimo: 0,
    total,
    criadoEm: ts(new Date()),
    criadoPor: 'u1',
  })

  const baseEntrega = { tipo: 'RETIRADA' as const, custoPorKm: 0, taxaExtra: 0, freteTotal: 0 }

  const makePedido = (overrides: Partial<Pedido> = {}): Pedido =>
    ({
      id: 'p1',
      numeroPedido: 'PED-0001',
      publicToken: 't',
      clienteId: 'c',
      clienteNome: 'n',
      status: 'CONFIRMADO',
      orcamentos: [],
      pacotes: [],
      entrega: baseEntrega,
      pagamentos: [],
      totalPago: 0,
      dataVencimento: ts(new Date()),
      statusPagamento: 'PENDENTE',
      isActive: true,
      createdAt: ts(new Date()),
      updatedAt: ts(new Date()),
      createdBy: 'u',
      ...overrides,
    } as Pedido)

  it('returns active orcamento total + freteTotal', () => {
    const pedido = makePedido({
      orcamentos: [makeOrcamento(400)],
      entrega: { ...baseEntrega, tipo: 'ENTREGA', freteTotal: 50 },
    })
    expect(calcularTotalPedido(pedido)).toBe(450)
  })

  it('picks the active orcamento when multiple exist', () => {
    const pedido = makePedido({
      orcamentos: [
        makeOrcamento(300, false),
        makeOrcamento(500, true),
        makeOrcamento(1000, false),
      ],
    })
    expect(calcularTotalPedido(pedido)).toBe(500)
  })

  it('returns 0 when no active orcamento and no frete', () => {
    const pedido = makePedido({ orcamentos: [makeOrcamento(300, false)] })
    expect(calcularTotalPedido(pedido)).toBe(0)
  })

  it('returns just frete when no orcamentos', () => {
    const pedido = makePedido({
      entrega: { ...baseEntrega, freteTotal: 25 },
    })
    expect(calcularTotalPedido(pedido)).toBe(25)
  })
})

// ---------------------------------------------------------------------------

describe('defaultDataVencimento', () => {
  const createdAt = new Date(2026, 3, 15)

  it('returns dataEntrega when provided', () => {
    const entrega = new Date(2026, 3, 20)
    expect(defaultDataVencimento({ dataEntrega: entrega, createdAt }).getTime()).toBe(
      entrega.getTime()
    )
  })

  it('returns createdAt + 7 days when dataEntrega is null', () => {
    const result = defaultDataVencimento({ dataEntrega: null, createdAt })
    const expected = new Date(2026, 3, 22)
    expect(result.getTime()).toBe(expected.getTime())
  })

  it('returns createdAt + 7 days when dataEntrega is undefined', () => {
    const result = defaultDataVencimento({ dataEntrega: undefined, createdAt })
    expect(result.getTime()).toBe(new Date(2026, 3, 22).getTime())
  })
})

// ---------------------------------------------------------------------------

describe('sumPagamentos', () => {
  const mkPag = (valor: number): Pagamento =>
    ({
      id: 'x',
      data: ts(new Date()),
      valor,
      metodo: 'PIX',
      createdAt: ts(new Date()),
      createdBy: 'u',
    } as Pagamento)

  it('sums empty array to 0', () => {
    expect(sumPagamentos([])).toBe(0)
  })

  it('sums multiple payments', () => {
    expect(sumPagamentos([mkPag(100), mkPag(50), mkPag(25.55)])).toBe(175.55)
  })

  it('handles floating drift safely', () => {
    expect(sumPagamentos([mkPag(0.1), mkPag(0.2)])).toBe(0.3)
  })
})

// ---------------------------------------------------------------------------

describe('resolvePaymentFields', () => {
  const createdAt = new Date(2026, 3, 15)
  const now = new Date(2026, 3, 16)

  it('backfills all fields for a legacy pedido (no payment fields at all)', () => {
    const result = resolvePaymentFields({
      createdAt,
      dataEntrega: new Date(2026, 3, 20),
      total: 450,
      now,
    })
    expect(result.pagamentos).toEqual([])
    expect(result.totalPago).toBe(0)
    expect(result.dataVencimentoDate.getTime()).toBe(new Date(2026, 3, 20).getTime())
    expect(result.statusPagamento).toBe('PENDENTE')
  })

  it('uses createdAt + 7d when no delivery date is set', () => {
    const result = resolvePaymentFields({
      createdAt,
      dataEntrega: null,
      total: 100,
      now,
    })
    expect(result.dataVencimentoDate.getTime()).toBe(new Date(2026, 3, 22).getTime())
  })

  it('derives PARCIAL status from existing pagamentos', () => {
    const pag = {
      id: 'p1',
      data: ts(new Date(2026, 3, 14)),
      valor: 100,
      metodo: 'PIX',
      createdAt: ts(new Date(2026, 3, 14)),
      createdBy: 'u',
    } as unknown as Pagamento
    const result = resolvePaymentFields({
      createdAt,
      dataVencimento: new Date(2026, 3, 25),
      total: 200,
      pagamentos: [pag],
      now,
    })
    expect(result.totalPago).toBe(100)
    expect(result.statusPagamento).toBe('PARCIAL')
  })

  it('accepts Timestamp-like objects with toDate()', () => {
    const tsLike = { toDate: () => new Date(2026, 3, 25) }
    const result = resolvePaymentFields({
      createdAt: { toDate: () => createdAt } as unknown as Date,
      dataVencimento: tsLike,
      total: 100,
      now,
    })
    expect(result.dataVencimentoDate.getTime()).toBe(new Date(2026, 3, 25).getTime())
  })

  it('prefers explicit totalPago over sum of pagamentos (for denormalization)', () => {
    const result = resolvePaymentFields({
      createdAt,
      dataVencimento: new Date(2026, 5, 1),
      total: 100,
      totalPago: 75, // explicit, different from sum
      pagamentos: [],
      now,
    })
    expect(result.totalPago).toBe(75)
    expect(result.statusPagamento).toBe('PARCIAL')
  })

  it('flips to VENCIDO when overdue and not paid', () => {
    const result = resolvePaymentFields({
      createdAt,
      dataVencimento: new Date(2026, 1, 1), // Feb 1
      total: 200,
      now: new Date(2026, 3, 16), // Apr 16
    })
    expect(result.statusPagamento).toBe('VENCIDO')
  })
})
