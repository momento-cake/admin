/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const useStatusMock = vi.fn();
vi.mock('@/hooks/useWhatsAppStatus', () => ({
  useWhatsAppStatus: () => useStatusMock(),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <>{children}</>,
}));

import { WhatsAppStatusBadge } from '@/components/whatsapp/WhatsAppStatusBadge';

describe('WhatsAppStatusBadge', () => {
  beforeEach(() => {
    useStatusMock.mockReset();
  });

  it('renders connected state with green dot and label', () => {
    useStatusMock.mockReturnValue({
      status: { instanceId: 'p', state: 'connected', updatedAt: { seconds: 1 } },
      isLoading: false,
      error: null,
    });
    render(<WhatsAppStatusBadge />);
    expect(screen.getByText(/conectado/i)).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-status-dot').className).toMatch(/green/);
  });

  it('renders pairing state', () => {
    useStatusMock.mockReturnValue({
      status: { instanceId: 'p', state: 'pairing', updatedAt: { seconds: 1 } },
      isLoading: false,
      error: null,
    });
    render(<WhatsAppStatusBadge />);
    expect(screen.getByText(/pareando|qr/i)).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-status-dot').className).toMatch(/amber|yellow/);
  });

  it('renders connecting state with amber dot', () => {
    useStatusMock.mockReturnValue({
      status: { instanceId: 'p', state: 'connecting', updatedAt: { seconds: 1 } },
      isLoading: false,
      error: null,
    });
    render(<WhatsAppStatusBadge />);
    expect(screen.getByText(/conectando/i)).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-status-dot').className).toMatch(/amber|yellow/);
  });

  it('renders disconnected state with red dot', () => {
    useStatusMock.mockReturnValue({
      status: { instanceId: 'p', state: 'disconnected', updatedAt: { seconds: 1 } },
      isLoading: false,
      error: null,
    });
    render(<WhatsAppStatusBadge />);
    expect(screen.getByText(/desconectado/i)).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-status-dot').className).toMatch(/red/);
  });

  it('renders unknown/loading state when status is null', () => {
    useStatusMock.mockReturnValue({ status: null, isLoading: true, error: null });
    render(<WhatsAppStatusBadge />);
    expect(screen.getByTestId('whatsapp-status-dot')).toBeInTheDocument();
  });
});
