import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'test-token-123' }),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Loader2: (props: any) => <svg data-testid="loader" {...props} />,
  CheckCircle2: (props: any) => <svg {...props} />,
  Calendar: (props: any) => <svg {...props} />,
  Sparkles: (props: any) => <svg {...props} />,
}))

// Mock PublicPedidoView
vi.mock('@/components/public/PublicPedidoView', () => ({
  PublicPedidoView: ({ pedido }: any) => (
    <div data-testid="public-pedido-view">{pedido.numeroPedido}</div>
  ),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import PublicPedidoPage from '@/app/(public)/pedido/[token]/page'

describe('PublicPedidoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('shows loading state while fetching', () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {}) as any)

    render(<PublicPedidoPage />)

    expect(screen.getByText('Carregando seu pedido...')).toBeInTheDocument()
  })

  it('shows error message for 404 responses', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ success: false, error: 'Not found' }),
    } as Response)

    render(<PublicPedidoPage />)

    await waitFor(() => {
      expect(screen.getByText('Pedido não encontrado')).toBeInTheDocument()
    })
  })

  it('shows restricted access message for 403 responses', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ success: false, error: 'Forbidden' }),
    } as Response)

    render(<PublicPedidoPage />)

    await waitFor(() => {
      expect(
        screen.getByText('Este pedido não está disponível para visualização')
      ).toBeInTheDocument()
    })
  })

  it('renders PublicPedidoView on successful fetch', async () => {
    const mockPedido = {
      id: 'pedido-1',
      numeroPedido: 'PED-001',
      clienteNome: 'Maria Silva',
      status: 'AGUARDANDO_APROVACAO',
      orcamento: null,
      entrega: { tipo: 'ENTREGA', custoPorKm: 0, taxaExtra: 0, freteTotal: 0 },
      createdAt: '2026-03-01',
      storeAddresses: [],
      storeHours: [],
    }

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true, data: mockPedido }),
    } as Response)

    render(<PublicPedidoPage />)

    await waitFor(() => {
      expect(screen.getByTestId('public-pedido-view')).toBeInTheDocument()
      expect(screen.getByText('PED-001')).toBeInTheDocument()
    })
  })
})
