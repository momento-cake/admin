/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildThermalReceipt, loadLogoImageData } from '@/lib/pedido-recibo-thermal'
import { buildReciboModel } from '@/lib/pedido-recibo'
import { encodeText } from '@/lib/escpos'
import type { Pedido } from '@/types/pedido'
import type { PersonalClient } from '@/types/client'

// --- Fixtures ---------------------------------------------------------------

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function item(nome: string, quantidade: number, precoUnitario = 10, descricao?: string) {
  return { id: `${nome}-${quantidade}`, nome, descricao, precoUnitario, quantidade, total: precoUnitario * quantidade }
}
function orcamento(overrides: Record<string, any> = {}) {
  return {
    id: 'orc-1', versao: 1, isAtivo: true, status: 'APROVADO', itens: [],
    subtotal: 0, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 0,
    criadoEm: ts(new Date(2026, 4, 1)), criadoPor: 'u1', ...overrides,
  }
}
function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1', numeroPedido: 'PED-0321', publicToken: 'tok',
    clienteId: 'c1', clienteNome: 'Cliente Snapshot', clienteTelefone: '11999990000',
    status: 'CONFIRMADO', orcamentos: [orcamento()], pacotes: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [], totalPago: 0,
    dataVencimento: ts(new Date(2026, 6, 19)) as any, statusPagamento: 'PENDENTE',
    isActive: true, createdAt: ts(new Date(2026, 4, 29)) as any,
    updatedAt: ts(new Date(2026, 4, 29)) as any, createdBy: 'u1', ...overrides,
  } as Pedido
}
function personalClient(overrides: Partial<PersonalClient> = {}): PersonalClient {
  return {
    id: 'c1', type: 'person', name: 'Jaqueline Gomes Honorato',
    email: 'jaque@example.com', cpfCnpj: '41172571880', phone: '11988887777',
    contactMethods: [], addresses: [], isActive: true,
    createdAt: ts(new Date(2026, 0, 1)) as any, ...overrides,
  }
}

