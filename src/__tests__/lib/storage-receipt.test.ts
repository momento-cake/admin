import { describe, it, expect, beforeEach, vi } from 'vitest'

// Firebase storage mocks — must be set up before importing storage.ts
const uploadBytesMock = vi.fn(async (_ref, _file, _meta) => ({ ref: { fullPath: 'p' } }))
const getDownloadURLMock = vi.fn(async () => 'https://storage.example/comprovante.pdf')
const deleteObjectMock = vi.fn(async () => undefined)
const refMock = vi.fn((_storage, path: string) => ({ _path: path }))

vi.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => refMock(...(args as [unknown, string])),
  uploadBytes: (...args: unknown[]) => uploadBytesMock(...(args as [unknown, File, unknown])),
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...(args as [unknown])),
  deleteObject: (...args: unknown[]) => deleteObjectMock(...(args as [unknown])),
  getMetadata: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  storage: { __fake: true },
}))

import {
  uploadReceipt,
  deleteReceipt,
  buildReceiptStoragePath,
} from '@/lib/storage'

function makeFile(name: string, type: string, size: number): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

describe('buildReceiptStoragePath', () => {
  it('uses the pedidos/{pedidoId}/comprovantes/ folder', () => {
    const file = makeFile('comprovante.pdf', 'application/pdf', 100)
    const path = buildReceiptStoragePath({
      pedidoId: 'ped-1',
      pagamentoId: 'pay-1',
      file,
    })
    expect(path).toMatch(/^pedidos\/ped-1\/comprovantes\/pay-1_\d+\.pdf$/)
  })

  it('preserves the extension lowercased', () => {
    const file = makeFile('Recibo.PNG', 'image/png', 100)
    const path = buildReceiptStoragePath({
      pedidoId: 'p',
      pagamentoId: 'x',
      file,
    })
    expect(path.endsWith('.png')).toBe(true)
  })

  it('falls back to "bin" when no extension', () => {
    const file = makeFile('noextension', 'application/pdf', 100)
    const path = buildReceiptStoragePath({
      pedidoId: 'p',
      pagamentoId: 'x',
      file,
    })
    expect(path.endsWith('.bin')).toBe(true)
  })
})

describe('uploadReceipt', () => {
  beforeEach(() => {
    uploadBytesMock.mockClear()
    getDownloadURLMock.mockClear()
    refMock.mockClear()
  })

  it('uploads a valid PDF and returns the result', async () => {
    const file = makeFile('comprovante.pdf', 'application/pdf', 1024)
    const result = await uploadReceipt({
      file,
      pedidoId: 'ped-1',
      pagamentoId: 'pay-1',
    })
    expect(uploadBytesMock).toHaveBeenCalledTimes(1)
    expect(result.url).toBe('https://storage.example/comprovante.pdf')
    expect(result.mimeType).toBe('application/pdf')
    expect(result.kind).toBe('pdf')
    expect(result.fileSize).toBe(1024)
    expect(result.storagePath).toMatch(/^pedidos\/ped-1\/comprovantes\/pay-1_\d+\.pdf$/)
  })

  it('uploads an image and returns kind=image', async () => {
    const file = makeFile('recibo.png', 'image/png', 1024)
    const result = await uploadReceipt({
      file,
      pedidoId: 'p',
      pagamentoId: 'x',
    })
    expect(result.kind).toBe('image')
  })

  it('passes custom metadata on the upload', async () => {
    const file = makeFile('comprovante.pdf', 'application/pdf', 100)
    await uploadReceipt({ file, pedidoId: 'ped-2', pagamentoId: 'pay-2' })
    const meta = uploadBytesMock.mock.calls[0][2] as {
      contentType: string
      customMetadata: Record<string, string>
    }
    expect(meta.contentType).toBe('application/pdf')
    expect(meta.customMetadata.pedidoId).toBe('ped-2')
    expect(meta.customMetadata.pagamentoId).toBe('pay-2')
  })

  it('rejects files with unsupported MIME types', async () => {
    const file = makeFile('x.txt', 'text/plain', 100)
    await expect(
      uploadReceipt({ file, pedidoId: 'p', pagamentoId: 'x' })
    ).rejects.toThrow(/não suportado/i)
    expect(uploadBytesMock).not.toHaveBeenCalled()
  })

  it('rejects files over 5 MB', async () => {
    const file = makeFile('big.pdf', 'application/pdf', 5 * 1024 * 1024 + 1)
    await expect(
      uploadReceipt({ file, pedidoId: 'p', pagamentoId: 'x' })
    ).rejects.toThrow(/muito grande|máximo/i)
    expect(uploadBytesMock).not.toHaveBeenCalled()
  })
})

describe('deleteReceipt', () => {
  beforeEach(() => {
    deleteObjectMock.mockReset()
  })

  it('deletes an existing receipt', async () => {
    deleteObjectMock.mockResolvedValueOnce(undefined)
    await expect(deleteReceipt('pedidos/p/comprovantes/x.pdf')).resolves.toBeUndefined()
    expect(deleteObjectMock).toHaveBeenCalled()
  })

  it('swallows object-not-found errors', async () => {
    deleteObjectMock.mockRejectedValueOnce({ code: 'storage/object-not-found' })
    await expect(deleteReceipt('missing.pdf')).resolves.toBeUndefined()
  })

  it('re-throws other storage errors', async () => {
    deleteObjectMock.mockRejectedValueOnce(new Error('network down'))
    await expect(deleteReceipt('any.pdf')).rejects.toThrow('network down')
  })
})
