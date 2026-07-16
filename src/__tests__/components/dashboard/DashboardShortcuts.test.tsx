/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const canAccess = vi.fn(() => true);
const canPerformAction = vi.fn(() => true);
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ role: 'admin', canAccess, canPerformAction }),
}));

vi.mock('@/components/pedidos/PedidoFormDialog', () => ({
  PedidoFormDialog: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="pedido-form-dialog">
        <button onClick={() => onOpenChange(false)}>dialog-cancel</button>
      </div>
    ) : null,
}));

import { DashboardShortcuts } from '@/components/dashboard/DashboardShortcuts';

describe('DashboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canAccess.mockReturnValue(true);
    canPerformAction.mockReturnValue(true);
  });

  it('renders "Novo Pedido" as a button, not a link', () => {
    render(<DashboardShortcuts />);

    const novoPedido = screen.getByRole('button', { name: /novo pedido/i });
    expect(novoPedido).toBeInTheDocument();
    expect(novoPedido).toHaveAttribute('type', 'button');
    // The dead /orders/new route must not be linked anywhere.
    expect(document.querySelector('a[href="/orders/new"]')).toBeNull();
  });

  it('keeps the "group" class on the button so hover styles still apply', () => {
    render(<DashboardShortcuts />);
    expect(screen.getByRole('button', { name: /novo pedido/i })).toHaveClass('group');
  });

  it('opens the new-order dialog when "Novo Pedido" is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardShortcuts />);

    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /novo pedido/i }));
    expect(screen.getByTestId('pedido-form-dialog')).toBeInTheDocument();

    await user.click(screen.getByText('dialog-cancel'));
    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
  });

  it('still renders the other shortcuts as links', () => {
    render(<DashboardShortcuts />);
    expect(document.querySelector('a[href="/clients/new"]')).not.toBeNull();
    expect(document.querySelector('a[href="/orders"]')).not.toBeNull();
  });

  it('hides "Novo Pedido" when the user lacks the orders create permission', () => {
    canPerformAction.mockImplementation(
      ((feature: string, action: string) => !(feature === 'orders' && action === 'create')) as any
    );
    render(<DashboardShortcuts />);
    expect(screen.queryByRole('button', { name: /novo pedido/i })).not.toBeInTheDocument();
  });
});
