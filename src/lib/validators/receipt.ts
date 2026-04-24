/**
 * Validation helpers for payment receipt (comprovante) uploads.
 * Accepts PDFs and common image formats, up to 5 MB (Conta Azul standard).
 */

export const SUPPORTED_RECEIPT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type SupportedReceiptType = (typeof SUPPORTED_RECEIPT_TYPES)[number];

export const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5 MB

export type ReceiptKind = 'pdf' | 'image';

/**
 * Validates a receipt file for upload.
 */
export function validateReceiptFile(file: File): {
  isValid: boolean;
  error?: string;
} {
  if (!file) {
    return { isValid: false, error: 'Nenhum arquivo selecionado' };
  }

  if (!SUPPORTED_RECEIPT_TYPES.includes(file.type as SupportedReceiptType)) {
    return {
      isValid: false,
      error:
        'Tipo de arquivo não suportado. Envie PDF, JPG, PNG ou WebP.',
    };
  }

  if (file.size > MAX_RECEIPT_SIZE) {
    return {
      isValid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${
        MAX_RECEIPT_SIZE / (1024 * 1024)
      } MB`,
    };
  }

  return { isValid: true };
}

/**
 * Returns the kind of receipt ("pdf" or "image") based on MIME type, or null
 * if the type is unsupported.
 */
export function getReceiptKind(mimeType: string): ReceiptKind | null {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
}
