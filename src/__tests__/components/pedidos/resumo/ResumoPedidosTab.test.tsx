/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumoPedidosTab } from '@/components/pedidos/resumo/ResumoPedidosTab'
import type { Pedido } from '@/types/pedido'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function orc(itens: any[], total = 0) {
  return { id: 'o', versao: 1, isAtivo: true, status: 'APROVADO', itens, subtotal: total, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total, criadoEm: ts(new Date()), criadoPor: 'u' }
}
function pedido(over: Partial<Pedido> & Record<string, any>): Pedido {
  return {
    id: 'p', numeroPedido: 'PED-1', publicToken: 't', clienteId: 'c', clienteNome: 'Rafaela',
    status: 'CONFIRMADO', orcamentos: [orc([{ id: 'i', nome: 'Bolo 1kg', precoUnitario: 195, quantidade: 1, total: 195 }], 195)],
    pacotes: [], entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 23, enderecoEntrega: { id: 'a', endereco: 'Rua X', numero: '10' } } as any,
    pagamentos: [], totalPago: 118, dataVencimento: ts(new Date()) as any, statusPagamento: 'PARCIAL',
    isActive: true, createdAt: ts(new Date()) as any, updatedAt: ts(new Date()) as any,
    dataEntrega: ts(new Date(2026, 4, 19)) as any, createdBy: 'u', ...over,
  } as Pedido
}

describe('ResumoPedidosTab', () => {
  it('renders a day header per delivery day and a trailing "Data a definir" group', () => {
    render(
      <ResumoPedidosTab
        pedidos={[
          pedido({ id: 'a', dataEntrega: ts(new Date(2026, 4, 19)) as any }),
          pedido({ id: 'u', clienteNome: 'Sem Data', dataEntrega: null as any }),
        ]}
      />
    )
    expect(screen.getByText('19/05 — Terça-feira')).toBeInTheDocument()
    expect(screen.getByText('Data a definir')).toBeInTheDocument()
  })

  it('hides prices by default and reveals them on toggle', async () => {
    const user = userEvent.setup()
    render(<ResumoPedidosTab pedidos={[pedido({ id: 'a' })]} />)

    // No price/total visible initially.
    expect(screen.queryByText(/Total:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mostrar valores/i }))

    expect(screen.getByText(/Total:/)).toBeInTheDocument()
    expect(screen.getByText(/Restante:/)).toBeInTheDocument()
    // Frete bullet appears with prices on.
    expect(screen.getByText(/Frete:/)).toBeInTheDocument()
  })

  it('shows the ORÇAMENTO A FAZER state and a CANCELADO badge', () => {
    render(
      <ResumoPedidosTab
        pedidos={[
          pedido({ id: 'x', clienteNome: 'Laís', orcamentos: [], dataEntrega: ts(new Date(2026, 4, 19)) as any }),
          pedido({ id: 'y', clienteNome: 'Cancelada', status: 'CANCELADO', dataEntrega: ts(new Date(2026, 4, 19)) as any }),
        ]}
      />
    )
    expect(screen.getByText(/Pedido aguardando definição de orçamento/i)).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })

  it('shows the FALTA SINAL badge and the item descrição for an unpaid order', () => {
    render(
      <ResumoPedidosTab
        pedidos={[
          pedido({
            id: 'unpaid',
            totalPago: 0,
            orcamentos: [orc([{ id: 'i', nome: 'Bolo', descricao: 'recheio de Nutella', precoUnitario: 100, quantidade: 1, total: 100 }], 100)],
          }),
        ]}
      />
    )
    expect(screen.getByText('Falta sinal')).toBeInTheDocument()
    expect(screen.getByText(/recheio de Nutella/)).toBeInTheDocument()
  })

  it('renders an empty state with no orders', () => {
    render(<ResumoPedidosTab pedidos={[]} />)
    expect(screen.getByText(/Nenhum pedido/i)).toBeInTheDocument()
  })

  it('renders reference image thumbnails, using the legenda as alt text', () => {
    render(
      <ResumoPedidosTab
        pedidos={[
          pedido({
            id: 'ref',
            imagensReferencia: [
              { id: 'img1', url: 'https://cdn.test/a.jpg', storagePath: 'p/a.jpg', legenda: 'Topo do bolo', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
              { id: 'img2', url: 'https://cdn.test/b.jpg', storagePath: 'p/b.jpg', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
            ],
          }),
        ]}
      />
    )
    expect(screen.getByText(/Referências:/i)).toBeInTheDocument()

    const withLegenda = screen.getByAltText('Topo do bolo')
    expect(withLegenda).toHaveAttribute('src', 'https://cdn.test/a.jpg')
    expect(withLegenda).toHaveAttribute('loading', 'lazy')

    // The caption-less image still gets a usable alt.
    expect(screen.getAllByRole('img')).toHaveLength(2)
  })

  it('renders no thumbnails when the order has no reference images', () => {
    render(<ResumoPedidosTab pedidos={[pedido({ id: 'none' })]} />)
    expect(screen.queryByText(/Referências:/i)).not.toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('renders no thumbnails when imagensReferencia is an empty array', () => {
    render(<ResumoPedidosTab pedidos={[pedido({ id: 'empty', imagensReferencia: [] })]} />)
    expect(screen.queryByText(/Referências:/i)).not.toBeInTheDocument()
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('renders thumbnails as static images with no click handler', () => {
    render(
      <ResumoPedidosTab
        pedidos={[
          pedido({
            id: 'static',
            imagensReferencia: [
              { id: 'img1', url: 'https://cdn.test/a.jpg', storagePath: 'p/a.jpg', legenda: 'Topo do bolo', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
            ],
          }),
        ]}
      />
    )
    // No lightbox affordance: the thumbnail is not a button/link and isn't wrapped in one.
    const img = screen.getByAltText('Topo do bolo')
    expect(img.closest('button')).toBeNull()
    expect(img.closest('a')).toBeNull()
  })
})
