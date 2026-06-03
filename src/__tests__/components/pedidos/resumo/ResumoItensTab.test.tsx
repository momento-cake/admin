/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ResumoItensTab } from '@/components/pedidos/resumo/ResumoItensTab'
import type { Pedido } from '@/types/pedido'

function ts(d: Date) {
  return { toDate: () => d, _seconds: Math.floor(d.getTime() / 1000) }
}
function orc(itens: any[]) {
  return { id: 'o', versao: 1, isAtivo: true, status: 'APROVADO', itens, subtotal: 0, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 0, criadoEm: ts(new Date()), criadoPor: 'u' }
}
function item(nome: string, q: number) {
  return { id: `${nome}-${q}`, nome, precoUnitario: 10, quantidade: q, total: 10 * q }
}
function pedido(id: string, clienteNome: string, q: number, nome = 'Brigadeiro ao leite'): Pedido {
  return {
    id, numeroPedido: id.toUpperCase(), publicToken: 't', clienteId: 'c', clienteNome,
    status: 'CONFIRMADO', orcamentos: [orc([item(nome, q)])], pacotes: [],
    entrega: { tipo: 'RETIRADA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 } as any,
    pagamentos: [], totalPago: 0, dataVencimento: ts(new Date()) as any, statusPagamento: 'PENDENTE',
    isActive: true, createdAt: ts(new Date()) as any, updatedAt: ts(new Date()) as any,
    dataEntrega: ts(new Date(2026, 4, 20)) as any, createdBy: 'u',
  } as Pedido
}

describe('ResumoItensTab', () => {
  it('shows an empty state when there are no items', () => {
    render(<ResumoItensTab pedidos={[]} />)
    expect(screen.getByText(/Nenhum item/i)).toBeInTheDocument()
  })

  it('sums quantities for items sharing a name', () => {
    render(<ResumoItensTab pedidos={[pedido('a', 'Fernanda', 25), pedido('b', 'Viviane', 50)]} />)
    expect(screen.getByText('Brigadeiro ao leite')).toBeInTheDocument()
    expect(screen.getByText('75 un.')).toBeInTheDocument()
  })

  it('reveals the per-order contributors (hint) when expanded', async () => {
    const user = userEvent.setup()
    render(<ResumoItensTab pedidos={[pedido('a', 'Fernanda', 25), pedido('b', 'Viviane', 50)]} />)
    // Contributors are hidden until expanded.
    expect(screen.queryByText(/Fernanda \(20\/05\): 25/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Brigadeiro ao leite/i }))
    expect(screen.getByText(/Fernanda \(20\/05\): 25/)).toBeInTheDocument()
    expect(screen.getByText(/Viviane \(20\/05\): 50/)).toBeInTheDocument()
  })
})
