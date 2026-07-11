/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildReciboModel,
  formatClientAddress,
  generateReciboPDF,
  loadLogoDataUrl,
} from '@/lib/pedido-recibo'

// 1x1 transparent PNG, used to exercise the logo-embedding branch.
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
import { COMPANY_INFO } from '@/lib/company-info'
import type { Pedido } from '@/types/pedido'
import type { Address, BusinessClient, PersonalClient } from '@/types/client'

// --- Fixtures ---------------------------------------------------------------

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}

function item(nome: string, quantidade: number, precoUnitario = 10, descricao?: string) {
  return {
    id: `${nome}-${quantidade}`,
    nome,
    descricao,
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
    numeroPedido: 'PED-0321',
    publicToken: 'tok',
    clienteId: 'c1',
    clienteNome: 'Cliente Snapshot',
    clienteTelefone: '11999990000',
    status: 'CONFIRMADO',
    orcamentos: [orcamento()],
    pacotes: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    pagamentos: [],
    totalPago: 0,
    dataVencimento: ts(new Date(2026, 6, 19)) as any,
    statusPagamento: 'PENDENTE',
    isActive: true,
    createdAt: ts(new Date(2026, 4, 29)) as any,
    updatedAt: ts(new Date(2026, 4, 29)) as any,
    createdBy: 'u1',
    ...overrides,
  } as Pedido
}

function personalClient(overrides: Partial<PersonalClient> = {}): PersonalClient {
  return {
    id: 'c1',
    type: 'person',
    name: 'Jaqueline Gomes Honorato',
    email: 'jaque@example.com',
    cpfCnpj: '41172571880',
    phone: '11988887777',
    contactMethods: [],
    addresses: [],
    isActive: true,
    createdAt: ts(new Date(2026, 0, 1)) as any,
    ...overrides,
  }
}

// --- formatClientAddress ----------------------------------------------------

describe('formatClientAddress', () => {
  it('joins the address parts into a single readable line', () => {
    const addr: Address = {
      id: 'a1',
      endereco: 'Rua Gastão Madeira',
      numero: '590',
      complemento: 'apto 64B',
      bairro: 'Vila Maria Alta',
      cidade: 'São Paulo',
      estado: 'SP',
      cep: '02131-080',
    }
    expect(formatClientAddress(addr)).toBe(
      'Rua Gastão Madeira, 590 - apto 64B - Vila Maria Alta - São Paulo - SP - CEP: 02131-080',
    )
  })

  it('omits missing parts gracefully', () => {
    const addr: Address = { id: 'a1', endereco: 'Rua X', numero: '10' }
    expect(formatClientAddress(addr)).toBe('Rua X, 10')
  })

  it('returns undefined when the address is undefined or empty', () => {
    expect(formatClientAddress(undefined)).toBeUndefined()
    expect(formatClientAddress({ id: 'a1' })).toBeUndefined()
  })
})

// --- buildReciboModel: company + meta ---------------------------------------

describe('buildReciboModel — company & meta', () => {
  it('uses the central company info and order metadata', () => {
    const model = buildReciboModel(pedido(), null)
    expect(model.company).toEqual(COMPANY_INFO)
    expect(model.numeroPedido).toBe('PED-0321')
    expect(model.emissao?.getFullYear()).toBe(2026)
    expect(model.dataVencimento?.getDate()).toBe(19)
  })

  it('captures the delivery summary (pickup)', () => {
    const model = buildReciboModel(
      pedido({
        entrega: {
          tipo: 'RETIRADA',
          custoPorKm: 0,
          taxaExtra: 0,
          freteTotal: 0,
          enderecoRetiradaNome: 'Loja Vila Maria',
        },
      }),
      null,
    )
    expect(model.entregaLabel).toBe('Retirada')
    expect(model.entregaDetalhe).toBe('Loja Vila Maria')
  })
})

// --- buildReciboModel: items -----------------------------------------------

describe('buildReciboModel — items', () => {
  it('maps active orçamento items with descriptions', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [
          orcamento({
            itens: [item('Bolo', 2, 55.9), item('Boleado', 25, 1.5, 'Leite Ninho c/ Nutella')],
          }),
        ],
      }),
      null,
    )
    expect(model.itens).toHaveLength(2)
    expect(model.itens[0]).toMatchObject({ nome: 'Bolo', quantidade: 2, precoUnitario: 55.9, total: 111.8 })
    expect(model.itens[1].descricao).toBe('Leite Ninho c/ Nutella')
  })

  it('normalizes an empty description to undefined', () => {
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: [item('X', 1, 5, '   ')] })] }),
      null,
    )
    expect(model.itens[0].descricao).toBeUndefined()
  })

  it('handles a missing active orçamento (empty items, zero totals)', () => {
    const model = buildReciboModel(pedido({ orcamentos: [] }), null)
    expect(model.itens).toEqual([])
    expect(model.totals.subtotal).toBe(0)
    expect(model.totals.valorLiquido).toBe(0)
  })
})

