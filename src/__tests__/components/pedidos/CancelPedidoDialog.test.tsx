import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

import { CancelPedidoDialog } from '@/components/pedidos/CancelPedidoDialog'
import { toast } from 'sonner'

function setup(overrides: Partial<React.ComponentProps<typeof CancelPedidoDialog>> = {}) {
  const props = {
    pedidoId: 'p1',
    numeroPedido: 'PED-001',
    open: true,
    onOpenChange: vi.fn(),
    onCanceled: vi.fn(),
    ...overrides,
  }
  render(<CancelPedidoDialog {...props} />)
  return props
}

describe('CancelPedidoDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: {} }),
    })) as unknown as typeof fetch
  })

  it('disables confirm until a reason is selected', () => {
    setup()
    const confirm = screen.getByRole('button', { name: /confirmar cancelamento/i })
    expect(confirm).toBeDisabled()
  })

  it('enables confirm once a preset reason is selected', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /pagamento não realizado/i }))
    expect(screen.getByRole('button', { name: /confirmar cancelamento/i })).toBeEnabled()
  })

  it('requires free text when "Outro" is chosen', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /^outro$/i }))
    const confirm = screen.getByRole('button', { name: /confirmar cancelamento/i })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/descreva o motivo/i), 'Fora da área')
    expect(confirm).toBeEnabled()
  })

  it('submits a preset reason with the category label as motivo', async () => {
    const user = userEvent.setup()
    const props = setup()
    await user.click(screen.getByRole('button', { name: /cliente desistiu/i }))
    await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const [url, init] = (global.fetch as any).mock.calls[0]
    expect(url).toBe('/api/pedidos/p1')
    expect(init.method).toBe('PUT')
    const payload = JSON.parse(init.body)
    expect(payload.status).toBe('CANCELADO')
    expect(payload.cancelamento.categoria).toBe('CLIENTE_DESISTIU')
    expect(payload.cancelamento.motivo).toBe('Cliente desistiu / solicitou cancelamento')

    await waitFor(() => expect(props.onCanceled).toHaveBeenCalled())
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
    expect(toast.success).toHaveBeenCalled()
  })

  it('submits the typed text as motivo for "Outro"', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: /^outro$/i }))
    await user.type(screen.getByLabelText(/descreva o motivo/i), '  Endereço inválido  ')
    await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    const payload = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(payload.cancelamento.categoria).toBe('OUTRO')
    expect(payload.cancelamento.motivo).toBe('Endereço inválido')
  })

  it('shows an error toast and stays open when the request fails', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      json: async () => ({ success: false, error: 'Informe o motivo do cancelamento.' }),
    })) as unknown as typeof fetch
    const props = setup()
    await user.click(screen.getByRole('button', { name: /indisponibilidade de produção/i }))
    await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    expect(props.onCanceled).not.toHaveBeenCalled()
  })
})
