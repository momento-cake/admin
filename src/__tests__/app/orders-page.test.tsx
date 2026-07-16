/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ canPerformAction: () => true, canAccess: () => true, role: 'admin' }),
}));

// Stub the list/board so these stay page-wiring tests.
vi.mock('@/components/pedidos/PedidoList', () => ({
  PedidoList: ({ onPedidoCreate, refreshToken }: any) => (
    <div>
      <span data-testid="refresh-token">{String(refreshToken)}</span>
      <button onClick={onPedidoCreate}>Novo Pedido</button>
    </div>
  ),
}));

vi.mock('@/components/pedidos/KanbanBoard', () => ({
  KanbanBoard: ({ onPedidoCreate, refreshToken }: any) => (
    <div>
      <span data-testid="refresh-token">{String(refreshToken)}</span>
      <button onClick={onPedidoCreate}>Novo Pedido</button>
    </div>
  ),
}));

vi.mock('@/components/pedidos/PedidoFormDialog', () => ({
  PedidoFormDialog: ({ open, onOpenChange, onCreated }: any) =>
    open ? (
      <div data-testid="pedido-form-dialog">
        <button onClick={() => onOpenChange(false)}>dialog-cancel</button>
        <button onClick={() => onCreated?.({ id: 'p1', numeroPedido: 'PED-01' })}>
          dialog-create
        </button>
      </div>
    ) : null,
}));

import OrdersPage from '@/app/(dashboard)/orders/page';
import OrdersKanbanPage from '@/app/(dashboard)/orders/kanban/page';

describe.each([
  ['OrdersPage', OrdersPage],
  ['OrdersKanbanPage', OrdersKanbanPage],
])('%s — new order dialog', (_name, Page) => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
  });

  it('starts with the dialog closed', () => {
    render(<Page />);
    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
  });

  it('opens the dialog instead of navigating to /orders/new', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole('button', { name: 'Novo Pedido' }));

    expect(screen.getByTestId('pedido-form-dialog')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('closes the dialog on cancel', async () => {
    const user = userEvent.setup();
    render(<Page />);

    await user.click(screen.getByRole('button', { name: 'Novo Pedido' }));
    await user.click(screen.getByText('dialog-cancel'));

    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
  });

  it('bumps refreshToken and closes the dialog after a pedido is created', async () => {
    const user = userEvent.setup();
    render(<Page />);

    const before = screen.getByTestId('refresh-token').textContent;

    await user.click(screen.getByRole('button', { name: 'Novo Pedido' }));
    await user.click(screen.getByText('dialog-create'));

    expect(screen.getByTestId('refresh-token').textContent).not.toBe(before);
    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
  });
});
