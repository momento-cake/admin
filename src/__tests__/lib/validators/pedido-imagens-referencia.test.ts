import { describe, it, expect } from 'vitest'
import {
  pedidoImagemReferenciaSchema,
  createPedidoSchema,
  updatePedidoSchema,
} from '@/lib/validators/pedido'

const validImg = {
  url: 'https://storage.googleapis.com/bucket/images/gallery/pedido-referencias/1-abc.jpg',
  storagePath: 'images/gallery/pedido-referencias/1-abc.jpg',
  legenda: 'Topo do bolo',
  width: 800,
  height: 600,
}

const validEntrega = {
  tipo: 'RETIRADA' as const,
  custoPorKm: 0,
  taxaExtra: 0,
  freteTotal: 0,
}

describe('pedidoImagemReferenciaSchema', () => {
  it('accepts a complete valid reference image', () => {
    expect(pedidoImagemReferenciaSchema.safeParse(validImg).success).toBe(true)
  })

  it('accepts a minimal image (url + storagePath only)', () => {
    const result = pedidoImagemReferenciaSchema.safeParse({
      url: validImg.url,
      storagePath: validImg.storagePath,
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid url', () => {
    const result = pedidoImagemReferenciaSchema.safeParse({ ...validImg, url: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty storagePath', () => {
    const result = pedidoImagemReferenciaSchema.safeParse({ ...validImg, storagePath: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a legenda longer than 200 chars', () => {
    const result = pedidoImagemReferenciaSchema.safeParse({ ...validImg, legenda: 'x'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('keeps a provided id (for edits)', () => {
    const result = pedidoImagemReferenciaSchema.safeParse({ ...validImg, id: 'img-1' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.id).toBe('img-1')
  })
})

describe('createPedidoSchema imagensReferencia integration', () => {
  const base = {
    clienteId: 'c1',
    clienteNome: 'Maria',
    entrega: validEntrega,
    orcamentos: [{ itens: [{ nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }] }],
  }

  it('accepts a create payload with reference images', () => {
    const result = createPedidoSchema.safeParse({ ...base, imagensReferencia: [validImg, validImg] })
    expect(result.success).toBe(true)
  })

  it('treats imagensReferencia as optional', () => {
    expect(createPedidoSchema.safeParse(base).success).toBe(true)
  })

  it('rejects more than 30 images', () => {
    const many = Array.from({ length: 31 }, () => validImg)
    const result = createPedidoSchema.safeParse({ ...base, imagensReferencia: many })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid embedded image', () => {
    const result = createPedidoSchema.safeParse({
      ...base,
      imagensReferencia: [{ url: 'bad', storagePath: '' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('updatePedidoSchema imagensReferencia integration', () => {
  it('carries imagensReferencia on a partial update', () => {
    const result = updatePedidoSchema.safeParse({ imagensReferencia: [validImg] })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.imagensReferencia).toHaveLength(1)
  })

  it('accepts an empty array (clearing all images)', () => {
    const result = updatePedidoSchema.safeParse({ imagensReferencia: [] })
    expect(result.success).toBe(true)
  })
})
