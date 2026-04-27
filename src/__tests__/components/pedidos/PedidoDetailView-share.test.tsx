import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PedidoDetailView } from '@/components/pedidos/PedidoDetailView';
import { Pedido } from '@/types/pedido';

// Mock all child components to isolate the share button behavior
vi.mock('@/components/pedidos/PedidoStatusBadge', () => ({
  PedidoStatusBadge: ({ status }: any) => <span data-testid="status-badge">{status}</span>,
}));

vi.mock('@/components/pedidos/PedidoStatusFlow', () => ({
  PedidoStatusFlow: () => <div data-testid="status-flow" />,
}));

vi.mock('@/components/pedidos/OrcamentoManager', () => ({
  OrcamentoManager: () => <div data-testid="orcamento-manager" />,
}));

vi.mock('@/components/pedidos/PaymentSection', () => ({
  PaymentSection: () => <div data-testid="payment-section" />,
}));

vi.mock('@/components/pedidos/NfSection', () => ({
  NfSection: () => <div data-testid="nf-section" />,
}));

vi.mock('@/components/pedidos/PacoteManager', () => ({
  PacoteManager: () => <div data-testid="pacote-manager" />,
}));

vi.mock('@/components/pedidos/EntregaSection', () => ({
  EntregaSection: () => <div data-testid="entrega-section" />,
}));

vi.mock('@/components/pedidos/ShareOrderButton', () => ({
  ShareOrderButton: (props: any) => (
    <div data-testid="share-order-button" data-token={props.publicToken} />
  ),
}));

vi.mock('@/components/pedidos/PedidoCheckoutCard', () => ({
  PedidoCheckoutCard: () => <div data-testid="checkout-card" />,
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/lib/products', () => ({
  formatPrice: (v: number) => `R$ ${v.toFixed(2)}`,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    FileText: () => null,
    Package: () => null,
    Truck: () => null,
    CreditCard: () => null,
    Receipt: () => null,
    UserCheck: () => null,
    Calendar: () => null,
    Clock: () => null,
  };
});

const basePedido: Pedido = {
  id: 'pedido-1',
  numeroPedido: 'PED-001',
  publicToken: 'token-abc',
  clienteId: 'client-1',
  clienteNome: 'Maria Silva',
  clienteTelefone: '11999999999',
  status: 'AGUARDANDO_APROVACAO',
  orcamentos: [
    {
      id: 'orc-1',
      versao: 1,
      isAtivo: true,
      status: 'ENVIADO',
      itens: [],
      subtotal: 100,
      desconto: 0,
      descontoTipo: 'valor',
      acrescimo: 0,
      total: 100,
      criadoEm: { toDate: () => new Date() } as any,
      criadoPor: 'admin',
    },
  ],
  pacotes: [],
  entrega: {
    tipo: 'RETIRADA',
    custoPorKm: 0,
    taxaExtra: 0,
    freteTotal: 0,
  },
  isActive: true,
  createdAt: { toDate: () => new Date() } as any,
  updatedAt: { toDate: () => new Date() } as any,
  createdBy: 'admin',
};

// Mock fetch for client addresses
global.fetch = vi.fn().mockResolvedValue({
  json: () => Promise.resolve({ success: true, data: { addresses: [] } }),
}) as any;

describe('PedidoDetailView - ShareOrderButton integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows ShareOrderButton when pedido is AGUARDANDO_APROVACAO', () => {
    render(
      <PedidoDetailView pedido={basePedido} onUpdate={vi.fn()} />
    );
    expect(screen.getByTestId('share-order-button')).toBeInTheDocument();
  });

  it('does not show ShareOrderButton for CONFIRMADO', () => {
    const pedido = { ...basePedido, status: 'CONFIRMADO' as const };
    render(
      <PedidoDetailView pedido={pedido} onUpdate={vi.fn()} />
    );
    expect(screen.queryByTestId('share-order-button')).not.toBeInTheDocument();
  });

  it('does not show ShareOrderButton for RASCUNHO', () => {
    const pedido = { ...basePedido, status: 'RASCUNHO' as const };
    render(
      <PedidoDetailView pedido={pedido} onUpdate={vi.fn()} />
    );
    expect(screen.queryByTestId('share-order-button')).not.toBeInTheDocument();
  });
});
