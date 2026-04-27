/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const useMessagesMock = vi.fn();
vi.mock('@/hooks/useWhatsAppMessages', () => ({
  useWhatsAppMessages: () => useMessagesMock(),
}));

import { MessageThread } from '@/components/whatsapp/MessageThread';

const ts = (offset = 0) => ({
  seconds: Math.floor(Date.now() / 1000) + offset,
  nanoseconds: 0,
});

const baseMessage = (over: any = {}) => ({
  id: 'm1',
  conversationId: '5511',
  whatsappMessageId: 'wamid',
  direction: 'in',
  type: 'text',
  text: 'olá',
  timestamp: ts(),
  createdAt: ts(),
  ...over,
});

describe('MessageThread', () => {
  beforeEach(() => {
    useMessagesMock.mockReset();
    Element.prototype.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    // jsdom doesn't implement scrollHeight/clientHeight; stub them
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 });
  });

  it('renders empty state when no conversation', () => {
    useMessagesMock.mockReturnValue({ messages: [], isLoading: false, error: null });
    render(<MessageThread conversationId={null} />);
    expect(screen.getByText(/selecione uma conversa/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    useMessagesMock.mockReturnValue({ messages: [], isLoading: true, error: null });
    render(<MessageThread conversationId="5511" />);
    expect(screen.getByTestId('message-thread-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    useMessagesMock.mockReturnValue({ messages: [], isLoading: false, error: new Error('boom') });
    render(<MessageThread conversationId="5511" />);
    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });

  it('aligns incoming messages on the left', () => {
    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ direction: 'in', text: 'oi' })],
      isLoading: false,
      error: null,
    });
    render(<MessageThread conversationId="5511" />);
    const bubble = screen.getByTestId('message-bubble-m1');
    expect(bubble.className).toMatch(/items-start|justify-start/);
  });

  it('aligns outgoing messages on the right', () => {
    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ id: 'mo', direction: 'out', text: 'oi' })],
      isLoading: false,
      error: null,
    });
    render(<MessageThread conversationId="5511" />);
    const bubble = screen.getByTestId('message-bubble-mo');
    expect(bubble.className).toMatch(/justify-end|items-end/);
  });

  it('shows status icon for outgoing message', () => {
    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ id: 'mo', direction: 'out', text: 'oi', status: 'delivered' })],
      isLoading: false,
      error: null,
    });
    render(<MessageThread conversationId="5511" />);
    expect(screen.getByTestId('message-status-mo')).toHaveAttribute('data-status', 'delivered');
  });

  it('shows failure reason for failed outgoing', () => {
    useMessagesMock.mockReturnValue({
      messages: [
        baseMessage({
          id: 'mf',
          direction: 'out',
          text: 'x',
          status: 'failed',
          failureReason: 'Erro X',
        }),
      ],
      isLoading: false,
      error: null,
    });
    render(<MessageThread conversationId="5511" />);
    expect(screen.getByText(/Erro X/)).toBeInTheDocument();
  });

  it('renders unsupported placeholder for non-text type', () => {
    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ id: 'mi', type: 'image', text: undefined })],
      isLoading: false,
      error: null,
    });
    render(<MessageThread conversationId="5511" />);
    expect(screen.getByText(/ainda não suportado/i)).toBeInTheDocument();
  });

  it('shows new-message pill when user has scrolled up and new message arrives', () => {
    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ id: 'm1', text: 'a' })],
      isLoading: false,
      error: null,
    });
    const { rerender, container } = render(<MessageThread conversationId="5511" />);

    // Simulate scroll up
    const scroller = container.querySelector('[data-testid="message-scroller"]') as HTMLElement;
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0 });
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(scroller, 'clientHeight', { configurable: true, value: 200 });
    fireEvent.scroll(scroller);

    useMessagesMock.mockReturnValue({
      messages: [baseMessage({ id: 'm1', text: 'a' }), baseMessage({ id: 'm2', text: 'b' })],
      isLoading: false,
      error: null,
    });
    rerender(<MessageThread conversationId="5511" />);
    expect(screen.getByTestId('new-message-pill')).toBeInTheDocument();
  });
});
