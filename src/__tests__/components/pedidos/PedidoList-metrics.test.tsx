import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

// Avoid firebase init chains.
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${Number(v).toFixed(2)}`,
}))
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (v: unknown) => v }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction: () => true }),
}))

import { PedidoList } from '@/components/pedidos/PedidoList'

const pedido = (status: string, total: number, id: string) => ({
  id,
  numeroPedido: id,
  clienteId: 'c1',
  clienteNome: 'Maria',
  status,
  orcamentos: [{ id: `o-${id}`, versao: 1, isAtivo: true, status: 'APROVADO', itens: [{ id: 'i1' }], total }],
  pacotes: [],
  entrega: { tipo: 'RETIRADA' },
  pagamentos: [],
  totalPago: 0,
  statusPagamento: 'PENDENTE',
  createdAt: '2026-04-01T00:00:00.000Z',
  isActive: true,
})

// 2 completed (ENTREGUE) + 1 in-progress + 1 ready. Values sum to 600 over 4
// orders → ticket médio 150.
const DATA = [
  pedido('ENTREGUE', 100, 'PED-001'),
  pedido('ENTREGUE', 200, 'PED-002'),
  pedido('CONFIRMADO', 300, 'PED-003'),
  pedido('PRONTO', 0, 'PED-004'),
]

/** The StatTile whose label matches — its parent div holds label + value. */
function tile(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement
}

describe('PedidoList — header metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: DATA, total: DATA.length }),
    })) as unknown as typeof fetch
  })

  it('shows a "Concluídos" tile counting ENTREGUE (entregue ou retirado) orders', async () => {
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Concluídos')).toBeInTheDocument())
    expect(within(tile('Concluídos')).getByText('2')).toBeInTheDocument()
    expect(screen.getByText('entregues ou retirados')).toBeInTheDocument()
    // "Prontos" is no longer a header tile.
    expect(screen.queryByText('Prontos')).toBeNull()
  })

  it('shows a "Ticket médio" tile = valor total ÷ total de pedidos', async () => {
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Ticket médio')).toBeInTheDocument())
    // Valor total = 600 over 4 orders → 150.
    expect(within(tile('Valor total')).getByText('R$ 600.00')).toBeInTheDocument()
    expect(within(tile('Ticket médio')).getByText('R$ 150.00')).toBeInTheDocument()
  })

  it('shows R$ 0,00 ticket médio with no orders (no divide-by-zero)', async () => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [], total: 0 }),
    })) as unknown as typeof fetch
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)
    await waitFor(() => expect(screen.getByText('Ticket médio')).toBeInTheDocument())
    expect(within(tile('Ticket médio')).getByText('R$ 0.00')).toBeInTheDocument()
  })
})
