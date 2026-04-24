import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Avoid real firebase init (chained imports via @/lib/products → @/lib/firebase)
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`,
}))

// Mock the storage upload so we don't hit real firebase in tests
vi.mock('@/lib/storage', () => ({
  uploadReceipt: vi.fn(),
  deleteReceipt: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

import { PaymentDialog } from '@/components/pedidos/pagamentos/PaymentDialog'

describe('PaymentDialog', () => {
  const defaults = {
    pedidoId: 'p1',
    total: 450,
    totalPago: 0,
    open: true,
    onOpenChange: () => {},
    onRegistered: vi.fn(),
  }

  beforeEach(() => {
    defaults.onRegistered = vi.fn()
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          pagamento: { id: 'x', valor: 450, metodo: 'PIX' },
          totalPago: 450,
          statusPagamento: 'PAGO',
        },
      }),
    })) as unknown as typeof fetch
  })

  it('pre-fills valor with the remaining saldo', () => {
    render(<PaymentDialog {...defaults} totalPago={100} />)
    const valorInput = screen.getByLabelText(/valor/i) as HTMLInputElement
    expect(valorInput.value).toBe('350')
  })

  it('allows editing valor', async () => {
    const user = userEvent.setup()
    render(<PaymentDialog {...defaults} />)
    const valorInput = screen.getByLabelText(/valor/i) as HTMLInputElement
    await user.clear(valorInput)
    await user.type(valorInput, '100')
    expect(valorInput.value).toBe('100')
  })

  it('submits a JSON payload to the pagamentos endpoint without file', async () => {
    const user = userEvent.setup()
    render(<PaymentDialog {...defaults} />)

    const valorInput = screen.getByLabelText(/valor/i)
    await user.clear(valorInput)
    await user.type(valorInput, '150')

    // The default metodo is PIX — submit directly
    const submit = screen.getByRole('button', { name: /registrar/i })
    await user.click(submit)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
    const [url, init] = (global.fetch as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/pedidos/p1/pagamentos')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.valor).toBe(150)
    expect(body.metodo).toBe('PIX')
    expect(body.data).toBeTruthy()
    expect(body.comprovanteUrl).toBeUndefined()
  })

  it('rejects submission when valor is 0 or empty', async () => {
    const user = userEvent.setup()
    render(<PaymentDialog {...defaults} />)
    const valorInput = screen.getByLabelText(/valor/i)
    await user.clear(valorInput)

    const submit = screen.getByRole('button', { name: /registrar/i })
    await user.click(submit)

    // No fetch call — the form should have blocked submission
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('calls onRegistered after successful submission', async () => {
    const user = userEvent.setup()
    render(<PaymentDialog {...defaults} />)
    const submit = screen.getByRole('button', { name: /registrar/i })
    await user.click(submit)
    await waitFor(() => {
      expect(defaults.onRegistered).toHaveBeenCalled()
    })
  })

  it('surfaces API errors to the user', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ success: false, error: 'Algum erro' }),
    })) as unknown as typeof fetch

    const user = userEvent.setup()
    render(<PaymentDialog {...defaults} />)
    const submit = screen.getByRole('button', { name: /registrar/i })
    await user.click(submit)

    const { toast } = await import('sonner')
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
