/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the heavy PedidoForm to keep this a thin-wrapper smoke test
vi.mock('@/components/pedidos/PedidoForm', () => ({
  PedidoForm: (props: any) => (
    <div data-testid="pedido-form-stub">
      <span data-testid="initial-cliente-id">{props.initialClienteId}</span>
      <span data-testid="initial-cliente-nome">{props.initialClienteNome}</span>
      <span data-testid="initial-cliente-tel">{props.initialClienteTelefone}</span>
      <span data-testid="redirect-on-success">{String(props.redirectOnSuccess)}</span>
      <button onClick={() => props.onCreated?.({ id: 'p1', numeroPedido: 'PED-01' })}>
        fake-submit
      </button>
    </div>
  ),
}));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: (...args: any[]) => toastSuccess(...args),
  },
}));

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p data-testid="sheet-description">{children}</p>,
}));

import { CreatePedidoSheet } from '@/components/whatsapp/CreatePedidoSheet';

const baseConv = (over: any = {}) => ({
  id: '5511999',
  phone: '5511999999999',
  phoneRaw: '5511999999999',
  clienteId: 'c1',
  clienteNome: 'Maria Silva',
  whatsappName: 'Maria',
  lastMessageAt: { seconds: 1, nanoseconds: 0 },
  lastMessagePreview: '',
  lastMessageDirection: 'in' as const,
  unreadCount: 0,
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  ...over,
});

beforeEach(() => {
  toastSuccess.mockReset();
});

describe('CreatePedidoSheet', () => {
  it('renders nothing when closed', () => {
    render(
      <CreatePedidoSheet
        open={false}
        onOpenChange={() => undefined}
        conversation={baseConv()}
        clienteId="c1"
        clienteNome="Maria Silva"
      />
    );
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('passes initial cliente props to PedidoForm', () => {
    render(
      <CreatePedidoSheet
        open
        onOpenChange={() => undefined}
        conversation={baseConv()}
        clienteId="c1"
        clienteNome="Maria Silva"
      />
    );
    expect(screen.getByTestId('initial-cliente-id')).toHaveTextContent('c1');
    expect(screen.getByTestId('initial-cliente-nome')).toHaveTextContent('Maria Silva');
    expect(screen.getByTestId('initial-cliente-tel')).toHaveTextContent('5511999999999');
    expect(screen.getByTestId('redirect-on-success')).toHaveTextContent('false');
  });

  it('falls back subtitle to whatsappName then phone when clienteNome missing', () => {
    render(
      <CreatePedidoSheet
        open
        onOpenChange={() => undefined}
        conversation={baseConv({ clienteNome: undefined, whatsappName: 'WAName' })}
        clienteId="c1"
        clienteNome="WAName"
      />
    );
    expect(screen.getByTestId('sheet-description')).toHaveTextContent('WAName');
  });

  it('closes sheet and toasts on successful creation', async () => {
    const onOpenChange = vi.fn();
    render(
      <CreatePedidoSheet
        open
        onOpenChange={onOpenChange}
        conversation={baseConv()}
        clienteId="c1"
        clienteNome="Maria Silva"
      />
    );
    screen.getByText('fake-submit').click();
    expect(toastSuccess).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
