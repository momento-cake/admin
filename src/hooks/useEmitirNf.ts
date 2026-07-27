'use client'

import { useCallback, useState } from 'react'
import type { NfModelo, Pedido } from '@/types/pedido'
import type { FiscalAmbiente, FiscalEmitResult } from '@/lib/fiscal/types'

/**
 * Normalized NF payload returned by the emission API (`data.nf`) and used to
 * drive the printed DANFE-NFC-e. Mirrors the fields `buildDanfeNfceModel` reads
 * from a `FiscalEmitResult`, plus the `ambiente` the route resolves.
 */
export interface EmitNfPayload {
  modelo: NfModelo
  serie: number
  numero: number
  accessKey: string
  protocolo?: string
  /** NFC-e (65) only. */
  qrCode?: string
  /** NFC-e (65) only. */
  urlChave?: string
  ambiente: FiscalAmbiente
}

/** SEFAZ rejection detail surfaced to the user (cStat / xMotivo). */
export interface NfRejection {
  code: string
  message: string
}

/** Cancellation outcome returned by the API (`data.cancel`). */
export interface NfCancelPayload {
  protocolo: string
  cancelledAt: string
}

export interface UseEmitirNfResult {
  /** POST the emission; resolves to the NF + updated order, or null on failure. */
  emit: (modelo: NfModelo) => Promise<{ nf: EmitNfPayload; pedido: Pedido } | null>
  emitting: boolean
  error: string | null
  rejection: NfRejection | null
  result: EmitNfPayload | null
  /** Print (or re-print) a DANFE-NFC-e, falling back to the browser page. */
  printNfce: (nf: EmitNfPayload) => Promise<void>
  printing: boolean
  printError: string | null
  /** POST a cancellation; resolves to the cancel result + updated order, or null. */
  cancel: (justificativa: string) => Promise<{ cancel: NfCancelPayload; pedido: Pedido } | null>
  cancelling: boolean
  cancelError: string | null
  cancelRejection: NfRejection | null
}

/**
 * Drives fiscal-document emission for a single order and the NFC-e thermal
 * print. Emission goes through the API route (server holds the certificate and
 * counters); a successful NFC-e (model 65) auto-prints, and any printer failure
 * falls back to the 80mm browser-print page.
 */
export function useEmitirNf(pedido: Pedido): UseEmitirNfResult {
  const [emitting, setEmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rejection, setRejection] = useState<NfRejection | null>(null)
  const [result, setResult] = useState<EmitNfPayload | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelRejection, setCancelRejection] = useState<NfRejection | null>(null)

  const printNfce = useCallback(
    async (nf: EmitNfPayload) => {
      setPrinting(true)
      setPrintError(null)
      try {
        // Deferred imports keep the WebUSB / canvas / renderer code out of the
        // detail view's load-time graph (mirrors ReciboButton).
        const [{ printEscPos, PrinterUnavailableError }, danfe, { COMPANY_INFO }, recibo] =
          await Promise.all([
            import('@/lib/webusb-printer'),
            import('@/lib/danfe-nfce-thermal'),
            import('@/lib/company-info'),
            import('@/lib/pedido-recibo-thermal'),
          ])

        // The client cannot decrypt the CPF, so the printed coupon carries only
        // the consumer's name (CPF omitted).
        const emitResult: FiscalEmitResult = {
          status: 'AUTORIZADA',
          modelo: nf.modelo,
          serie: nf.serie,
          numero: nf.numero,
          accessKey: nf.accessKey,
          protocolo: nf.protocolo,
          qrCode: nf.qrCode,
          urlChave: nf.urlChave,
          emittedAt: new Date(),
        }
        const model = danfe.buildDanfeNfceModel(pedido, emitResult, {
          ambiente: nf.ambiente,
          consumidor: pedido.billing?.nome ? { nome: pedido.billing.nome } : undefined,
        })

        const qr = nf.qrCode ? await danfe.makeQrImageData(nf.qrCode) : null
        const logo = await recibo.loadLogoImageData(COMPANY_INFO.logoPath)
        const bytes = danfe.buildDanfeNfce(model, qr, logo)

        try {
          await printEscPos(bytes)
        } catch (err) {
          if (err instanceof PrinterUnavailableError) {
            // No reachable USB printer — open the browser-print fallback page.
            window.open(`/orders/${pedido.id}/danfe-nfce`, '_blank')
          } else {
            throw err
          }
        }
      } catch (err) {
        setPrintError(err instanceof Error ? err.message : 'Não foi possível imprimir a DANFE-NFC-e')
      } finally {
        setPrinting(false)
      }
    },
    [pedido],
  )

  const emit = useCallback(
    async (modelo: NfModelo) => {
      setEmitting(true)
      setError(null)
      setRejection(null)
      try {
        const res = await fetch(`/api/pedidos/${pedido.id}/nf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modelo }),
        })
        const json = await res.json().catch(() => null)

        if (res.ok && json?.success) {
          const nf = json.data.nf as EmitNfPayload
          setResult(nf)
          // A freshly authorized NFC-e prints its coupon immediately.
          if (nf.modelo === 65) void printNfce(nf)
          return { nf, pedido: json.data.pedido as Pedido }
        }

        if (res.status === 422 && json?.rejection) {
          setRejection(json.rejection as NfRejection)
          return null
        }

        setError(json?.error || 'Não foi possível emitir a nota fiscal')
        return null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao comunicar com o servidor')
        return null
      } finally {
        setEmitting(false)
      }
    },
    [pedido.id, printNfce],
  )

  const cancel = useCallback(
    async (justificativa: string) => {
      setCancelling(true)
      setCancelError(null)
      setCancelRejection(null)
      try {
        const res = await fetch(`/api/pedidos/${pedido.id}/nf/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ justificativa }),
        })
        const json = await res.json().catch(() => null)
        // The cancel route returns `{ pedido, cancel }` directly; tolerate a
        // `{ success, data }` wrapper too in case it adopts the emit convention.
        const body = json?.data ?? json

        if (res.ok && body?.cancel) {
          return {
            cancel: body.cancel as NfCancelPayload,
            pedido: body.pedido as Pedido,
          }
        }

        if (res.status === 422 && json?.rejection) {
          setCancelRejection(json.rejection as NfRejection)
          return null
        }

        setCancelError(json?.error || 'Não foi possível cancelar a nota fiscal')
        return null
      } catch (err) {
        setCancelError(err instanceof Error ? err.message : 'Erro ao comunicar com o servidor')
        return null
      } finally {
        setCancelling(false)
      }
    },
    [pedido.id],
  )

  return {
    emit,
    emitting,
    error,
    rejection,
    result,
    printNfce,
    printing,
    printError,
    cancel,
    cancelling,
    cancelError,
    cancelRejection,
  }
}
