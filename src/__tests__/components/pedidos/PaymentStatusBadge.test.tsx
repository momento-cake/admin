import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PaymentStatusBadge } from '@/components/pedidos/pagamentos/PaymentStatusBadge'

describe('PaymentStatusBadge', () => {
  it('renders PAGO with a green-ish visual', () => {
    render(<PaymentStatusBadge status="PAGO" />)
    expect(screen.getByText(/pago/i)).toBeInTheDocument()
  })

  it('renders PARCIAL', () => {
    render(<PaymentStatusBadge status="PARCIAL" />)
    expect(screen.getByText(/parcial/i)).toBeInTheDocument()
  })

  it('renders VENCIDO', () => {
    render(<PaymentStatusBadge status="VENCIDO" />)
    expect(screen.getByText(/vencido/i)).toBeInTheDocument()
  })

  it('renders PENDENTE when not hidden', () => {
    render(<PaymentStatusBadge status="PENDENTE" />)
    expect(screen.getByText(/pendente/i)).toBeInTheDocument()
  })

  it('hides PENDENTE when hideWhenPendente is true', () => {
    const { container } = render(
      <PaymentStatusBadge status="PENDENTE" hideWhenPendente />
    )
    expect(container.firstChild).toBeNull()
  })

  it('still renders non-PENDENTE even when hideWhenPendente is true', () => {
    render(<PaymentStatusBadge status="PAGO" hideWhenPendente />)
    expect(screen.getByText(/pago/i)).toBeInTheDocument()
  })
})
