/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResumoPrintView } from '@/components/pedidos/resumo/ResumoPrintView'
import type { Pedido } from '@/types/pedido'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function orc(itens: any[], total = 0) {
  return { id: 'o', versao: 1, isAtivo: true, status: 'APROVADO', itens, subtotal: total, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total, criadoEm: ts(new Date()), criadoPor: 'u' }
}
function pedido(over: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p', numeroPedido: 'PED-1', publicToken: 't', clienteId: 'c', clienteNome: 'Rafaela',
    status: 'CONFIRMADO',
    orcamentos: [orc([{ id: 'i', nome: 'Bolo 1kg', precoUnitario: 195, quantidade: 1, total: 195 }], 195)],
    pacotes: [],
    entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 23, enderecoEntrega: { id: 'a', endereco: 'Rua X', numero: '10' } } as any,
    pagamentos: [], totalPago: 118, dataVencimento: ts(new Date()) as any, statusPagamento: 'PARCIAL',
    isActive: true, createdAt: ts(new Date()) as any, updatedAt: ts(new Date()) as any,
    dataEntrega: ts(new Date(2026, 4, 19)) as any, createdBy: 'u', observacoes: 'Forminhas: azul', ...over,
  } as Pedido
}

describe('ResumoPrintView — sem valores (produção)', () => {
  it('renders the (Produção) title, day header and the items summary, without prices', () => {
    render(<ResumoPrintView pedidos={[pedido()]} rangeLabel="Semana X" comValores={false} />)
    expect(screen.getByText(/\(Produção\)/)).toBeInTheDocument()
    expect(screen.getByText('Semana X')).toBeInTheDocument()
    expect(screen.getByText('19/05 — Terça-feira')).toBeInTheDocument()
    expect(screen.getByText(/RESUMO DE ITENS/i)).toBeInTheDocument()
    // No financial total line in production mode.
    expect(screen.queryByText(/Total: R\$/)).not.toBeInTheDocument()
    // Observação is surfaced.
    expect(screen.getByText('Forminhas: azul')).toBeInTheDocument()
  })

  it('shows a "Data a definir" section for undated orders', () => {
    render(
      <ResumoPrintView
        pedidos={[pedido({ id: 'u', dataEntrega: null as any })]}
        rangeLabel="Semana X"
        comValores={false}
      />
    )
    expect(screen.getByText('Data a definir')).toBeInTheDocument()
  })

  it('renders status tags in the heading', () => {
    render(
      <ResumoPrintView
        pedidos={[pedido({ id: 'x', clienteNome: 'Laís', orcamentos: [] })]}
        rangeLabel="Semana X"
        comValores={false}
      />
    )
    expect(screen.getByText(/ORÇAMENTO A FAZER/i)).toBeInTheDocument()
  })

  it('renders reference image thumbnails on the production sheet', () => {
    render(
      <ResumoPrintView
        pedidos={[
          pedido({
            imagensReferencia: [
              { id: 'img1', url: 'https://cdn.test/a.jpg', storagePath: 'p/a.jpg', legenda: 'Topo do bolo', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
              { id: 'img2', url: 'https://cdn.test/b.jpg', storagePath: 'p/b.jpg', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
            ],
          }),
        ]}
        rangeLabel="Semana X"
        comValores={false}
      />
    )
    expect(screen.getAllByRole('img')).toHaveLength(2)
    expect(screen.getByAltText('Topo do bolo')).toHaveAttribute('src', 'https://cdn.test/a.jpg')
  })

  it('renders no thumbnails when the order has no reference images', () => {
    render(<ResumoPrintView pedidos={[pedido()]} rangeLabel="Semana X" comValores={false} />)
    expect(screen.queryAllByRole('img')).toHaveLength(0)
  })

  it('lists each contributing order on its own line (not pipe-separated) in the items summary', () => {
    const shared = (id: string, cliente: string, qty: number) =>
      pedido({
        id,
        clienteNome: cliente,
        orcamentos: [orc([{ id: 'i', nome: 'Brigadeiro ao leite', precoUnitario: 1, quantidade: qty, total: qty }], qty)],
      })
    render(
      <ResumoPrintView
        pedidos={[shared('a', 'Fernanda', 25), shared('b', 'Viviane', 50)]}
        rangeLabel="Semana X"
        comValores={false}
      />
    )
    // Aggregated header + one line per contributor.
    expect(screen.getByText(/Brigadeiro ao leite — 75 un\./)).toBeInTheDocument()
    const fernanda = screen.getByText(/Fernanda.*: 25/)
    const viviane = screen.getByText(/Viviane.*: 50/)
    // Distinct elements (separate lines), and neither line uses a pipe separator.
    expect(fernanda).not.toBe(viviane)
    expect(fernanda.textContent).not.toContain('|')
    expect(viviane.textContent).not.toContain('|')
  })
})

describe('ResumoPrintView — com valores (financeiro)', () => {
  it('renders prices and totals (frete folded into Total, not listed) and no items summary', () => {
    render(<ResumoPrintView pedidos={[pedido()]} rangeLabel="Semana X" comValores={true} />)
    expect(screen.queryByText(/\(Produção\)/)).not.toBeInTheDocument()
    expect(screen.queryByText(/RESUMO DE ITENS/i)).not.toBeInTheDocument()
    // Total still includes frete (195 + 23), but frete is no longer listed as its own line.
    expect(screen.getByText(/Total: R\$\s?218,00/)).toBeInTheDocument()
    expect(screen.queryByText(/Frete:/)).not.toBeInTheDocument()
  })

  it('omits reference image thumbnails from the financial sheet', () => {
    render(
      <ResumoPrintView
        pedidos={[
          pedido({
            imagensReferencia: [
              { id: 'img1', url: 'https://cdn.test/a.jpg', storagePath: 'p/a.jpg', legenda: 'Topo do bolo', uploadedAt: ts(new Date()) as any, uploadedBy: 'u' },
            ],
          }),
        ]}
        rangeLabel="Semana X"
        comValores={true}
      />
    )
    expect(screen.queryAllByRole('img')).toHaveLength(0)
    expect(screen.queryByAltText('Topo do bolo')).not.toBeInTheDocument()
  })

  it('omits the ✓ when no sinal has been paid', () => {
    render(<ResumoPrintView pedidos={[pedido({ totalPago: 0 })]} rangeLabel="Semana X" comValores={true} />)
    const totals = screen.getByText(/Total: R\$/)
    expect(totals.textContent).not.toContain('✓')
    expect(totals.textContent).toMatch(/Sinal: R\$\s?0,00/)
  })
})
