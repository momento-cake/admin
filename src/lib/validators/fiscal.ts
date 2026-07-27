import { z } from 'zod';

// ============================================================================
// FISCAL SETTINGS SCHEMA
// ============================================================================

/**
 * Validates the editable fields of the `storeSettings/fiscal` document
 * (see `FiscalSettings` in `src/types/store-settings.ts`).
 *
 * Secrets are handled apart from the persisted shape: the raw CSC token arrives
 * as `csc` (encrypted into `cscEnc` server-side) and the certificate password as
 * `certPassword` (encrypted into `certPasswordEnc`). Neither is ever returned by
 * the GET route.
 */
export const fiscalSettingsSchema = z.object({
  ambiente: z.enum(['homologacao', 'producao']),
  inscricaoEstadual: z.string()
    .trim()
    .min(1, 'Inscrição Estadual é obrigatória')
    .max(20, 'Inscrição Estadual muito longa'),
  crt: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  cfop: z.string()
    .trim()
    .regex(/^\d{4}$/, 'CFOP deve ter 4 dígitos'),
  ncm: z.string()
    .trim()
    .regex(/^\d{8}$/, 'NCM deve ter 8 dígitos'),
  csosn: z.string()
    .trim()
    .min(1, 'CSOSN é obrigatório')
    .max(4, 'CSOSN inválido'),
  /** CST ICMS — optional; only applies under Regime Normal (CRT 3). */
  cst: z.string()
    .trim()
    .max(3, 'CST inválido')
    .optional(),
  unidade: z.string()
    .trim()
    .min(1, 'Unidade é obrigatória')
    .max(6, 'Unidade muito longa'),
  naturezaOperacao: z.string()
    .trim()
    .min(1, 'Natureza da operação é obrigatória')
    .max(60, 'Natureza da operação muito longa'),
  serieNfe: z.number()
    .int('Série NF-e deve ser um número inteiro')
    .min(1, 'Série NF-e deve ser maior que zero')
    .max(999, 'Série NF-e inválida'),
  serieNfce: z.number()
    .int('Série NFC-e deve ser um número inteiro')
    .min(1, 'Série NFC-e deve ser maior que zero')
    .max(999, 'Série NFC-e inválida'),
  cscId: z.string()
    .trim()
    .max(10, 'ID do CSC inválido')
    .optional(),
  /** Raw CSC token (input only; stored encrypted as `cscEnc`). */
  csc: z.string()
    .trim()
    .max(200, 'Token CSC muito longo')
    .optional(),
  /** Raw certificate password (input only; stored encrypted as `certPasswordEnc`). */
  certPassword: z.string()
    .max(200, 'Senha do certificado muito longa')
    .optional(),
});

export type FiscalSettingsInput = z.infer<typeof fiscalSettingsSchema>;

// ============================================================================
// CERTIFICATE (.pfx) FILE VALIDATION
// ============================================================================

/** Accepted MIME types for an A1 certificate (PKCS#12 bundle). */
export const SUPPORTED_CERT_TYPES = [
  'application/x-pkcs12',
  'application/pkcs12',
  'application/octet-stream',
] as const;

/** Accepted file extensions when the browser reports a generic MIME type. */
export const SUPPORTED_CERT_EXTENSIONS = ['.pfx', '.p12'] as const;

/** A1 certificates are tiny; cap the upload to guard against abuse. */
export const MAX_CERT_SIZE = 512 * 1024; // 512 KB

/**
 * Validates an uploaded A1 certificate file. Browsers are inconsistent about the
 * MIME type they attach to `.pfx`/`.p12` files (often the generic
 * `application/octet-stream`), so the extension is accepted as a fallback.
 */
export function validateCertFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo selecionado' };
  }

  const name = (file.name || '').toLowerCase();
  const hasValidExtension = SUPPORTED_CERT_EXTENSIONS.some((ext) => name.endsWith(ext));
  const hasValidType = (SUPPORTED_CERT_TYPES as readonly string[]).includes(file.type);

  if (!hasValidType && !hasValidExtension) {
    return {
      isValid: false,
      error: 'Tipo de arquivo inválido. Envie o certificado A1 (.pfx ou .p12).',
    };
  }

  if (file.size > MAX_CERT_SIZE) {
    return {
      isValid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${MAX_CERT_SIZE / 1024} KB`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'Arquivo de certificado vazio' };
  }

  return { isValid: true };
}
