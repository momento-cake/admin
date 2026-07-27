/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest'
import {
  buildDanfeNfce,
  buildDanfeNfceModel,
  formatChaveAcesso,
  makeQrImageData,
} from '@/lib/danfe-nfce-thermal'
import { encodeText } from '@/lib/escpos'
import type { Pedido } from '@/types/pedido'
import type { FiscalEmitResult } from '@/lib/fiscal/types'

// --- Fixtures ---------------------------------------------------------------

const CHAVE = '35260730640317000153650010000001231234567890' // 44 digits
const QR_TEXT =
  'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=' + CHAVE + '|2|2|1|abcdef0123456789'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function item(nome: string, quantidade: number, precoUnitario = 10, descricao?: string) {
  return { id: `${nome}-${quantidade}`, nome, descricao, precoUnitario, quantidade, total: precoUnitario * quantidade }
}
function orcamento(overrides: Record<string, any> = {}) {
  return {
    id: 'orc-1', versao: 1, isAtivo: true, status: 'APROVADO', itens: [item('Bolo de Cenoura', 1, 120)],
    subtotal: 0, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 0,
    criadoEm: ts(new Date(2026, 4, 1)), criadoPor: 'u1', ...overrides,
  }
}
function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1', numeroPedido: 'PED-0777', publicToken: 'tok',
    clienteId: 'c1', clienteNome: 'Cliente Loja', clienteTelefone: '11999990000',
    status: 'CONFIRMADO', orcamentos: [orcamento()], pacotes: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [{ id: 'pg1', data: ts(new Date(2026, 6, 20)), valor: 120, metodo: 'PIX', createdAt: ts(new Date(2026, 6, 20)), createdBy: 'u1' } as any],
    totalPago: 120,
    dataVencimento: ts(new Date(2026, 6, 19)) as any, statusPagamento: 'PAGO',
    isActive: true, createdAt: ts(new Date(2026, 6, 20)) as any,
    updatedAt: ts(new Date(2026, 6, 20)) as any, createdBy: 'u1', ...overrides,
  } as Pedido
}
function emitResult(overrides: Partial<FiscalEmitResult> = {}): FiscalEmitResult {
  return {
    status: 'AUTORIZADA',
    modelo: 65,
    serie: 1,
    numero: 123,
    accessKey: CHAVE,
    protocolo: '135260000123456',
    qrCode: QR_TEXT,
    urlChave: 'https://www.nfce.fazenda.sp.gov.br/consulta',
    emittedAt: new Date(2026, 6, 20, 14, 30),
    ...overrides,
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

/** True if the stream carries a GS v 0 raster header (an embedded bitmap). */
function hasRaster(b: Uint8Array): boolean {
  for (let i = 0; i + 3 <= b.length; i++) {
    if (b[i] === 0x1d && b[i + 1] === 0x76 && b[i + 2] === 0x30) return true
  }
  return false
}

// --- buildDanfeNfceModel ----------------------------------------------------

describe('buildDanfeNfceModel', () => {
  it('maps items, unit price and subtotal from the active orçamento', () => {
    const model = buildDanfeNfceModel(
      pedido({ orcamentos: [orcamento({ itens: [item('Bolo de Uva', 2, 55.9)] })] }),
      emitResult(),
    )
    expect(model.itens).toEqual([
      { quantidade: 2, nome: 'Bolo de Uva', descricao: undefined, precoUnitario: 55.9, total: 111.8 },
    ])
    expect(model.totals.produtos).toBeCloseTo(111.8)
    expect(model.totals.total).toBeCloseTo(111.8)
  })

  it('recomputes totals with discount, surcharge and freight', () => {
    const model = buildDanfeNfceModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 100)], desconto: 20, descontoTipo: 'valor', acrescimo: 5 })],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 15 },
      }),
      emitResult(),
    )
    expect(model.totals.produtos).toBe(100)
    expect(model.totals.desconto).toBe(20)
    expect(model.totals.acrescimo).toBe(5)
    expect(model.totals.frete).toBe(15)
    expect(model.totals.total).toBe(100) // 100 - 20 + 5 + 15
  })

  it('resolves a percentage discount to an absolute value', () => {
    const model = buildDanfeNfceModel(
      pedido({ orcamentos: [orcamento({ itens: [item('A', 1, 200)], desconto: 10, descontoTipo: 'percentual' })] }),
      emitResult(),
    )
    expect(model.totals.desconto).toBeCloseTo(20)
    expect(model.totals.total).toBeCloseTo(180)
  })

  it('carries the chave, protocolo, urlChave, qrCode, série and número from the result', () => {
    const model = buildDanfeNfceModel(pedido(), emitResult())
    expect(model.chaveAcesso).toBe(CHAVE)
    expect(model.protocolo).toBe('135260000123456')
    expect(model.urlChave).toBe('https://www.nfce.fazenda.sp.gov.br/consulta')
    expect(model.qrCode).toBe(QR_TEXT)
    expect(model.serie).toBe(1)
    expect(model.numero).toBe(123)
    expect(model.emitidaEm).toEqual(new Date(2026, 6, 20, 14, 30))
  })

  it('maps payments to labelled forms', () => {
    const model = buildDanfeNfceModel(pedido(), emitResult())
    expect(model.pagamentos).toEqual([{ metodo: 'PIX', valor: 120 }])
  })

  it('defaults to producao ambiente and an anonymous consumer', () => {
    const model = buildDanfeNfceModel(pedido(), emitResult())
    expect(model.ambiente).toBe('producao')
    expect(model.consumidor).toEqual({})
  })

  it('honours a homologação ambiente and an identified consumer', () => {
    const model = buildDanfeNfceModel(pedido(), emitResult(), {
      ambiente: 'homologacao',
      consumidor: { nome: 'Fulano', cpf: '123.456.789-09' },
    })
    expect(model.ambiente).toBe('homologacao')
    expect(model.consumidor).toEqual({ nome: 'Fulano', cpf: '123.456.789-09' })
  })

  it('tolerates a missing active orçamento and missing result fields', () => {
    const model = buildDanfeNfceModel(
      pedido({ orcamentos: [], pagamentos: [] }),
      emitResult({ accessKey: undefined, protocolo: undefined, qrCode: undefined, urlChave: undefined }),
    )
    expect(model.itens).toEqual([])
    expect(model.totals.total).toBe(0)
    expect(model.chaveAcesso).toBe('')
    expect(model.protocolo).toBe('')
    expect(model.qrCode).toBe('')
    expect(model.pagamentos).toEqual([])
  })
})

