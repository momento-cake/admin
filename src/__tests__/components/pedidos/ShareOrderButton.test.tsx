import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ShareOrderButton } from '@/components/pedidos/ShareOrderButton';

// Mock sonner toast
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: any[]) => mockToastSuccess(...args),
  },
}));

// Mock shadcn dropdown-menu to render items directly
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    Share2: () => <span data-testid="share2-icon" />,
    Link: () => <span data-testid="link-icon" />,
    MessageCircle: () => <span data-testid="message-circle-icon" />,
  };
});

describe('ShareOrderButton', () => {
  const defaultProps = {
    publicToken: 'abc123token',
    pedidoStatus: 'AGUARDANDO_APROVACAO' as const,
    clienteNome: 'Maria Silva',
    numeroPedido: 'PED-001',
  };

  const writeTextMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockToastSuccess.mockClear();
    writeTextMock.mockClear().mockResolvedValue(undefined);
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      get: () => ({ writeText: writeTextMock }),
      configurable: true,
    });
    vi.spyOn(window, 'open').mockImplementation(() => null);
    delete (process.env as any).NEXT_PUBLIC_PORTAL_DOMAIN;
  });

  it('renders share button for AGUARDANDO_APROVACAO status', () => {
    render(<ShareOrderButton {...defaultProps} />);
    expect(screen.getByText('Compartilhar')).toBeInTheDocument();
  });

  it('does not render for CONFIRMADO status', () => {
    render(
      <ShareOrderButton {...defaultProps} pedidoStatus="CONFIRMADO" />
    );
    expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
  });

  it('does not render for RASCUNHO status', () => {
    render(
      <ShareOrderButton {...defaultProps} pedidoStatus="RASCUNHO" />
    );
    expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
  });

  it('copies correct URL to clipboard when "Copiar Link" is clicked', async () => {
    render(<ShareOrderButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar Link'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        expect.stringContaining('abc123token')
      );
    });
  });

  it('shows toast "Link copiado!" after copying', async () => {
    render(<ShareOrderButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar Link'));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Link copiado!');
    });
  });

  it('WhatsApp link has correct URL with encoded message', () => {
    render(<ShareOrderButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Enviar via WhatsApp'));

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/?text='),
      '_blank'
    );
  });

  it('WhatsApp message includes client name and order number', () => {
    render(<ShareOrderButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Enviar via WhatsApp'));

    const openCall = (window.open as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    const decodedUrl = decodeURIComponent(openCall);
    expect(decodedUrl).toContain('Maria Silva');
    expect(decodedUrl).toContain('PED-001');
  });

  it('uses NEXT_PUBLIC_PORTAL_DOMAIN when set', async () => {
    process.env.NEXT_PUBLIC_PORTAL_DOMAIN = 'pedidos.momentocake.com.br';
    render(<ShareOrderButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Copiar Link'));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(
        'https://pedidos.momentocake.com.br/abc123token'
      );
    });
  });
});
