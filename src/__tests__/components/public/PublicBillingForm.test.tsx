import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicBillingForm } from '@/components/public/PublicBillingForm'

describe('PublicBillingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders the four fields and submit button with amount', () => {
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={350}
        onConfirmed={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cpf ou cnpj/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^e-mail$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument()

    const button = screen.getByRole('button', { name: /continuar para pagamento/i })
    expect(button).toBeInTheDocument()
    expect(button.textContent).toMatch(/R\$/)
  })

  it('pre-fills the nome field from initial', () => {
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria Silva', email: 'maria@example.com' }}
        amount={100}
        onConfirmed={vi.fn()}
      />,
    )
    const input = screen.getByLabelText(/nome completo/i) as HTMLInputElement
    expect(input.value).toBe('Maria Silva')
    const emailInput = screen.getByLabelText(/^e-mail$/i) as HTMLInputElement
    expect(emailInput.value).toBe('maria@example.com')
  })

  it('masks CPF as the user types', async () => {
    const user = userEvent.setup()
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: '' }}
        amount={50}
        onConfirmed={vi.fn()}
      />,
    )
    const input = screen.getByLabelText(/cpf ou cnpj/i) as HTMLInputElement
    await user.type(input, '12345678909')
    expect(input.value).toBe('123.456.789-09')
  })

  it('shows validation errors for invalid CPF on submit', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={50}
        onConfirmed={onConfirmed}
      />,
    )

    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '11111111111')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(screen.getByText(/CPF\/CNPJ inválido/i)).toBeInTheDocument()
    })
    expect(onConfirmed).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={50}
        onConfirmed={vi.fn()}
      />,
    )
    // Valid CPF (Receita test value)
    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))
    await waitFor(() => {
      expect(screen.getByText(/E-mail inválido/i)).toBeInTheDocument()
    })
  })

  it('calls onConfirmed with the billing returned by the API on success', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()
    const billing = {
      nome: 'Maria Silva',
      cpfCnpj: '52998224725',
      email: 'maria@example.com',
      telefone: '11999999999',
      confirmedAt: '2026-04-25T10:00:00.000Z',
    }
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { billing } }),
    } as Response)

    render(
      <PublicBillingForm
        token="abc-token"
        initial={{ nome: 'Maria Silva' }}
        amount={350}
        onConfirmed={onConfirmed}
      />,
    )

    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/public/pedidos/abc-token/billing',
        expect.objectContaining({ method: 'PATCH' }),
      )
    })

    await waitFor(() => {
      expect(onConfirmed).toHaveBeenCalledWith(billing)
    })
  })

  it('shows alert when API responds with an error', async () => {
    const user = userEvent.setup()
    const onConfirmed = vi.fn()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ success: false, error: 'Pedido inválido para cobrança' }),
    } as Response)

    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={50}
        onConfirmed={onConfirmed}
      />,
    )

    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Pedido inválido para cobrança/i),
      ).toBeInTheDocument()
    })
    expect(onConfirmed).not.toHaveBeenCalled()
  })

  it('shows nome error and telefone error from local validation', async () => {
    const user = userEvent.setup()
    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: '' }}
        amount={50}
        onConfirmed={vi.fn()}
      />,
    )

    // Empty nome + bad telefone (3 digits = below 10)
    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.type(screen.getByLabelText(/telefone/i), '123')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(screen.getByText(/Nome é obrigatório/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Telefone inválido/i)).toBeInTheDocument()
  })

  it('shows backend field-level details when API returns details object', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          success: false,
          error: 'Validation failed',
          details: { email: 'Email já cadastrado' },
        }),
    } as Response)

    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={50}
        onConfirmed={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(screen.getByText(/Email já cadastrado/i)).toBeInTheDocument()
    })
  })

  it('shows network error alert when fetch rejects', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('boom'))

    render(
      <PublicBillingForm
        token="t"
        initial={{ nome: 'Maria' }}
        amount={50}
        onConfirmed={vi.fn()}
      />,
    )

    await user.type(screen.getByLabelText(/cpf ou cnpj/i), '52998224725')
    await user.type(screen.getByLabelText(/^e-mail$/i), 'maria@example.com')
    await user.click(screen.getByRole('button', { name: /continuar para pagamento/i }))

    await waitFor(() => {
      expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument()
    })
  })
})
