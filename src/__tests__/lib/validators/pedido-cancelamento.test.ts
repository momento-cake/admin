import { describe, it, expect } from 'vitest'
import { cancelamentoSchema, updatePedidoSchema } from '@/lib/validators/pedido'

describe('cancelamentoSchema', () => {
  it('accepts a valid preset cancellation', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'CLIENTE_DESISTIU',
      motivo: 'Cliente desistiu / solicitou cancelamento',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an OUTRO cancellation with free text', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'OUTRO',
      motivo: 'Endereço de entrega fora da área de cobertura',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty motivo', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'OUTRO',
      motivo: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a whitespace-only motivo', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'OUTRO',
      motivo: '    ',
    })
    expect(result.success).toBe(false)
  })

  it('rejects a motivo longer than 500 chars', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'OUTRO',
      motivo: 'x'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown categoria', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'NAO_EXISTE',
      motivo: 'algum motivo',
    })
    expect(result.success).toBe(false)
  })

  it('trims the motivo', () => {
    const result = cancelamentoSchema.safeParse({
      categoria: 'PEDIDO_DUPLICADO',
      motivo: '  duplicado  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.motivo).toBe('duplicado')
    }
  })
})

describe('updatePedidoSchema cancelamento integration', () => {
  it('carries a cancelamento alongside a status change', () => {
    const result = updatePedidoSchema.safeParse({
      status: 'CANCELADO',
      cancelamento: {
        categoria: 'PAGAMENTO_NAO_REALIZADO',
        motivo: 'Pagamento não realizado',
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.cancelamento?.categoria).toBe('PAGAMENTO_NAO_REALIZADO')
    }
  })

  it('treats cancelamento as optional for non-cancel updates', () => {
    const result = updatePedidoSchema.safeParse({ observacoes: 'nota' })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid embedded cancelamento', () => {
    const result = updatePedidoSchema.safeParse({
      status: 'CANCELADO',
      cancelamento: { categoria: 'OUTRO', motivo: '' },
    })
    expect(result.success).toBe(false)
  })
})
