/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---- Firebase admin mock ----------------------------------------------------
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockDownload = vi.fn();
const mockFile = vi.fn(() => ({ download: mockDownload }));
const mockGetFiscalBucket = vi.fn(() => ({ file: mockFile }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
  getFiscalBucket: () => mockGetFiscalBucket(),
}));

// Use the REAL encryption module so the round-trip (encrypt in the test,
// decrypt in loadFiscalConfig) actually exercises decryptPii.
import { encryptPii, resetBillingEncryptionForTesting } from '@/lib/billing-encryption';
import { loadFiscalConfig } from '@/lib/fiscal/config';

function fullDoc(overrides: Record<string, unknown> = {}) {
  return {
    ambiente: 'producao',
    inscricaoEstadual: '111222333444',
    crt: 3,
    cfop: '5102',
    ncm: '19059090',
    csosn: '102',
    cst: '00',
    unidade: 'UN',
    naturezaOperacao: 'Venda de bolos',
    serieNfe: 2,
    serieNfce: 7,
    cscId: '000001',
    cscEnc: encryptPii('CSC-SECRET'),
    certStoragePath: 'fiscal/certificates/cert.pfx',
    certPasswordEnc: encryptPii('pfx-password'),
    ...overrides,
  };
}

describe('loadFiscalConfig', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDoc.mockClear();
    mockCollection.mockClear();
    mockDownload.mockReset();
    mockFile.mockClear();
    mockGetFiscalBucket.mockClear();
    resetBillingEncryptionForTesting();
  });

  it('reads storeSettings/fiscal, seeds the issuer letterhead and overlays doc fields', async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => fullDoc() });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX-BYTES')]);

    const config = await loadFiscalConfig();

    expect(mockCollection).toHaveBeenCalledWith('storeSettings');
    expect(mockDoc).toHaveBeenCalledWith('fiscal');

    // Seeded letterhead from company-info
    expect(config.issuer.cnpj).toBe('30640317000153');
    expect(config.issuer.razaoSocial).toBe('Momento Cake LTDA');
    expect(config.issuer.nomeFantasia).toBe('MOMENTO CAKE');
    expect(config.issuer.codigoMunicipioIbge).toBe('3550308');
    expect(config.issuer.uf).toBe('SP');
    expect(config.issuer.cep).toBe('02131080');

    // Overlaid from the doc
    expect(config.issuer.inscricaoEstadual).toBe('111222333444');
    expect(config.issuer.crt).toBe(3);
    expect(config.ambiente).toBe('producao');
    expect(config.serieNfe).toBe(2);
    expect(config.serieNfce).toBe(7);
    expect(config.taxProfile.cfop).toBe('5102');
    expect(config.taxProfile.origem).toBe('0');
    expect(config.taxProfile.cst).toBe('00');
  });

  it('decrypts the certificate password and CSC token', async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => fullDoc() });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX-BYTES')]);

    const config = await loadFiscalConfig();

    expect(config.cert.password).toBe('pfx-password');
    expect(config.csc).toEqual({ id: '000001', token: 'CSC-SECRET' });
  });

  it('downloads the certificate bytes from the configured storage path', async () => {
    mockGet.mockResolvedValueOnce({ exists: true, data: () => fullDoc() });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX-BYTES')]);

    const config = await loadFiscalConfig();

    expect(mockFile).toHaveBeenCalledWith('fiscal/certificates/cert.pfx');
    expect(config.cert.pfx).toBeInstanceOf(Buffer);
    expect(config.cert.pfx.toString()).toBe('PFX-BYTES');
  });

  it('omits csc when only one of cscId/cscEnc is present', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => fullDoc({ cscEnc: undefined }),
    });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX-BYTES')]);

    const config = await loadFiscalConfig();
    expect(config.csc).toBeUndefined();
  });

  it('defaults ambiente to homologacao when the doc omits it', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => fullDoc({ ambiente: undefined }),
    });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX-BYTES')]);

    const config = await loadFiscalConfig();
    expect(config.ambiente).toBe('homologacao');
  });

  it('falls back to sane defaults when the doc only carries the certificate', async () => {
    // Only the certificate fields are present — everything else must default.
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        certStoragePath: 'fiscal/certificates/cert.pfx',
        certPasswordEnc: encryptPii('pw'),
      }),
    });
    mockDownload.mockResolvedValueOnce([Buffer.from('PFX')]);

    const config = await loadFiscalConfig();

    expect(config.ambiente).toBe('homologacao');
    expect(config.serieNfe).toBe(1);
    expect(config.serieNfce).toBe(1);
    expect(config.issuer.inscricaoEstadual).toBe('');
    expect(config.issuer.crt).toBe(1);
    expect(config.taxProfile.cfop).toBe('');
    expect(config.taxProfile.ncm).toBe('');
    expect(config.taxProfile.unidade).toBe('UN');
    expect(config.taxProfile.csosn).toBeUndefined();
    expect(config.taxProfile.cst).toBeUndefined();
    expect(config.taxProfile.naturezaOperacao).toBe('Venda de mercadoria');
    expect(config.csc).toBeUndefined();
  });

  it('handles an empty doc payload (data() returns undefined)', async () => {
    // exists true but data() undefined ⇒ treated as an empty object, so the
    // missing-certificate guard fires.
    mockGet.mockResolvedValueOnce({ exists: true, data: () => undefined });
    await expect(loadFiscalConfig()).rejects.toThrow(/[Cc]ertificado/);
  });

  it('throws when the fiscal doc does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: false });
    await expect(loadFiscalConfig()).rejects.toThrow(/não encontrada/i);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('throws when the certificate path is missing', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => fullDoc({ certStoragePath: undefined }),
    });
    await expect(loadFiscalConfig()).rejects.toThrow(/[Cc]ertificado/);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it('throws when the certificate password is missing', async () => {
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => fullDoc({ certPasswordEnc: undefined }),
    });
    await expect(loadFiscalConfig()).rejects.toThrow(/[Ss]enha/);
    expect(mockDownload).not.toHaveBeenCalled();
  });
});
