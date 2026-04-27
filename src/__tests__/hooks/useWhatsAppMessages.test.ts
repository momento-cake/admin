/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const subscribeMock = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  subscribeToMessages: (...args: any[]) => subscribeMock(...args),
}));

import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';

describe('useWhatsAppMessages', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
  });

  it('does not subscribe when conversationId is null', () => {
    renderHook(() => useWhatsAppMessages(null));
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it('subscribes when conversationId becomes available', () => {
    subscribeMock.mockImplementation(() => () => undefined);

    const { rerender } = renderHook(({ id }: { id: string | null }) => useWhatsAppMessages(id), {
      initialProps: { id: null as string | null },
    });

    expect(subscribeMock).not.toHaveBeenCalled();

    rerender({ id: '5511' });
    expect(subscribeMock).toHaveBeenCalledWith('5511', expect.any(Function));
  });

  it('updates messages on snapshot', async () => {
    let captured: ((m: any[]) => void) | null = null;
    subscribeMock.mockImplementation((_id: string, cb: (m: any[]) => void) => {
      captured = cb;
      return () => undefined;
    });

    const { result } = renderHook(() => useWhatsAppMessages('5511'));

    await act(async () => {
      captured?.([
        { id: 'm1', conversationId: '5511', direction: 'in', type: 'text', text: 'oi' },
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('oi');
  });

  it('resubscribes when conversationId changes and unsubs old', () => {
    const unsubA = vi.fn();
    const unsubB = vi.fn();
    let call = 0;
    subscribeMock.mockImplementation(() => {
      call += 1;
      return call === 1 ? unsubA : unsubB;
    });

    const { rerender, unmount } = renderHook(({ id }: { id: string }) => useWhatsAppMessages(id), {
      initialProps: { id: 'a' },
    });

    rerender({ id: 'b' });
    expect(unsubA).toHaveBeenCalled();

    unmount();
    expect(unsubB).toHaveBeenCalled();
  });

  it('captures error thrown by subscribe', async () => {
    subscribeMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useWhatsAppMessages('5511'));
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