// --- buildReciboModel: totals ----------------------------------------------

describe('buildReciboModel — totals', () => {
  it('computes subtotal from item totals and adds frete', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 2, 100)] })],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 30 },
      }),
      null,
    )
    expect(model.totals.subtotal).toBe(200)
    expect(model.totals.frete).toBe(30)
    expect(model.totals.valorLiquido).toBe(230)
  })

  it('resolves an absolute (valor) discount', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [
          orcamento({ itens: [item('A', 1, 1787)], desconto: 187, descontoTipo: 'valor' }),
        ],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 30 },
      }),
      null,
    )
    expect(model.totals.descontoValor).toBe(187)
    expect(model.totals.valorLiquido).toBe(1787 - 187 + 30)
  })

  it('resolves a percentual discount against the subtotal', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [
          orcamento({ itens: [item('A', 1, 1000)], desconto: 10, descontoTipo: 'percentual' }),
        ],
      }),
      null,
    )
    expect(model.totals.descontoValor).toBe(100)
    expect(model.totals.valorLiquido).toBe(900)
  })

  it('includes acréscimo (surcharge)', () => {
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: [item('A', 1, 100)], acrescimo: 20 })] }),
      null,
    )
    expect(model.totals.acrescimo).toBe(20)
    expect(model.totals.valorLiquido).toBe(120)
  })
})

// --- buildReciboModel: client block ----------------------------------------

describe('buildReciboModel — client block', () => {
  it('prefers the full client record and formats the CPF', () => {
    const model = buildReciboModel(pedido(), personalClient())
    expect(model.client.nome).toBe('Jaqueline Gomes Honorato')
    expect(model.client.documento).toBe('411.725.718-80')
    expect(model.client.email).toBe('jaque@example.com')
    expect(model.client.telefone).toBe('(11) 98888-7777')
  })

  it('formats a business CNPJ from companyInfo when cpfCnpj is absent', () => {
    const business: BusinessClient = {
      id: 'c2',
      type: 'business',
      name: 'Talita Romancini Convites LTDA',
      contactMethods: [],
      companyInfo: { cnpj: '50836341000170', companyName: 'Talita Romancini' },
      representative: { name: 'Talita', email: 't@x.com', phone: '11' },
      isActive: true,
      createdAt: ts(new Date(2026, 0, 1)) as any,
    }
    const model = buildReciboModel(pedido(), business)
    expect(model.client.documento).toBe('50.836.341/0001-70')
  })

  it('falls back to the order snapshot when no client is provided', () => {
    const model = buildReciboModel(pedido(), null)
    expect(model.client.nome).toBe('Cliente Snapshot')
    expect(model.client.telefone).toBe('(11) 99999-0000')
    expect(model.client.documento).toBeUndefined()
    expect(model.client.email).toBeUndefined()
    expect(model.client.endereco).toBeUndefined()
  })

  it('formats the first client address', () => {
    const model = buildReciboModel(
      pedido(),
      personalClient({
        addresses: [
          { id: 'a1', endereco: 'Rua Samurais', numero: '25', bairro: 'Vila Maria Alta', cidade: 'São Paulo', estado: 'SP', cep: '02131-080' },
        ],
      }),
    )
    expect(model.client.endereco).toContain('Rua Samurais, 25')
    expect(model.client.endereco).toContain('CEP: 02131-080')
  })
})

// --- buildReciboModel: payments --------------------------------------------

describe('buildReciboModel — payments', () => {
  it('maps recorded payments with labels and computes the balance', () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 460.3) ] })],
        pagamentos: [
          { id: 'pg1', data: ts(new Date(2026, 6, 5)), valor: 230.15, metodo: 'PIX', observacao: 'sinal de 50%', createdAt: ts(new Date(2026, 6, 5)), createdBy: 'u1' } as any,
        ],
        totalPago: 230.15,
      }),
      null,
    )
    expect(model.pagamentos).toHaveLength(1)
    expect(model.pagamentos[0]).toMatchObject({ metodo: 'PIX', valor: 230.15, observacao: 'sinal de 50%' })
    expect(model.pagamentos[0].data?.getDate()).toBe(5)
    expect(model.totalPago).toBe(230.15)
    expect(model.restante).toBeCloseTo(230.15, 2)
  })

  it('handles no payments (full balance outstanding)', () => {
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: [item('A', 1, 100)] })], pagamentos: [], totalPago: 0 }),
      null,
    )
    expect(model.pagamentos).toEqual([])
    expect(model.restante).toBe(100)
  })

  it('never reports a negative balance when overpaid', () => {
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: [item('A', 1, 100)] })], totalPago: 150 }),
      null,
    )
    expect(model.restante).toBe(0)
  })

  it('falls back to the raw method code for an unknown payment method', () => {
    const model = buildReciboModel(
      pedido({
        pagamentos: [
          { id: 'pg1', data: ts(new Date(2026, 6, 5)), valor: 10, metodo: 'CRYPTO' as any, createdAt: ts(new Date(2026, 6, 5)), createdBy: 'u1' } as any,
        ],
      }),
      null,
    )
    expect(model.pagamentos[0].metodo).toBe('CRYPTO')
    expect(model.pagamentos[0].observacao).toBeUndefined()
  })
})

