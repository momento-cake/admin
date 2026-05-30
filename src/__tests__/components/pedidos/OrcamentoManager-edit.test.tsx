import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/firebase', () => ({ auth: {}, db: {}, storage: {} }))
vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${Number(v).toFixed(2)}`,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { OrcamentoManager } from '@/components/pedidos/OrcamentoManager'
import { toast } from 'sonner'

function makePedido(overrides: Record<string, any> = {}) {
  return {
    id: 'p1',
    numeroPedido: 'PED-001',
    status: 'CONFIRMADO',
    orcamentos: [
      {
        id: 'o1',
        versao: 1,
        isAtivo: true,
        status: 'APROVADO',
        itens: [
          { id: 'i1', produtoId: null, nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 },
        ],
        subtotal: 100,
        desconto: 0,
        descontoTipo: 'valor',
        acrescimo: 0,
        total: 100,
      },
    ],
    ...overrides,
  } as any
}

describe('OrcamentoManager — edit items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async (url: string, init?: any) => {
      if (init?.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ success: true, data: { id: 'o2', versao: 2 } }),
        }
      }
      // PUT activate
      return { ok: true, status: 200, json: async () => ({ success: true, data: {} }) }
    }) as unknown as typeof fetch
  })

  it('opens the edit dialog prefilled and saves via POST then activate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    render(<OrcamentoManager pedido={makePedido()} onUpdate={onUpdate} />)

    await user.click(screen.getByRole('button', { name: /editar itens/i }))
    expect(await screen.findByText(/editar itens do pedido/i)).toBeInTheDocument()
    // prefilled item visible
    expect(screen.getByText('Bolo')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => {
      const calls = (global.fetch as any).mock.calls
      expect(calls.length).toBe(2)
    })
    const calls = (global.fetch as any).mock.calls
    expect(calls[0][0]).toBe('/api/pedidos/p1/orcamento')
    expect(calls[0][1].method).toBe('POST')
    const postBody = JSON.parse(calls[0][1].body)
    expect(postBody.itens).toHaveLength(1)
    expect(postBody.itens[0].nome).toBe('Bolo')

    expect(calls[1][0]).toBe('/api/pedidos/p1/orcamento/o2/ativar')
    expect(calls[1][1].method).toBe('PUT')

    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalled()
  })

  it('disables editing for a delivered order', () => {
    render(<OrcamentoManager pedido={makePedido({ status: 'ENTREGUE' })} onUpdate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /editar itens/i })).toBeDisabled()
  })

  it('sends the edited quantity (and recalculated total) in the POST payload', async () => {
    const user = userEvent.setup()
    render(<OrcamentoManager pedido={makePedido()} onUpdate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /editar itens/i }))
    await screen.findByText(/editar itens do pedido/i)

    // First spinbutton in the dialog is the item quantity input.
    const qtyInput = screen.getAllByRole('spinbutton')[0] as HTMLInputElement
    await user.clear(qtyInput)
    await user.type(qtyInput, '3')

    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect((global.fetch as any).mock.calls.length).toBe(2))
    const postBody = JSON.parse((global.fetch as any).mock.calls[0][1].body)
    expect(postBody.itens[0].quantidade).toBe(3)
    expect(postBody.itens[0].total).toBe(300)
  })

  it('shows an error toast and keeps the dialog open when saving fails', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ success: false, error: 'Erro interno' }),
    })) as unknown as typeof fetch

    render(<OrcamentoManager pedido={makePedido()} onUpdate={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /editar itens/i }))
    await screen.findByText(/editar itens do pedido/i)
    await user.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    // Dialog stays open (only the POST attempted, no activate)
    expect(screen.getByText(/editar itens do pedido/i)).toBeInTheDocument()
    expect((global.fetch as any).mock.calls.length).toBe(1)
  })

  it('activates a historical orçamento version', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const pedido = makePedido({
      orcamentos: [
        {
          id: 'o2', versao: 2, isAtivo: true, status: 'APROVADO',
          itens: [{ id: 'i2', produtoId: null, nome: 'Novo', precoUnitario: 50, quantidade: 1, total: 50 }],
          subtotal: 50, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 50,
        },
        {
          id: 'o1', versao: 1, isAtivo: false, status: 'APROVADO',
          itens: [{ id: 'i1', produtoId: null, nome: 'Antigo', precoUnitario: 100, quantidade: 1, total: 100 }],
          subtotal: 100, desconto: 0, descontoTipo: 'valor', acrescimo: 0, total: 100,
        },
      ],
    })
    render(<OrcamentoManager pedido={pedido} onUpdate={onUpdate} />)

    expect(screen.getByText(/histórico de orçamentos/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /ativar/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect((global.fetch as any).mock.calls[0][0]).toBe('/api/pedidos/p1/orcamento/o1/ativar')
    await waitFor(() => expect(onUpdate).toHaveBeenCalled())
  })

  it('opens the read-only items view for the active orçamento', async () => {
    const user = userEvent.setup()
    render(<OrcamentoManager pedido={makePedido()} onUpdate={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /ver itens/i }))
    expect(await screen.findByText(/orçamento versão 1/i)).toBeInTheDocument()
  })
})