/** True if the ESC/POS byte stream contains the contiguous encoding of `str`. */
function contains(buf: Uint8Array, str: string): boolean {
  const needle = encodeText(str)
  outer: for (let i = 0; i + needle.length <= buf.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (buf[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

// --- Tests ------------------------------------------------------------------

describe('buildThermalReceipt', () => {
  it('returns ESC/POS bytes starting with init + codepage', () => {
    const bytes = buildThermalReceipt(buildReciboModel(pedido(), null), null)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(Array.from(bytes.slice(0, 5))).toEqual([0x1b, 0x40, 0x1b, 0x74, 0x02])
  })

  it('ends with a paper cut', () => {
    const bytes = buildThermalReceipt(buildReciboModel(pedido(), null), null)
    expect(Array.from(bytes.slice(-3))).toEqual([0x1d, 0x56, 0x00])
  })

  it('includes the company letterhead', () => {
    const bytes = buildThermalReceipt(buildReciboModel(pedido(), null), null)
    expect(contains(bytes, 'MOMENTO CAKE')).toBe(true)
    expect(contains(bytes, 'CNPJ: 30.640.317/0001-53')).toBe(true)
    expect(contains(bytes, 'contato@momentocake.com.br')).toBe(true)
  })

  it('includes the order number and full client details', () => {
    const model = buildReciboModel(
      pedido(),
      personalClient({
        addresses: [{ id: 'a1', endereco: 'Rua Samurais', numero: '25', cidade: 'São Paulo', estado: 'SP', cep: '02131-080' }],
      }),
    )
    const bytes = buildThermalReceipt(model, null)
    expect(contains(bytes, 'VENDA PED-0321')).toBe(true)
    expect(contains(bytes, 'Jaqueline Gomes Honorato')).toBe(true)
    expect(contains(bytes, 'CPF/CNPJ: 411.725.718-80')).toBe(true)
    expect(contains(bytes, 'Rua Samurais')).toBe(true)
  })

  it('lists items with quantity, unit price and subtotal', () => {
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: [item('Bolo de Uva', 2, 55.9)] })] }),
      null,
    )
    const bytes = buildThermalReceipt(model, null)
    expect(contains(bytes, 'Bolo de Uva')).toBe(true)
    expect(contains(bytes, '2 x R$ 55,90')).toBe(true)
    expect(contains(bytes, 'R$ 111,80')).toBe(true)
  })

  it('renders totals and the liquid value', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 100)], desconto: 20, descontoTipo: 'valor' })],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 15 },
      }),
      null,
    )
    const bytes = buildThermalReceipt(model, null)
    expect(contains(bytes, 'Subtotal')).toBe(true)
    expect(contains(bytes, 'Descontos')).toBe(true)
    expect(contains(bytes, 'Frete')).toBe(true)
    expect(contains(bytes, 'VALOR LIQUIDO')).toBe(true)
    expect(contains(bytes, 'R$ 95,00')).toBe(true) // 100 - 20 + 15
  })

  it('lists recorded payments and the balance', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 460.3)] })],
        pagamentos: [{ id: 'pg1', data: ts(new Date(2026, 6, 5)), valor: 230.15, metodo: 'PIX', observacao: 'sinal', createdAt: ts(new Date(2026, 6, 5)), createdBy: 'u1' } as any],
        totalPago: 230.15,
      }),
      null,
    )
    const bytes = buildThermalReceipt(model, null)
    expect(contains(bytes, 'CONDICAO DE PAGAMENTO')).toBe(true)
    expect(contains(bytes, 'PIX')).toBe(true)
    expect(contains(bytes, 'Total pago')).toBe(true)
    expect(contains(bytes, 'Saldo')).toBe(true)
  })

  it('shows a placeholder when there are no payments', () => {
    const bytes = buildThermalReceipt(buildReciboModel(pedido({ pagamentos: [] }), null), null)
    expect(contains(bytes, 'Nenhum pagamento registrado.')).toBe(true)
  })

  it('includes client-facing observações when present and omits the section otherwise', () => {
    const withObs = buildThermalReceipt(buildReciboModel(pedido({ observacoesCliente: 'Retirada as 11h' }), null), null)
    expect(contains(withObs, 'OBSERVACOES')).toBe(true)
    expect(contains(withObs, 'Retirada as 11h')).toBe(true)
    const without = buildThermalReceipt(buildReciboModel(pedido({ observacoesCliente: undefined }), null), null)
    expect(contains(without, 'OBSERVACOES')).toBe(false)
  })

  it('never prints the internal observacoes', () => {
    const bytes = buildThermalReceipt(
      buildReciboModel(pedido({ observacoes: 'NOTA INTERNA secreta', observacoesCliente: undefined }), null),
      null,
    )
    expect(contains(bytes, 'NOTA INTERNA')).toBe(false)
  })

  it('handles a missing active orçamento without throwing', () => {
    const bytes = buildThermalReceipt(buildReciboModel(pedido({ orcamentos: [] }), null), null)
    expect(bytes.length).toBeGreaterThan(0)
    expect(contains(bytes, 'VALOR LIQUIDO')).toBe(true)
  })

  it('renders item detail, delivery date, acréscimo and a no-due-date balance', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 100, 'sem lactose')], acrescimo: 20 })],
        entrega: {
          tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 10,
          enderecoEntrega: { id: 'a', endereco: 'Rua X', numero: '1', bairro: 'Centro', cidade: 'São Paulo' },
        },
        dataEntrega: ts(new Date(2026, 5, 3)) as any,
        dataVencimento: undefined as any,
      }),
      null,
    )
    const bytes = buildThermalReceipt(model, null)
    expect(contains(bytes, 'Entrega:')).toBe(true)
    expect(contains(bytes, 'Data de entrega:')).toBe(true)
    expect(contains(bytes, 'sem lactose')).toBe(true)
    expect(contains(bytes, 'Acrescimo')).toBe(true)
    expect(contains(bytes, 'Saldo restante')).toBe(true) // no "vence" suffix
  })

  it('embeds the logo raster when an ImageData is provided', () => {
    const data = new Uint8ClampedArray(8 * 2 * 4).fill(0)
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque black
    const logo = { width: 8, height: 2, data, colorSpace: 'srgb' } as unknown as ImageData
    const withLogo = buildThermalReceipt(buildReciboModel(pedido(), null), logo)
    const withoutLogo = buildThermalReceipt(buildReciboModel(pedido(), null), null)
    // GS v 0 raster header present only with a logo
    const rasterHeader = [0x1d, 0x76, 0x30]
    const has = (b: Uint8Array) => {
      for (let i = 0; i + 3 <= b.length; i++) if (b[i] === rasterHeader[0] && b[i + 1] === rasterHeader[1] && b[i + 2] === rasterHeader[2]) return true
      return false
    }
    expect(has(withLogo)).toBe(true)
    expect(has(withoutLogo)).toBe(false)
  })
})

// --- loadLogoImageData (browser helper) -------------------------------------

class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 396
  naturalHeight = 128
  set src(_v: string) {
    setTimeout(() => this.onload && this.onload(), 0)
  }
}

describe('loadLogoImageData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function stubCanvas(ctx: any) {
    const canvas: any = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(ctx) }
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: any) =>
      tag === 'canvas' ? canvas : realCreate(tag),
    )
    return canvas
  }

  it('returns ImageData drawn on a white background', async () => {
    const fakeData = { width: 384, height: 124 } as unknown as ImageData
    const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn(), getImageData: vi.fn().mockReturnValue(fakeData) }
    stubCanvas(ctx)
    vi.stubGlobal('Image', FakeImage as any)

    const result = await loadLogoImageData('/brand/logo.png', 384)
    expect(result).toBe(fakeData)
    expect(ctx.fillRect).toHaveBeenCalled() // white background painted first
    expect(ctx.drawImage).toHaveBeenCalled()
  })

  it('returns null when the 2D context is unavailable', async () => {
    stubCanvas(null)
    vi.stubGlobal('Image', FakeImage as any)
    expect(await loadLogoImageData('/brand/logo.png')).toBeNull()
  })

  it('returns null when the image fails to load', async () => {
    class FailImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_v: string) {
        setTimeout(() => this.onerror && this.onerror(), 0)
      }
    }
    vi.stubGlobal('Image', FailImage as any)
    expect(await loadLogoImageData('/brand/logo.png')).toBeNull()
  })
})
