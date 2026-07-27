import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FiscalConfig, FiscalEmitInput } from '@/lib/fiscal/types';

// --- Library mocks --------------------------------------------------------
// Each wizard records the config it was loaded with and returns a scripted
// autorização response so we can assert the adapter maps it correctly and wires
// the certificate/CSC through.

const nfeLoad = vi.fn();
const nfeAutorizacao = vi.fn();
const nfeCancelamento = vi.fn();
const nfeConsultaProtocolo = vi.fn();
const nfceLoad = vi.fn();
const nfceAutorizacao = vi.fn();
const nfceCancelamento = vi.fn();

vi.mock('nfewizard-io', () => ({
  default: class NFeWizard {
    NFE_LoadEnvironment = nfeLoad;
    NFE_Autorizacao = nfeAutorizacao;
    NFE_Cancelamento = nfeCancelamento;
    NFE_ConsultaProtocolo = nfeConsultaProtocolo;
  },
}));

vi.mock('@nfewizard/nfce', () => ({
  NFCEWizard: class NFCEWizard {
    NFE_LoadEnvironment = nfceLoad;
    NFCE_Autorizacao = nfceAutorizacao;
    NFCE_Cancelamento = nfceCancelamento;
  },
}));

const nfeGerarDanfe = vi.fn();
const nfceGerarDanfe = vi.fn();
vi.mock('@nfewizard/danfe', () => ({
  NFE_GerarDanfe: (p: unknown) => nfeGerarDanfe(p),
  NFCE_GerarDanfe: (p: unknown) => nfceGerarDanfe(p),
}));

// fs is mocked so DANFE read-back and XML archival hit in-memory fixtures.
const readFile = vi.fn();
const mkdir = vi.fn();
const rm = vi.fn();
vi.mock('fs', () => {
  const promises = {
    readFile: (...a: unknown[]) => readFile(...a),
    mkdir: (...a: unknown[]) => mkdir(...a),
    rm: (...a: unknown[]) => rm(...a),
  };
  return { promises, default: { promises } };
});

import { createNfeWizardProvider } from '@/lib/fiscal/nfewizard';
import { FiscalProviderError } from '@/lib/fiscal/types';

const pfx = Buffer.from('fake-pfx-bytes');

function baseConfig(overrides: Partial<FiscalConfig> = {}): FiscalConfig {
  return {
    ambiente: 'homologacao',
    issuer: {
      cnpj: '12345678000199',
      razaoSocial: 'Momento Cake LTDA',
      nomeFantasia: 'Momento Cake',
      inscricaoEstadual: '111222333',
      crt: 1,
      logradouro: 'Rua A',
      numero: '1',
      bairro: 'Centro',
      municipio: 'Sao Paulo',
      codigoMunicipioIbge: '3550308',
      uf: 'SP',
      cep: '01001000',
    },
    taxProfile: {
      cfop: '5102',
      ncm: '19059090',
      unidade: 'UN',
      origem: '0',
      csosn: '102',
      naturezaOperacao: 'Venda',
    },
    serieNfe: 1,
    serieNfce: 1,
    csc: { token: 'CSC-TOKEN', id: '000001' },
    cert: { pfx, password: 'secret' },
    ...overrides,
  };
}

function baseInput(overrides: Partial<FiscalEmitInput> = {}): FiscalEmitInput {
  return {
    modelo: 55,
    serie: 1,
    numero: 10,
    ambiente: 'homologacao',
    issuer: baseConfig().issuer,
    taxProfile: baseConfig().taxProfile,
    recipient: { nome: 'Cliente', cpfCnpj: '39053344705' },
    items: [{ codigo: 'A', descricao: 'Bolo', quantidade: 1, valorUnitario: 10, valorTotal: 10 }],
    totals: { produtos: 10, desconto: 0, acrescimo: 0, frete: 0, total: 10 },
    payments: [{ tPag: '01', valor: 10 }],
    numeroPedido: 'PED-1',
    emittedAtIso: '2026-07-26T10:00:00-03:00',
    ...overrides,
  };
}

