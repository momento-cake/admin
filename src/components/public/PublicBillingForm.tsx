'use client'

import { useState } from 'react'
import { Loader2, Receipt, AlertCircle } from 'lucide-react'
import { formatCpfCnpj, formatPhone } from '@/lib/masks'
import { billingSchema } from '@/lib/validators/billing'

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

const inputClass =
  'w-full px-3.5 py-2.5 text-sm border border-[#d4c4a8]/40 rounded-xl bg-white text-[#2d2319] placeholder:text-[#a89b8a] focus:outline-none focus:ring-2 focus:ring-[#b8956a]/30 focus:border-[#b8956a]/50 transition-all'

const inputClassError =
  'w-full px-3.5 py-2.5 text-sm border border-red-300 rounded-xl bg-white text-[#2d2319] placeholder:text-[#a89b8a] focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400 transition-all'

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
      const json = await response.json().catch(() => ({}))
      if (!response.ok || !json?.success) {
        // Surface field-level errors if backend provided them
        if (json?.details && typeof json.details === 'object') {
          const detailErrors: FieldErrors = {}
          for (const [key, msg] of Object.entries(json.details)) {
            if (typeof msg === 'string') {
              detailErrors[key as keyof FieldErrors] = msg
            }
          }
          if (Object.keys(detailErrors).length > 0) {
            setErrors(detailErrors)
          }
        }
        setTopError(json?.error || 'Não foi possível salvar os dados de cobrança.')
        return
      }
      onConfirmed(json.data.billing as ConfirmedBilling)
    } catch {
      setTopError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="premium-card overflow-hidden" noValidate>
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-4 h-4 text-[#b8956a]" />
          <h3
            className="text-base text-[#2d2319] tracking-wide"
            style={{ ...fontHeading, fontWeight: 600 }}
          >
            Dados de Cobrança
          </h3>
        </div>
        <p
          className="text-[13px] text-[#8b7e6e] mt-2 leading-relaxed"
          style={fontBody}
        >
          Precisamos destes dados para emitir o pagamento.
        </p>
      </div>

      <div className="px-6 pb-6 space-y-4">
        {/* Top error */}
        {topError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-700" style={fontBody}>
              {topError}
            </p>
          </div>
        )}

        {/* Nome */}
        <div>
          <label htmlFor="billing-nome" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            Nome completo
          </label>
          <input
            id="billing-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={errors.nome ? inputClassError : inputClass}
            placeholder="Seu nome"
            autoComplete="name"
            disabled={submitting}
            style={fontBody}
          />
          {errors.nome && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.nome}
            </p>
          )}
        </div>

        {/* CPF/CNPJ */}
        <div>
          <label htmlFor="billing-cpfCnpj" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            CPF ou CNPJ
          </label>
          <input
            id="billing-cpfCnpj"
            type="text"
            inputMode="numeric"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
            className={errors.cpfCnpj ? inputClassError : inputClass}
            placeholder="000.000.000-00"
            autoComplete="off"
            maxLength={18}
            disabled={submitting}
            style={fontBody}
          />
          {errors.cpfCnpj && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.cpfCnpj}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="billing-email" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            E-mail
          </label>
          <input
            id="billing-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errors.email ? inputClassError : inputClass}
            placeholder="email@exemplo.com"
            autoComplete="email"
            disabled={submitting}
            style={fontBody}
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.email}
            </p>
          )}
        </div>

        {/* Telefone */}
        <div>
          <label htmlFor="billing-telefone" className="block text-[13px] font-medium text-[#5c4a2e] mb-1.5" style={fontBody}>
            Telefone <span className="text-[#a89b8a] font-normal">(opcional)</span>
          </label>
          <input
            id="billing-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            className={errors.telefone ? inputClassError : inputClass}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            maxLength={15}
            disabled={submitting}
            style={fontBody}
          />
          {errors.telefone && (
            <p className="text-xs text-red-500 mt-1.5" style={fontBody}>
              {errors.telefone}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="confirm-btn w-full py-4 text-white rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            style={fontBody}
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-base font-semibold tracking-wide">Salvando...</span>
              </>
            ) : (
              <span className="text-base font-semibold tracking-wide">
                Continuar para Pagamento ({formatCurrency(amount)})
              </span>
            )}
          </button>
          <p
            className="text-center text-[11px] text-[#a89b8a] mt-3 tracking-wide"
            style={fontBody}
          >
            Seus dados são usados apenas para emissão da cobrança.
          </p>
        </div>
      </div>
    </form>
  )
}

