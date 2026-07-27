/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const toDataURLMock = vi.fn(async () => 'data:image/png;base64,QQ==')
vi.mock('qrcode', () => ({
  default: { toDataURL: (...args: any[]) => toDataURLMock(...args) },
}))

import { DanfeNfceThermalView } from '@/components/pedidos/DanfeNfceThermalView'
import type { Pedido } from '@/types/pedido'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function orcamento() {
  return {
    id: 'o1', versao: 1, isAtivo: true, status: 'APROVADO',
    itens: [{ id: 'i1', nome: 'Bolo de Uva', precoUnitario: 55.9, quantidade: 2, total: 111.8 }],
    subtotal: 111.8, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 111.8,
    criadoEm: ts(new Date(2026, 6, 1)), criadoPor: 'u1',
  }
}
function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1', numeroPedido: 'PED-0777', clienteNome: 'Cliente Loja',
    orcamentos: [orcamento()], pagamentos: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
    nfStatus: 'EMITIDA', nfModelo: 65, nfSerie: 1, nfNumero: 123,
    nfAccessKey: '35260730640317000153650010000001231234567890',
    nfQrCode: 'QRTEXT', nfUrlChave: 'https://consulta',
    nfEmittedAt: ts(new Date(2026, 6, 20, 14, 30)),
    ...overrides,
  } as Pedido
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DanfeNfceThermalView', () => {
  it('renders the letterhead, title, items and grouped chave', () => {
    render(<DanfeNfceThermalView pedido={pedido()} />)
    expect(screen.getByText('MOMENTO CAKE')).toBeInTheDocument()
    expect(screen.getByText('DANFE NFC-e')).toBeInTheDocument()
    expect(screen.getByText('Bolo de Uva')).toBeInTheDocument()
    expect(screen.getByText(/3526 0730 6403/)).toBeInTheDocument()
    expect(screen.getByText(/NFC-e nº 123 Série 1/)).toBeInTheDocument()
  })

  it('renders the QR image from qrcode.toDataURL', async () => {
    render(<DanfeNfceThermalView pedido={pedido()} />)
    await waitFor(() => {
      const img = screen.getByAltText('QR Code NFC-e') as HTMLImageElement
      expect(img).toBeInTheDocument()
      expect(img.src).toContain('data:image/png')
    })
    expect(toDataURLMock).toHaveBeenCalledWith('QRTEXT', expect.any(Object))
  })

  it('omits the QR when the order has no stored qrCode', async () => {
    render(<DanfeNfceThermalView pedido={pedido({ nfQrCode: null })} />)
    // Let any effects settle, then assert no QR image is present.
    await waitFor(() => expect(screen.getByText('DANFE NFC-e')).toBeInTheDocument())
    expect(screen.queryByAltText('QR Code NFC-e')).not.toBeInTheDocument()
    expect(toDataURLMock).not.toHaveBeenCalled()
  })

  it('marks an anonymous consumer', () => {
    render(<DanfeNfceThermalView pedido={pedido()} />)
    expect(screen.getByText(/CONSUMIDOR NÃO IDENTIFICADO/i)).toBeInTheDocument()
  })

  it('shows the SEM VALOR FISCAL banner for a homologação reprint', () => {
    render(<DanfeNfceThermalView pedido={pedido({ nfAmbiente: 'homologacao' })} />)
    expect(screen.getByText(/SEM VALOR FISCAL - HOMOLOGAÇÃO/i)).toBeInTheDocument()
  })

  it('omits the banner for a produção reprint', () => {
    render(<DanfeNfceThermalView pedido={pedido({ nfAmbiente: 'producao' })} />)
    expect(screen.queryByText(/SEM VALOR FISCAL/i)).not.toBeInTheDocument()
  })

  it('renders the protocolo line when stored, and omits it otherwise', () => {
    const { unmount } = render(
      <DanfeNfceThermalView pedido={pedido({ nfProtocolo: '135260000123456' })} />,
    )
    expect(screen.getByText(/Protocolo de Autorização: 135260000123456/i)).toBeInTheDocument()
    unmount()
    render(<DanfeNfceThermalView pedido={pedido({ nfProtocolo: null })} />)
    expect(screen.queryByText(/Protocolo de Autorização/i)).not.toBeInTheDocument()
  })

  it('renders item detail, discount, surcharge, freight and payment rows', () => {
    const withExtras = pedido({
      orcamentos: [
        {
          ...orcamento(),
          itens: [{ id: 'i1', nome: 'Bolo A', descricao: 'sem lactose', precoUnitario: 100, quantidade: 1, total: 100 }],
          desconto: 20, descontoTipo: 'valor', acrescimo: 5,
        },
      ],
      entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 15 },
      pagamentos: [{ id: 'pg1', data: ts(new Date(2026, 6, 20)), valor: 100, metodo: 'PIX', createdAt: ts(new Date(2026, 6, 20)), createdBy: 'u1' } as any],
    })
    render(<DanfeNfceThermalView pedido={withExtras} />)
    expect(screen.getByText('sem lactose')).toBeInTheDocument()
    expect(screen.getByText('Descontos')).toBeInTheDocument()
    expect(screen.getByText('Acréscimo')).toBeInTheDocument()
    expect(screen.getByText('Frete')).toBeInTheDocument()
    expect(screen.getByText('PIX')).toBeInTheDocument()
  })

  it('shows a placeholder and hides the consulta URL when absent', () => {
    render(<DanfeNfceThermalView pedido={pedido({ pagamentos: [], nfUrlChave: null })} />)
    expect(screen.getByText('Nenhum pagamento registrado.')).toBeInTheDocument()
    expect(screen.queryByText('https://consulta')).not.toBeInTheDocument()
  })

  it('renders without a QR when toDataURL fails', async () => {
    toDataURLMock.mockRejectedValueOnce(new Error('qr fail'))
    render(<DanfeNfceThermalView pedido={pedido()} />)
    await waitFor(() => expect(toDataURLMock).toHaveBeenCalled())
    expect(screen.queryByAltText('QR Code NFC-e')).not.toBeInTheDocument()
  })
})
