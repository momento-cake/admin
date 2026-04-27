/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const useStatusMock = vi.fn();
vi.mock('@/hooks/useWhatsAppStatus', () => ({
  useWhatsAppStatus: () => useStatusMock(),
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args: any[]) => toastError(...args),
    success: (...args: any[]) => toastSuccess(...args),
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <>{children}</>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

import { MessageComposer } from '@/components/whatsapp/MessageComposer';

const mockFetch = vi.fn();

beforeEach(() => {
  useStatusMock.mockReset();
  toastError.mockReset();
  toastSuccess.mockReset();
  mockFetch.mockReset();
  global.fetch = mockFetch as any;
});

const setConnected = () =>
  useStatusMock.mockReturnValue({
    status: { instanceId: 'p', state: 'connected', updatedAt: { seconds: 1 } },
    isLoading: false,
    error: null,
  });

const setDisconnected = () =>
  useStatusMock.mockReturnValue({
    status: { instanceId: 'p', state: 'disconnected', updatedAt: { seconds: 1 } },
    isLoading: false,
    error: null,
  });

describe('MessageComposer', () => {
  it('disables textarea and button when disconnected', () => {
    setDisconnected();
    render(<MessageComposer conversationId="5511" />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /enviar/i })).toBeDisabled();
  });

  it('enables when connected', () => {
    setConnected();
    render(<MessageComposer conversationId="5511" />);
    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('sends on Enter and clears input on success', async () => {
    setConnected();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) });
    render(<MessageComposer conversationId="5511" />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'olá{Enter}');
    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/whatsapp/conversations/5511/send',
        expect.objectContaining({ method: 'POST' })
      )
    );
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('Shift+Enter inserts newline and does not send', async () => {
    setConnected();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: {} }) });
    render(<MessageComposer conversationId="5511" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    await userEvent.type(textarea, 'olá{Shift>}{Enter}{/Shift}mundo');
    expect(mockFetch).not.toHaveBeenCalled();
    expect(textarea.value).toBe('olá\nmundo');
  });

  it('shows character count when over 3500', async () => {
    setConnected();
    const { fireEvent } = await import('@testing-library/react');
    render(<MessageComposer conversationId="5511" />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    const longText = 'a'.repeat(3600);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(screen.getByTestId('char-count')).toBeInTheDocument();
  });

  it('shows toast error on API failure and keeps text', async () => {
    setConnected();
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'fail' }),
    });
    render(<MessageComposer conversationId="5511" />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'oi');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect((textarea as HTMLTextAreaElement).value).toBe('oi');
  });

  it('does not submit empty/whitespace-only text', async () => {
    setConnected();
    render(<MessageComposer conversationId="5511" />);
    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, '   ');
    await userEvent.click(screen.getByRole('button', { name: /enviar/i }));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
