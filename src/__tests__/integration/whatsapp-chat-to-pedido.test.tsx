/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
let currentParams = new URLSearchParams();
const mockPush = vi.fn((url: string) => {
  const q = url.split('?')[1] || '';
  currentParams = new URLSearchParams(q);
});
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: (key: string) => currentParams.get(key),
  }),
}));

// Mock the SDK subscriptions to feed our fixtures
const conversationsCallbacks: ((c: any[]) => void)[] = [];
const messageCallbacks: Record<string, ((m: any[]) => void)[]> = {};
const statusCallbacks: ((s: any) => void)[] = [];

vi.mock('@/lib/whatsapp', () => ({
  subscribeToConversations: (cb: (c: any[]) => void) => {
    conversationsCallbacks.push(cb);
    return () => undefined;
  },
  subscribeToMessages: (id: string, cb: (m: any[]) => void) => {
    if (!messageCallbacks[id]) messageCallbacks[id] = [];
    messageCallbacks[id].push(cb);
    return () => undefined;
  },
  subscribeToStatus: (cb: (s: any) => void) => {
    statusCallbacks.push(cb);
    return () => undefined;
  },
}));

// Mock CreatePedidoSheet so we don't need to mount the full PedidoForm
vi.mock('@/components/whatsapp/CreatePedidoSheet', () => ({
  CreatePedidoSheet: ({ open, clienteId, clienteNome }: any) =>
    open ? (
      <div data-testid="create-pedido-sheet">
        <span data-testid="sheet-cliente-id">{clienteId}</span>
        <span data-testid="sheet-cliente-nome">{clienteNome}</span>
      </div>
    ) : null,
}));

// Mock fetch globally
const mockFetch = vi.fn();

import WhatsAppPage from '@/app/(dashboard)/whatsapp/page';

const ts = (offset = 0) => ({
  seconds: Math.floor(Date.now() / 1000) + offset,
  nanoseconds: 0,
});

const conversation = {
  id: '5511999',
  phone: '5511999999999',
  phoneRaw: '5511999999999',
  clienteId: 'c1',
  clienteNome: 'Maria Silva',
  whatsappName: 'Maria',
  lastMessageAt: ts(-30),
  lastMessagePreview: 'oi',
  lastMessageDirection: 'in',
  unreadCount: 1,
  createdAt: ts(-60),
  updatedAt: ts(-30),
};

beforeEach(() => {
  conversationsCallbacks.length = 0;
  Object.keys(messageCallbacks).forEach((k) => delete messageCallbacks[k]);
  statusCallbacks.length = 0;
  mockFetch.mockReset();
  mockPush.mockClear();
  currentParams = new URLSearchParams();
  global.fetch = mockFetch as any;

  mockFetch.mockImplementation((url: string) => {
    if (typeof url === 'string' && url.startsWith('/api/clients/c1')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { id: 'c1', name: 'Maria Silva' } }),
      });
    }
    if (typeof url === 'string' && url.startsWith('/api/pedidos')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { pedidos: [], total: 0, count: 0 } }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true, data: {} }) });
  });
});

describe('WhatsApp inbox → Criar pedido integration', () => {
  it('selects conversation, shows linked client, opens CreatePedidoSheet', async () => {
    const { rerender } = render(<WhatsAppPage />);

    // Push initial fixtures
    await act(async () => {
      conversationsCallbacks.forEach((cb) => cb([conversation]));
      statusCallbacks.forEach((cb) => cb({ instanceId: 'p', state: 'connected', updatedAt: ts() }));
    });

    // Click conversation
    await waitFor(() => expect(screen.getByText('Maria Silva')).toBeInTheDocument());
    await userEvent.click(screen.getByText('Maria Silva'));

    // Now URL has ?c=5511999 — re-render to pick up the search param
    rerender(<WhatsAppPage />);
    await act(async () => {
      conversationsCallbacks.forEach((cb) => cb([conversation]));
    });

    // Feed messages for selected conversation
    await waitFor(() => expect(messageCallbacks['5511999']).toBeDefined());
    await act(async () => {
      messageCallbacks['5511999'].forEach((cb) =>
        cb([
          {
            id: 'm1',
            conversationId: '5511999',
            whatsappMessageId: 'wamid',
            direction: 'in',
            type: 'text',
            text: 'oi',
            timestamp: ts(-30),
            createdAt: ts(-30),
          },
        ])
      );
    });

    // Contact panel shows linked client (loaded via fetch)
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    // The "Criar pedido" button is visible
    const criarBtn = await screen.findByRole('button', { name: /criar pedido/i });
    await userEvent.click(criarBtn);

    expect(screen.getByTestId('create-pedido-sheet')).toBeInTheDocument();
    expect(screen.getByTestId('sheet-cliente-id')).toHaveTextContent('c1');
    expect(screen.getByTestId('sheet-cliente-nome')).toHaveTextContent('Maria Silva');
  });
});
