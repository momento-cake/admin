'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, CreditCard, AlertCircle, Lock } from 'lucide-react'
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

const inputClass =
  'w-full px-3.5 py-2.5 text-sm border border-[#d4c4a8]/40 rounded-xl bg-white text-[#2d2319] placeholder:text-[#a89b8a] focus:outline-none focus:ring-2 focus:ring-[#b8956a]/30 focus:border-[#b8956a]/50 transition-all'

const inputClassError =
  'w-full px-3.5 py-2.5 text-sm border border-red-300 rounded-xl bg-white text-[#2d2319] placeholder:text-[#a89b8a] focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400 transition-all'

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

  return (
    <form onSubmit={handleSubmit} className="premium-card overflow-hidden" noValidate>
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <CreditCard className="w-4 h-4 text-[#b8956a]" />
          <h3
            className="text-base text-[#2d2319] tracking-wide"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            Cartão de Crédito
          </h3>
        </div>
        <p className="text-[13px] text-[#8b7e6e] mt-2 leading-relaxed" style={fontBody}>
          Total: <span className="text-[#5c4a2e] font-medium">{formatCurrency(amount)}</span>
        </p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {topError && (
          <div role="alert" className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-700" style={fontBody}>
              {topError}
            </p>
          </div>
        )}

        {/* Pending polling banner */}
        {pendingPolling && (
          <div role="status" className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Loader2 className="h-4 w-4 text-amber-600 flex-shrink-0 animate-spin" />
            <p className="text-[13px] text-amber-800" style={fontBody}>
              Processando pagamento... aguarde a confirmação.
            </p>
          </div>
        )}

        {/* Card number */}
        <div>
          <label htmlFor="card-number" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            Número do cartão
          </label>
          <input
            id="card-number"
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            className={errors.number ? inputClassError : inputClass}
            placeholder="0000 0000 0000 0000"
            autoComplete="cc-number"
            maxLength={23}
            disabled={submitting || pendingPolling}
            style={fontBody}
          />
          {errors.number && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.number}
            </p>
          )}
        </div>

        {/* Holder name */}
        <div>
          <label htmlFor="card-holder" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            Nome impresso no cartão
          </label>
          <input
            id="card-holder"
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value.toUpperCase())}
            className={errors.holderName ? inputClassError : inputClass}
            placeholder="NOME COMO ESTÁ NO CARTÃO"
            autoComplete="cc-name"
            disabled={submitting || pendingPolling}
            style={fontBody}
          />
          {errors.holderName && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.holderName}
            </p>
          )}
        </div>

        {/* Expiry + CVV */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="card-month" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
              Mês
            </label>
            <select
              id="card-month"
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              className={errors.expiryMonth ? inputClassError : inputClass}
              autoComplete="cc-exp-month"
              disabled={submitting || pendingPolling}
              style={fontBody}
            >
              <option value="">MM</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.expiryMonth && (
              <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
                {errors.expiryMonth}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="card-year" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
              Ano
            </label>
            <select
              id="card-year"
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
              className={errors.expiryYear ? inputClassError : inputClass}
              autoComplete="cc-exp-year"
              disabled={submitting || pendingPolling}
              style={fontBody}
            >
              <option value="">AAAA</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {errors.expiryYear && (
              <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
                {errors.expiryYear}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="card-cvv" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
              CVV
            </label>
            <input
              id="card-cvv"
              type="text"
              inputMode="numeric"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={errors.cvv ? inputClassError : inputClass}
              placeholder="123"
              autoComplete="cc-csc"
              maxLength={4}
              disabled={submitting || pendingPolling}
              style={fontBody}
            />
            {errors.cvv && (
              <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
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
            className="confirm-btn w-full py-4 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            style={fontBody}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">Processando...</span>
              </>
            ) : pendingPolling ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">Aguardando confirmação...</span>
              </>
            ) : (
              <span className="text-base font-semibold tracking-wide">
                Pagar {formatCurrency(amount)}
              </span>
            )}
          </button>
          <p
            className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[#a89b8a] mt-3 tracking-wide"
            style={fontBody}
          >
            <Lock className="h-3 w-3" />
            Conexão segura. Não armazenamos os dados do cartão.
          </p>
        </div>
      </div>
    </form>
  )
}
