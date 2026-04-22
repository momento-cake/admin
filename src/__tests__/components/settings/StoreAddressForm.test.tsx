import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreAddressForm } from '@/components/settings/StoreAddressForm';
import type { StoreAddress } from '@/types/store-settings';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));
vi.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

const PAULISTA = {
  cep: '01310-100',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  localidade: 'São Paulo',
  uf: 'SP',
};

describe('StoreAddressForm', () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockCepOk = (payload: any = PAULISTA) => {
    (global.fetch as any).mockResolvedValueOnce({ json: async () => payload });
  };
  const mockCepNotFound = () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ erro: true }),
    });
  };

  it('idle state: only shows nome, cep, and default toggle initially', () => {
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    expect(screen.getByLabelText(/Nome do Endereço/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/CEP/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Endereço$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Bairro$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Cidade$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Estado$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Número$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Complemento$/i)).not.toBeInTheDocument();
  });

  it('auto-triggers lookup when CEP reaches 8 digits and reveals resolved fields', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/CEP/i), '01310100');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://viacep.com.br/ws/01310100/json/'
      );
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Avenida Paulista');
    });
    expect(screen.getByLabelText(/^Bairro$/i)).toHaveValue('Bela Vista');
    expect(screen.getByLabelText(/^Cidade$/i)).toHaveValue('São Paulo');
    expect(screen.getByLabelText(/^Estado$/i)).toHaveValue('SP');
  });

  it('renders ViaCEP-owned fields as read-only after resolution', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/CEP/i), '01310100');

    await waitFor(() => {
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Avenida Paulista');
    });

    expect(screen.getByLabelText(/Endereço$/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Bairro$/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Cidade$/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Estado$/i)).toHaveAttribute('readonly');
    // Numero and Complemento remain editable
    expect(screen.getByLabelText(/^Número$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Complemento$/i)).not.toHaveAttribute('readonly');
  });

  it('"Editar endereço" unlocks the read-only fields', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/CEP/i), '01310100');
    await waitFor(() =>
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Avenida Paulista')
    );

    await user.click(screen.getByRole('button', { name: /Editar endereço/i }));

    expect(screen.getByLabelText(/Endereço$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Bairro$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Cidade$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Estado$/i)).not.toHaveAttribute('readonly');
  });

  it('CEP not-found shows error and "Digitar manualmente" opens empty editable fields', async () => {
    const user = userEvent.setup();
    mockCepNotFound();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/CEP/i), '00000000');

    await waitFor(() =>
      expect(screen.getByText(/CEP não encontrado/i)).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /Digitar manualmente/i }));

    expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('');
    expect(screen.getByLabelText(/Endereço$/i)).not.toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Cidade$/i)).not.toHaveAttribute('readonly');
  });

  it('editing CEP after resolution resets dependent fields back to idle', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    const cepInput = screen.getByLabelText(/CEP/i);
    await user.type(cepInput, '01310100');
    await waitFor(() =>
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Avenida Paulista')
    );

    // User backspaces one digit → CEP no longer valid, form should return to idle
    await user.type(cepInput, '{backspace}');

    await waitFor(() => {
      expect(screen.queryByLabelText(/Endereço$/i)).not.toBeInTheDocument();
    });
  });

  it('edit-mode does NOT re-fetch ViaCEP on mount (preserves persisted address)', async () => {
    const existing: StoreAddress = {
      id: 'abc',
      nome: 'Loja Centro',
      cep: '01310-100',
      estado: 'SP',
      cidade: 'São Paulo',
      bairro: 'Bela Vista',
      endereco: 'Av Paulista',
      numero: '1000',
      complemento: '',
      isDefault: true,
      isActive: true,
      createdAt: { seconds: 0, nanoseconds: 0 } as any,
      createdBy: 'u1',
    };

    render(
      <StoreAddressForm address={existing} onSave={onSave} onCancel={onCancel} />
    );

    // Wait a tick to let any pending effect run
    await waitFor(() => {
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Av Paulista');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('CEP race: a new CEP mid-flight wins over the earlier response', async () => {
    const user = userEvent.setup();

    let resolveFirst: (v: any) => void = () => {};
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    (global.fetch as any)
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce({
        json: async () => ({
          cep: '20040-020',
          logradouro: 'Rua B',
          bairro: 'Centro',
          localidade: 'Rio de Janeiro',
          uf: 'RJ',
        }),
      });

    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    // Type first CEP — fetch fires but will not resolve until we let it.
    await user.type(screen.getByLabelText(/CEP/i), '01310100');

    // Replace with a new CEP before the first one resolves.
    await user.clear(screen.getByLabelText(/CEP/i));
    await user.type(screen.getByLabelText(/CEP/i), '20040020');

    // Let the first (stale) response resolve AFTER the second was issued.
    resolveFirst({
      json: async () => ({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    });

    await waitFor(() => {
      expect(screen.getByLabelText(/^Cidade$/i)).toHaveValue('Rio de Janeiro');
    });
    expect(screen.getByLabelText(/^Estado$/i)).toHaveValue('RJ');
    expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Rua B');
  });

  it('estado input is limited to 2 characters (UF)', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/CEP/i), '01310100');
    await waitFor(() =>
      expect(screen.getByLabelText(/^Estado$/i)).toHaveValue('SP')
    );

    expect(screen.getByLabelText(/^Estado$/i)).toHaveAttribute('maxlength', '2');
  });

  it('after "Editar endereço", edited cidade is submitted', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Nome do Endereço/i), 'Loja Z');
    await user.type(screen.getByLabelText(/CEP/i), '01310100');
    await waitFor(() =>
      expect(screen.getByLabelText(/^Cidade$/i)).toHaveValue('São Paulo')
    );

    await user.click(screen.getByRole('button', { name: /Editar endereço/i }));

    const cidade = screen.getByLabelText(/^Cidade$/i);
    await user.clear(cidade);
    await user.type(cidade, 'Campinas');

    await user.click(screen.getByRole('button', { name: /Adicionar Endereço/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ cidade: 'Campinas' })
    );
  });

  it('edit-mode: pre-populates with existing address in resolved read-only state', () => {
    const existing: StoreAddress = {
      id: 'abc',
      nome: 'Loja Centro',
      cep: '01310-100',
      estado: 'SP',
      cidade: 'São Paulo',
      bairro: 'Bela Vista',
      endereco: 'Av Paulista',
      numero: '1000',
      complemento: 'sala 5',
      isDefault: true,
      isActive: true,
      createdAt: { seconds: 0, nanoseconds: 0 } as any,
      createdBy: 'u1',
    };

    render(
      <StoreAddressForm address={existing} onSave={onSave} onCancel={onCancel} />
    );

    expect(screen.getByLabelText(/Nome do Endereço/i)).toHaveValue('Loja Centro');
    expect(screen.getByLabelText(/CEP/i)).toHaveValue('01310-100');
    expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Av Paulista');
    expect(screen.getByLabelText(/Endereço$/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^Número$/i)).toHaveValue('1000');
    expect(screen.getByLabelText(/^Complemento$/i)).toHaveValue('sala 5');
  });

  it('submits all fields including complemento and numero', async () => {
    const user = userEvent.setup();
    mockCepOk();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Nome do Endereço/i), 'Loja X');
    await user.type(screen.getByLabelText(/CEP/i), '01310100');
    await waitFor(() =>
      expect(screen.getByLabelText(/Endereço$/i)).toHaveValue('Avenida Paulista')
    );

    await user.type(screen.getByLabelText(/^Número$/i), '42');
    await user.type(screen.getByLabelText(/^Complemento$/i), 'apto 7');

    await user.click(screen.getByRole('button', { name: /Adicionar Endereço/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Loja X',
        cep: '01310-100',
        estado: 'SP',
        cidade: 'São Paulo',
        bairro: 'Bela Vista',
        endereco: 'Avenida Paulista',
        numero: '42',
        complemento: 'apto 7',
        isDefault: false,
      })
    );
  });

  it('cancel button calls onCancel', async () => {
    const user = userEvent.setup();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('submit button label is "Atualizar Endereço" when editing an existing address', () => {
    const existing: StoreAddress = {
      id: 'abc',
      nome: 'Loja Centro',
      isDefault: false,
      isActive: true,
      createdAt: { seconds: 0, nanoseconds: 0 } as any,
      createdBy: 'u1',
    };

    render(
      <StoreAddressForm address={existing} onSave={onSave} onCancel={onCancel} />
    );

    expect(
      screen.getByRole('button', { name: /Atualizar Endereço/i })
    ).toBeInTheDocument();
  });

  it('toggling default switch updates form submission', async () => {
    const user = userEvent.setup();
    render(<StoreAddressForm onSave={onSave} onCancel={onCancel} />);

    await user.type(screen.getByLabelText(/Nome do Endereço/i), 'Loja Y');
    await user.click(screen.getByLabelText(/Endereço padrão/i));
    await user.click(screen.getByRole('button', { name: /Adicionar Endereço/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ isDefault: true })
    );
  });
});
