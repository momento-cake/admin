/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// --- Mocks for the deferred print imports -----------------------------------

const printEscPosMock = vi.fn()
class PrinterUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PrinterUnavailableError'
  }
}
vi.mock('@/lib/webusb-printer', () => ({
  printEscPos: (...args: any[]) => printEscPosMock(...args),
  PrinterUnavailableError,
}))

const buildDanfeNfceModelMock = vi.fn(() => ({ model: true }))
const buildDanfeNfceMock = vi.fn(() => new Uint8Array([1, 2, 3]))
const makeQrImageDataMock = vi.fn(async () => ({ width: 8, height: 8 }))
vi.mock('@/lib/danfe-nfce-thermal', () => ({
  buildDanfeNfceModel: (...args: any[]) => buildDanfeNfceModelMock(...args),
  buildDanfeNfce: (...args: any[]) => buildDanfeNfceMock(...args),
  makeQrImageData: (...args: any[]) => makeQrImageDataMock(...args),
}))

const loadLogoImageDataMock = vi.fn(async () => null)
vi.mock('@/lib/pedido-recibo-thermal', () => ({
  loadLogoImageData: (...args: any[]) => loadLogoImageDataMock(...args),
}))

vi.mock('@/lib/company-info', () => ({
  COMPANY_INFO: { logoPath: '/brand/logo.png' },
}))

import { useEmitirNf } from '@/hooks/useEmitirNf'
import type { Pedido } from '@/types/pedido'

// --- Fixtures ---------------------------------------------------------------

function pedido(overrides: Partial<Pedido> & Record<string, any> = {}): Pedido {
  return {
    id: 'p1',
    numeroPedido: 'PED-0777',
    clienteNome: 'Cliente Loja',
    billing: { nome: 'Fulano de Tal', cpfCnpj: '123', email: 'x@y.z', confirmedAt: {} },
    ...overrides,
  } as Pedido
}

function okNf(modelo: 55 | 65) {
  return {
    modelo,
    serie: 1,
    numero: 123,
    accessKey: '3526...',
    protocolo: '135260000123456',
    qrCode: modelo === 65 ? 'QRTEXT' : undefined,
    urlChave: 'https://consulta',
    ambiente: 'homologacao',
  }
}

function jsonResponse(status: number, body: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response
}

const openMock = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn())
  vi.stubGlobal('open', openMock)
  ;(window as any).open = openMock
})

// --- Tests ------------------------------------------------------------------