// --- formatChaveAcesso ------------------------------------------------------

describe('formatChaveAcesso', () => {
  it('breaks the 44-digit key into space-separated groups of four', () => {
    expect(formatChaveAcesso(CHAVE)).toBe(
      '3526 0730 6403 1700 0153 6500 1000 0001 2312 3456 7890',
    )
  })

  it('strips non-digits before grouping', () => {
    expect(formatChaveAcesso('3526 0730-6403')).toBe('3526 0730 6403')
  })
})

// --- buildDanfeNfce ---------------------------------------------------------

describe('buildDanfeNfce', () => {
  const fakeQr = (): ImageData => {
    const data = new Uint8ClampedArray(16 * 16 * 4).fill(0)
    for (let i = 3; i < data.length; i += 4) data[i] = 255 // opaque black
    return { width: 16, height: 16, data, colorSpace: 'srgb' } as unknown as ImageData
  }

  it('returns ESC/POS bytes starting with init + codepage', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(Array.from(bytes.slice(0, 5))).toEqual([0x1b, 0x40, 0x1b, 0x74, 0x02])
  })

  it('ends with a paper cut', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    expect(Array.from(bytes.slice(-3))).toEqual([0x1d, 0x56, 0x00])
  })

  it('prints the letterhead and the DANFE NFC-e title', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    expect(contains(bytes, 'MOMENTO CAKE')).toBe(true)
    expect(contains(bytes, 'CNPJ: 30.640.317/0001-53')).toBe(true)
    expect(contains(bytes, 'DANFE NFC-e')).toBe(true)
    expect(contains(bytes, 'Documento Auxiliar da NFC-e')).toBe(true)
  })

  it('lists items and totals', () => {
    const model = buildDanfeNfceModel(
      pedido({ orcamentos: [orcamento({ itens: [item('Bolo de Uva', 2, 55.9)] })] }),
      emitResult(),
    )
    const bytes = buildDanfeNfce(model, fakeQr())
    expect(contains(bytes, 'Bolo de Uva')).toBe(true)
    expect(contains(bytes, '2 x R$ 55,90')).toBe(true)
    expect(contains(bytes, 'R$ 111,80')).toBe(true)
    expect(contains(bytes, 'VALOR TOTAL')).toBe(true)
  })

  it('renders the payment form and value', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    expect(contains(bytes, 'FORMA DE PAGAMENTO')).toBe(true)
    expect(contains(bytes, 'PIX')).toBe(true)
  })

  it('shows a placeholder when there are no payments', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido({ pagamentos: [] }), emitResult()), fakeQr())
    expect(contains(bytes, 'Nenhum pagamento registrado.')).toBe(true)
  })

  it('prints the fiscal block: chave (grouped), urlChave and protocolo', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    expect(contains(bytes, 'Consulte pela Chave de Acesso em')).toBe(true)
    expect(contains(bytes, 'https://www.nfce.fazenda.sp.gov.br/consulta')).toBe(true)
    expect(contains(bytes, '3526 0730 6403')).toBe(true) // grouped chave
    expect(contains(bytes, 'Protocolo de Autorizacao')).toBe(true)
    expect(contains(bytes, '135260000123456')).toBe(true)
    expect(contains(bytes, 'NFC-e no. 123 Serie 1')).toBe(true)
  })

  it('embeds the QR raster when an ImageData is supplied', () => {
    const withQr = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), fakeQr())
    const withoutQr = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), null)
    expect(hasRaster(withQr)).toBe(true)
    expect(hasRaster(withoutQr)).toBe(false)
  })

  it('still renders without a QR (null) and without throwing', () => {
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), null)
    expect(bytes.length).toBeGreaterThan(0)
    expect(contains(bytes, 'DANFE NFC-e')).toBe(true)
  })

  it('embeds a logo raster when provided alongside the QR', () => {
    const logoData = new Uint8ClampedArray(8 * 2 * 4).fill(0)
    for (let i = 3; i < logoData.length; i += 4) logoData[i] = 255
    const logo = { width: 8, height: 2, data: logoData, colorSpace: 'srgb' } as unknown as ImageData
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), null, logo)
    expect(hasRaster(bytes)).toBe(true)
  })

  it('prints the SEM VALOR FISCAL banner only in homologação', () => {
    const homolog = buildDanfeNfce(
      buildDanfeNfceModel(pedido(), emitResult(), { ambiente: 'homologacao' }),
      null,
    )
    expect(contains(homolog, 'SEM VALOR FISCAL - HOMOLOGACAO')).toBe(true)
    const producao = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), null)
    expect(contains(producao, 'SEM VALOR FISCAL')).toBe(false)
  })

  it('renders item detail lines plus discount, surcharge and freight rows', () => {
    const model = buildDanfeNfceModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 100, 'sem lactose')], desconto: 20, descontoTipo: 'valor', acrescimo: 5 })],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 15 },
      }),
      emitResult(),
    )
    const bytes = buildDanfeNfce(model, null)
    expect(contains(bytes, 'sem lactose')).toBe(true)
    expect(contains(bytes, 'Descontos')).toBe(true)
    expect(contains(bytes, 'Acrescimo')).toBe(true)
    expect(contains(bytes, 'Frete')).toBe(true)
  })

  it('omits the urlChave and protocolo lines when the result lacks them', () => {
    const bytes = buildDanfeNfce(
      buildDanfeNfceModel(pedido(), emitResult({ urlChave: undefined, protocolo: undefined })),
      null,
    )
    expect(contains(bytes, 'Consulte pela Chave de Acesso em')).toBe(true)
    expect(contains(bytes, 'Protocolo de Autorizacao')).toBe(false)
  })

  it('marks an anonymous consumer, or the CPF when identified', () => {
    const anon = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), null)
    expect(contains(anon, 'CONSUMIDOR NAO IDENTIFICADO')).toBe(true)
    const named = buildDanfeNfce(
      buildDanfeNfceModel(pedido(), emitResult(), { consumidor: { nome: 'Fulano', cpf: '123.456.789-09' } }),
      null,
    )
    expect(contains(named, 'CONSUMIDOR CPF: 123.456.789-09')).toBe(true)
    expect(contains(named, 'Fulano')).toBe(true)
  })
})

