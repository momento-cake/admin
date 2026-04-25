import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { PublicPixCharge } from '@/components/public/PublicPixCharge'

const FAKE_QR_BASE64 = 'iVBORw0KGgoAAAANSUhEUg=='
const FAKE_COPY_PASTE = '00020126360014BR.GOV.BCB.PIX0114+5511999999999204000053039865406100.005802BR'

function buildPixSessionResponse(overrides: Partial<{
  qrCodeBase64: string
  copyPaste: string
  expiresAt: string
  status: string
}> = {}) {
  return {
    success: true,
    data: {
      paymentSession: {
        method: 'PIX',
        status: overrides.status ?? 'PENDING',
        amount: 100,
        pixQrCodeBase64: overrides.qrCodeBase64 ?? FAKE_QR_BASE64,
        pixCopyPaste: overrides.copyPaste ?? FAKE_COPY_PASTE,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        chargeId: 'charge-1',
      },
    },
  }
}

describe('PublicPixCharge', () => {
  let clipboardWriteText: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.stubGlobal('fetch', vi.fn())
    clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardWriteText },
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    cleanup()
    vi.unstubAllGlobals()
  })

  it('creates a session on mount and renders QR + copy-paste code', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(buildPixSessionResponse()),
    } as Response)

    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={null}
      />,
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/pedidos/tok/charge/pix',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await waitFor(() => {
      expect(screen.getByAltText(/QR Code PIX/i)).toBeInTheDocument()
    })
    expect(screen.getByTestId('pix-copy-paste').textContent).toBe(FAKE_COPY_PASTE)
  })

  it('reuses an existing PENDING session without making a network call', () => {
    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'PENDING',
        }}
      />,
    )
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByAltText(/QR Code PIX/i)).toBeInTheDocument()
  })

  it('regenerates the session when existing session is EXPIRED', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(buildPixSessionResponse()),
    } as Response)

    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: 'old',
          pixCopyPaste: 'old',
          expiresAt: new Date(Date.now() - 1000).toISOString(),
          status: 'EXPIRED',
        }}
      />,
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/pedidos/tok/charge/pix',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('copies the code to clipboard when "Copiar código" is clicked', async () => {
    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'PENDING',
        }}
      />,
    )

    const copyButton = screen.getByRole('button', { name: /copiar código/i })
    await act(async () => {
      fireEvent.click(copyButton)
      // Flush the awaited clipboard.writeText() microtask + setState
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(clipboardWriteText).toHaveBeenCalledWith(FAKE_COPY_PASTE)
    await waitFor(() => {
      expect(screen.getByText('Copiado!')).toBeInTheDocument()
    })
  })

  it('polls /payment-status and calls onPaid when status flips to CONFIRMED', async () => {
    const onPaid = vi.fn()

    // First POST returns the session
    vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/charge/pix')) {
        return {
          ok: true,
          json: async () => buildPixSessionResponse(),
        } as Response
      }
      if (url.endsWith('/payment-status')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              status: 'CONFIRMADO',
              paymentSession: { status: 'CONFIRMED', method: 'PIX' },
              paidAt: new Date().toISOString(),
            },
          }),
        } as Response
      }
      throw new Error('Unexpected URL: ' + url)
    })

    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={onPaid}
        existingSession={null}
      />,
    )

    // Wait for session creation
    await waitFor(() => {
      expect(screen.getByAltText(/QR Code PIX/i)).toBeInTheDocument()
    })

    // Advance timers to trigger first poll (and let microtasks flush)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    await waitFor(() => {
      expect(onPaid).toHaveBeenCalledTimes(1)
    })
  })

  it('stops polling on unmount', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            status: 'AGUARDANDO_PAGAMENTO',
            paymentSession: { status: 'PENDING' },
            paidAt: null,
          },
        }),
    } as Response)

    const onPaid = vi.fn()
    const { unmount } = render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={onPaid}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'PENDING',
        }}
      />,
    )

    // Unmount immediately
    unmount()

    const callsBefore = vi.mocked(global.fetch).mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    const callsAfter = vi.mocked(global.fetch).mock.calls.length
    expect(callsAfter).toBe(callsBefore)
    expect(onPaid).not.toHaveBeenCalled()
  })

  it('shows error UI with "Tentar novamente" when initial create fails', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ success: false, error: 'Falha ao gerar PIX' }),
    } as Response)

    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={null}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText(/Falha ao gerar PIX/i)).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /tentar novamente/i }),
    ).toBeInTheDocument()
  })

  it('flips session to expired UI when polling returns FAILED status', async () => {
    vi.mocked(global.fetch).mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/payment-status')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              status: 'AGUARDANDO_PAGAMENTO',
              paymentSession: { status: 'FAILED', method: 'PIX' },
              paidAt: null,
            },
          }),
        } as Response
      }
      throw new Error('Unexpected URL: ' + url)
    })

    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          status: 'PENDING',
        }}
      />,
    )

    // First poll fires after 3s; FAILED is returned and session flips
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /gerar novo código/i }),
      ).toBeInTheDocument()
    })
  })

  it('regenerates a new session when "Gerar novo código" is clicked', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(buildPixSessionResponse()),
    } as Response)

    const expiredAt = new Date(Date.now() - 5_000).toISOString()
    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: expiredAt,
          status: 'PENDING',
        }}
      />,
    )

    const regenerateButton = await screen.findByRole('button', {
      name: /gerar novo código/i,
    })
    await act(async () => {
      fireEvent.click(regenerateButton)
      await Promise.resolve()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/pedidos/tok/charge/pix',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })

  it('shows expired UI and "Gerar novo código" button when expiresAt is in the past', async () => {
    // Status PENDING but expiresAt already passed: component reuses session
    // (isUnusableSession returns false) but UI flips to "expired" branch.
    const expiredAt = new Date(Date.now() - 5_000).toISOString()
    render(
      <PublicPixCharge
        token="tok"
        amount={100}
        onPaid={vi.fn()}
        existingSession={{
          pixQrCodeBase64: FAKE_QR_BASE64,
          pixCopyPaste: FAKE_COPY_PASTE,
          expiresAt: expiredAt,
          status: 'PENDING',
        }}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /gerar novo código/i }),
      ).toBeInTheDocument()
    })
  })
})
