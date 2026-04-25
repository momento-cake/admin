'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Copy, Check, QrCode, AlertCircle, RefreshCw } from 'lucide-react'
import type { NormalizedChargeStatus } from '@/lib/payments/types'

const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }

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
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function isUnusableSession(session: ExistingPixSession | null | undefined): boolean {
  if (!session) return true
  if (session.status === 'EXPIRED' || session.status === 'FAILED') return true
  if (!session.pixCopyPaste && !session.pixQrCodeBase64) return true
  return false
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
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const onPaidCalledRef = useRef(false)
  const cancelledRef = useRef(false)
  const pollStartedAtRef = useRef<number | null>(null)

  // Tick clock for countdown
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const createSession = useCallback(async () => {
    if (cancelledRef.current) return
    setCreating(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/public/pedidos/${token}/charge/pix`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )
      const json = await response.json().catch(() => ({}))
      if (cancelledRef.current) return
      if (!response.ok || !json?.success) {
        setError(json?.error || 'Não foi possível gerar o código PIX.')
        return
      }
      const ps = json.data?.paymentSession
      if (!ps) {
        setError('Resposta inválida do servidor.')
        return
      }
      setSession({
        qrCodeBase64: ps.pixQrCodeBase64,
        copyPaste: ps.pixCopyPaste,
        expiresAt: ps.expiresAt,
        status: ps.status as NormalizedChargeStatus,
      })
    } catch {
      if (!cancelledRef.current) {
        setError('Erro de conexão. Tente novamente.')
      }
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
      if (elapsed > POLL_MAX_DURATION_MS) return
      try {
        const response = await fetch(
          `/api/public/pedidos/${token}/payment-status`,
          { method: 'GET' },
        )
        const json = await response.json().catch(() => ({}))
        if (cancelled) return
        if (response.ok && json?.success) {
          const data = json.data
          const psStatus: NormalizedChargeStatus | undefined =
            data?.paymentSession?.status
          if (
            psStatus === 'CONFIRMED' ||
            data?.status === 'CONFIRMADO'
          ) {
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
        }
      } catch {
        // ignore transient network errors
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
      // Fallback: do nothing fancy; user can long-press / select.
    }
  }

  const handleRegenerate = async () => {
    pollStartedAtRef.current = null
    onPaidCalledRef.current = false
    setSession(null)
    await createSession()
  }

  const expiresAtMs = session?.expiresAt ? Date.parse(session.expiresAt) : null
  const expired =
    session?.status === 'EXPIRED' ||
    session?.status === 'FAILED' ||
    (expiresAtMs !== null && !Number.isNaN(expiresAtMs) && expiresAtMs <= now)

  return (
    <div className="premium-card overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <QrCode className="w-4 h-4 text-[#b8956a]" />
          <h3
            className="text-base text-[#2d2319] tracking-wide"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            Pague com PIX
          </h3>
        </div>
        <p
          className="text-[13px] text-[#8b7e6e] mt-2 leading-relaxed"
          style={fontBody}
        >
          Total: <span className="text-[#5c4a2e] font-medium">{formatCurrency(amount)}</span>
        </p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Loading state */}
        {creating && !session && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#b8956a]" />
            <p className="text-sm text-[#8b7e6e]" style={fontBody}>
              Gerando código PIX...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !session && !creating && (
          <div role="alert" className="space-y-3">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-700" style={fontBody}>
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={createSession}
              className="w-full py-3 text-sm font-medium text-[#b8956a] border border-[#b8956a]/30 rounded-xl hover:bg-[#faf7f2] transition-all"
              style={fontBody}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Active session */}
        {session && !expired && session.status !== 'CONFIRMED' && (
          <>
            {/* QR Code */}
            {session.qrCodeBase64 && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white rounded-2xl p-4 border border-[#d4c4a8]/30 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${session.qrCodeBase64}`}
                    alt="QR Code PIX"
                    width={240}
                    height={240}
                    className="block w-60 h-60"
                  />
                </div>
                {expiresAtMs !== null && !Number.isNaN(expiresAtMs) && (
                  <p
                    className="text-[12px] text-[#a89b8a] tabular-nums tracking-wide"
                    style={fontBody}
                  >
                    Expira em {formatCountdown(expiresAtMs - now)}
                  </p>
                )}
              </div>
            )}

            {/* Copy-paste code */}
            {session.copyPaste && (
              <div className="space-y-2">
                <p
                  className="text-[13px] font-medium text-[#5c4a2e]"
                  style={fontBody}
                >
                  Ou copie o código PIX:
                </p>
                <div className="bg-[#faf7f2] rounded-xl p-3 border border-[#d4c4a8]/30">
                  <p
                    data-testid="pix-copy-paste"
                    className="text-[11px] text-[#5c4a2e] font-mono break-all leading-relaxed"
                  >
                    {session.copyPaste}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#b8956a] to-[#c9a96e] rounded-xl hover:from-[#a68559] hover:to-[#b8956a] transition-all shadow-sm flex items-center justify-center gap-2"
                  style={fontBody}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar código
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-[#faf7f2] rounded-xl p-4 border border-[#d4c4a8]/20">
              <p
                className="text-[12px] text-[#5c4a2e] leading-relaxed"
                style={fontBody}
              >
                Abra o app do seu banco, escolha PIX &gt; Ler QR code, ou cole o
                código copiado. O pedido será atualizado automaticamente assim
                que o pagamento for identificado.
              </p>
            </div>

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-[12px] text-[#a89b8a]" style={fontBody}>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Aguardando pagamento...</span>
            </div>
          </>
        )}

        {/* Expired state */}
        {session && expired && session.status !== 'CONFIRMED' && (
          <div className="space-y-3">
            <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-amber-800" style={fontBody}>
                Este código PIX expirou. Gere um novo para continuar.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={creating}
              className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-[#b8956a] to-[#c9a96e] rounded-xl hover:from-[#a68559] hover:to-[#b8956a] disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              style={fontBody}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Gerar novo código
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
