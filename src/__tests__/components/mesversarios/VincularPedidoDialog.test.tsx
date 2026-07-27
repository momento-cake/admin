/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { VincularPedidoDialog } from '@/components/mesversarios/VincularPedidoDialog';
import type { Pedido } from '@/types/pedido';

const makePedido = (over: Partial<Pedido> = {}): Pedido =>
  ({
    id: 'p1',
    numeroPedido: 'PED-0001',
    status: 'CONFIRMADO',
    clienteId: 'c1',
    clienteNome: 'Maria',
    orcamentos: [{ id: 'o1', isAtivo: true, total: 250, itens: [] }],
    entrega: { tipo: 'RETIRADA' },
    pagamentos: [],
    totalPago: 0,
    ...over,
  }) as any;

function mockFetchOnce(data: Pedido[]) {
  global.fetch = vi.fn(async () => ({
    json: async () => ({ success: true, data }),
  })) as any;
}

describe('VincularPedidoDialog', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it('does not fetch while closed', () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as any;
    render(
      <VincularPedidoDialog
        open={false}
        onOpenChange={() => {}}
        clienteId="c1"
        clienteNome="Maria"
        onPick={vi.fn()}
      />
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lists the client orders with number and total', async () => {
    mockFetchOnce([makePedido({ id: 'p1', numeroPedido: 'PED-0001', orcamentos: [{ id: 'o', isAtivo: true, total: 250, itens: [] }] as any })]);
    render(
      <VincularPedidoDialog
        open
        onOpenChange={() => {}}
        clienteId="c1"
        clienteNome="Maria"
        onPick={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText('PED-0001')).toBeInTheDocument());
    expect(screen.getByText(/R\$\s?250,00/)).toBeInTheDocument();
    // Fetched scoped to the client.
    expect((global.fetch as any).mock.calls[0][0]).toContain('clienteId=c1');
  });

  it('calls onPick with the chosen order', async () => {
    const onPick = vi.fn();
    mockFetchOnce([makePedido({ id: 'p9', numeroPedido: 'MES-0003' })]);
    render(
      <VincularPedidoDialog
        open
        onOpenChange={() => {}}
        clienteId="c1"
        clienteNome="Maria"
        onPick={onPick}
      />
    );
    await waitFor(() => expect(screen.getByText('MES-0003')).toBeInTheDocument());
    await userEvent.click(screen.getByText('MES-0003'));
    await waitFor(() => expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'p9' })));
  });

  it('shows the empty state when the client has no orders', async () => {
    mockFetchOnce([]);
    render(
      <VincularPedidoDialog
        open
        onOpenChange={() => {}}
        clienteId="c1"
        clienteNome="Maria"
        onPick={vi.fn()}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/ainda não tem pedidos/i)).toBeInTheDocument()
    );
  });

  it('orders unlinked pedidos before already-linked ones', async () => {
    mockFetchOnce([
      makePedido({ id: 'linked', numeroPedido: 'PED-0001', mesversarioId: 'm-other' }),
      makePedido({ id: 'free', numeroPedido: 'PED-0002' }),
    ]);
    render(
      <VincularPedidoDialog
        open
        onOpenChange={() => {}}
        clienteId="c1"
        clienteNome="Maria"
        onPick={vi.fn()}
      />
    );
    await waitFor(() => expect(screen.getByText('PED-0002')).toBeInTheDocument());
    const codes = screen.getAllByText(/PED-000\d/).map((el) => el.textContent);
    // The unlinked order (PED-0002) sorts ahead of the linked one (PED-0001).
    expect(codes[0]).toBe('PED-0002');
  });
});
