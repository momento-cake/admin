import { describe, it, expect } from 'vitest'
import {
  createPagamentoSchema,
  updateVencimentoSchema,
  PAGAMENTO_METODO_VALUES,
  STATUS_PAGAMENTO_VALUES,
} from '@/lib/validators/payment'

describe('createPagamentoSchema', () => {
  const validPayload = {
    data: '2026-04-20T12:00:00.000Z',
    valor: 150,
    metodo: 'PIX' as const,
    observacao: 'Sinal',
  }

  it('accepts a complete valid payment payload', () => {
    const result = createPagamentoSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts a payload without observacao', () => {
    const { observacao: _o, ...rest } = validPayload
    const result = createPagamentoSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })

  it('rejects valor <= 0', () => {
    const zero = createPagamentoSchema.safeParse({ ...validPayload, valor: 0 })
    const negative = createPagamentoSchema.safeParse({ ...validPayload, valor: -10 })
    expect(zero.success).toBe(false)
    expect(negative.success).toBe(false)
  })

  it('rejects valor without two decimal precision being lost', () => {
    const result = createPagamentoSchema.safeParse({ ...validPayload, valor: 150.55 })
    expect(result.success).toBe(true)
  })

  it('rejects missing data field', () => {
    const { data: _d, ...rest } = validPayload
    const result = createPagamentoSchema.safeParse(rest)
    expect(result.success).toBe(false)
  })

  it('rejects invalid metodo', () => {
    const result = createPagamentoSchema.safeParse({ ...validPayload, metodo: 'INVALID' })
    expect(result.success).toBe(false)
  })

  it('accepts each allowed metodo', () => {
    for (const metodo of PAGAMENTO_METODO_VALUES) {
      const result = createPagamentoSchema.safeParse({ ...validPayload, metodo })
      expect(result.success, `metodo=${metodo}`).toBe(true)
    }
  })

  it('rejects observacao longer than 500 characters', () => {
    const long = 'x'.repeat(501)
    const result = createPagamentoSchema.safeParse({ ...validPayload, observacao: long })
    expect(result.success).toBe(false)
  })

  it('coerces string date into a Date object', () => {
    const result = createPagamentoSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toBeInstanceOf(Date)
    }
  })

  it('rejects non-parseable date strings', () => {
    const result = createPagamentoSchema.safeParse({ ...validPayload, data: 'not-a-date' })
    expect(result.success).toBe(false)
  })

  it('rejects future dates (data > today)', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 2)
    const result = createPagamentoSchema.safeParse({
      ...validPayload,
      data: tomorrow.toISOString(),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateVencimentoSchema', () => {
  it('accepts an ISO date string', () => {
    const result = updateVencimentoSchema.safeParse({ dataVencimento: '2026-06-01T00:00:00.000Z' })
    expect(result.success).toBe(true)
  })

  it('accepts a Date object directly', () => {
    const result = updateVencimentoSchema.safeParse({
      dataVencimento: new Date(2026, 5, 1),
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.dataVencimento).toBeInstanceOf(Date)
    }
  })

  it('rejects an invalid date', () => {
    const result = updateVencimentoSchema.safeParse({ dataVencimento: 'nope' })
    expect(result.success).toBe(false)
  })
})

describe('createPagamentoSchema — Date object input', () => {
  it('accepts a Date object for data (not just strings)', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const result = createPagamentoSchema.safeParse({
      data: yesterday,
      valor: 100,
      metodo: 'PIX',
    })
    expect(result.success).toBe(true)
  })
})

describe('STATUS_PAGAMENTO_VALUES', () => {
  it('contains the four expected statuses', () => {
    expect(STATUS_PAGAMENTO_VALUES).toEqual(['PENDENTE', 'PARCIAL', 'PAGO', 'VENCIDO'])
  })
})
