import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`,
}))
vi.mock('@/lib/storage', () => ({
  uploadReceipt: vi.fn(),
  deleteReceipt: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { PaymentList } from '@/components/pedidos/pagamentos/PaymentList'
import type { Pagamento } from '@/types/pedido'

const mkPag = (overrides: Partial<Pagamento> = {}): Pagamento =>
  ({
    id: 'pay-1',
    data: { toDate: () => new Date('2026-04-20T12:00:00Z') } as unknown as Pagamento['data'],
    valor: 150,
    metodo: 'PIX',
    createdAt: { toDate: () => new Date() } as unknown as Pagamento['createdAt'],
    createdBy: 'u1',
    ...overrides,
  } as Pagamento)

describe('PaymentList', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { removed: { id: 'pay-1', comprovantePath: null } },
      }),
    })) as unknown as typeof fetch
  })

  it('renders an empty state when there are no payments', () => {
    render(
      <PaymentList
        pedidoId="p1"
        pagamentos={[]}
        canDelete
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText(/nenhum pagamento/i)).toBeInTheDocument()
  })

  it('renders one row per payment with valor, metodo, and date', () => {
    render(
      <PaymentList
        pedidoId="p1"
        pagamentos={[
          mkPag({ id: 'a', valor: 150, metodo: 'PIX' }),
          mkPag({ id: 'b', valor: 300, metodo: 'DINHEIRO' }),
        ]}
        canDelete
        onChanged={vi.fn()}
      />
    )
    expect(screen.getByText(/150,00/)).toBeInTheDocument()
    expect(screen.getByText(/300,00/)).toBeInTheDocument()
    expect(screen.getByText('PIX')).toBeInTheDocument()
    expect(screen.getByText(/dinheiro/i)).toBeInTheDocument()
  })

  it('hides the delete button when canDelete is false', () => {
    render(
      <PaymentList
        pedidoId="p1"
        pagamentos={[mkPag()]}
        canDelete={false}
        onChanged={vi.fn()}
      />
    )
    expect(screen.queryByLabelText(/excluir/i)).not.toBeInTheDocument()
  })

  it('calls DELETE on the correct endpoint and onChanged after success', async () => {
    const onChanged = vi.fn()
    const user = userEvent.setup()
    render(
      <PaymentList
        pedidoId="p1"
        pagamentos={[mkPag({ id: 'pay-1' })]}
        canDelete
        onChanged={onChanged}
      />
    )
    const btn = screen.getByLabelText(/excluir/i)
    await user.click(btn)
    // confirm dialog
    const confirmBtn = await screen.findByRole('button', { name: /confirmar|excluir/i })
    await user.click(confirmBtn)
    // the fetch should have been made to the right URL
    const call = (global.fetch as unknown as { mock: { calls: unknown[][] } })
      .mock.calls[0]
    expect(call[0]).toBe('/api/pedidos/p1/pagamentos/pay-1')
    expect((call[1] as RequestInit).method).toBe('DELETE')
    expect(onChanged).toHaveBeenCalled()
  })

  it('renders a comprovante link when comprovanteUrl is present', () => {
    render(
      <PaymentList
        pedidoId="p1"
        pagamentos={[
          mkPag({
            comprovanteUrl: 'https://storage.example/x.pdf',
            comprovanteTipo: 'pdf',
          }),
        ]}
        canDelete
        onChanged={vi.fn()}
      />
    )
    const link = screen.getByRole('link', { name: /comprovante/i }) as HTMLAnchorElement
    expect(link.href).toBe('https://storage.example/x.pdf')
  })
})
