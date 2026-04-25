/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const subscribeMock = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  subscribeToConversations: (...args: any[]) => subscribeMock(...args),
}));

import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';

describe('useWhatsAppConversations', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
  });

  it('starts in loading state with empty list', () => {
    subscribeMock.mockImplementation(() => () => undefined);

    const { result } = renderHook(() => useWhatsAppConversations());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.conversations).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('updates conversations when subscription emits', async () => {
    let captured: ((c: any[]) => void) | null = null;
    subscribeMock.mockImplementation((cb: (c: any[]) => void) => {
      captured = cb;
      return () => undefined;
    });

    const { result } = renderHook(() => useWhatsAppConversations());

    await act(async () => {
      captured?.([
        { id: '5511999', phone: '5511999', lastMessagePreview: 'oi', unreadCount: 0 },
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.conversations[0].id).toBe('5511999');
  });

  it('captures errors thrown by subscribe', async () => {
    subscribeMock.mockImplementation(() => {
      throw new Error('boom');
    });

    const { result } = renderHook(() => useWhatsAppConversations());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const unsub = vi.fn();
    subscribeMock.mockImplementation(() => unsub);

    const { unmount } = renderHook(() => useWhatsAppConversations());
    unmount();

    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
