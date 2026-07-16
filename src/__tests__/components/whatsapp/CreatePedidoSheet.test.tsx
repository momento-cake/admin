/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the shared dialog so this stays a thin-wrapper test: we assert what
// CreatePedidoSheet hands down, not how PedidoFormDialog renders it.
vi.mock('@/components/pedidos/PedidoFormDialog', () => ({
  PedidoFormDialog: (props: any) =>
    props.open ? (
      <div data-testid="pedido-form-dialog">
        <span data-testid="dialog-title">{props.title}</span>
        <span data-testid="dialog-description">{props.description}</span>
        <span data-testid="initial-cliente-id">{props.initialClienteId}</span>
        <span data-testid="initial-cliente-nome">{props.initialClienteNome}</span>
        <span data-testid="initial-cliente-tel">{props.initialClienteTelefone}</span>
        <button onClick={() => props.onCreated?.({ id: 'p1', numeroPedido: 'PED-01' })}>
          fake-submit
        </button>
      </div>
    ) : null,
}));

const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: (...args: any[]) => toastSuccess(...args),
  },
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
    expect(screen.queryByTestId('pedido-form-dialog')).not.toBeInTheDocument();
  });

  it('passes initial cliente props and the WhatsApp title through to the dialog', () => {
    render(
      <CreatePedidoSheet
        open
        onOpenChange={() => undefined}
        conversation={baseConv()}
        clienteId="c1"
        clienteNome="Maria Silva"
      />
    );
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Criar pedido — WhatsApp');
    expect(screen.getByTestId('initial-cliente-id')).toHaveTextContent('c1');
    expect(screen.getByTestId('initial-cliente-nome')).toHaveTextContent('Maria Silva');
    expect(screen.getByTestId('initial-cliente-tel')).toHaveTextContent('5511999999999');
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
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('WAName');
  });

  it('closes and toasts on successful creation', async () => {
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
