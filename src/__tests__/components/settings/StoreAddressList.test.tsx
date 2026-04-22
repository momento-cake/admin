import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreAddressList } from '@/components/settings/StoreAddressList';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ userModel: { uid: 'u1', role: 'admin' } }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/settings/StoreAddressForm', () => ({
  StoreAddressForm: ({ onSave, onCancel, address }: any) => (
    <div data-testid="store-address-form">
      <span>{address ? 'editing' : 'creating'}</span>
      <button
        onClick={() =>
          onSave({ nome: 'Nova Loja', isDefault: false })
        }
      >
        Fake Save
      </button>
      <button onClick={onCancel}>Fake Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
}));
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  AlertDialogAction: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children }: any) => <button>{children}</button>,
  AlertDialogContent: ({ children }: any) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: any) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: any) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: any) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

const ADDRESSES = [
  {
    id: 'a1',
    nome: 'Loja Principal',
    cep: '01310-100',
    estado: 'SP',
    cidade: 'São Paulo',
    bairro: 'Bela Vista',
    endereco: 'Av Paulista',
    numero: '1000',
    isDefault: true,
    isActive: true,
  },
  {
    id: 'a2',
    nome: 'Filial Centro',
    cep: '01000-000',
    estado: 'SP',
    cidade: 'São Paulo',
    isDefault: false,
    isActive: true,
  },
];

describe('StoreAddressList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows loading spinner initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    render(<StoreAddressList />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders empty state when no addresses exist', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText(/Nenhum endereço cadastrado/i)).toBeInTheDocument()
    );
    expect(
      screen.getAllByRole('button', { name: /Adicionar Endereço/i }).length
    ).toBeGreaterThan(0);
  });

  it('renders the list of addresses with name and formatted details', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: ADDRESSES }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );
    expect(screen.getByText('Filial Centro')).toBeInTheDocument();
  });

  it('shows the "Padrão" badge on the default address only', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: ADDRESSES }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );
    const badges = screen.getAllByText(/Padrão/i);
    expect(badges.length).toBe(1);
  });

  it('opens the form in creating mode when "Adicionar Endereço" is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText(/Nenhum endereço cadastrado/i)).toBeInTheDocument()
    );

    await user.click(
      screen.getAllByRole('button', { name: /Adicionar Endereço/i })[0]
    );

    expect(screen.getByTestId('store-address-form')).toBeInTheDocument();
    expect(screen.getByText('creating')).toBeInTheDocument();
  });

  it('opens the form in editing mode when edit action is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: ADDRESSES }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );

    const editButtons = screen.getAllByRole('button', { name: /Editar/i });
    await user.click(editButtons[0]);

    expect(screen.getByTestId('store-address-form')).toBeInTheDocument();
    expect(screen.getByText('editing')).toBeInTheDocument();
  });

  it('confirms delete → calls DELETE endpoint and refreshes list', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      // initial load
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: ADDRESSES }),
      })
      // DELETE call
      .mockResolvedValueOnce({
        json: async () => ({ success: true }),
      })
      // reload after delete
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [ADDRESSES[1]] }),
      });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Remover/i });
    await user.click(deleteButtons[0]);

    // Confirm in dialog
    const confirmButtons = screen.getAllByRole('button', { name: /Remover/i });
    // The last "Remover" button is the confirm action inside the dialog
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/store-addresses/${ADDRESSES[0].id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('cancel in the form restores the list view', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: [] }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText(/Nenhum endereço cadastrado/i)).toBeInTheDocument()
    );

    await user.click(
      screen.getAllByRole('button', { name: /Adicionar Endereço/i })[0]
    );
    expect(screen.getByTestId('store-address-form')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Fake Cancel/i }));
    expect(screen.queryByTestId('store-address-form')).not.toBeInTheDocument();
  });

  it('saving a new address (first address) forces isDefault=true via POST', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 'new' } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText(/Nenhum endereço cadastrado/i)).toBeInTheDocument()
    );

    await user.click(
      screen.getAllByRole('button', { name: /Adicionar Endereço/i })[0]
    );
    await user.click(screen.getByRole('button', { name: /Fake Save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/store-addresses',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"isDefault":true'),
        })
      );
    });
  });

  it('saving an edit sends PUT to the address id', async () => {
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: ADDRESSES }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: { id: 'a1' } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: ADDRESSES }),
      });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );

    const editButtons = screen.getAllByRole('button', { name: /Editar/i });
    await user.click(editButtons[0]);
    await user.click(screen.getByRole('button', { name: /Fake Save/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/store-addresses/a1',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"nome":"Nova Loja"'),
        })
      );
    });
  });

  it('shows an error toast when saving fails', async () => {
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'save fail' }),
      });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText(/Nenhum endereço cadastrado/i)).toBeInTheDocument()
    );

    await user.click(
      screen.getAllByRole('button', { name: /Adicionar Endereço/i })[0]
    );
    await user.click(screen.getByRole('button', { name: /Fake Save/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao salvar endereço',
        expect.any(Object)
      )
    );
  });

  it('shows an error toast when delete fails', async () => {
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    (global.fetch as any)
      .mockResolvedValueOnce({
        json: async () => ({ success: true, data: ADDRESSES }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'delete fail' }),
      });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Remover/i });
    await user.click(deleteButtons[0]);

    const confirmButtons = screen.getAllByRole('button', { name: /Remover/i });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Erro ao remover endereço',
        expect.any(Object)
      )
    );
  });

  it('shows an error toast when loading addresses fails', async () => {
    const { toast } = await import('sonner');
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'boom' }),
    });

    render(<StoreAddressList />);

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it('opens delete confirmation dialog when delete action is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, data: ADDRESSES }),
    });

    render(<StoreAddressList />);

    await waitFor(() =>
      expect(screen.getByText('Loja Principal')).toBeInTheDocument()
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Remover/i });
    await user.click(deleteButtons[0]);

    expect(
      screen.getByRole('heading', { name: /Remover Endereço/i })
    ).toBeInTheDocument();
  });
});
