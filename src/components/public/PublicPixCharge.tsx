'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Copy, Check, AlertCircle, RefreshCw, Hourglass } from 'lucide-react'
import { toast } from 'sonner'
import type { NormalizedChargeStatus } from '@/lib/payments/types'
import { BrandLogo } from './brand/BrandLogo'
import {
  describeError,
  logError,
  parseApiResponse,
} from '@/lib/error-handler'

const fontBody = { fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-cormorant), Georgia, serif' }

const POLL_INTERVAL_MS = 3000
const POLL_MAX_DURATION_MS = 30 * 60 * 1000 // 30 minutes

interface ExistingPixSession {
  pixQrCodeBase64?: string
  pixCopyPaste?: string
  expiresAt?: string
  status: NormalizedChargeStatus
}

interface PublicPixChargeProps {
  token: string
  amount: number
  onPaid: () => void
  existingSession?: ExistingPixSession | null
}

interface PixSessionState {
  qrCodeBase64?: string
  copyPaste?: string
  expiresAt?: string
  status: NormalizedChargeStatus
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCountdown(ms: number): string {
  const safeMs = Math.max(0, ms)
  const totalSeconds = Math.floor(safeMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  if (hours >= 1) {
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60)
    return `${hours}h ${remainingMinutes}m`
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isUnusableSession(session: ExistingPixSession | null | undefined): boolean {
  if (!session) return true
  if (session.status === 'EXPIRED' || session.status === 'FAILED') return true
  // Risk analysis is reusable even without QR codes — the panel doesn't need
  // them and we don't want to spawn a fresh charge while one is being
  // reviewed.
  if (session.status === 'PENDING_RISK_ANALYSIS') return false
  if (!session.pixCopyPaste && !session.pixQrCodeBase64) return true
  return false
}

/**
 * Crest used at the top of every checkout card — same shape as the
 * PublicBillingForm crest for family resemblance, and now carrying the
 * actual Momento Cake brand monogram instead of a generic glyph.
 */
function CardCrest({ caption }: { caption: string }) {
  return (
    <div className="flex flex-col items-center text-center pt-7 pb-4 px-6">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border border-[#C9A96E]/45 flex items-center justify-center bg-gradient-to-b from-[#FFFDF8] to-[#F5EDE4] shadow-[0_2px_10px_-2px_rgba(201,169,110,0.25)]">
          <BrandLogo
            variant="monogram"
            width={32}
            color="#C9A96E"
            ariaLabel="Momento Cake"
          />
        </div>
        <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-[#C9A96E] shadow-[0_0_0_2px_#fff]" />
      </div>
      <p
        className="mt-3 text-[10px] text-[#8B6F4E] tracking-[0.32em] uppercase"
        style={fontBody}
      >
        {caption}
      </p>
    </div>
  )
}

export function PublicPixCharge({
  token,
  amount,
  onPaid,
  existingSession,
}: PublicPixChargeProps) {
  const [session, setSession] = useState<PixSessionState | null>(() => {
    if (!existingSession || isUnusableSession(existingSession)) return null
    return {
      qrCodeBase64: existingSession.pixQrCodeBase64,
      copyPaste: existingSession.pixCopyPaste,
      expiresAt: existingSession.expiresAt,
      status: existingSession.status,
    }
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Surfaced when the 30-minute polling cap is reached without confirmation.
  const [pollExpiredError, setPollExpiredError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const onPaidCalledRef = useRef(false)
  const cancelledRef = useRef(false)
  const pollStartedAtRef = useRef<number | null>(null)

  // Tick clock for countdown — runs only while session is active.
  // Self-clears when expiresAt is reached so we don't keep ticking on the
  // expired UI. Cleanup also runs on unmount or when session changes.
  useEffect(() => {
    if (!session) return
    if (
      session.status === 'CONFIRMED' ||
      session.status === 'EXPIRED' ||
      session.status === 'FAILED' ||
      session.status === 'PENDING_RISK_ANALYSIS'
    ) {
      return
    }
    const expiresAtMsLocal = session.expiresAt
      ? Date.parse(session.expiresAt)
      : null
    const id = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (
        expiresAtMsLocal !== null &&
        !Number.isNaN(expiresAtMsLocal) &&
        current >= expiresAtMsLocal
      ) {
        window.clearInterval(id)
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [session])

  const createSession = useCallback(async () => {
    if (cancelledRef.current) return
    setCreating(true)
    setError(null)
    setPollExpiredError(null)
    try {
      const response = await fetch(
        `/api/public/pedidos/${token}/charge/pix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(15000),
        },
      )
      const data = await parseApiResponse<{
        paymentSession?: {
          pixQrCodeBase64?: string
          pixCopyPaste?: string
          expiresAt?: string
          status: NormalizedChargeStatus
        }
      }>(response)
      if (cancelledRef.current) return
      const ps = data?.paymentSession
      if (!ps) {
        setError('Resposta inválida do servidor.')
        return
      }
      setSession({
        qrCodeBase64: ps.pixQrCodeBase64,
        copyPaste: ps.pixCopyPaste,
        expiresAt: ps.expiresAt,
        status: ps.status,
      })
    } catch (err) {
      if (cancelledRef.current) return
      logError('PublicPixCharge.createSession', err)
      if (
        err instanceof DOMException &&
        (err.name === 'TimeoutError' || err.name === 'AbortError')
      ) {
        setError(
          'O pagamento demorou mais que o esperado. Por favor, tente novamente.',
        )
        return
      }
      setError(describeError(err))
    } finally {
      if (!cancelledRef.current) setCreating(false)
    }
  }, [token])

  // Create session on mount if needed
  useEffect(() => {
    cancelledRef.current = false
    if (!session && !creating) {
      void createSession()
    }
    return () => {
      cancelledRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polling for payment status while we have a usable session
  useEffect(() => {
    if (!session) return
    if (session.status === 'CONFIRMED') {
      if (!onPaidCalledRef.current) {
        onPaidCalledRef.current = true
        onPaid()
      }
      return
    }
    if (session.status === 'EXPIRED' || session.status === 'FAILED') return

    let cancelled = false
    pollStartedAtRef.current = pollStartedAtRef.current ?? Date.now()

    const tick = async () => {
      if (cancelled) return
      const elapsed = Date.now() - (pollStartedAtRef.current ?? Date.now())
      if (elapsed > POLL_MAX_DURATION_MS) {
        if (!cancelled) {
          setPollExpiredError(
            'Não recebemos confirmação do pagamento. O código PIX pode ter expirado — tente gerar um novo.',
          )
        }
        return
      }
      try {
        const response = await fetch(
          `/api/public/pedidos/${token}/payment-status`,
        )
        const data = await parseApiResponse<{
          status?: string
          paymentSession?: {
            status?: NormalizedChargeStatus
            method?: string | null
          } | null
        }>(response)
        if (cancelled) return
        const psStatus = data?.paymentSession?.status
        if (psStatus === 'CONFIRMED' || data?.status === 'CONFIRMADO') {
          if (!onPaidCalledRef.current) {
            onPaidCalledRef.current = true
            onPaid()
          }
          return
        }
        if (psStatus === 'EXPIRED' || psStatus === 'FAILED') {
          setSession((prev) => (prev ? { ...prev, status: psStatus } : prev))
          return
        }
        if (psStatus === 'PENDING_RISK_ANALYSIS') {
          // Defensive: PIX rarely triggers risk analysis, but if Asaas
          // reports it we swap the QR for the calmer "em análise" panel
          // and keep polling.
          setSession((prev) =>
            prev && prev.status !== psStatus
              ? { ...prev, status: psStatus }
              : prev,
          )
        } else if (psStatus === 'PENDING') {
          setSession((prev) =>
            prev && prev.status !== psStatus
              ? { ...prev, status: psStatus }
              : prev,
          )
        }
      } catch (err) {
        // Transient hiccups during a 3s poll loop must not spam the
        // customer — log only.
        logError('PublicPixCharge.poll', err)
      }
      if (!cancelled) {
        timer = window.setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    let timer: number = window.setTimeout(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [session, token, onPaid])

  const handleCopy = async () => {
    if (!session?.copyPaste) return
    try {
      await navigator.clipboard.writeText(session.copyPaste)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard denied is a user-side concern (permissions, insecure
      // context), not a server issue — surface a hint without polluting logs.
      toast.error('Erro ao copiar código', {
        description: 'Tente copiar manualmente o código abaixo.',
      })
    }
  }

  const handleRegenerate = async () => {
    pollStartedAtRef.current = null
    onPaidCalledRef.current = false
    setPollExpiredError(null)
    setSession(null)
    await createSession()
  }

  const expiresAtMs = session?.expiresAt ? Date.parse(session.expiresAt) : null
  const isRiskAnalysis = session?.status === 'PENDING_RISK_ANALYSIS'
  const expired =
    !isRiskAnalysis &&
    (session?.status === 'EXPIRED' ||
      session?.status === 'FAILED' ||
      (expiresAtMs !== null &&
        !Number.isNaN(expiresAtMs) &&
        expiresAtMs <= now))

  return (
    <div className="premium-card overflow-hidden animate-page-turn">
      <CardCrest caption="Pagamento via PIX" />

      <div className="px-6">
        <h3
          className="text-center text-[22px] text-[#2d2319] leading-tight"
          style={{ ...fontHeading, fontWeight: 600 }}
        >
          {isRiskAnalysis ? 'Pagamento em análise' : 'Aponte a câmera'}
        </h3>
        <p
          className="text-center text-[13px] text-[#8b7e6e] mt-1.5 leading-relaxed"
          style={fontBody}
        >
          Total a pagar:{' '}
          <span
            className="text-[#5c4a2e] tabular-nums"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {formatCurrency(amount)}
          </span>
        </p>
      </div>

      {/* Hairline */}
      <div
        className="flex items-center justify-center gap-2 px-6 mt-3 pb-2"
        aria-hidden="true"
      >
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4c4a8]/60" />
        <div className="w-1 h-1 rounded-full bg-[#c9a96e]/70" />
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4c4a8]/60" />
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Loading state */}
        {creating && !session && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full border border-[#d4c4a8]/40 flex items-center justify-center bg-[#faf7f2]">
              <Loader2 className="h-6 w-6 animate-spin text-[#b8956a]" />
            </div>
            <p
              className="text-[12px] text-[#8b7e6e] tracking-[0.18em] uppercase"
              style={fontBody}
            >
              Gerando seu código PIX
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !session && !creating && (
          <div role="alert" className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700" style={fontBody}>
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={createSession}
              className="w-full py-3 text-sm font-medium text-[#8b7355] border border-[#b8956a]/40 rounded-xl hover:bg-[#faf7f2] transition-all min-h-[44px]"
              style={fontBody}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Polling cap reached — surfaced when 30 minutes elapsed without
            confirmation. The customer may regenerate the code below. */}
        {pollExpiredError && (
          <div role="alert" className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-800" style={fontBody}>
                {pollExpiredError}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={creating}
              className="confirm-btn w-full py-3.5 text-white rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
              style={fontBody}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-semibold tracking-wide">
                    Gerar novo código
                  </span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Risk analysis state — defensive: PIX rarely triggers this, but
            if it does we replace the QR with the calmer review panel. */}
        {session && isRiskAnalysis && (
          <div role="status" aria-live="polite" className="space-y-4 pt-2">
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-amber-50/70 border border-amber-200/70 flex items-center justify-center shadow-[0_2px_10px_-2px_rgba(184,149,106,0.25)]">
                <Loader2 className="h-6 w-6 text-amber-600 animate-spin" />
              </div>
            </div>
            <p
              className="text-center text-[13px] text-[#7a6552] leading-relaxed px-2"
              style={fontBody}
            >
              Estamos verificando seu pagamento com o sistema antifraude. Isso
              pode levar alguns minutos. Você pode fechar esta página — vamos
              te avisar.
            </p>
            <div
              className="flex items-center justify-center gap-2 pt-1"
              aria-hidden="true"
            >
              <span className="h-px w-6 bg-[#d4c4a8]/50" />
              <p
                className="text-[10px] text-[#a89b8a] tracking-[0.22em] uppercase"
                style={fontBody}
              >
                Aguardando confirmação
              </p>
              <span className="h-px w-6 bg-[#d4c4a8]/50" />
            </div>
          </div>
        )}

        {/* Active session */}
        {session && !isRiskAnalysis && !expired && session.status !== 'CONFIRMED' && (
          <>
            {/* QR — framed like a polaroid pinned to the page */}
            {session.qrCodeBase64 && (
              <div className="flex flex-col items-center pt-2">
                <div className="qr-frame">
                  <div className="bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${session.qrCodeBase64}`}
                      alt="QR Code PIX"
                      width={224}
                      height={224}
                      className="block w-56 h-56"
                    />
                  </div>
                  {/* Hand-written caption under the polaroid image */}
                  <p
                    className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-[#a89b8a] tracking-[0.28em] uppercase"
                    style={fontBody}
                  >
                    PIX · Momento Cake
                  </p>
                </div>

                {/* Hourglass countdown */}
                {expiresAtMs !== null && !Number.isNaN(expiresAtMs) && (
                  <div className="mt-4 flex items-center gap-2">
                    <Hourglass
                      className="w-3.5 h-3.5 text-[#b8956a] animate-hourglass"
                      strokeWidth={1.6}
                    />
                    <p
                      className="text-[11px] text-[#8b7e6e] tabular-nums tracking-[0.2em] uppercase"
                      style={fontBody}
                    >
                      Expira em {formatCountdown(expiresAtMs - now)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tear-off "ou copie o código" divider */}
            {session.copyPaste && (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 pt-2"
                  aria-hidden="true"
                >
                  <div className="flex-1 border-t border-dashed border-[#d4c4a8]/55" />
                  <span
                    className="text-[10px] text-[#a89b8a] tracking-[0.32em] uppercase"
                    style={fontBody}
                  >
                    ou copie o código
                  </span>
                  <div className="flex-1 border-t border-dashed border-[#d4c4a8]/55" />
                </div>

                {/* Code presented like a tear-off receipt strip */}
                <div className="bg-[#faf7f2] rounded-xl p-4 border border-[#d4c4a8]/30 relative">
                  <p
                    data-testid="pix-copy-paste"
                    className="text-[11px] text-[#5c4a2e] font-mono break-all leading-relaxed select-all"
                  >
                    {session.copyPaste}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="confirm-btn w-full py-3.5 text-white rounded-2xl flex items-center justify-center gap-2.5 min-h-[48px]"
                  style={fontBody}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-sm font-semibold tracking-wide">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-sm font-semibold tracking-wide">
                        Copiar código
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Calm instructions */}
            <div className="bg-[#faf7f2] rounded-xl p-4 border border-[#d4c4a8]/20">
              <p
                className="text-[12px] text-[#5c4a2e] leading-relaxed"
                style={fontBody}
              >
                Abra o app do seu banco, escolha{' '}
                <span className="font-medium text-[#8b7355]">PIX › Ler QR code</span>,
                ou cole o código copiado. Vamos avisar aqui mesmo assim que o
                pagamento chegar.
              </p>
            </div>

            {/* Polling indicator — soft, calm */}
            <div
              className="flex items-center justify-center gap-2 text-[11px] text-[#a89b8a] tracking-[0.18em] uppercase pt-1"
              style={fontBody}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#b8956a] animate-gentle-pulse" />
              <span>Aguardando pagamento</span>
            </div>
          </>
        )}

        {/* Expired state */}
        {session && expired && !isRiskAnalysis && session.status !== 'CONFIRMED' && (
          <div className="space-y-3">
            <div
              role="alert"
              className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-800" style={fontBody}>
                Este código PIX expirou. Vamos preparar um novinho para você.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={creating}
              className="confirm-btn w-full py-3.5 text-white rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
              style={fontBody}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm font-semibold tracking-wide">
                    Gerar novo código
                  </span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