describe('useEmitirNf.emit', () => {
  it('emits an NF-e (55) and returns the nf + updated pedido without printing', async () => {
    const nf = okNf(55)
    const updated = pedido({ nfStatus: 'EMITIDA' })
    ;(fetch as any).mockResolvedValue(jsonResponse(200, { success: true, data: { nf, pedido: updated } }))

    const { result } = renderHook(() => useEmitirNf(pedido()))

    let returned: any
    await act(async () => {
      returned = await result.current.emit(55)
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/pedidos/p1/nf',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ modelo: 55 }) }),
    )
    expect(returned).toEqual({ nf, pedido: updated })
    expect(result.current.result).toEqual(nf)
    expect(result.current.error).toBeNull()
    expect(printEscPosMock).not.toHaveBeenCalled()
  })

  it('emits an NFC-e (65) and auto-prints the coupon', async () => {
    const nf = okNf(65)
    ;(fetch as any).mockResolvedValue(jsonResponse(200, { success: true, data: { nf, pedido: pedido() } }))
    printEscPosMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.emit(65)
    })

    await waitFor(() => expect(printEscPosMock).toHaveBeenCalledTimes(1))
    expect(makeQrImageDataMock).toHaveBeenCalledWith('QRTEXT')
    expect(buildDanfeNfceModelMock).toHaveBeenCalled()
    // Consumer passed with name only (no CPF).
    const [, , options] = buildDanfeNfceModelMock.mock.calls[0] as any
    expect(options).toEqual({ ambiente: 'homologacao', consumidor: { nome: 'Fulano de Tal' } })
    expect(buildDanfeNfceMock).toHaveBeenCalled()
    expect(openMock).not.toHaveBeenCalled()
  })

  it('surfaces a 422 SEFAZ rejection', async () => {
    ;(fetch as any).mockResolvedValue(
      jsonResponse(422, { success: false, error: 'rejeitada', rejection: { code: '539', message: 'Duplicidade' } }),
    )
    const { result } = renderHook(() => useEmitirNf(pedido()))
    let returned: any
    await act(async () => {
      returned = await result.current.emit(65)
    })
    expect(returned).toBeNull()
    expect(result.current.rejection).toEqual({ code: '539', message: 'Duplicidade' })
    expect(result.current.error).toBeNull()
  })

  it('sets a generic error on a 409 guard / non-rejection failure', async () => {
    ;(fetch as any).mockResolvedValue(jsonResponse(409, { success: false, error: 'Pedido não é online pago' }))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.emit(55)
    })
    expect(result.current.error).toBe('Pedido não é online pago')
    expect(result.current.rejection).toBeNull()
  })

  it('sets a generic error when fetch throws (network/timeout)', async () => {
    ;(fetch as any).mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.emit(65)
    })
    expect(result.current.error).toBe('network down')
  })

  it('falls back to a default message when the failure body has no error field', async () => {
    ;(fetch as any).mockResolvedValue(jsonResponse(500, { success: false }))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.emit(65)
    })
    expect(result.current.error).toBe('Não foi possível emitir a nota fiscal')
  })

  it('uses a default message when a non-Error is thrown', async () => {
    ;(fetch as any).mockRejectedValue('string failure')
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.emit(65)
    })
    expect(result.current.error).toBe('Erro ao comunicar com o servidor')
  })

  it('toggles the emitting flag around the request', async () => {
    let resolveFetch: (v: any) => void = () => {}
    ;(fetch as any).mockReturnValue(new Promise((r) => { resolveFetch = r }))
    const { result } = renderHook(() => useEmitirNf(pedido()))

    let emitPromise: Promise<any>
    act(() => {
      emitPromise = result.current.emit(65)
    })
    await waitFor(() => expect(result.current.emitting).toBe(true))

    await act(async () => {
      resolveFetch(jsonResponse(200, { success: true, data: { nf: okNf(65), pedido: pedido() } }))
      await emitPromise
    })
    expect(result.current.emitting).toBe(false)
  })
})

describe('useEmitirNf.printNfce', () => {
  it('falls back to the browser print page on PrinterUnavailableError', async () => {
    printEscPosMock.mockRejectedValue(new PrinterUnavailableError('no printer'))
    const { result } = renderHook(() => useEmitirNf(pedido()))

    await act(async () => {
      await result.current.printNfce(okNf(65) as any)
    })

    expect(openMock).toHaveBeenCalledWith('/orders/p1/danfe-nfce', '_blank')
    expect(result.current.printError).toBeNull()
  })

  it('records a printError for an unexpected failure', async () => {
    printEscPosMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.printNfce(okNf(65) as any)
    })
    expect(result.current.printError).toBe('boom')
    expect(openMock).not.toHaveBeenCalled()
  })

  it('uses a default printError message when a non-Error is thrown', async () => {
    printEscPosMock.mockRejectedValue('kaput')
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.printNfce(okNf(65) as any)
    })
    expect(result.current.printError).toBe('Não foi possível imprimir a DANFE-NFC-e')
  })

  it('skips QR generation when the nf has no qrCode', async () => {
    printEscPosMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.printNfce({ ...okNf(65), qrCode: undefined } as any)
    })
    expect(makeQrImageDataMock).not.toHaveBeenCalled()
    expect(buildDanfeNfceMock).toHaveBeenCalledWith(expect.anything(), null, null)
  })

  it('omits the consumer when the order has no billing name', async () => {
    printEscPosMock.mockResolvedValue(undefined)
    const { result } = renderHook(() => useEmitirNf(pedido({ billing: undefined })))
    await act(async () => {
      await result.current.printNfce(okNf(65) as any)
    })
    const [, , options] = buildDanfeNfceModelMock.mock.calls[0] as any
    expect(options.consumidor).toBeUndefined()
  })
})

