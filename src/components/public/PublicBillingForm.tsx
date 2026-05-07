'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { formatCpfCnpj, formatPhone } from '@/lib/masks'
import { billingSchema } from '@/lib/validators/billing'
import {
  ApiError,
  describeError,
  logError,
  parseApiResponse,
} from '@/lib/error-handler'

const fontBody = { fontFamily: 'var(--font-dm-sans), system-ui, sans-serif' }
const fontHeading = { fontFamily: 'var(--font-playfair), Georgia, serif' }

export interface ConfirmedBilling {
  nome: string
  cpfCnpj: string
  email: string
  telefone?: string
  confirmedAt?: string
}

interface PublicBillingFormProps {
  token: string
  initial: { nome: string; cpfCnpj?: string; email?: string; telefone?: string }
  amount: number
  onConfirmed: (billing: ConfirmedBilling) => void
}

interface FieldErrors {
  nome?: string
  cpfCnpj?: string
  email?: string
  telefone?: string
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/**
 * Stationery-style crest used at the top of each checkout card.
 * A tiny ornament + a small caption, sitting above the title — gives the form
 * the feel of a guestbook page or a tasting menu rather than a tax form.
 */
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
        {/* tiny gold dot accent */}
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

export function PublicBillingForm({
  token,
  initial,
  amount,
  onConfirmed,
}: PublicBillingFormProps) {
  const [nome, setNome] = useState(initial.nome ?? '')
  const [cpfCnpj, setCpfCnpj] = useState(formatCpfCnpj(initial.cpfCnpj ?? ''))
  const [email, setEmail] = useState(initial.email ?? '')
  const [telefone, setTelefone] = useState(formatPhone(initial.telefone ?? ''))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [topError, setTopError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setTopError(null)
    setErrors({})

    const parsed = billingSchema.safeParse({
      nome,
      cpfCnpj,
      email,
      telefone,
    })

    if (!parsed.success) {
      const fieldErrors: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(
        `/api/public/pedidos/${token}/billing`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: parsed.data.nome,
            cpfCnpj: parsed.data.cpfCnpj,
            email: parsed.data.email,
            telefone: parsed.data.telefone || undefined,
          }),
        },
      )
      const data = await parseApiResponse<{ billing: ConfirmedBilling }>(
        response,
      )
      onConfirmed(data.billing)
    } catch (err) {
      logError('PublicBillingForm.submit', err)
      if (err instanceof ApiError) {
        const details = err.details
        // The billing API may return validation details either as a Zod array
        // ([{ field, message }]) or as an object map ({ field: message }).
        // Map both to the per-field error UI; otherwise fall back to a toast-
        // style top message.
        if (Array.isArray(details)) {
          const detailErrors: FieldErrors = {}
          for (const entry of details) {
            if (
              entry &&
              typeof entry === 'object' &&
              typeof (entry as { field?: unknown }).field === 'string' &&
              typeof (entry as { message?: unknown }).message === 'string'
            ) {
              const field = (entry as { field: string }).field as keyof FieldErrors
              const message = (entry as { message: string }).message
              if (field && !detailErrors[field]) detailErrors[field] = message
            }
          }
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors)
          }
        } else if (details && typeof details === 'object') {
          const detailErrors: FieldErrors = {}
          for (const [key, msg] of Object.entries(
            details as Record<string, unknown>,
          )) {
            if (typeof msg === 'string') {
              detailErrors[key as keyof FieldErrors] = msg
            }
          }
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors)
          }
        }
        setTopError(
          err.message || 'Não foi possível salvar os dados de cobrança.',
        )
      } else {
        // Non-ApiError reaching here is almost always a connectivity failure
        // (fetch rejected with TypeError, DNS, AbortSignal timeout, etc.).
        // Show the standard pt-BR connectivity message instead of a raw
        // error.message, which is rarely user-friendly.
        setTopError(
          'Erro de conexão. Verifique sua internet e tente novamente.',
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Hairline ornament under the crest — pulled from PublicPedidoView's vocabulary.
  const Hairline = () => (
    <div
      className="flex items-center justify-center gap-2 px-6 -mt-1 pb-4"
      aria-hidden="true"
    >
      <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4c4a8]/60" />
      <div className="w-1 h-1 rounded-full bg-[#c9a96e]/70" />
      <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4c4a8]/60" />
    </div>
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="premium-card overflow-hidden animate-page-turn"
      noValidate
    >
      <CardCrest caption="Dados de Cobrança" monogram="✎" />

      <div className="px-6">
        <h3
          className="text-center text-[22px] text-[#2d2319] leading-tight"
          style={{ ...fontHeading, fontWeight: 600 }}
        >
          Quase lá
        </h3>
        <p
          className="text-center text-[13px] text-[#8b7e6e] mt-1.5 leading-relaxed"
          style={fontBody}
        >
          Precisamos destes dados para emitir a sua cobrança.
        </p>
      </div>

      <Hairline />

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

        {/* Floating-label fields */}
        <div className="relative">
          <input
            id="billing-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={`gilded-input ${errors.nome ? 'has-error' : ''} ${nome ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="name"
            disabled={submitting}
            style={fontBody}
          />
          <label
            htmlFor="billing-nome"
            className="gilded-label"
            style={fontBody}
          >
            Nome completo
          </label>
          {errors.nome && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.nome}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id="billing-cpfCnpj"
            type="text"
            inputMode="numeric"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
            className={`gilded-input tabular-nums ${errors.cpfCnpj ? 'has-error' : ''} ${cpfCnpj ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="off"
            maxLength={18}
            disabled={submitting}
            style={fontBody}
          />
          <label
            htmlFor="billing-cpfCnpj"
            className="gilded-label"
            style={fontBody}
          >
            CPF ou CNPJ
          </label>
          {errors.cpfCnpj && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.cpfCnpj}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id="billing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`gilded-input ${errors.email ? 'has-error' : ''} ${email ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="email"
            inputMode="email"
            disabled={submitting}
            style={fontBody}
          />
          <label
            htmlFor="billing-email"
            className="gilded-label"
            style={fontBody}
          >
            E-mail
          </label>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.email}
            </p>
          )}
        </div>

        <div className="relative">
          <input
            id="billing-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            className={`gilded-input tabular-nums ${errors.telefone ? 'has-error' : ''} ${telefone ? 'is-filled' : ''}`}
            placeholder=" "
            autoComplete="tel"
            inputMode="tel"
            maxLength={15}
            disabled={submitting}
            style={fontBody}
          />
          <label
            htmlFor="billing-telefone"
            className="gilded-label"
            style={fontBody}
          >
            Telefone <span className="lowercase tracking-normal">(opcional)</span>
          </label>
          {errors.telefone && (
            <p className="text-xs text-red-500 mt-1.5 ml-1" style={fontBody}>
              {errors.telefone}
            </p>
          )}
        </div>

        {/* Amount preview pill */}
        <div className="amount-glow rounded-2xl px-5 py-3.5 flex items-baseline justify-between border border-[#d4c4a8]/30">
          <span
            className="text-[11px] text-[#8b7e6e] tracking-[0.22em] uppercase"
            style={fontBody}
          >
            A pagar
          </span>
          <span
            className="text-xl tabular-nums gold-shimmer"
            style={{ ...fontHeading, fontWeight: 700 }}
          >
            {formatCurrency(amount)}
          </span>
        </div>

        {/* Submit */}
        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="confirm-btn w-full py-4 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 min-h-[48px]"
            style={fontBody}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">Salvando...</span>
              </>
            ) : (
              <>
                <span className="text-base font-semibold tracking-wide">
                  Continuar para Pagamento
                </span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-2 mt-3.5">
            <span className="h-px w-6 bg-[#d4c4a8]/50" />
            <p
              className="text-[10px] text-[#a89b8a] tracking-[0.22em] uppercase"
              style={fontBody}
            >
              feito com carinho
            </p>
            <span className="h-px w-6 bg-[#d4c4a8]/50" />
          </div>
          <p
            className="text-center text-[11px] text-[#a89b8a] mt-2 leading-relaxed px-4"
            style={fontBody}
          >
            Seus dados são usados apenas para emissão da cobrança.
          </p>
        </div>
      </div>
    </form>
  )
}
