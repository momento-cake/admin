import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Avoid firebase init chains.
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${Number(v).toFixed(2)}`,
}))
vi.mock('@/hooks/useDebounce', () => ({ useDebounce: (v: unknown) => v }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Controllable permissions
const canPerformAction = vi.fn()
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction }),
}))

import { PedidoList } from '@/components/pedidos/PedidoList'

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

function mockFetchOk() {
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data: [PEDIDO], total: 1 }),
  })) as unknown as typeof fetch
}

describe('PedidoList — cancel/delete action gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchOk()
  })

  function setPerms(map: Record<string, boolean>) {
    canPerformAction.mockImplementation((_feature: string, action: string) => !!map[action])
  }

  it('shows Cancel and hides Delete for an update-only user (atendente)', async () => {
    setPerms({ update: true, delete: false })
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByLabelText('Cancelar pedido').length).toBeGreaterThan(0))
    expect(screen.queryByLabelText('Excluir pedido')).toBeNull()
  })

  it('shows Delete for a user with delete permission (admin)', async () => {
    setPerms({ update: true, delete: true })
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByLabelText('Excluir pedido').length).toBeGreaterThan(0))
    expect(screen.getAllByLabelText('Cancelar pedido').length).toBeGreaterThan(0)
  })

  it('opens the cancel dialog when the cancel action is clicked', async () => {
    const user = userEvent.setup()
    setPerms({ update: true, delete: false })
    render(<PedidoList onPedidoView={vi.fn()} onPedidoEdit={vi.fn()} onPedidoDelete={vi.fn()} />)

    await waitFor(() => expect(screen.getAllByLabelText('Cancelar pedido').length).toBeGreaterThan(0))
    await user.click(screen.getAllByLabelText('Cancelar pedido')[0])

    expect(await screen.findByText(/cancelar pedido ped-001/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeInTheDocument()
  })
})
