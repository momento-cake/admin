/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Keep the Referências step's uploader away from real Firebase storage.
vi.mock('@/lib/storage', () => ({
  uploadMultipleImages: vi.fn(async () => ({ successful: [], failed: [] })),
  deleteImage: vi.fn(async () => {}),
}));

vi.mock('@/lib/products', () => ({
  formatPrice: (price: number) => `R$ ${price.toFixed(2)}`,
}));

// Drive the client/items state directly; ClienteStep's own quick-create dialog
// stays REAL because the nested-dialog case is what this suite is guarding.
vi.mock('@/components/pedidos/ClienteSelector', () => ({
  ClienteSelector: ({ onSelect }: any) => (
    <button
      type="button"
      data-testid="mock-select-client"
      onClick={() => onSelect({ id: 'client-1', nome: 'Maria Silva', telefone: '11999999999' })}
    >
      Select Client
    </button>
  ),
}));

vi.mock('@/components/pedidos/PedidoItemsTable', () => ({
  PedidoItemsTable: ({ onChange }: any) => (
    <button
      type="button"
      data-testid="mock-add-item"
      onClick={() =>
        onChange([{ id: 'item-1', nome: 'Bolo', precoUnitario: 100, quantidade: 1, total: 100 }])
      }
    >
      Add Item
    </button>
  ),
}));

import { PedidoFormDialog } from '@/components/pedidos/PedidoFormDialog';

const STEP_LABELS = ['Cliente', 'Itens', 'Entrega', 'Detalhes', 'Referências', 'Revisão'];

function mockFetch() {
  global.fetch = vi.fn(async (url: string) => {
    if (typeof url === 'string' && url.includes('/api/clients/')) {
      return { ok: true, json: async () => ({ success: true, data: { addresses: [] } }) } as any;
    }
    if (typeof url === 'string' && url.includes('/api/clients')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { id: 'client-9', name: 'Novo Cliente' } }),
      } as any;
    }
    if (typeof url === 'string' && url.includes('/api/store-addresses')) {
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: 'store-1', nome: 'Loja Principal', endereco: 'Rua A', numero: '1' }],
        }),
      } as any;
    }
    if (typeof url === 'string' && url.includes('/api/pedidos')) {
      return {
        ok: true,
        json: async () => ({ success: true, data: { id: 'ped-1', numeroPedido: 'PED-001' } }),
      } as any;
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }) as any;
}

describe('PedidoFormDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mockPush.mockReset();
    mockFetch();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function advanceAnimation() {
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
  }

  it('renders nothing when open is false', () => {
    render(<PedidoFormDialog open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Novo Pedido')).not.toBeInTheDocument();
  });

  it('renders the default title and all six wizard steps when open', () => {
    render(<PedidoFormDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Novo Pedido' })).toBeInTheDocument();

    // Full parity with the old /orders/new page: every step is reachable from
    // the indicator, and the wizard starts on Cliente.
    for (const label of STEP_LABELS) {
      expect(screen.getByRole('button', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getByText('Selecione o cliente para este pedido')).toBeInTheDocument();
  });

  it('renders a custom title and description', () => {
    render(
      <PedidoFormDialog
        open
        onOpenChange={vi.fn()}
        title="Criar pedido — WhatsApp"
        description="Maria Silva"
      />
    );
    expect(screen.getByRole('heading', { name: 'Criar pedido — WhatsApp' })).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
  });

  it('closes via onOpenChange when Cancelar is clicked, without navigating away', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(<PedidoFormDialog open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not close when the overlay is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(<PedidoFormDialog open onOpenChange={onOpenChange} />);

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')!;
    await user.click(overlay);

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not close when Escape is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(<PedidoFormDialog open onOpenChange={onOpenChange} />);

    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Radix aria-hidden's the outer layer while an inner modal is open, so the
   * outer dialog drops out of getAllByRole('dialog'). Count the mounted content
   * nodes instead — what matters is that the wizard is not unmounted.
   */
  const dialogContents = () => document.querySelectorAll('[data-slot="dialog-content"]');

  it('keeps the wizard mounted when ClienteStep opens its nested dialog', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(<PedidoFormDialog open onOpenChange={onOpenChange} />);

    expect(dialogContents()).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /cadastrar novo cliente/i }));

    // Both layers are mounted: the inner quick-create dialog over the wizard.
    await waitFor(() => expect(dialogContents()).toHaveLength(2));
    const inner = screen.getByRole('dialog', { name: /cadastrar novo cliente/i });
    expect(within(inner).getByLabelText(/nome \*/i)).toBeInTheDocument();
    // The outer must not have taken the inner's open as an outside interaction.
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Selecione o cliente para este pedido')).toBeInTheDocument();
  });

  it('closes only the inner dialog on Escape, leaving the wizard open', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onOpenChange = vi.fn();
    render(<PedidoFormDialog open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: /cadastrar novo cliente/i }));
    await waitFor(() => expect(dialogContents()).toHaveLength(2));

    await user.keyboard('{Escape}');

    // Escape reaches the innermost layer only; the guarded wizard survives.
    await waitFor(() => expect(dialogContents()).toHaveLength(1));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Novo Pedido' })).toBeInTheDocument();
    expect(screen.getByText('Selecione o cliente para este pedido')).toBeInTheDocument();
  });

  it('bubbles the created pedido through onCreated after the full wizard flow', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCreated = vi.fn();
    render(<PedidoFormDialog open onOpenChange={vi.fn()} onCreated={onCreated} />);

    const next = async () => {
      await user.click(screen.getByRole('button', { name: /próximo/i }));
      await advanceAnimation();
    };

    await user.click(screen.getByTestId('mock-select-client'));
    await next();

    await user.click(screen.getByTestId('mock-add-item'));
    await next();

    await waitFor(() => expect(screen.getByText('Loja Principal')).toBeInTheDocument());
    await user.click(screen.getByTestId('store-card-store-1'));
    await next();
    await next();
    await next();

    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledWith({ id: 'ped-1', numeroPedido: 'PED-001' });
    });
    // The dialog owns closing; the form must not navigate the app away.
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('seeds the wizard with the initial client so it starts pre-selected', () => {
    render(
      <PedidoFormDialog
        open
        onOpenChange={vi.fn()}
        initialClienteId="c1"
        initialClienteNome="Maria Silva"
        initialClienteTelefone="5511999999999"
      />
    );
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('5511999999999')).toBeInTheDocument();
  });
});
