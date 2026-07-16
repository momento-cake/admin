/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'

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
import { KanbanBoard } from '@/components/pedidos/KanbanBoard'

const PEDIDO = {
  id: 'p1',
  numeroPedido: 'PED-001',
  clienteId: 'c1',
  clienteNome: 'Maria',
  status: 'CONFIRMADO',
  orcamentos: [
    { id: 'o1', versao: 1, isAtivo: true, status: 'APROVADO', itens: [{ id: 'i1' }], total: 200 },
  ],
  pacotes: [],
  entrega: { tipo: 'RETIRADA' },
  pagamentos: [],
  totalPago: 0,
  statusPagamento: 'PENDENTE',
  createdAt: '2026-04-01T00:00:00.000Z',
  isActive: true,
}

function fetchUrls() {
  return (global.fetch as any).mock.calls.map((c: any[]) => String(c[0]))
}

/** The list endpoint carries the page param; the counts endpoint asks for 500. */
const isListCall = (u: string) => u.includes('/api/pedidos?') && u.includes('limit=20')
const isCountsCall = (u: string) => u.includes('/api/pedidos?') && u.includes('limit=500')

beforeEach(() => {
  vi.clearAllMocks()
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [PEDIDO], total: 1 }),
  })) as unknown as typeof fetch
})

describe('PedidoList — refreshToken', () => {
  it('refetches both the list and the status counts when refreshToken changes', async () => {
    const { rerender } = render(<PedidoList refreshToken={0} />)

    await waitFor(() => {
      expect(fetchUrls().filter(isListCall)).toHaveLength(1)
      expect(fetchUrls().filter(isCountsCall)).toHaveLength(1)
    })

    rerender(<PedidoList refreshToken={1} />)

    await waitFor(() => {
      expect(fetchUrls().filter(isListCall)).toHaveLength(2)
      expect(fetchUrls().filter(isCountsCall)).toHaveLength(2)
    })
  })

  it('does not refetch when refreshToken is unchanged', async () => {
    const { rerender } = render(<PedidoList refreshToken={3} />)

    await waitFor(() => expect(fetchUrls().filter(isListCall)).toHaveLength(1))

    rerender(<PedidoList refreshToken={3} />)

    await waitFor(() => expect(fetchUrls().filter(isListCall)).toHaveLength(1))
    expect(fetchUrls().filter(isCountsCall)).toHaveLength(1)
  })
})

describe('KanbanBoard — refreshToken', () => {
  it('refetches when refreshToken changes', async () => {
    const { rerender } = render(<KanbanBoard refreshToken={0} />)

    await waitFor(() => expect(fetchUrls().filter(isCountsCall)).toHaveLength(1))

    rerender(<KanbanBoard refreshToken={1} />)

    await waitFor(() => expect(fetchUrls().filter(isCountsCall)).toHaveLength(2))
  })

  it('does not refetch when refreshToken is unchanged', async () => {
    const { rerender } = render(<KanbanBoard refreshToken={7} />)

    await waitFor(() => expect(fetchUrls().filter(isCountsCall)).toHaveLength(1))

    rerender(<KanbanBoard refreshToken={7} />)

    await waitFor(() => expect(fetchUrls().filter(isCountsCall)).toHaveLength(1))
  })
})
