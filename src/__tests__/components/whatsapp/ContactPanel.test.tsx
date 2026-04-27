/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => toastError(...args),
    success: (...args: any[]) => toastSuccess(...args),
  },
}));

const mockOnCreateOrder = vi.fn();
vi.mock('@/components/whatsapp/CreatePedidoSheet', () => ({
  CreatePedidoSheet: ({ open, clienteId, clienteNome }: any) =>
    open ? (
      <div data-testid="create-pedido-sheet">
        <span>{clienteId}</span>
        <span>{clienteNome}</span>
      </div>
    ) : null,
}));

import { ContactPanel } from '@/components/whatsapp/ContactPanel';

const mockFetch = vi.fn();

const baseConv = (over: any = {}) => ({
  id: '5511999',
  phone: '5511999999999',
  phoneRaw: '5511999999999',
  whatsappName: 'WAName',
  lastMessageAt: { seconds: 1, nanoseconds: 0 },
  lastMessagePreview: '',
  lastMessageDirection: 'in',
  unreadCount: 0,
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  ...over,
});

beforeEach(() => {
  toastError.mockReset();
  toastSuccess.mockReset();
  mockFetch.mockReset();
  mockOnCreateOrder.mockReset();
  global.fetch = mockFetch as any;
});

describe('ContactPanel', () => {
  it('renders nothing when conversation is null', () => {
    const { container } = render(<ContactPanel conversation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows unmatched state when no clienteId', () => {
    render(<ContactPanel conversation={baseConv()} />);
    expect(screen.getByText(/\+55 \(11\) 99999-9999/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vincular/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar cliente rápido/i })).toBeInTheDocument();
  });

  it('opens link existing client UI and links on selection', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { clients: [{ id: 'c1', name: 'Maria' }] },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

    render(<ContactPanel conversation={baseConv()} />);
    await userEvent.click(screen.getByRole('button', { name: /vincular/i }));
    const search = await screen.findByPlaceholderText(/buscar/i);
    await userEvent.type(search, 'Mar');

    await waitFor(() => expect(screen.getByText('Maria')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Maria'));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/whatsapp/conversations/5511999/link-client',
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('quick-creates a client', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: {} }),
    });
    render(<ContactPanel conversation={baseConv()} />);
    await userEvent.click(screen.getByRole('button', { name: /criar cliente rápido/i }));
    const nameInput = await screen.findByLabelText(/nome/i);
    await userEvent.type(nameInput, 'João');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/whatsapp/conversations/5511999/quick-create-client',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'João' }),
        })
      )
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it('shows linked client view when clienteId set', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { id: 'c1', name: 'Maria Silva' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { pedidos: [], total: 0, count: 0 },
        }),
      });

    render(
      <ContactPanel
        conversation={baseConv({ clienteId: 'c1', clienteNome: 'Maria Silva' })}
      />
    );

    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /criar pedido/i })).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });

  it('opens CreatePedidoSheet when clicking Criar pedido', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'c1', name: 'Maria' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { pedidos: [], total: 0, count: 0 } }),
      });

    render(<ContactPanel conversation={baseConv({ clienteId: 'c1', clienteNome: 'Maria' })} />);
    await userEvent.click(screen.getByRole('button', { name: /criar pedido/i }));
    const sheet = screen.getByTestId('create-pedido-sheet');
    expect(sheet).toBeInTheDocument();
    expect(sheet).toHaveTextContent('c1');
    expect(sheet).toHaveTextContent('Maria');
  });

  it('toasts error when link fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { clients: [{ id: 'c1', name: 'Maria' }] },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'fail' }),
      });
    render(<ContactPanel conversation={baseConv()} />);
    await userEvent.click(screen.getByRole('button', { name: /vincular/i }));
    const search = await screen.findByPlaceholderText(/buscar/i);
    await userEvent.type(search, 'Mar');
    await waitFor(() => expect(screen.getByText('Maria')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Maria'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
