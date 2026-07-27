/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// sonner toast is a side-effect we only need to not crash.
const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...a: any[]) => toastSuccess(...a), error: (...a: any[]) => toastError(...a) },
}));

// Radix Select relies on portals/pointer APIs jsdom lacks; render a passthrough
// so the form (and its default values) mount without interaction.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <span>{children}</span>,
}));

import { FiscalSettings } from '@/components/settings/FiscalSettings';

const LOADED = {
  ambiente: 'homologacao',
  inscricaoEstadual: '123456789012',
  crt: 1,
  cfop: '5102',
  ncm: '19059090',
  csosn: '102',
  unidade: 'UN',
  naturezaOperacao: 'Venda de mercadoria',
  serieNfe: 1,
  serieNfce: 1,
  cscId: '000001',
  hasCert: true,
  hasCsc: true,
  certFileName: 'cert.pfx',
};

function mockJson(payload: any, ok = true) {
  return { ok, json: async () => payload };
}

describe('FiscalSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('shows a loading spinner then loads and displays the current config', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockJson({ success: true, data: LOADED }));

    render(<FiscalSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Inscrição Estadual/i)).toHaveValue('123456789012');
    });
    // Certificate status reflects hasCert + filename
    expect(screen.getByText(/Certificado configurado: cert\.pfx/i)).toBeInTheDocument();
    // Existing CSC is signalled without exposing the token
    expect(screen.getByPlaceholderText(/salvo/i)).toBeInTheDocument();
  });

  it('renders the producao warning and empty cert/csc state, applying defaults', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      mockJson({ success: true, data: { ambiente: 'producao', hasCert: false, hasCsc: false } }),
    );

    render(<FiscalSettings />);

    await waitFor(() => {
      // Producao ambiente shows the fiscal-value warning.
      expect(screen.getByText(/validade fiscal real/i)).toBeInTheDocument();
    });
    // No certificate yet
    expect(screen.getByText(/Nenhum certificado enviado/i)).toBeInTheDocument();
    // Defaults filled in from DEFAULT_FORM when the doc omits fields
    expect(screen.getByLabelText(/CFOP/i)).toHaveValue('5102');
    expect(screen.getByLabelText(/Unidade Comercial/i)).toHaveValue('UN');
    // CSC token placeholder is the "enter token" variant (not the saved one)
    expect(screen.getByLabelText(/Token CSC/i)).toHaveAttribute('placeholder', 'Token do CSC');
  });

  it('edits every text field and sends the updated values on save', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockJson({ success: true, data: LOADED }))
      .mockResolvedValueOnce(mockJson({ success: true }));

    const user = userEvent.setup();
    render(<FiscalSettings />);
    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    const ie = screen.getByLabelText(/Inscrição Estadual/i);
    await user.clear(ie);
    await user.type(ie, '999');
    await user.clear(screen.getByLabelText(/^NCM$/i));
    await user.type(screen.getByLabelText(/^NCM$/i), '84151011');
    await user.clear(screen.getByLabelText(/^CSOSN$/i));
    await user.type(screen.getByLabelText(/^CSOSN$/i), '400');
    await user.type(screen.getByLabelText(/CST ICMS/i), '00');
    await user.clear(screen.getByLabelText(/Unidade Comercial/i));
    await user.type(screen.getByLabelText(/Unidade Comercial/i), 'KG');
    await user.clear(screen.getByLabelText(/Natureza da Operação/i));
    await user.type(screen.getByLabelText(/Natureza da Operação/i), 'Venda de bolos');
    await user.clear(screen.getByLabelText(/Série NF-e/i));
    await user.type(screen.getByLabelText(/Série NF-e/i), '3');
    await user.clear(screen.getByLabelText(/Série NFC-e/i));
    await user.type(screen.getByLabelText(/Série NFC-e/i), '4');
    await user.clear(screen.getByLabelText(/ID do CSC/i));
    await user.type(screen.getByLabelText(/ID do CSC/i), '000009');
    await user.type(screen.getByLabelText(/Senha do Certificado/i), 'secret-pw');

    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    const putCall = (global.fetch as any).mock.calls.find((c: any[]) => c[1]?.method === 'PUT');
    const body = JSON.parse(putCall[1].body);
    expect(body.inscricaoEstadual).toBe('999');
    expect(body.csosn).toBe('400');
    expect(body.cst).toBe('00');
    expect(body.unidade).toBe('KG');
    expect(body.naturezaOperacao).toBe('Venda de bolos');
    expect(body.serieNfe).toBe(3);
    expect(body.serieNfce).toBe(4);
    expect(body.cscId).toBe('000009');
    expect(body.certPassword).toBe('secret-pw');
  });

  it('shows validation details from a failed save', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockJson({ success: true, data: LOADED }))
      .mockResolvedValueOnce(
        mockJson({ success: false, error: 'Validação falhou', details: [{ message: 'CFOP inválido' }] }),
      );

    const user = userEvent.setup();
    render(<FiscalSettings />);
    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Erro ao salvar configuração fiscal',
        expect.objectContaining({ description: expect.stringContaining('CFOP inválido') }),
      );
    });
  });

  it('surfaces a load error via toast', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockJson({ success: false, error: 'boom' }));

    render(<FiscalSettings />);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith(
        'Erro ao carregar configuração fiscal',
        expect.anything(),
      );
    });
  });

  it('saves via PUT with numeric coercion and omits secrets when untouched', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockJson({ success: true, data: LOADED })) // load
      .mockResolvedValueOnce(mockJson({ success: true })); // save

    const user = userEvent.setup();
    render(<FiscalSettings />);

    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Configuração fiscal salva com sucesso!');
    });

    const putCall = (global.fetch as any).mock.calls.find(
      (c: any[]) => c[0] === '/api/fiscal-settings' && c[1]?.method === 'PUT',
    );
    expect(putCall).toBeTruthy();
    const body = JSON.parse(putCall[1].body);
    expect(body.crt).toBe(1); // coerced from '1'
    expect(body.serieNfe).toBe(1);
    expect(body.ncm).toBe('19059090');
    expect(body.csc).toBeUndefined(); // not re-entered
    expect(body.certPassword).toBeUndefined();
  });

  it('includes the CSC token in the PUT payload when entered', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockJson({ success: true, data: { ...LOADED, hasCsc: false } }))
      .mockResolvedValueOnce(mockJson({ success: true }));

    const user = userEvent.setup();
    render(<FiscalSettings />);

    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    await user.type(screen.getByLabelText(/Token CSC/i), 'NEW-CSC');
    await user.click(screen.getByRole('button', { name: /^Salvar$/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());

    const putCall = (global.fetch as any).mock.calls.find(
      (c: any[]) => c[1]?.method === 'PUT',
    );
    const body = JSON.parse(putCall[1].body);
    expect(body.csc).toBe('NEW-CSC');
  });

  it('uploads a certificate via multipart POST', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(mockJson({ success: true, data: { ...LOADED, hasCert: false, certFileName: null } }))
      .mockResolvedValueOnce(mockJson({ success: true, data: { certFileName: 'novo.pfx', hasCert: true } }));

    const user = userEvent.setup();
    render(<FiscalSettings />);

    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    const input = screen.getByTestId('cert-file-input') as HTMLInputElement;
    const file = new File(['PFX'], 'novo.pfx', { type: 'application/x-pkcs12' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith('Certificado enviado com sucesso!');
    });

    const postCall = (global.fetch as any).mock.calls.find(
      (c: any[]) => c[0] === '/api/fiscal-settings/certificate',
    );
    expect(postCall).toBeTruthy();
    expect(postCall[1].method).toBe('POST');
    expect(postCall[1].body).toBeInstanceOf(FormData);
    expect(screen.getByText(/novo\.pfx/)).toBeInTheDocument();
  });

  it('rejects an invalid certificate file before uploading', async () => {
    (global.fetch as any).mockResolvedValueOnce(mockJson({ success: true, data: LOADED }));

    render(<FiscalSettings />);

    await waitFor(() => screen.getByLabelText(/Inscrição Estadual/i));

    const input = screen.getByTestId('cert-file-input') as HTMLInputElement;
    const badFile = new File(['x'], 'notes.txt', { type: 'text/plain' });
    // fireEvent.change bypasses the input's accept filter so the component's own
    // validation is what rejects the file.
    Object.defineProperty(input, 'files', { value: [badFile], configurable: true });
    fireEvent.change(input);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    // Only the initial GET happened — no certificate POST.
    const postCall = (global.fetch as any).mock.calls.find(
      (c: any[]) => c[0] === '/api/fiscal-settings/certificate',
    );
    expect(postCall).toBeFalsy();
  });
});