describe('useEmitirNf.cancel', () => {
  it('cancels and returns the cancel result + updated pedido', async () => {
    const updated = pedido({ nfStatus: 'CANCELADA' })
    const cancelData = { protocolo: '999', cancelledAt: '2026-07-27T10:00:00Z' }
    ;(fetch as any).mockResolvedValue(jsonResponse(200, { pedido: updated, cancel: cancelData }))

    const { result } = renderHook(() => useEmitirNf(pedido()))
    let returned: any
    await act(async () => {
      returned = await result.current.cancel('Cancelamento por erro de digitação')
    })

    expect(fetch).toHaveBeenCalledWith(
      '/api/pedidos/p1/nf/cancel',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ justificativa: 'Cancelamento por erro de digitação' }),
      }),
    )
    expect(returned).toEqual({ cancel: cancelData, pedido: updated })
    expect(result.current.cancelError).toBeNull()
    expect(result.current.cancelRejection).toBeNull()
  })

  it('also accepts a { success, data } wrapper shape', async () => {
    const cancelData = { protocolo: '999', cancelledAt: '2026-07-27T10:00:00Z' }
    ;(fetch as any).mockResolvedValue(
      jsonResponse(200, { success: true, data: { pedido: pedido(), cancel: cancelData } }),
    )
    const { result } = renderHook(() => useEmitirNf(pedido()))
    let returned: any
    await act(async () => {
      returned = await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(returned?.cancel).toEqual(cancelData)
  })

  it('surfaces a 422 SEFAZ cancellation rejection', async () => {
    ;(fetch as any).mockResolvedValue(
      jsonResponse(422, {
        error: 'rejeitado',
        code: 'nf-cancel-rejected',
        rejection: { code: '501', message: 'Prazo de cancelamento expirado' },
      }),
    )
    const { result } = renderHook(() => useEmitirNf(pedido()))
    let returned: any
    await act(async () => {
      returned = await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(returned).toBeNull()
    expect(result.current.cancelRejection).toEqual({ code: '501', message: 'Prazo de cancelamento expirado' })
    expect(result.current.cancelError).toBeNull()
  })

  it('sets a generic error on a 409 guard / non-rejection failure', async () => {
    ;(fetch as any).mockResolvedValue(jsonResponse(409, { error: 'NF não está emitida' }))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(result.current.cancelError).toBe('NF não está emitida')
    expect(result.current.cancelRejection).toBeNull()
  })

  it('falls back to a default message when the failure body has no error field', async () => {
    ;(fetch as any).mockResolvedValue(jsonResponse(500, {}))
    const { result } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(result.current.cancelError).toBe('Não foi possível cancelar a nota fiscal')
  })

  it('sets a generic error when fetch throws, and a default for a non-Error', async () => {
    ;(fetch as any).mockRejectedValue(new Error('offline'))
    const { result, rerender } = renderHook(() => useEmitirNf(pedido()))
    await act(async () => {
      await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(result.current.cancelError).toBe('offline')

    ;(fetch as any).mockRejectedValue('weird')
    rerender()
    await act(async () => {
      await result.current.cancel('Justificativa suficientemente longa')
    })
    expect(result.current.cancelError).toBe('Erro ao comunicar com o servidor')
  })

  it('toggles the cancelling flag around the request', async () => {
    let resolveFetch: (v: any) => void = () => {}
    ;(fetch as any).mockReturnValue(new Promise((r) => { resolveFetch = r }))
    const { result } = renderHook(() => useEmitirNf(pedido()))

    let p: Promise<any>
    act(() => {
      p = result.current.cancel('Justificativa suficientemente longa')
    })
    await waitFor(() => expect(result.current.cancelling).toBe(true))
    await act(async () => {
      resolveFetch(jsonResponse(200, { pedido: pedido(), cancel: { protocolo: '1', cancelledAt: 'x' } }))
      await p
    })
    expect(result.current.cancelling).toBe(false)
  })
})
