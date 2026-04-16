/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

// Mock products lib to avoid Firebase initialization
vi.mock('@/lib/products', () => ({
  formatPrice: (price: number) => `R$ ${price.toFixed(2)}`,
}));

// Mock UI components to simple shells
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
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
  Card: ({ children, onClick, className, ...rest }: any) => (
    <div onClick={onClick} className={className} {...rest}>{children}</div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Loader2: () => <span data-testid="loader">loading</span>,
    Save: () => <span>save</span>,
    Check: () => <span>check</span>,
    ChevronLeft: () => <span>&lt;</span>,
    ChevronRight: () => <span>&gt;</span>,
    UserCheck: () => <span>usercheck</span>,
    Package: () => <span>package</span>,
    Truck: () => <span>truck</span>,
    Store: () => <span>store</span>,
    Calendar: () => <span>calendar</span>,
    ClipboardCheck: () => <span>clipboard</span>,
    Lock: () => <span>lock</span>,
    Globe: () => <span>globe</span>,
    Pencil: () => <span>pencil</span>,
    RefreshCw: () => <span>refresh</span>,
    MapPin: () => <span>mappin</span>,
  };
});

import { PedidoForm } from '@/components/pedidos/PedidoForm';

describe('PedidoForm - Wizard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    mockPush.mockReset();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    // Default fetch mock that handles client address and store address fetches
    global.fetch = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/clients/')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { addresses: [] },
          }),
        } as any;
      }
      if (typeof url === 'string' && url.includes('/api/store-addresses')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [],
          }),
        } as any;
      }
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
    }) as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Helper to advance past the 150ms step animation */
  async function advanceAnimation() {
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
  }

  /** Helper to click next and wait for animation */
  async function clickNext(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /próximo/i }));
    await advanceAnimation();
  }

  it('renders the step indicator and starts on the Cliente step', () => {
    render(<PedidoForm />);
    // The instruction text is unique to the step content
    expect(
      screen.getByText('Selecione o cliente para este pedido')
    ).toBeInTheDocument();
  });

  it('disables "Próximo" button when step 0 is invalid (no client selected)', () => {
    render(<PedidoForm />);
    const nextButton = screen.getByRole('button', { name: /próximo/i });
    expect(nextButton).toBeDisabled();
  });

  it('enables "Próximo" and navigates to step 1 after selecting a client', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Select a client
    await user.click(screen.getByTestId('mock-select-client'));

    // Próximo should now be enabled
    const nextButton = screen.getByRole('button', { name: /próximo/i });
    expect(nextButton).not.toBeDisabled();

    // Click next
    await clickNext(user);

    // Should now be on Itens step
    expect(screen.getByText('Itens do Pedido')).toBeInTheDocument();
  });

  it('navigates backward with "Anterior" button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Select client and go to step 1
    await user.click(screen.getByTestId('mock-select-client'));
    await clickNext(user);
    expect(screen.getByText('Itens do Pedido')).toBeInTheDocument();

    // Click "Anterior"
    await user.click(screen.getByRole('button', { name: /anterior/i }));
    await advanceAnimation();

    // Should be back on Cliente step
    expect(
      screen.getByText('Selecione o cliente para este pedido')
    ).toBeInTheDocument();
  });

  it('disables "Próximo" on step 1 when no items are added', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Select client and go to step 1
    await user.click(screen.getByTestId('mock-select-client'));
    await clickNext(user);
    expect(screen.getByText('Itens do Pedido')).toBeInTheDocument();

    // Próximo should be disabled (no items)
    const nextButton = screen.getByRole('button', { name: /próximo/i });
    expect(nextButton).toBeDisabled();
  });

  it('shows "Cancelar" on step 0 instead of "Anterior"', () => {
    render(<PedidoForm />);
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /anterior/i })).not.toBeInTheDocument();
  });

  it('navigates to /orders when "Cancelar" is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockPush).toHaveBeenCalledWith('/orders');
  });

  it('completes full wizard flow and submits order', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Step 0: Select client
    await user.click(screen.getByTestId('mock-select-client'));
    await clickNext(user);

    // Step 1: Add items
    expect(screen.getByText('Itens do Pedido')).toBeInTheDocument();
    await user.click(screen.getByTestId('mock-add-item'));
    await clickNext(user);

    // Step 2: Entrega (default RETIRADA, just continue)
    expect(screen.getByText('Escolha como o pedido será entregue ao cliente')).toBeInTheDocument();
    await clickNext(user);

    // Step 3: Detalhes (all optional, just continue)
    expect(screen.getByText('Detalhes do Pedido')).toBeInTheDocument();
    await clickNext(user);

    // Step 4: Revisão
    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();

    // Click "Criar Pedido"
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    // Verify the fetch call
    const fetchMock = global.fetch as any;
    const pedidoCall = fetchMock.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0] === '/api/pedidos'
    );
    expect(pedidoCall).toBeDefined();
    const body = JSON.parse((pedidoCall![1] as RequestInit).body as string);
    expect(body.entrega.tipo).toBe('RETIRADA');
    expect(body.entrega.custoPorKm).toBe(0);
    expect(body.clienteId).toBe('client-1');
    expect(body.clienteNome).toBe('Maria Silva');
  });

  it('shows inline error banner when submit fails', async () => {
    // Override fetch to fail on pedidos
    global.fetch = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/clients/')) {
        return { ok: true, json: async () => ({ success: true, data: { addresses: [] } }) } as any;
      }
      if (typeof url === 'string' && url.includes('/api/store-addresses')) {
        return { ok: true, json: async () => ({ success: true, data: [] }) } as any;
      }
      if (typeof url === 'string' && url.includes('/api/pedidos')) {
        return { ok: false, json: async () => ({ success: false, error: 'Test server error' }) } as any;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Navigate through all steps
    await user.click(screen.getByTestId('mock-select-client'));
    await clickNext(user);
    await user.click(screen.getByTestId('mock-add-item'));
    await clickNext(user);
    await clickNext(user);
    await clickNext(user);

    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /criar pedido/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Erro ao criar pedido');
    expect(mockToastError).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('fetches client addresses when a client is selected', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/clients/client-1')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              addresses: [
                { id: 'addr-1', label: 'Casa', endereco: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'SP' },
              ],
            },
          }),
        } as any;
      }
      if (typeof url === 'string' && url.includes('/api/store-addresses')) {
        return { ok: true, json: async () => ({ success: true, data: [] }) } as any;
      }
      if (typeof url === 'string' && url.includes('/api/pedidos')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: { id: 'ped-1', numeroPedido: 'PED-001' } }),
        } as any;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;
    global.fetch = fetchMock;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Select client
    await user.click(screen.getByTestId('mock-select-client'));

    // Verify fetch was called with client ID
    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call: any[]) => call[0]);
      expect(urls.some((u: string) => u.includes('/api/clients/client-1'))).toBe(true);
    });
  });

  it('submits enriched entrega with selected client address for ENTREGA', async () => {
    // Mock fetch to return client addresses
    const fetchMock = vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/clients/client-1')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              addresses: [
                {
                  id: 'addr-1',
                  label: 'Casa',
                  endereco: 'Rua A',
                  numero: '10',
                  bairro: 'Centro',
                  cidade: 'SP',
                  estado: 'SP',
                  cep: '01001-000',
                },
              ],
            },
          }),
        } as any;
      }
      if (typeof url === 'string' && url.includes('/api/store-addresses')) {
        return { ok: true, json: async () => ({ success: true, data: [] }) } as any;
      }
      if (typeof url === 'string' && url.includes('/api/pedidos')) {
        return {
          ok: true,
          json: async () => ({ success: true, data: { id: 'ped-1', numeroPedido: 'PED-001' } }),
        } as any;
      }
      throw new Error(`Unexpected fetch to ${url}`);
    }) as any;
    global.fetch = fetchMock;

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<PedidoForm />);

    // Step 0: Select client
    await user.click(screen.getByTestId('mock-select-client'));
    await clickNext(user);

    // Step 1: Add items
    expect(screen.getByText('Itens do Pedido')).toBeInTheDocument();
    await user.click(screen.getByTestId('mock-add-item'));
    await clickNext(user);

    // Step 2: Switch to ENTREGA and select address
    expect(screen.getByText('Escolha como o pedido será entregue ao cliente')).toBeInTheDocument();

    // Click the ENTREGA toggle
    await user.click(screen.getByTestId('toggle-entrega'));

    // Wait for client addresses to load and be displayed
    await waitFor(() => {
      expect(screen.getByText('Casa')).toBeInTheDocument();
    });

    // Select the address
    await user.click(screen.getByTestId('address-card-addr-1'));

    // Continue to step 3 and 4
    await clickNext(user);
    expect(screen.getByText('Detalhes do Pedido')).toBeInTheDocument();
    await clickNext(user);
    expect(screen.getByText('Resumo do Pedido')).toBeInTheDocument();

    // Submit
    await user.click(screen.getByRole('button', { name: /criar pedido/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/orders');
    });

    // Verify enriched entrega
    const pedidoCall = fetchMock.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0] === '/api/pedidos'
    );
    expect(pedidoCall).toBeDefined();
    const body = JSON.parse((pedidoCall![1] as RequestInit).body as string);
    expect(body.entrega.tipo).toBe('ENTREGA');
    expect(body.entrega.enderecoEntrega).toBeDefined();
    expect(body.entrega.enderecoEntrega.id).toBe('addr-1');
    expect(body.entrega.enderecoEntregaClienteId).toBe('client-1');
  });
});
