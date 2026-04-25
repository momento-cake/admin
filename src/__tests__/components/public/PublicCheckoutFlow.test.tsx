import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  PublicCheckoutFlow,
  type PublicCheckoutPedido,
} from '@/components/public/PublicCheckoutFlow'
import type { PublicEntrega, PublicOrcamento } from '@/components/public/PublicPedidoView'

// Mock children to make assertions cheap and isolate flow behavior
vi.mock('@/components/public/PublicBillingForm', () => ({
  PublicBillingForm: ({ amount, onConfirmed }: any) => (
    <div data-testid="billing-form">
      <span data-testid="billing-amount">{amount}</span>
      <button
        data-testid="billing-confirm"
        onClick={() =>
          onConfirmed({
            nome: 'Maria Silva',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          })
        }
      >
        Confirmar
      </button>
    </div>
  ),
}))

vi.mock('@/components/public/PublicPixCharge', () => ({
  PublicPixCharge: ({ amount, onPaid, existingSession }: any) => (
    <div data-testid="pix-charge">
      <span data-testid="pix-amount">{amount}</span>
      {existingSession && <span data-testid="pix-existing">yes</span>}
      <button data-testid="pix-paid" onClick={() => onPaid()}>
        Pago
      </button>
    </div>
  ),
}))

vi.mock('@/components/public/PublicCardCharge', () => ({
  PublicCardCharge: ({ amount, onPaid }: any) => (
    <div data-testid="card-charge">
      <span data-testid="card-amount">{amount}</span>
      <button data-testid="card-paid" onClick={() => onPaid()}>
        Pago
      </button>
    </div>
  ),
}))

vi.mock('@/components/public/PublicPaymentSuccess', () => ({
  PublicPaymentSuccess: ({ pedido }: any) => (
    <div data-testid="payment-success">
      <span>{pedido.numeroPedido}</span>
      <span>{pedido.clienteNome}</span>
    </div>
  ),
}))

const baseOrcamento: PublicOrcamento = {
  id: 'orc-1',
  versao: 1,
  isAtivo: true,
  status: 'APROVADO',
  itens: [],
  subtotal: 300,
  desconto: 0,
  descontoTipo: 'valor',
  acrescimo: 0,
  total: 300,
}

const baseEntrega: PublicEntrega = {
  tipo: 'ENTREGA',
  custoPorKm: 0,
  taxaExtra: 0,
  freteTotal: 50,
}

function makePedido(
  overrides: Partial<PublicCheckoutPedido> = {},
): PublicCheckoutPedido {
  return {
    id: 'pedido-1',
    numeroPedido: 'PED-001',
    clienteNome: 'Maria Silva',
    status: 'AGUARDANDO_PAGAMENTO',
    orcamento: baseOrcamento,
    entrega: baseEntrega,
    dataEntrega: null,
    observacoesCliente: null,
    createdAt: '2026-04-01T10:00:00Z',
    storeAddresses: [],
    storeHours: [],
    ...overrides,
  } as PublicCheckoutPedido
}

describe('PublicCheckoutFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the success screen when pedido status is CONFIRMADO', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({ status: 'CONFIRMADO' })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('payment-success')).toBeInTheDocument()
    expect(screen.queryByTestId('billing-form')).not.toBeInTheDocument()
    expect(screen.queryByTestId('pix-charge')).not.toBeInTheDocument()
  })

  it('renders nothing when status is neither CONFIRMADO nor AGUARDANDO_PAGAMENTO', () => {
    const { container } = render(
      <PublicCheckoutFlow
        pedido={makePedido({ status: 'EM_PRODUCAO' })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders billing form when AGUARDANDO_PAGAMENTO without billing', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido()}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('billing-form')).toBeInTheDocument()
    // amountDue = 300 (orcamento) + 50 (frete) - 0 = 350
    expect(screen.getByTestId('billing-amount').textContent).toBe('350')
  })

  it('subtracts totalPago from amountDue', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({ totalPago: 100 })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('billing-amount').textContent).toBe('250')
  })

  it('does NOT include freight when entrega tipo is RETIRADA', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          entrega: { ...baseEntrega, tipo: 'RETIRADA', freteTotal: 50 },
        })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('billing-amount').textContent).toBe('300')
  })

  it('forwards billing payload through onPedidoUpdate when billing form confirms', async () => {
    const user = userEvent.setup()
    const onPedidoUpdate = vi.fn()
    render(
      <PublicCheckoutFlow
        pedido={makePedido()}
        token="t"
        onPedidoUpdate={onPedidoUpdate}
      />,
    )
    await user.click(screen.getByTestId('billing-confirm'))
    expect(onPedidoUpdate).toHaveBeenCalledWith({
      billing: expect.objectContaining({
        nome: 'Maria Silva',
        cpfCnpj: '52998224725',
        email: 'maria@example.com',
      }),
    })
  })

  it('renders payment tabs (PIX + Cartão) when billing is present', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          billing: {
            nome: 'Maria',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          },
        })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    // Default tab is PIX
    expect(screen.getByTestId('pix-charge')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /pix/i })).toBeInTheDocument()
    expect(
      screen.getByRole('tab', { name: /cartão de crédito/i }),
    ).toBeInTheDocument()
  })

  it('switches to card tab when clicked and renders card charge component', async () => {
    const user = userEvent.setup()
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          billing: {
            nome: 'Maria',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          },
        })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    await user.click(screen.getByRole('tab', { name: /cartão de crédito/i }))
    expect(screen.getByTestId('card-charge')).toBeInTheDocument()
  })

  it('passes existingSession to PublicPixCharge when paymentSession is PIX/PENDING', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          billing: {
            nome: 'Maria',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          },
          paymentSession: {
            method: 'PIX',
            status: 'PENDING',
            pixCopyPaste: 'pix-code',
            pixQrCodeBase64: 'qr',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('pix-existing')).toBeInTheDocument()
  })

  it('renders success when paymentSession.status is CONFIRMED but pedido status is still AGUARDANDO_PAGAMENTO', () => {
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          billing: {
            nome: 'Maria',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          },
          paymentSession: { status: 'CONFIRMED', method: 'PIX' },
        })}
        token="t"
        onPedidoUpdate={vi.fn()}
      />,
    )
    expect(screen.getByTestId('payment-success')).toBeInTheDocument()
  })

  it('updates pedido status to CONFIRMADO when child onPaid fires', async () => {
    const user = userEvent.setup()
    const onPedidoUpdate = vi.fn()
    render(
      <PublicCheckoutFlow
        pedido={makePedido({
          billing: {
            nome: 'Maria',
            cpfCnpj: '52998224725',
            email: 'maria@example.com',
          },
        })}
        token="t"
        onPedidoUpdate={onPedidoUpdate}
      />,
    )
    await user.click(screen.getByTestId('pix-paid'))
    expect(onPedidoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMADO' }),
    )
  })
})
