/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const subscribeMock = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  subscribeToStatus: (...args: any[]) => subscribeMock(...args),
}));

import { useWhatsAppStatus } from '@/hooks/useWhatsAppStatus';

describe('useWhatsAppStatus', () => {
  beforeEach(() => {
    subscribeMock.mockReset();
  });

  it('starts in loading with null status', () => {
    subscribeMock.mockImplementation(() => () => undefined);
    const { result } = renderHook(() => useWhatsAppStatus());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.status).toBeNull();
  });

  it('updates status when subscription emits', async () => {
    let captured: ((s: any) => void) | null = null;
    subscribeMock.mockImplementation((cb: (s: any) => void) => {
      captured = cb;
      return () => undefined;
    });

    const { result } = renderHook(() => useWhatsAppStatus());

    await act(async () => {
      captured?.({ instanceId: 'primary', state: 'connected', updatedAt: { seconds: 1 } });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status?.state).toBe('connected');
  });

  it('handles null status from worker emptiness', async () => {
    let captured: ((s: any) => void) | null = null;
    subscribeMock.mockImplementation((cb: (s: any) => void) => {
      captured = cb;
      return () => undefined;
    });
    const { result } = renderHook(() => useWhatsAppStatus());
    await act(async () => {
      captured?.(null);
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.status).toBeNull();
  });

  it('unsubscribes on unmount', () => {
    const unsub = vi.fn();
    subscribeMock.mockImplementation(() => unsub);
    const { unmount } = renderHook(() => useWhatsAppStatus());
    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });

  it('captures errors thrown by subscribe', async () => {
    subscribeMock.mockImplementation(() => {
      throw new Error('boom');
    });
    const { result } = renderHook(() => useWhatsAppStatus());
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
  });
});