// --- buildReciboModel: telefone fallback ------------------------------------

describe('buildReciboModel — telefone edge cases', () => {
  it('leaves telefone undefined when neither client nor snapshot has one', () => {
    const model = buildReciboModel(
      pedido({ clienteTelefone: undefined }),
      personalClient({ phone: undefined }),
    )
    expect(model.client.telefone).toBeUndefined()
  })
})

// --- buildReciboModel: observações -----------------------------------------

describe('buildReciboModel — observações', () => {
  it('uses the client-facing notes (observacoesCliente)', () => {
    const model = buildReciboModel(pedido({ observacoesCliente: 'Retirada às 11:30' }), null)
    expect(model.observacoes).toBe('Retirada às 11:30')
  })

  it('never exposes the internal observacoes on the receipt', () => {
    const model = buildReciboModel(
      pedido({ observacoes: 'NOTA INTERNA: cliente caloteiro', observacoesCliente: undefined }),
      null,
    )
    expect(model.observacoes).toBeUndefined()
  })

  it('omits blank client notes', () => {
    const model = buildReciboModel(pedido({ observacoesCliente: '   ' }), null)
    expect(model.observacoes).toBeUndefined()
  })
})

// --- generateReciboPDF (drawing smoke tests) --------------------------------

describe('generateReciboPDF', () => {
  it('produces a non-empty PDF blob for a typical order', async () => {
    const model = buildReciboModel(
      pedido({
        orcamentos: [
          orcamento({
            itens: [item('Bolo', 2, 55.9), item('Boleado', 25, 1.5, 'Leite Ninho c/ Nutella')],
            desconto: 10,
            descontoTipo: 'valor',
          }),
        ],
        entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 30, enderecoRetiradaNome: '' },
        pagamentos: [
          { id: 'pg1', data: ts(new Date(2026, 6, 5)), valor: 100, metodo: 'PIX', observacao: 'sinal', createdAt: ts(new Date(2026, 6, 5)), createdBy: 'u1' } as any,
        ],
        totalPago: 100,
        observacoesCliente: 'Retirada às 11:30',
      }),
      personalClient({
        addresses: [{ id: 'a1', endereco: 'Rua Samurais', numero: '25', cidade: 'São Paulo', estado: 'SP', cep: '02131-080' }],
      }),
    )
    const blob = await generateReciboPDF(model, null)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('handles a long item list that overflows onto multiple pages', async () => {
    const many = Array.from({ length: 60 }, (_, i) => item(`Produto ${i}`, i + 1, 9.9, `Detalhe bem longo do item número ${i} para forçar quebra de linha`))
    const model = buildReciboModel(
      pedido({ orcamentos: [orcamento({ itens: many })] }),
      null,
    )
    const blob = await generateReciboPDF(model, null)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('renders when there are no payments and no observações', async () => {
    const model = buildReciboModel(pedido({ pagamentos: [], observacoes: undefined }), null)
    const blob = await generateReciboPDF(model, null)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('embeds the logo when a data URL is provided', async () => {
    const model = buildReciboModel(pedido({ orcamentos: [orcamento({ itens: [item('A', 1, 10)] })] }), null)
    const blob = await generateReciboPDF(model, TINY_PNG)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('does not throw on a malformed logo data URL', async () => {
    const model = buildReciboModel(pedido(), null)
    const blob = await generateReciboPDF(model, 'data:image/png;base64,not-a-real-image')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('renders the balance label without a due date when none is set', async () => {
    const model = buildReciboModel(pedido({ dataVencimento: undefined as any }), null)
    expect(model.dataVencimento).toBeNull()
    const blob = await generateReciboPDF(model, null)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('paginates via ensureSpace when a long observações block overflows', async () => {
    const longObs = Array.from({ length: 120 }, (_, i) => `Linha de observação número ${i} com bastante texto para ocupar espaço`).join(' ')
    const model = buildReciboModel(
      pedido({
        orcamentos: [orcamento({ itens: [item('A', 1, 10)] })],
        observacoesCliente: longObs,
      }),
      null,
    )
    const blob = await generateReciboPDF(model, null)
    expect(blob.size).toBeGreaterThan(0)
  })
})

// --- loadLogoDataUrl --------------------------------------------------------

describe('loadLogoDataUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves a data URL on a successful fetch', async () => {
    const blob = new Blob(['hello'], { type: 'image/png' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(blob) }))
    const result = await loadLogoDataUrl('/brand/logo.png')
    expect(result).toMatch(/^data:image\/png/)
  })

  it('returns null when the response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await loadLogoDataUrl('/brand/logo.png')).toBeNull()
  })

  it('returns null when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await loadLogoDataUrl('/brand/logo.png')).toBeNull()
  })
})