// --- makeQrImageData --------------------------------------------------------

describe('makeQrImageData', () => {
  it('produces a square, byte-aligned bitmap with black and white pixels', async () => {
    const img = await makeQrImageData(QR_TEXT)
    expect(img.width).toBe(img.height)
    expect(img.width % 8).toBe(0)
    expect(img.width).toBeLessThanOrEqual(384)
    expect(img.data.length).toBe(img.width * img.height * 4)

    // Contains both dark modules (black) and quiet-zone / light (white) pixels.
    let hasBlack = false
    let hasWhite = false
    for (let i = 0; i < img.data.length; i += 4) {
      if (img.data[i] === 0) hasBlack = true
      else if (img.data[i] === 255) hasWhite = true
      if (hasBlack && hasWhite) break
    }
    expect(hasBlack).toBe(true)
    expect(hasWhite).toBe(true)
    // Every pixel is fully opaque.
    expect(img.data[3]).toBe(255)
  })

  it('honours a smaller target size', async () => {
    const img = await makeQrImageData(QR_TEXT, 200)
    expect(img.width).toBeLessThanOrEqual(200)
    expect(img.width % 8).toBe(0)
  })

  it('round-trips through buildDanfeNfce as an embedded raster', async () => {
    const qr = await makeQrImageData(QR_TEXT)
    const bytes = buildDanfeNfce(buildDanfeNfceModel(pedido(), emitResult()), qr)
    expect(hasRaster(bytes)).toBe(true)
  })

  it('uses the native ImageData constructor when available (browser path)', async () => {
    class FakeImageData {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    }
    vi.stubGlobal('ImageData', FakeImageData as any)
    try {
      const img = await makeQrImageData(QR_TEXT)
      expect(img).toBeInstanceOf(FakeImageData as any)
      expect(img.width).toBe(img.height)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
