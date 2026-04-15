/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock sonner toast
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => mockToastError(...args),
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

// Mock child components so we can drive form state directly
vi.mock('@/components/pedidos/ClienteSelector', () => ({
  ClienteSelector: ({ onSelect }: any) => (
    <button
      type="button"
      data-testid="mock-select-client"
      onClick={() =>
        onSelect({ id: 'client-1', nome: 'Maria Silva', telefone: '11999999999' })
      }
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
        onChange([
          {
            id: 'item-1',
            nome: 'Bolo',
            precoUnitario: 100,
            quantidade: 1,
            total: 100,
          },
        ])
      }
    >
      Add Item
    </button>
  ),
}));

// Mock UI components to simple shells. We render Button as a div with
// role="button" so we can still exercise the React onClick handler even when
// `disabled` is true — browsers block click events on real disabled buttons,
// but we need to hit handleSave's validation branch in one specific test.
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled ? 'true' : undefined}
      data-disabled={disabled ? 'true' : 'false'}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: any) => <label {...rest}>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      data-testid="entrega-tipo-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span data-testid="loader">loading</span>,
  Save: () => <span>save</span>,
}));

import { PedidoForm } from '@/components/pedidos/PedidoForm';

describe('PedidoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPush.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
  });

  function mockFetchPedidoSuccess() {
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/pedidos')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 'ped-1', numeroPedido: 'PED-001' },
          }),
        } as any;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    global.fetch = fetchMock as any;
    return fetchMock;
  }

  async function fillAndSubmit() {
    const user = userEvent.setup();
    await user.click(screen.getByTestId('mock-select-client'));
    await user.click(screen.getByTestId('mock-add-item'));
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));
  }

  it('does not call /api/store-settings when submitting a new order', async () => {
    const fetchMock = mockFetchPedidoSuccess();

    render(<PedidoForm />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const urls = fetchMock.mock.calls.map((call) => call[0]);
    expect(urls.some((u: string) => u.includes('/api/pedidos'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/store-settings'))).toBe(false);
  });

  it('submits a RETIRADA order with custoPorKm=0 without fetching store settings', async () => {
    const fetchMock = mockFetchPedidoSuccess();

    render(<PedidoForm />);
    await fillAndSubmit();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/pedidos',
        expect.objectContaining({ method: 'POST' })
      );
    });

    const pedidoCall = fetchMock.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/api/pedidos')
    );
    expect(pedidoCall).toBeDefined();
    const body = JSON.parse((pedidoCall![1] as RequestInit).body as string);
    expect(body.entrega).toEqual(
      expect.objectContaining({
        tipo: 'RETIRADA',
        custoPorKm: 0,
        taxaExtra: 0,
        freteTotal: 0,
      })
    );
    // Success path should redirect
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });
  });

  it('shows an inline error banner when the create request fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/pedidos')) {
        return {
          ok: false,
          json: async () => ({ success: false, error: 'Test server error' }),
        } as any;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    global.fetch = fetchMock as any;

    render(<PedidoForm />);
    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    // Banner header should be visible
    expect(alert.textContent).toContain('Erro ao criar pedido');
    // Should contain a user-friendly message produced by formatErrorMessage
    expect((alert.textContent ?? '').trim().length).toBeGreaterThan(
      'Erro ao criar pedido'.length
    );
    // Toast is still invoked as a backup
    expect(mockToastError).toHaveBeenCalled();
    // Should not have navigated away on error
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables the Criar Pedido button until a client and items are selected', async () => {
    render(<PedidoForm />);
    const button = screen.getByRole('button', { name: /criar pedido/i });
    // The button is aria-disabled until the form is filled.
    expect(button.getAttribute('aria-disabled')).toBe('true');
  });

  it('shows the delivery hint and submits an ENTREGA order with custoPorKm=0', async () => {
    const fetchMock = mockFetchPedidoSuccess();
    const user = userEvent.setup();

    render(<PedidoForm />);

    // Switch to ENTREGA (exercises the ENTREGA branch + onValueChange handler)
    const select = screen.getByTestId('entrega-tipo-select') as HTMLSelectElement;
    await user.selectOptions(select, 'ENTREGA');

    // The delivery hint should now be visible
    expect(
      screen.getByText(/configure o endereço de entrega e frete após criar o pedido/i)
    ).toBeInTheDocument();

    // Populate additional fields to exercise the remaining onChange handlers
    await user.type(screen.getByLabelText(/data de entrega/i), '2026-05-01');
    await user.type(
      screen.getByLabelText(/observações internas/i),
      'nota interna'
    );
    await user.type(
      screen.getByLabelText(/observações para o cliente/i),
      'nota para cliente'
    );

    await user.click(screen.getByTestId('mock-select-client'));
    await user.click(screen.getByTestId('mock-add-item'));
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    const pedidoCall = fetchMock.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('/api/pedidos')
    );
    expect(pedidoCall).toBeDefined();
    const body = JSON.parse((pedidoCall![1] as RequestInit).body as string);
    expect(body.entrega.tipo).toBe('ENTREGA');
    expect(body.entrega.custoPorKm).toBe(0);
    expect(body.observacoes).toBe('nota interna');
    expect(body.observacoesCliente).toBe('nota para cliente');
    expect(body.dataEntrega).toBeDefined();
  });

  it('navigates back to /orders when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    render(<PedidoForm />);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockPush).toHaveBeenCalledWith('/orders');
  });

  it('shows inline field errors when handleSave runs without client or items', async () => {
    // Exercises the validation branch that populates client/items field errors.
    // The real Button component disables click when saving or when the form is
    // incomplete; our mock swaps in a div-based button so we can fire the click
    // even when aria-disabled=true to exercise the error-display branches.
    render(<PedidoForm />);
    const button = screen.getByRole('button', { name: /criar pedido/i });
    fireEvent.click(button);

    expect(
      await screen.findByText(/selecione um cliente/i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/adicione pelo menos um item/i)
    ).toBeInTheDocument();
  });

  it('clears the submit error banner on the next successful attempt', async () => {
    // First attempt fails
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'boom' }),
    } as any);
    // Second attempt succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'ped-2', numeroPedido: 'PED-002' },
      }),
    } as any);
    global.fetch = fetchMock as any;

    const user = userEvent.setup();
    render(<PedidoForm />);
    await user.click(screen.getByTestId('mock-select-client'));
    await user.click(screen.getByTestId('mock-add-item'));

    // First click – banner appears
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));
    await screen.findByRole('alert');

    // Second click – banner cleared, success path
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
    expect(mockPush).toHaveBeenCalledWith('/orders');
  });
});
