/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumoView, buildPrintHref } from '@/components/pedidos/resumo/ResumoView'
import type { Pedido } from '@/types/pedido'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function pedido(): Pedido {
  return {
    id: 'p', numeroPedido: 'PED-1', publicToken: 't', clienteId: 'c', clienteNome: 'Rafaela',
    status: 'CONFIRMADO',
    orcamentos: [{ id: 'o', versao: 1, isAtivo: true, status: 'APROVADO', itens: [{ id: 'i', nome: 'Bolo', precoUnitario: 1, quantidade: 1, total: 1 }], subtotal: 1, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 1, criadoEm: ts(new Date()), criadoPor: 'u' }] as any,
    pacotes: [], entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 } as any,
    pagamentos: [], totalPago: 0, dataVencimento: ts(new Date()) as any, statusPagamento: 'PENDENTE',
    isActive: true, createdAt: ts(new Date()) as any, updatedAt: ts(new Date()) as any,
    dataEntrega: ts(new Date(2026, 4, 19)) as any, createdBy: 'u',
  } as Pedido
}

describe('buildPrintHref', () => {
  it('builds the sem-valores URL (prices=0)', () => {
    expect(buildPrintHref('2026-05-19', '2026-05-23', false)).toBe(
      '/orders/resumo/print?from=2026-05-19&to=2026-05-23&prices=0'
    )
  })
  it('builds the com-valores URL (prices=1)', () => {
    expect(buildPrintHref('2026-05-19', '2026-05-23', true)).toBe(
      '/orders/resumo/print?from=2026-05-19&to=2026-05-23&prices=1'
    )
  })
})

describe('ResumoView', () => {
  it('renders the range selector slot and both tabs', () => {
    render(
      <ResumoView
        pedidos={[pedido()]}
        fromIso="2026-05-19"
        toIso="2026-05-23"
        rangeSelector={<div data-testid="range-slot">range</div>}
      />
    )
    expect(screen.getByTestId('range-slot')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Pedidos/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Itens/i })).toBeInTheDocument()
  })

  it('switches to the Itens tab on click', async () => {
    const user = userEvent.setup()
    render(<ResumoView pedidos={[pedido()]} fromIso="2026-05-19" toIso="2026-05-23" />)
    // Pedidos tab is default — day header visible.
    expect(screen.getByText('19/05 — Terça-feira')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Itens/i }))
    // Items tab header.
    expect(screen.getByText('Quantidade total')).toBeInTheDocument()
  })

  it('shows a loading state instead of tabs while loading', () => {
    render(<ResumoView pedidos={[]} fromIso="2026-05-19" toIso="2026-05-23" loading />)
    expect(screen.getByText(/Carregando pedidos/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Itens/i })).not.toBeInTheDocument()
  })

  it('disables print when the range is incomplete', () => {
    render(<ResumoView pedidos={[]} fromIso="" toIso="" />)
    expect(screen.getByRole('button', { name: /Imprimir/i })).toBeDisabled()
  })
})
