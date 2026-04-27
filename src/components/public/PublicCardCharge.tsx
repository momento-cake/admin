'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { formatCardNumber } from '@/lib/masks'
import type { BillingInfo, NormalizedChargeStatus } from '@/lib/payments/types'

const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }

const POLL_INTERVAL_MS = 3000
const POLL_MAX_DURATION_MS = 30 * 60 * 1000

interface PublicCardChargeProps {
  token: string
  billing: BillingInfo
  amount: number
  onPaid: () => void
}

interface CardFieldErrors {
  number?: string
  holderName?: string
  expiryMonth?: string
  expiryYear?: string
  cvv?: string
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, '0'),
)

function buildYearOptions(): string[] {
  const current = new Date().getFullYear()
  return Array.from({ length: 16 }, (_, i) => String(current + i))
}

function validateCardLocal(input: {
  number: string
  holderName: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}): CardFieldErrors {
  const errors: CardFieldErrors = {}
  const digits = input.number.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) {
    errors.number = 'Número de cartão inválido'
  }
  if (input.holderName.trim().length < 2) {
    errors.holderName = 'Nome no cartão é obrigatório'
  }
  if (!/^(0[1-9]|1[0-2])$/.test(input.expiryMonth)) {
    errors.expiryMonth = 'Mês inválido'
  }
  if (!/^\d{4}$/.test(input.expiryYear)) {
    errors.expiryYear = 'Ano inválido'
  }
  if (!/^\d{3,4}$/.test(input.cvv)) {
    errors.cvv = 'CVV inválido'
  }
  return errors
}