const authorized55 = {
  success: true,
  xMotivo: [{ chNFe: '3'.repeat(44), xMotivo: 'Autorizado o uso da NF-e', cStat: '100' }],
  xmls: [
    {
      NFe: { infNFe: {} },
      protNFe: { infProt: { chNFe: '3'.repeat(44), nProt: '135240000000001', cStat: '100' } },
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mkdir.mockResolvedValue(undefined);
  rm.mockResolvedValue(undefined);
  readFile.mockResolvedValue(Buffer.from('%PDF-1.4 fake'));
  nfeGerarDanfe.mockResolvedValue({ success: true, message: 'ok' });
  nfceGerarDanfe.mockResolvedValue({ success: true, message: 'ok' });
});

describe('createNfeWizardProvider — NF-e (55)', () => {
  it('authorizes and maps into a FiscalEmitResult with the DANFE', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    // readFile is called first for the archived XML, then for the DANFE bytes.
    readFile
      .mockResolvedValueOnce('<nfeProc>signed</nfeProc>')
      .mockResolvedValueOnce(Buffer.from('%PDF-1.4 danfe'));

    const provider = createNfeWizardProvider(baseConfig());
    const result = await provider.emit(baseInput());

    expect(result.status).toBe('AUTORIZADA');
    expect(result.accessKey).toBe('3'.repeat(44));
    expect(result.protocolo).toBe('135240000000001');
    expect(result.xml).toBe('<nfeProc>signed</nfeProc>');
    expect(result.danfePdf?.toString()).toBe('%PDF-1.4 danfe');
    expect(result.qrCode).toBeUndefined();
    expect(nfceAutorizacao).not.toHaveBeenCalled();
  });

  it('passes the certificate as a Buffer to NFE_LoadEnvironment', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    const provider = createNfeWizardProvider(baseConfig());
    await provider.emit(baseInput());

    const cfg = nfeLoad.mock.calls[0][0].config;
    expect(Buffer.isBuffer(cfg.dfe.pathCertificado)).toBe(true);
    expect(cfg.dfe.pathCertificado).toBe(pfx);
    expect(cfg.dfe.senhaCertificado).toBe('secret');
    expect(cfg.nfe.ambiente).toBe(2); // homologação
    expect(cfg.nfe.tokenCSC).toBeUndefined(); // NF-e does not use CSC
  });

  it('maps a rejection cStat to REJEITADA without a DANFE', async () => {
    nfeAutorizacao.mockResolvedValue({
      success: true,
      xMotivo: [{ chNFe: '', xMotivo: 'Rejeicao: duplicidade de NF-e', cStat: '204' }],
      xmls: [{ protNFe: { infProt: { cStat: '204' } } }],
    });
    const provider = createNfeWizardProvider(baseConfig());
    const result = await provider.emit(baseInput());

    expect(result.status).toBe('REJEITADA');
    expect(result.rejection).toEqual({ code: '204', message: 'Rejeicao: duplicidade de NF-e' });
    expect(result.danfePdf).toBeUndefined();
    expect(nfeGerarDanfe).not.toHaveBeenCalled();
  });

  it('maps a denegação cStat to DENEGADA', async () => {
    nfeAutorizacao.mockResolvedValue({
      success: true,
      xMotivo: [{ xMotivo: 'Denegada', cStat: '302' }],
      xmls: [{ protNFe: { infProt: { cStat: '302' } } }],
    });
    const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
    expect(result.status).toBe('DENEGADA');
  });

  it('returns ERRO when the autorização throws', async () => {
    nfeAutorizacao.mockRejectedValue(new Error('Documento do destinatário inválido'));
    const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
    expect(result.status).toBe('ERRO');
    expect(result.rejection?.message).toContain('destinatário');
  });

  it('throws a FiscalProviderError when LoadEnvironment fails', async () => {
    nfeLoad.mockRejectedValueOnce(new Error('certificado expirado'));
    await expect(createNfeWizardProvider(baseConfig()).emit(baseInput())).rejects.toBeInstanceOf(
      FiscalProviderError,
    );
  });

  it('still authorizes when the DANFE cannot be generated', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    readFile.mockReset();
    readFile
      .mockResolvedValueOnce('<nfeProc/>') // archived xml
      .mockRejectedValueOnce(new Error('no pdf')); // danfe read-back fails
    nfeGerarDanfe.mockResolvedValue({ success: true });
    const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
    expect(result.status).toBe('AUTORIZADA');
    expect(result.danfePdf).toBeUndefined();
  });

  it('omits the DANFE when the generator reports success:false', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    nfeGerarDanfe.mockResolvedValue({ success: false, message: 'invalid layout' });
    const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
    expect(result.status).toBe('AUTORIZADA');
    expect(result.danfePdf).toBeUndefined();
  });

  it('authorizes but logs loudly when the archived XML cannot be read back', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    readFile.mockReset();
    readFile
      .mockRejectedValueOnce(new Error('xml gone')) // archived xml read fails
      .mockResolvedValueOnce(Buffer.from('%PDF danfe')); // danfe bytes
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
      expect(result.status).toBe('AUTORIZADA');
      expect(result.xml).toBeUndefined();
      expect(result.danfePdf?.toString()).toBe('%PDF danfe');
      // Ops-visible signal that the legal XML was not archived, with the chave.
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('3'.repeat(44)));
      expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/XML autorizado/i));
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('logs loudly when the DANFE cannot be generated for an authorized note', async () => {
    nfeAutorizacao.mockResolvedValue(authorized55);
    nfeGerarDanfe.mockResolvedValue({ success: false });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createNfeWizardProvider(baseConfig()).emit(baseInput());
      expect(result.status).toBe('AUTORIZADA');
      expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/DANFE/));
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('createNfeWizardProvider — NFC-e (65)', () => {
  const authorized65 = {
    success: true,
    xMotivo: [{ chNFe: '6'.repeat(44), xMotivo: 'Autorizado', cStat: '100' }],
    xmls: [
      {
        NFe: { infNFe: {}, infNFeSupl: { qrCode: 'https://qr?p=abc', urlChave: 'https://consulta' } },
        protNFe: { infProt: { chNFe: '6'.repeat(44), nProt: '999', cStat: '100' } },
      },
    ],
  };

  it('uses NFCEWizard, wires the CSC and captures the QR code', async () => {
    nfceAutorizacao.mockResolvedValue(authorized65);
    const result = await createNfeWizardProvider(baseConfig()).emit(
      baseInput({ modelo: 65, serie: 1, recipient: undefined }),
    );

    expect(result.status).toBe('AUTORIZADA');
    expect(result.qrCode).toBe('https://qr?p=abc');
    expect(result.urlChave).toBe('https://consulta');
    expect(nfeAutorizacao).not.toHaveBeenCalled();
    expect(nfceGerarDanfe).toHaveBeenCalled();

    const cfg = nfceLoad.mock.calls[0][0].config;
    expect(cfg.nfe.tokenCSC).toBe('CSC-TOKEN');
    expect(cfg.nfe.idCSC).toBe(1);
  });

  it('throws a csc_missing error when emitting NFC-e without a CSC', async () => {
    const provider = createNfeWizardProvider(baseConfig({ csc: undefined }));
    await expect(provider.emit(baseInput({ modelo: 65 }))).rejects.toMatchObject({
      code: 'csc_missing',
    });
  });
});

