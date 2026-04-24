import { describe, it, expect } from 'vitest'
import {
  validateReceiptFile,
  MAX_RECEIPT_SIZE,
  SUPPORTED_RECEIPT_TYPES,
  getReceiptKind,
} from '@/lib/validators/receipt'

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('validateReceiptFile', () => {
  it('accepts PDF files within size limit', () => {
    const file = makeFile('receipt.pdf', 'application/pdf', 1024)
    expect(validateReceiptFile(file)).toEqual({ isValid: true })
  })

  it('accepts JPEG files', () => {
    const file = makeFile('comprovante.jpg', 'image/jpeg', 1024)
    expect(validateReceiptFile(file).isValid).toBe(true)
  })

  it('accepts PNG files', () => {
    const file = makeFile('comprovante.png', 'image/png', 1024)
    expect(validateReceiptFile(file).isValid).toBe(true)
  })

  it('accepts WebP files', () => {
    const file = makeFile('comprovante.webp', 'image/webp', 1024)
    expect(validateReceiptFile(file).isValid).toBe(true)
  })

  it('rejects unsupported MIME types (e.g., DOCX)', () => {
    const file = makeFile(
      'receipt.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      1024
    )
    const result = validateReceiptFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/não suportado/i)
  })

  it('rejects files over the size limit', () => {
    const file = makeFile('huge.pdf', 'application/pdf', MAX_RECEIPT_SIZE + 1)
    const result = validateReceiptFile(file)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/muito grande|máximo/i)
  })

  it('rejects missing file', () => {
    const result = validateReceiptFile(null as unknown as File)
    expect(result.isValid).toBe(false)
  })
})

describe('SUPPORTED_RECEIPT_TYPES', () => {
  it('contains PDF and common image MIME types', () => {
    expect(SUPPORTED_RECEIPT_TYPES).toContain('application/pdf')
    expect(SUPPORTED_RECEIPT_TYPES).toContain('image/jpeg')
    expect(SUPPORTED_RECEIPT_TYPES).toContain('image/png')
  })
})

describe('MAX_RECEIPT_SIZE', () => {
  it('is set to 5 MB', () => {
    expect(MAX_RECEIPT_SIZE).toBe(5 * 1024 * 1024)
  })
})

describe('getReceiptKind', () => {
  it('returns "pdf" for PDF MIME types', () => {
    expect(getReceiptKind('application/pdf')).toBe('pdf')
  })

  it('returns "image" for image MIME types', () => {
    expect(getReceiptKind('image/jpeg')).toBe('image')
    expect(getReceiptKind('image/png')).toBe('image')
    expect(getReceiptKind('image/webp')).toBe('image')
  })

  it('returns null for unsupported types', () => {
    expect(getReceiptKind('text/plain')).toBe(null)
  })
})
