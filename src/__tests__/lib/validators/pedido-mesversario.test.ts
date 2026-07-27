import { describe, it, expect } from 'vitest'
import { createPedidoSchema, updatePedidoSchema } from '@/lib/validators/pedido'

const baseCreate = {
  clienteId: 'c1',
  clienteNome: 'Maria',
  entrega: { tipo: 'RETIRADA' as const },
}

describe('createPedidoSchema — mesversário fields', () => {
  it('accepts a payload without the milestone fields', () => {
    const result = createPedidoSchema.safeParse(baseCreate)
    expect(result.success).toBe(true)
  })

  it('accepts mesversarioId with a valid mesNumero (1..12)', () => {
    const result = createPedidoSchema.safeParse({
      ...baseCreate,
      mesversarioId: 'm1',
      mesNumero: 12,
    })
    expect(result.success).toBe(true)
  })

  it('rejects mesNumero below 1', () => {
    const result = createPedidoSchema.safeParse({ ...baseCreate, mesNumero: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects mesNumero above 12', () => {
    const result = createPedidoSchema.safeParse({ ...baseCreate, mesNumero: 13 })
    expect(result.success).toBe(false)
  })

  it('rejects a non-integer mesNumero', () => {
    const result = createPedidoSchema.safeParse({ ...baseCreate, mesNumero: 3.5 })
    expect(result.success).toBe(false)
  })
})

describe('updatePedidoSchema — mesversário back-reference', () => {
  it('accepts null to clear the milestone link', () => {
    const result = updatePedidoSchema.safeParse({ mesversarioId: null, mesNumero: null })
    expect(result.success).toBe(true)
  })

  it('accepts a milestone link', () => {
    const result = updatePedidoSchema.safeParse({ mesversarioId: 'm1', mesNumero: 4 })
    expect(result.success).toBe(true)
  })

  it('rejects an out-of-range mesNumero', () => {
    const result = updatePedidoSchema.safeParse({ mesNumero: 99 })
    expect(result.success).toBe(false)
  })
})
