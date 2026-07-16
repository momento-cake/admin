import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${Number(v).toFixed(2)}`,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { OrcamentoCard } from '@/components/pedidos/OrcamentoCard'

function makeOrcamento(overrides: Record<string, any> = {}) {
  return {
    id: 'o1',
    versao: 1,
    isAtivo: true,
    status: 'APROVADO',
    itens: [
      { id: 'i1', produtoId: null, nome: 'Bolo de Cenoura', precoUnitario: 100, quantidade: 2, total: 200 },
    ],
    subtotal: 200,
    desconto: 0,
    descontoTipo: 'valor',
    acrescimo: 0,
    total: 200,
    ...overrides,
  } as any
}

describe('OrcamentoCard', () => {
  it('renders the orçamento items read-only when showItems is set', () => {
    render(
      <OrcamentoCard orcamento={makeOrcamento()} pedidoId="p1" showItems onUpdate={vi.fn()} />
    )

    expect(screen.getByText('Bolo de Cenoura')).toBeInTheDocument()
    // Read-only: quantity/price are plain text, not editable inputs.
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    // Editing affordances from PedidoItemsTable must stay hidden.
    expect(screen.queryByRole('button', { name: /adicionar produto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /item personalizado/i })).not.toBeInTheDocument()
  })

  it('does not render the items table when showItems is omitted', () => {
    render(<OrcamentoCard orcamento={makeOrcamento()} pedidoId="p1" onUpdate={vi.fn()} />)

    expect(screen.queryByText('Bolo de Cenoura')).not.toBeInTheDocument()
  })

  it('never renders a "Ver Itens" button', () => {
    render(
      <OrcamentoCard orcamento={makeOrcamento()} pedidoId="p1" showItems onUpdate={vi.fn()} />
    )

    expect(screen.queryByRole('button', { name: /ver itens/i })).not.toBeInTheDocument()
  })

  it('renders the items of a historical orçamento alongside its Ativar button', async () => {
    const user = userEvent.setup()
    const onActivate = vi.fn()
    render(
      <OrcamentoCard
        orcamento={makeOrcamento({ isAtivo: false, itens: [
          { id: 'i9', produtoId: null, nome: 'Torta Antiga', precoUnitario: 50, quantidade: 1, total: 50 },
        ] })}
        pedidoId="p1"
        showItems
        onActivate={onActivate}
        onUpdate={vi.fn()}
      />
    )

    expect(screen.getByText('Torta Antiga')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ativar/i }))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('hides the Ativar button when showActivateButton is false', () => {
    render(
      <OrcamentoCard
        orcamento={makeOrcamento({ isAtivo: false })}
        pedidoId="p1"
        showItems
        showActivateButton={false}
        onActivate={vi.fn()}
        onUpdate={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /ativar/i })).not.toBeInTheDocument()
  })
})
