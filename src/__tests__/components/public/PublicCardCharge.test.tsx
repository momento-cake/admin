import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicCardCharge } from '@/components/public/PublicCardCharge'
import type { BillingInfo } from '@/lib/payments/types'

const billing: BillingInfo = {
  nome: 'Maria Silva',
  cpfCnpj: '52998224725',
  email: 'maria@example.com',
  telefone: '11999999999',
}

async function fillValidCard(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/número do cartão/i), '4111111111111111')
  await user.type(screen.getByLabelText(/nome impresso no cartão/i), 'MARIA SILVA')
  const select = screen.getAllByRole('combobox')
  await user.selectOptions(select[0], '12')
  // Pick the second option in the year select (current year + something)
  const yearSelect = select[1]
  const yearOptions = yearSelect.querySelectorAll('option')
  await user.selectOptions(yearSelect, yearOptions[1].value)
  await user.type(screen.getByLabelText(/cvv/i), '123')
}

describe('PublicCardCharge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders all card fields and the pay button with amount', () => {
    render(
      <PublicCardCharge
        token="tok"
        billing={billing}
        amount={150}
        onPaid={vi.fn()}
      />,
    )
    expect(screen.getByLabelText(/número do cartão/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/nome impresso no cartão/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mês$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^ano$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument()
    const payButton = screen.getByRole('button', { name: /pagar/i })
    expect(payButton.textContent).toMatch(/R\$/)
  })

  it('shows local validation errors when fields are empty', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()
    render(
      <PublicCardCharge
        token="tok"
        billing={billing}
        amount={150}
        onPaid={onPaid}
      />,
    )

    await user.click(screen.getByRole('button', { name: /pagar/i }))
    await waitFor(() => {
      expect(screen.getByText(/Número de cartão inválido/i)).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(onPaid).not.toHaveBeenCalled()
  })

  it('posts the card payload and calls onPaid when immediatelyConfirmed=true', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            paymentSession: {
              method: 'CARTAO_CREDITO',
              status: 'CONFIRMED',
              amount: 150,
              chargeId: 'charge-123',
            },
            immediatelyConfirmed: true,
          },
        }),
    } as Response)

    render(
      <PublicCardCharge
        token="abc"
        billing={billing}
        amount={150}
        onPaid={onPaid}
      />,
    )

    await fillValidCard(user)
    await user.click(screen.getByRole('button', { name: /pagar/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/pedidos/abc/charge/card',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    const call = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(String((call[1] as RequestInit).body))
    expect(body.card.number).toBe('4111111111111111')
    expect(body.card.holderName).toBe('MARIA SILVA')
    expect(body.card.expiryMonth).toBe('12')
    expect(body.card.cvv).toBe('123')

    await waitFor(() => {
      expect(onPaid).toHaveBeenCalledTimes(1)
    })
  })

  it('shows declined error when API responds 402', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: () =>
        Promise.resolve({ success: false, error: 'CARD_DECLINED' }),
    } as Response)

    render(
      <PublicCardCharge
        token="tok"
        billing={billing}
        amount={150}
        onPaid={onPaid}
      />,
    )

    await fillValidCard(user)
    await user.click(screen.getByRole('button', { name: /pagar/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/recusad/i)
    })
    expect(onPaid).not.toHaveBeenCalled()
  })

  it('shows "Pagamento em análise" panel and starts polling when charge response reports PENDING_RISK_ANALYSIS', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            paymentSession: {
              method: 'CARTAO_CREDITO',
              status: 'PENDING_RISK_ANALYSIS',
              amount: 150,
              chargeId: 'charge-1',
            },
            immediatelyConfirmed: false,
          },
        }),
    } as Response)

    render(
      <PublicCardCharge
        token="abc"
        billing={billing}
        amount={150}
        onPaid={onPaid}
      />,
    )

    await fillValidCard(user)
    await user.click(screen.getByRole('button', { name: /pagar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Pagamento em análise/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/sistema antifraude/i)).toBeInTheDocument()
    // Form fields should no longer be rendered
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument()
    // Live region present
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(onPaid).not.toHaveBeenCalled()
  })

  it('renders the "em análise" state immediately when existingSession.status is PENDING_RISK_ANALYSIS', () => {
    render(
      <PublicCardCharge
        token="tok"
        billing={billing}
        amount={150}
        onPaid={vi.fn()}
        existingSession={{ status: 'PENDING_RISK_ANALYSIS' }}
      />,
    )

    expect(screen.getByText(/Pagamento em análise/i)).toBeInTheDocument()
    expect(screen.getByText(/sistema antifraude/i)).toBeInTheDocument()
    // No card form
    expect(screen.queryByLabelText(/número do cartão/i)).not.toBeInTheDocument()
    // No QR or pay button
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument()
  })

  it('polling: PENDING → PENDING_RISK_ANALYSIS → CONFIRMED reaches success path', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const onPaid = vi.fn()
      let pollCount = 0
      vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/charge/card')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                paymentSession: { method: 'CARTAO_CREDITO', status: 'PENDING' },
                immediatelyConfirmed: false,
              },
            }),
          } as Response
        }
        if (url.endsWith('/payment-status')) {
          pollCount += 1
          if (pollCount === 1) {
            return {
              ok: true,
              json: async () => ({
                success: true,
                data: {
                  status: 'AGUARDANDO_PAGAMENTO',
                  paymentSession: { status: 'PENDING_RISK_ANALYSIS' },
                },
              }),
            } as Response
          }
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                status: 'CONFIRMADO',
                paymentSession: { status: 'CONFIRMED' },
              },
            }),
          } as Response
        }
        throw new Error('Unexpected URL: ' + url)
      })

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(
        <PublicCardCharge
          token="tok"
          billing={billing}
          amount={150}
          onPaid={onPaid}
        />,
      )

      await fillValidCard(user)
      await user.click(screen.getByRole('button', { name: /pagar/i }))

      // First poll: PENDING_RISK_ANALYSIS — UI flips to em análise
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })
      await waitFor(() => {
        expect(screen.getByText(/Pagamento em análise/i)).toBeInTheDocument()
      })

      // Second poll: CONFIRMED — onPaid fires
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })
      await waitFor(() => {
        expect(onPaid).toHaveBeenCalledTimes(1)
      })
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it('polling: PENDING_RISK_ANALYSIS → FAILED falls back to declined error', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/payment-status')) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                status: 'AGUARDANDO_PAGAMENTO',
                paymentSession: { status: 'FAILED' },
              },
            }),
          } as Response
        }
        throw new Error('Unexpected URL: ' + url)
      })

      render(
        <PublicCardCharge
          token="tok"
          billing={billing}
          amount={150}
          onPaid={vi.fn()}
          existingSession={{ status: 'PENDING_RISK_ANALYSIS' }}
        />,
      )

      // Start in em análise state
      expect(screen.getByText(/Pagamento em análise/i)).toBeInTheDocument()

      // First poll returns FAILED → form returns with declined error
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })
      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toMatch(/recusad/i)
      })
      // Form is back so the user can retry
      expect(screen.getByLabelText(/número do cartão/i)).toBeInTheDocument()
    } finally {
      vi.runOnlyPendingTimers()
      vi.useRealTimers()
    }
  })

  it('shows generic error and no onPaid call when API returns 400', async () => {
    const user = userEvent.setup()
    const onPaid = vi.fn()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ success: false, error: 'Pedido inválido' }),
    } as Response)

    render(
      <PublicCardCharge
        token="tok"
        billing={billing}
        amount={150}
        onPaid={onPaid}
      />,
    )

    await fillValidCard(user)
    await user.click(screen.getByRole('button', { name: /pagar/i }))

    await waitFor(() => {
      expect(screen.getByText(/Pedido inválido/i)).toBeInTheDocument()
    })
    expect(onPaid).not.toHaveBeenCalled()
  })
})