describe('createNfeWizardProvider — cancelNf', () => {
  const cancelInput = {
    modelo: 55 as const,
    accessKey: '3'.repeat(44),
    protocolo: '135240000000001',
    justificativa: 'Pedido cancelado pelo cliente antes da entrega',
  };

  // NFE_Cancelamento returns the envelope array (retEnvEvento → retEvento → infEvento).
  const cancelled55 = [
    { retEvento: { infEvento: { cStat: '135', xMotivo: 'Evento registrado e vinculado a NF-e', chNFe: '3'.repeat(44), nProt: '999888777' } } },
  ];

  it('maps cStat 135 to CANCELADA for NF-e via NFE_Cancelamento', async () => {
    nfeCancelamento.mockResolvedValue(cancelled55);
    const result = await createNfeWizardProvider(baseConfig()).cancelNf(cancelInput);
    expect(result.status).toBe('CANCELADA');
    expect(result.protocolo).toBe('999888777');
    expect(result.cancelledAt).toBeInstanceOf(Date);
    expect(result.xml).toBeDefined();
    expect(nfceCancelamento).not.toHaveBeenCalled();
    // Cancellation must not require the CSC (config here has one, but assert wiring).
    expect(nfeLoad).toHaveBeenCalled();
  });

  it('treats cStat 155 (registrado fora de prazo) as CANCELADA', async () => {
    nfeCancelamento.mockResolvedValue([
      { retEvento: { infEvento: { cStat: '155', nProt: '1' } } },
    ]);
    const result = await createNfeWizardProvider(baseConfig()).cancelNf(cancelInput);
    expect(result.status).toBe('CANCELADA');
  });

  it('routes NFC-e cancellation through NFCE_Cancelamento and reads xMotivos', async () => {
    nfceCancelamento.mockResolvedValue({
      success: true,
      xMotivos: [{ chNFe: '6'.repeat(44), xMotivo: 'Evento registrado', cStat: '135' }],
      response: [{ retEvento: { infEvento: { nProt: '555' } } }],
    });
    const result = await createNfeWizardProvider(baseConfig()).cancelNf({
      ...cancelInput,
      modelo: 65,
    });
    expect(result.status).toBe('CANCELADA');
    expect(result.protocolo).toBe('555');
    expect(nfeCancelamento).not.toHaveBeenCalled();
    // No CSC required for NFC-e cancellation.
    const provider = createNfeWizardProvider(baseConfig({ csc: undefined }));
    await expect(provider.cancelNf({ ...cancelInput, modelo: 65 })).resolves.toBeDefined();
  });

  it('maps a rejection cStat to REJEITADA with the motivo', async () => {
    nfeCancelamento.mockResolvedValue([
      { retEvento: { infEvento: { cStat: '573', xMotivo: 'Duplicidade de evento' } } },
    ]);
    const result = await createNfeWizardProvider(baseConfig()).cancelNf(cancelInput);
    expect(result.status).toBe('REJEITADA');
    expect(result.rejection).toEqual({ code: '573', message: 'Duplicidade de evento' });
  });

  it('returns ERRO when the cancellation call throws', async () => {
    nfeCancelamento.mockRejectedValue(new Error('SEFAZ indisponível'));
    const result = await createNfeWizardProvider(baseConfig()).cancelNf(cancelInput);
    expect(result.status).toBe('ERRO');
    expect(result.rejection?.message).toContain('SEFAZ');
  });

  it('logs loudly when the cancellation response has no event payload', async () => {
    nfeCancelamento.mockResolvedValue({ success: true }); // no `response`, no infEvento
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const result = await createNfeWizardProvider(baseConfig()).cancelNf(cancelInput);
      expect(result.status).toBe('ERRO'); // no cStat found
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('3'.repeat(44)));
    } finally {
      errorSpy.mockRestore();
    }
  });
});

describe('createNfeWizardProvider — queryNf', () => {
  it('maps consulta cStat 100 to AUTORIZADA with protocolo', async () => {
    nfeConsultaProtocolo.mockResolvedValue({
      cStat: '100',
      protNFe: { infProt: { nProt: '111222' } },
    });
    const result = await createNfeWizardProvider(baseConfig()).queryNf('3'.repeat(44));
    expect(result.status).toBe('AUTORIZADA');
    expect(result.protocolo).toBe('111222');
  });

  it('maps consulta cStat 101 (cancelada) to CANCELADA', async () => {
    nfeConsultaProtocolo.mockResolvedValue({ cStat: '101' });
    const result = await createNfeWizardProvider(baseConfig()).queryNf('3'.repeat(44));
    expect(result.status).toBe('CANCELADA');
  });

  it('maps consulta cStat 217 (não consta) to DESCONHECIDA', async () => {
    nfeConsultaProtocolo.mockResolvedValue({ cStat: '217' });
    const result = await createNfeWizardProvider(baseConfig()).queryNf('3'.repeat(44));
    expect(result.status).toBe('DESCONHECIDA');
  });
});
