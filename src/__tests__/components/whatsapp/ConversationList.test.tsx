/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useConversationsMock = vi.fn();
vi.mock('@/hooks/useWhatsAppConversations', () => ({
  useWhatsAppConversations: () => useConversationsMock(),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { ConversationList } from '@/components/whatsapp/ConversationList';

const baseConv = (over: Partial<any> = {}) => ({
  id: '5511999',
  phone: '5511999999999',
  phoneRaw: '5511999999999',
  lastMessageAt: { seconds: Math.floor(Date.now() / 1000) - 60, nanoseconds: 0 },
  lastMessagePreview: 'oi mundo',
  lastMessageDirection: 'in',
  unreadCount: 0,
  createdAt: { seconds: 1, nanoseconds: 0 },
  updatedAt: { seconds: 1, nanoseconds: 0 },
  ...over,
});

describe('ConversationList', () => {
  beforeEach(() => {
    useConversationsMock.mockReset();
    mockPush.mockReset();
  });

  it('renders empty state when no conversations', () => {
    useConversationsMock.mockReturnValue({ conversations: [], isLoading: false, error: null });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByText(/nenhuma conversa/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    useConversationsMock.mockReturnValue({ conversations: [], isLoading: true, error: null });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByTestId('conversation-list-loading')).toBeInTheDocument();
  });

  it('renders error state', () => {
    useConversationsMock.mockReturnValue({
      conversations: [],
      isLoading: false,
      error: new Error('boom'),
    });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByText(/erro/i)).toBeInTheDocument();
  });

  it('shows display name preferring clienteNome', () => {
    useConversationsMock.mockReturnValue({
      conversations: [
        baseConv({ clienteNome: 'Maria', whatsappName: 'wa name' }),
      ],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByText('Maria')).toBeInTheDocument();
  });

  it('falls back to whatsappName when no client', () => {
    useConversationsMock.mockReturnValue({
      conversations: [baseConv({ whatsappName: 'wa name' })],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByText('wa name')).toBeInTheDocument();
  });

  it('falls back to formatted phone when nothing else', () => {
    useConversationsMock.mockReturnValue({
      conversations: [baseConv()],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId={null} />);
    expect(screen.getByText(/\+55 \(11\) 99999-9999/)).toBeInTheDocument();
  });

  it('shows unread badge only when count > 0', () => {
    useConversationsMock.mockReturnValue({
      conversations: [
        baseConv({ id: 'a', unreadCount: 0 }),
        baseConv({ id: 'b', unreadCount: 3 }),
      ],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId={null} />);
    const badges = screen.queryAllByTestId('unread-badge');
    expect(badges).toHaveLength(1);
    expect(badges[0]).toHaveTextContent('3');
  });

  it('navigates to ?c=<id> on click', async () => {
    useConversationsMock.mockReturnValue({
      conversations: [baseConv({ clienteNome: 'Maria' })],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId={null} />);
    await userEvent.click(screen.getByText('Maria'));
    expect(mockPush).toHaveBeenCalledWith('/whatsapp?c=5511999');
  });

  it('marks selected conversation visually', () => {
    useConversationsMock.mockReturnValue({
      conversations: [baseConv({ id: '5511999', clienteNome: 'Maria' })],
      isLoading: false,
      error: null,
    });
    render(<ConversationList selectedId="5511999" />);
    const row = screen.getByTestId('conversation-row-5511999');
    expect(row.className).toMatch(/selected|bg-/);
  });
});
