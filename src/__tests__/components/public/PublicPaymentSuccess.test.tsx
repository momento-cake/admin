import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PublicPaymentSuccess } from '@/components/public/PublicPaymentSuccess'

describe('PublicPaymentSuccess', () => {
  it('renders order number and customer name', () => {
    render(
      <PublicPaymentSuccess
        pedido={{
          numeroPedido: 'PED-042',
          clienteNome: 'Maria Silva',
          entrega: { tipo: 'ENTREGA' },
        }}
      />,
    )
    expect(screen.getByText(/Pagamento confirmado/i)).toBeInTheDocument()
    expect(screen.getByText('PED-042')).toBeInTheDocument()
    expect(screen.getByText(/Maria Silva/)).toBeInTheDocument()
  })

  it('shows delivery-flavored message for ENTREGA orders', () => {
    render(
      <PublicPaymentSuccess
        pedido={{
          numeroPedido: 'PED-100',
          clienteNome: 'Joao',
          entrega: { tipo: 'ENTREGA' },
        }}
      />,
    )
    expect(
      screen.getByText(/Vamos te avisar quando seu pedido estiver pronto\./i),
    ).toBeInTheDocument()
  })

  it('shows pickup-flavored message for RETIRADA orders', () => {
    render(
      <PublicPaymentSuccess
        pedido={{
          numeroPedido: 'PED-101',
          clienteNome: 'Ana',
          entrega: { tipo: 'RETIRADA' },
        }}
      />,
    )
    expect(
      screen.getByText(/Vamos te avisar quando estiver pronto para retirada\./i),
    ).toBeInTheDocument()
  })
})
