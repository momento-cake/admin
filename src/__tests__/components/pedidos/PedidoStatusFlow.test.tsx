import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { PedidoStatusFlow } from '@/components/pedidos/PedidoStatusFlow'

describe('PedidoStatusFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    })) as unknown as typeof fetch
  })

  it('renders the valid transitions for the current status', () => {
    render(
      <PedidoStatusFlow pedidoId="p1" currentStatus="CONFIRMADO" onStatusChange={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /aguardar pagamento/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar produ/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument()
  })

  it('renders nothing for a terminal status (ENTREGUE)', () => {
    const { container } = render(
      <PedidoStatusFlow pedidoId="p1" currentStatus="ENTREGUE" onStatusChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('PUTs the new status and calls onStatusChange for a normal transition', async () => {
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(
      <PedidoStatusFlow pedidoId="p1" currentStatus="CONFIRMADO" onStatusChange={onStatusChange} />
    )
    await user.click(screen.getByRole('button', { name: /iniciar produ/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const [url, init] = (global.fetch as any).mock.calls[0]
    expect(url).toBe('/api/pedidos/p1')
    expect(JSON.parse(init.body).status).toBe('EM_PRODUCAO')
    await waitFor(() => expect(onStatusChange).toHaveBeenCalledWith('EM_PRODUCAO'))
  })

  it('opens the cancel-reason dialog instead of cancelling directly', async () => {
    const user = userEvent.setup()
    render(
      <PedidoStatusFlow pedidoId="p1" currentStatus="CONFIRMADO" onStatusChange={vi.fn()} />
    )
    await user.click(screen.getByRole('button', { name: /cancelar pedido/i }))

    expect(
      await screen.findByRole('button', { name: /confirmar cancelamento/i })
    ).toBeInTheDocument()
    // No status PUT happens just from opening the dialog.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('disables "Marcar como Entregue" when the order is not fully paid', () => {
    render(
      <PedidoStatusFlow pedidoId="p1" currentStatus="PRONTO" onStatusChange={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /marcar como entregue/i })).toBeDisabled()
  })
})