function CardCrest({ caption, monogram }: { caption: string; monogram: string }) {
  return (
    <div className="flex flex-col items-center text-center pt-7 pb-4 px-6">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border border-[#d4c4a8]/50 flex items-center justify-center bg-gradient-to-b from-[#fffdf8] to-[#faf3e6] shadow-[0_2px_8px_-2px_rgba(184,149,106,0.25)]">
          <span
            className="text-[#8b7355] text-lg leading-none"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            {monogram}
          </span>
        </div>
        <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-[#e8c87a] shadow-[0_0_0_2px_#fff]" />
      </div>
      <p
        className="mt-3 text-[10px] text-[#a89b8a] tracking-[0.32em] uppercase"
        style={fontBody}
      >
        {caption}
      </p>
    </div>
  )
}

export function PublicCardCharge({
  token,
  billing,
  amount,
  onPaid,
}: PublicCardChargeProps) {
  // Note: `billing` is included in props for future provider context;
  // the backend resolves it from the pedido itself.
  void billing

  const [number, setNumber] = useState('')
  const [holderName, setHolderName] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [errors, setErrors] = useState<CardFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [pendingPolling, setPendingPolling] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)

  const onPaidCalledRef = useRef(false)
  const pollStartedAtRef = useRef<number | null>(null)

  // Polling fallback for PENDING card charges
  useEffect(() => {
    if (!pendingPolling) return
    let cancelled = false
    pollStartedAtRef.current = pollStartedAtRef.current ?? Date.now()

    const tick = async () => {
      if (cancelled) return
      const elapsed = Date.now() - (pollStartedAtRef.current ?? Date.now())
      if (elapsed > POLL_MAX_DURATION_MS) {
        if (!cancelled) {
          setPendingPolling(false)
          setTopError('Não recebemos confirmação do pagamento. Tente novamente.')
        }
        return
      }
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
          if (psStatus === 'CONFIRMED' || data?.status === 'CONFIRMADO') {
            if (!onPaidCalledRef.current) {
              onPaidCalledRef.current = true
              onPaid()
            }
            setPendingPolling(false)
            return
          }
          if (psStatus === 'FAILED') {
            setPendingPolling(false)
            setTopError('Pagamento recusado. Tente outro cartão.')
            return
          }
        }
      } catch {
        // ignore transient errors
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
  }, [pendingPolling, token, onPaid])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || pendingPolling) return

    setTopError(null)

    const localErrors = validateCardLocal({
      number,
      holderName,
      expiryMonth,
      expiryYear,
      cvv,
    })
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors)
      return
    }
    setErrors({})

    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/public/pedidos/${token}/charge/card`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card: {
              number: number.replace(/\s+/g, ''),
              holderName: holderName.trim(),
              expiryMonth,
              expiryYear,
              cvv,
            },
          }),
        },
      )
      const json = await response.json().catch(() => ({}))

      if (response.status === 402 || json?.error === 'CARD_DECLINED') {
        setTopError(
          json?.error && typeof json.error === 'string' && json.error !== 'CARD_DECLINED'
            ? json.error
            : 'Pagamento recusado pela operadora. Verifique os dados ou use outro cartão.',
        )
        return
      }

      if (!response.ok || !json?.success) {
        if (json?.details && typeof json.details === 'object') {
          const detailErrors: CardFieldErrors = {}
          for (const [key, msg] of Object.entries(json.details)) {
            if (typeof msg === 'string') {
              detailErrors[key as keyof CardFieldErrors] = msg
            }
          }
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors)
          }
        }
        setTopError(json?.error || 'Não foi possível processar o pagamento.')
        return
      }

      if (json.data?.immediatelyConfirmed) {
        if (!onPaidCalledRef.current) {
          onPaidCalledRef.current = true
          onPaid()
        }
        return
      }

      // Pending status -> start polling
      setPendingPolling(true)
    } catch {
      setTopError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const yearOptions = buildYearOptions()
  const lastFour = number.replace(/\D/g, '').slice(-4)
  // Brand sniff: very simple heuristic for the placeholder card visual
  const firstDigit = number.replace(/\D/g, '')[0]
  const brandLetter =
    firstDigit === '4' ? 'V' : firstDigit === '5' ? 'M' : firstDigit === '3' ? 'A' : '◈'

  return (
    <form
      onSubmit={handleSubmit}
      className="premium-card overflow-hidden animate-page-turn"
      noValidate
    >
      <CardCrest caption="Cartão de Crédito" monogram="✦" />

      <div className="px-6">
        <h3
          className="text-center text-[22px] text-[#2d2319] leading-tight"
          style={{ ...fontHeading, fontWeight: 600 }}
        >
          Pagamento no cartão
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

      {/* Card visual preview — gives the form a tactile anchor */}
      <div className="px-6 mt-5">
        <div
          className="relative w-full h-32 rounded-2xl overflow-hidden border border-[#d4c4a8]/40 shadow-[0_4px_16px_-6px_rgba(45,35,25,0.18)]"
          style={{
            background:
              'linear-gradient(135deg, #faf3e6 0%, #f5e9d2 35%, #e8c87a 100%)',
          }}
          aria-hidden="true"
        >
          {/* subtle grain */}
          <div className="absolute inset-0 paper-grain opacity-60" />
          {/* gold disc */}
          <div className="absolute top-4 left-5 w-9 h-7 rounded-md bg-gradient-to-br from-[#e8c87a] to-[#b8956a] border border-[#a68559]/40 shadow-inner" />
          {/* brand mark */}
          <div className="absolute top-4 right-5 text-[#5c4a2e]/70 text-base tracking-widest font-semibold" style={fontHeading}>
            {brandLetter}
          </div>
          <div
            className="absolute bottom-9 left-5 right-5 text-[#5c4a2e] tracking-[0.28em] tabular-nums text-sm"
            style={fontBody}
          >
            •••• •••• •••• {lastFour ? lastFour.padStart(4, '•') : '••••'}
          </div>
          <div
            className="absolute bottom-3 left-5 text-[10px] text-[#5c4a2e]/70 tracking-[0.2em] uppercase truncate max-w-[60%]"
            style={fontBody}
          >
            {holderName || 'Nome no cartão'}
          </div>
          <div
            className="absolute bottom-3 right-5 text-[10px] text-[#5c4a2e]/70 tracking-[0.2em] tabular-nums"
            style={fontBody}
          >
            {expiryMonth || 'MM'}/{expiryYear ? expiryYear.slice(-2) : 'AA'}
          </div>
        </div>
      </div>

      {/* Hairline */}
      <div
        className="flex items-center justify-center gap-2 px-6 mt-5 pb-2"
        aria-hidden="true"
      >
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4c4a8]/60" />
        <div className="w-1 h-1 rounded-full bg-[#c9a96e]/70" />
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4c4a8]/60" />
      </div>

      <div className="px-6 pb-6 space-y-4">
        {topError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-700" style={fontBody}>
              {topError}
            </p>
          </div>
        )}

        {/* Pending polling banner */}
        {pendingPolling && (
          <div
            role="status"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200"
          >
            <Loader2 className="h-4 w-4 text-amber-600 flex-shrink-0 animate-spin" />
            <p className="text-[13px] text-amber-800" style={fontBody}>
              Processando pagamento... aguarde a confirmação.
            </p>
          </div>
        )}

        {/* Card number */}
        <div className="relative">
          <input
            id="card-number"
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            className={`gilded-input tabular-nums tracking-[0.12em] ${errors.number ? 'has-error' : ''} ${number ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="cc-number"
            maxLength={23}
            disabled={submitting || pendingPolling}
            style={fontBody}
          />
          <label htmlFor="card-number" className="gilded-label" style={fontBody}>
            Número do cartão
          </label>
          {errors.number && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.number}
            </p>
          )}
        </div>

        {/* Holder name */}
        <div className="relative">
          <input
            id="card-holder"
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value.toUpperCase())}
            className={`gilded-input ${errors.holderName ? 'has-error' : ''} ${holderName ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="cc-name"
            disabled={submitting || pendingPolling}
            style={fontBody}
          />
          <label htmlFor="card-holder" className="gilded-label" style={fontBody}>
            Nome impresso no cartão
          </label>
          {errors.holderName && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.holderName}
            </p>
          )}
        </div>

        {/* Expiry + CVV */}
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <select
              id="card-month"
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              className={`gilded-input tabular-nums appearance-none pr-7 ${errors.expiryMonth ? 'has-error' : ''} ${expiryMonth ? 'is-filled' : ''}`}
              autoComplete="cc-exp-month"
              disabled={submitting || pendingPolling}
              style={fontBody}
            >
              <option value=""> </option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="card-month" className="gilded-label" style={fontBody}>
              Mês
            </label>
            {errors.expiryMonth && (
              <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
                {errors.expiryMonth}
              </p>
            )}
          </div>
          <div className="relative">
            <select
              id="card-year"
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
              className={`gilded-input tabular-nums appearance-none pr-7 ${errors.expiryYear ? 'has-error' : ''} ${expiryYear ? 'is-filled' : ''}`}
              autoComplete="cc-exp-year"
              disabled={submitting || pendingPolling}
              style={fontBody}
            >
              <option value=""> </option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <label htmlFor="card-year" className="gilded-label" style={fontBody}>
              Ano
            </label>
            {errors.expiryYear && (
              <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
                {errors.expiryYear}
              </p>
            )}
          </div>
          <div className="relative">
            <input
              id="card-cvv"
              type="text"
              inputMode="numeric"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={`gilded-input tabular-nums ${errors.cvv ? 'has-error' : ''} ${cvv ? 'is-filled' : ''}`}
              placeholder=" "
              autoComplete="cc-csc"
              maxLength={4}
              disabled={submitting || pendingPolling}
              style={fontBody}
            />
            <label htmlFor="card-cvv" className="gilded-label" style={fontBody}>
              CVV
            </label>
            {errors.cvv && (
              <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
                {errors.cvv}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || pendingPolling}
            className="confirm-btn w-full py-4 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 min-h-[48px]"
            style={fontBody}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">
                  Processando...
                </span>
              </>
            ) : pendingPolling ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">
                  Aguardando confirmação...
                </span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="text-base font-semibold tracking-wide">
                  Pagar {formatCurrency(amount)}
                </span>
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2 mt-3.5">
            <span className="h-px w-6 bg-[#d4c4a8]/50" />
            <p
              className="text-[10px] text-[#a89b8a] tracking-[0.22em] uppercase"
              style={fontBody}
            >
              pagamento confiável
            </p>
            <span className="h-px w-6 bg-[#d4c4a8]/50" />
          </div>
          <p
            className="text-center text-[11px] text-[#a89b8a] mt-2 leading-relaxed px-4"
            style={fontBody}
          >
            Conexão criptografada. Não armazenamos os dados do cartão.
          </p>
        </div>
      </div>
    </form>
  )
}
