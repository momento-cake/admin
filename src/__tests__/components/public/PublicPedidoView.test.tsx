import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublicPedidoView } from '@/components/public/PublicPedidoView'
import type { PublicPedidoData, PublicEntrega, PublicOrcamento } from '@/components/public/PublicPedidoView'

// Mock child components
vi.mock('@/components/public/PublicEntregaToggle', () => ({
  PublicEntregaToggle: ({ entrega }: any) => (
    <div data-testid="entrega-toggle">
      {entrega.tipo === 'ENTREGA' && entrega.enderecoEntrega && (
        <div data-testid="delivery-address">
          {entrega.enderecoEntrega.endereco}, {entrega.enderecoEntrega.numero}
        </div>
      )}
      {entrega.tipo === 'RETIRADA' && entrega.enderecoRetiradaNome && (
        <div data-testid="pickup-location">{entrega.enderecoRetiradaNome}</div>
      )}
    </div>
  ),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>()
  return {
    ...actual,
    CheckCircle2: (props: any) => <svg data-testid="check-circle-icon" {...props} />,
    Loader2: (props: any) => <svg data-testid="loader-icon" {...props} />,
    Calendar: (props: any) => <svg data-testid="calendar-icon" {...props} />,
    MapPin: (props: any) => <svg data-testid="map-pin-icon" {...props} />,
    Store: (props: any) => <svg data-testid="store-icon" {...props} />,
    Package: (props: any) => <svg data-testid="package-icon" {...props} />,
    Truck: (props: any) => <svg data-testid="truck-icon" {...props} />,
    Sparkles: (props: any) => <svg data-testid="sparkles-icon" {...props} />,
    MessageSquare: (props: any) => <svg data-testid="message-square-icon" {...props} />,
  }
})

// Helper to create mock pedido data
function createMockPedido(overrides: Partial<PublicPedidoData> = {}): PublicPedidoData {
  const defaultOrcamento: PublicOrcamento = {
    id: 'orc-1',
    versao: 1,
    isAtivo: true,
    status: 'APROVADO',
    itens: [
      {
        id: 'item-1',
        nome: 'Bolo de Chocolate',
        descricao: 'Bolo recheado com chocolate belga',
        precoUnitario: 120.0,
        quantidade: 2,
        total: 240.0,
      },
      {
        id: 'item-2',
        nome: 'Cupcake de Baunilha',
        precoUnitario: 15.0,
        quantidade: 10,
        total: 150.0,
      },
    ],
    subtotal: 390.0,
    desconto: 40.0,
    descontoTipo: 'valor',
    acrescimo: 0,
    total: 350.0,
  }

  const defaultEntrega: PublicEntrega = {
    tipo: 'ENTREGA',
    enderecoEntrega: {
      id: 'addr-1',
      endereco: 'Rua das Flores',
      numero: '123',
      bairro: 'Centro',
      cidade: 'Sao Paulo',
      estado: 'SP',
      cep: '01001-000',
    },
    custoPorKm: 2.0,
    taxaExtra: 0,
    freteTotal: 25.0,
  }

  return {
    id: 'pedido-1',
    numeroPedido: 'PED-001',
    clienteNome: 'Maria Silva',
    status: 'AGUARDANDO_APROVACAO',
    orcamento: defaultOrcamento,
    entrega: defaultEntrega,
    dataEntrega: '2026-04-15',
    observacoesCliente: 'Entregar na portaria',
    createdAt: '2026-03-01T10:00:00Z',
    storeAddresses: [],
    storeHours: [],
    ...overrides,
  }
}

describe('PublicPedidoView', () => {
  const mockOnPedidoUpdate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  describe('Branded Header', () => {
    it('renders branded header with Momento Cake', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      const momentoCakeTexts = screen.getAllByText('Momento Cake')
      expect(momentoCakeTexts.length).toBeGreaterThanOrEqual(1)
    })

    it('renders order number in the header', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText(/PED-001/)).toBeInTheDocument()
    })

    it('renders status badge in the header', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText('Aguardando Aprovação')).toBeInTheDocument()
    })
  })

  describe('Order Items Display', () => {
    it('renders order items with names, quantities, and prices', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText('Bolo de Chocolate')).toBeInTheDocument()
      expect(screen.getByText('Cupcake de Baunilha')).toBeInTheDocument()
      // Quantity detail
      expect(screen.getByText(/2 unidades/)).toBeInTheDocument()
      expect(screen.getByText(/10 unidades/)).toBeInTheDocument()
    })

    it('shows item description when present', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText('Bolo recheado com chocolate belga')).toBeInTheDocument()
    })

    it('formats prices in BRL currency', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // Check for BRL formatted values (R$ prefix)
      const allText = document.body.textContent || ''
      expect(allText).toContain('R$')
    })

    it('shows discount when present', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText('Desconto')).toBeInTheDocument()
    })
  })

  describe('Delivery Info', () => {
    it('shows delivery info for ENTREGA orders', () => {
      const pedido = createMockPedido({
        entrega: {
          tipo: 'ENTREGA',
          enderecoEntrega: {
            id: 'addr-1',
            endereco: 'Rua das Flores',
            numero: '123',
            bairro: 'Centro',
            cidade: 'Sao Paulo',
            estado: 'SP',
            cep: '01001-000',
          },
          custoPorKm: 2.0,
          taxaExtra: 0,
          freteTotal: 25.0,
        },
      })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // The entrega toggle is mocked, check it renders with delivery address
      expect(screen.getByTestId('delivery-address')).toBeInTheDocument()
    })

    it('shows pickup info for RETIRADA orders', () => {
      const pedido = createMockPedido({
        entrega: {
          tipo: 'RETIRADA',
          enderecoRetiradaId: 'store-1',
          enderecoRetiradaNome: 'Loja Centro',
          custoPorKm: 0,
          taxaExtra: 0,
          freteTotal: 0,
        },
      })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByTestId('pickup-location')).toBeInTheDocument()
      expect(screen.getByText('Loja Centro')).toBeInTheDocument()
    })

    it('shows delivery date when present', () => {
      const pedido = createMockPedido({ dataEntrega: '2026-04-15' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // Should display formatted date
      expect(screen.getByText(/15 de abril de 2026/)).toBeInTheDocument()
    })
  })

  describe('Client Notes', () => {
    it('shows client notes when present', () => {
      const pedido = createMockPedido({ observacoesCliente: 'Entregar na portaria' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText('Entregar na portaria')).toBeInTheDocument()
      expect(screen.getByText('Observações')).toBeInTheDocument()
    })

    it('does not show notes section when absent', () => {
      const pedido = createMockPedido({ observacoesCliente: null })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.queryByText('Observações')).not.toBeInTheDocument()
    })
  })

  describe('Confirm Button (AGUARDANDO_APROVACAO)', () => {
    it('shows the confirm-and-pay button for AGUARDANDO_APROVACAO status', () => {
      const pedido = createMockPedido({ status: 'AGUARDANDO_APROVACAO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByRole('button', { name: /confirmar e ir para pagamento/i })).toBeInTheDocument()
    })

    it('does NOT show confirm button for CONFIRMADO status', () => {
      const pedido = createMockPedido({ status: 'CONFIRMADO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.queryByRole('button', { name: /confirmar e ir para pagamento/i })).not.toBeInTheDocument()
    })

    it('calls API and updates state on successful confirmation', async () => {
      const user = userEvent.setup()
      const updatedPedido = createMockPedido({ status: 'CONFIRMADO' })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: updatedPedido }),
      } as Response)

      const pedido = createMockPedido({ status: 'AGUARDANDO_APROVACAO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token-abc" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      const confirmButton = screen.getByRole('button', { name: /confirmar e ir para pagamento/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/public/pedidos/test-token-abc/confirmar',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      await waitFor(() => {
        expect(mockOnPedidoUpdate).toHaveBeenCalledWith(updatedPedido)
      })
    })

    it('shows loading state during confirmation', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      vi.mocked(global.fetch).mockReturnValueOnce(fetchPromise as any)

      const pedido = createMockPedido({ status: 'AGUARDANDO_APROVACAO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      const confirmButton = screen.getByRole('button', { name: /confirmar e ir para pagamento/i })
      await user.click(confirmButton)

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/confirmando/i)).toBeInTheDocument()
      })

      // Resolve the promise to clean up
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ success: true, data: createMockPedido({ status: 'CONFIRMADO' }) }),
      })
    })

    it('shows error message on confirm failure', async () => {
      const { toast } = await import('sonner')
      const user = userEvent.setup()

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Este pedido nao pode ser confirmado no status atual',
          }),
      } as Response)

      const pedido = createMockPedido({ status: 'AGUARDANDO_APROVACAO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      const confirmButton = screen.getByRole('button', { name: /confirmar e ir para pagamento/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
    })
  })

  describe('Confirmed State Display', () => {
    it('shows payment-confirmed success banner for CONFIRMADO status', () => {
      const pedido = createMockPedido({ status: 'CONFIRMADO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      expect(screen.getByText(/pagamento confirmado/i)).toBeInTheDocument()
    })

    it('shows the confirmation success card with role=status for CONFIRMADO', () => {
      const pedido = createMockPedido({ status: 'CONFIRMADO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // The success card lives in PublicPaymentSuccess and is a live region.
      // The previous design used CheckCircle2; the redesigned wax-seal uses
      // the lucide `Check` icon inside a custom disc, so we assert on the
      // user-visible behavior (live status + the success heading) instead.
      const status = screen.getByRole('status')
      expect(status).toBeInTheDocument()
      expect(status.textContent).toMatch(/pagamento confirmado/i)
    })

    it('still shows all order details when confirmed', () => {
      const pedido = createMockPedido({ status: 'CONFIRMADO' })
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // Items should still be visible
      expect(screen.getByText('Bolo de Chocolate')).toBeInTheDocument()
      expect(screen.getByText('Cupcake de Baunilha')).toBeInTheDocument()
      // Totals still visible
      expect(screen.getByText('Subtotal')).toBeInTheDocument()
    })
  })

  describe('No Progress Wizard', () => {
    it('does not show step progress indicator', () => {
      const pedido = createMockPedido()
      render(
        <PublicPedidoView pedido={pedido} token="test-token" onPedidoUpdate={mockOnPedidoUpdate} />
      )

      // Old wizard steps should not be present
      expect(screen.queryByText('Pagamento')).not.toBeInTheDocument()
    })
  })
})
