import { describe, it, expect } from 'vitest';
import {
  fiscalSettingsSchema,
  validateCertFile,
  MAX_CERT_SIZE,
} from '@/lib/validators/fiscal';

const validSettings = {
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
};

/** Build a File-like object with a controllable `size` without allocating bytes. */
function makeCertFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('fiscalSettingsSchema', () => {
  it('accepts a fully valid config', () => {
    const result = fiscalSettingsSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it('accepts optional cscId, csc token and certPassword', () => {
    const result = fiscalSettingsSchema.safeParse({
      ...validSettings,
      cscId: '000001',
      csc: 'SECRET-CSC-TOKEN',
      certPassword: 'pfx-pass',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional cst (Regime Normal)', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, cst: '00' });
    expect(result.success).toBe(true);
  });

  it('rejects a cst longer than 3 chars', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, cst: '0000' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown ambiente', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, ambiente: 'staging' });
    expect(result.success).toBe(false);
  });

  it('rejects a crt outside 1|2|3', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, crt: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects a CFOP that is not 4 digits', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, cfop: '510' });
    expect(result.success).toBe(false);
  });

  it('rejects an NCM that is not 8 digits', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, ncm: '1905' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer serieNfe', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, serieNfe: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects serieNfce below 1', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, serieNfce: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty inscricaoEstadual', () => {
    const result = fiscalSettingsSchema.safeParse({ ...validSettings, inscricaoEstadual: '' });
    expect(result.success).toBe(false);
  });
});

describe('validateCertFile', () => {
  it('accepts a .pfx file with the pkcs12 MIME type', () => {
    const file = makeCertFile('cert.pfx', 'application/x-pkcs12', 2048);
    expect(validateCertFile(file)).toEqual({ isValid: true });
  });

  it('accepts a .p12 file even with a generic octet-stream MIME type', () => {
    const file = makeCertFile('cert.p12', 'application/octet-stream', 2048);
    expect(validateCertFile(file).isValid).toBe(true);
  });

  it('accepts a .pfx by extension when the browser reports an empty MIME type', () => {
    const file = makeCertFile('mycert.PFX', '', 1024);
    expect(validateCertFile(file).isValid).toBe(true);
  });

  it('rejects a file with a wrong extension and MIME type', () => {
    const file = makeCertFile('cert.txt', 'text/plain', 1024);
    const result = validateCertFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/inválido/i);
  });

  it('rejects a file larger than the max size', () => {
    const file = makeCertFile('cert.pfx', 'application/x-pkcs12', MAX_CERT_SIZE + 1);
    const result = validateCertFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/máximo/i);
  });

  it('rejects an empty file', () => {
    const file = makeCertFile('cert.pfx', 'application/x-pkcs12', 0);
    const result = validateCertFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toMatch(/vazio/i);
  });

  it('rejects a missing file', () => {
    const result = validateCertFile(undefined as unknown as File);
    expect(result.isValid).toBe(false);
  });
});
