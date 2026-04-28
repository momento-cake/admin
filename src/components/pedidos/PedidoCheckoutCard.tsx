'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Lock,
  Mail,
  Phone,
  User2,
  ExternalLink,
  RefreshCcw,
  Timer,
  ShieldCheck,
  CircleDot,
  Globe,
} from 'lucide-react'
import type { Pedido } from '@/types/pedido'
import type {
  NormalizedChargeStatus,
  PaymentMethod,
} from '@/lib/payments/types'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'
import { ShareOrderButton } from './ShareOrderButton'

interface PedidoCheckoutCardProps {
  pedido: Pedido
}

const METHOD_LABELS: Record<PaymentMethod, string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
}

interface ChargeStatusTheme {
  label: string
  dot: string
  bg: string
  ring: string
  text: string
}

const CHARGE_STATUS_THEME: Record<NormalizedChargeStatus, ChargeStatusTheme> = {
  PENDING: {
    label: 'Aguardando',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-800',
  },
  CONFIRMED: {
    label: 'Confirmado',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-800',
  },
  FAILED: {
    label: 'Falhou',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    text: 'text-rose-800',
  },
  EXPIRED: {
    label: 'Expirou',
    dot: 'bg-stone-500',
    bg: 'bg-stone-100',
    ring: 'ring-stone-200',
    text: 'text-stone-700',
  },
  REFUNDED: {
    label: 'Estornado',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    text: 'text-sky-800',
  },
  PARTIALLY_REFUNDED: {
    label: 'Estorno parcial',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50',
    ring: 'ring-sky-200',
    text: 'text-sky-800',
  },
  PENDING_RISK_ANALYSIS: {
    label: 'Em análise antifraude',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-800',
  },
  CHARGEBACK_REQUESTED: {
    label: 'Chargeback solicitado',
    dot: 'bg-rose-600',
    bg: 'bg-rose-50',
    ring: 'ring-rose-300',
    text: 'text-rose-900',
  },
  CHARGEBACK_DISPUTE: {
    label: 'Chargeback em disputa',
    dot: 'bg-rose-600',
    bg: 'bg-rose-50',
    ring: 'ring-rose-300',
    text: 'text-rose-900',
  },
  DELETED: {
    label: 'Cobrança removida',
    dot: 'bg-stone-500',
    bg: 'bg-stone-100',
    ring: 'ring-stone-200',
    text: 'text-stone-700',
  },
}

function parseTimestamp(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value
  const v = value as {
    toDate?: () => Date
    _seconds?: number
    seconds?: number
  }
  if (typeof v.toDate === 'function') return v.toDate()
  if (typeof v._seconds === 'number') return new Date(v._seconds * 1000)
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000)
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function formatDateTime(value: unknown): string {
  const d = parseTimestamp(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function formatRelativeShort(value: unknown, now: number): string {
  const d = parseTimestamp(value)
  if (!d) return '—'
  const diffMs = now - d.getTime()
  const seconds = Math.round(diffMs / 1000)
  if (seconds < 0) {
    // future timestamp — fall back to absolute
    return formatDateTime(value)
  }
  if (seconds < 60) return 'agora há pouco'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 7) return `há ${days} d`
  return formatDateTime(value)
}

function formatCountdown(target: Date | null, now: number): string | null {
  if (!target) return null
  const diff = target.getTime() - now
  if (diff <= 0) return 'expirado'
  const totalSeconds = Math.floor(diff / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours >= 1) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`
}

function maskCpfCnpj(raw: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, '')
  if (digits.length < 4) return null
  // Show only last 2 digits, otherwise treat as opaque/encrypted
  const last2 = digits.slice(-2)
  if (digits.length === 11) {
    return `***.***.***-${last2 === digits.slice(-2) ? last2 : '**'}`
  }
  if (digits.length === 14) {
    return `**.***.***/****-${last2}`
  }
  // Fallback for opaque/ciphertext lengths
  return null
}

function formatPhone(raw?: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D+/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return raw
}

function getAsaasConsoleUrl(chargeId: string): string {
  // Same path on prod & sandbox; the user is logged into the right one.
  return `https://www.asaas.com/payments/${chargeId}`
}

export function PedidoCheckoutCard({ pedido }: PedidoCheckoutCardProps) {
  const { billing, paymentSession, status } = pedido

  // Tick once per second so PIX countdown stays live.
  const [now, setNow] = useState(() => Date.now())
  const expiresAt = useMemo(
    () => parseTimestamp(paymentSession?.expiresAt),
    [paymentSession?.expiresAt],
  )

  useEffect(() => {
    if (!expiresAt) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [expiresAt])

  // Render decision tree
  const hasBilling = !!billing
  const hasSession = !!paymentSession

  // Empty state — only meaningful while we're still waiting on the customer.
  if (!hasBilling && !hasSession) {
    if (status !== 'AGUARDANDO_APROVACAO') return null
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 ring-1 ring-amber-200">
              <Globe className="h-4 w-4 text-amber-700" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">
                Aguardando o cliente confirmar
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                O cliente ainda não abriu o pedido para revisão. Envie o link
                pelo WhatsApp ou copie e compartilhe.
              </p>
            </div>
          </div>
          <ShareOrderButton
            publicToken={pedido.publicToken}
            pedidoStatus={pedido.status}
            clienteNome={pedido.clienteNome}
            numeroPedido={pedido.numeroPedido}
            variant="primary"
          />
        </CardContent>
      </Card>
    )
  }

  const sessionTheme = paymentSession
    ? CHARGE_STATUS_THEME[paymentSession.status]
    : null

  const countdown =
    paymentSession?.method === 'PIX' && paymentSession.status === 'PENDING'
      ? formatCountdown(expiresAt, now)
      : null

  const billingPhone = formatPhone(billing?.telefone)
  const billingMask = billing ? maskCpfCnpj(billing.cpfCnpj) : null

  return (
    <TooltipProvider delayDuration={150}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Autoatendimento
            </CardTitle>
            {paymentSession?.lastWebhookAt && (
              <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <RefreshCcw className="h-3 w-3" aria-hidden />
                Atualizado {formatRelativeShort(
                  paymentSession.lastWebhookAt,
                  now,
                )}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {/* ---------- BILLING ---------- */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Dados de cobrança
            </h3>

            {hasBilling ? (
              <dl className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="sr-only">Nome</dt>
                    <dd className="truncate font-medium">{billing!.nome}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="sr-only">CPF/CNPJ</dt>
                    <dd className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {billingMask ?? 'CPF/CNPJ enviado'}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600 ring-1 ring-inset ring-stone-200"
                            tabIndex={0}
                          >
                            <ShieldCheck className="h-3 w-3" aria-hidden />
                            criptografado
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          Armazenado de forma criptografada. Visível apenas
                          para serviços internos de cobrança e nota fiscal.
                        </TooltipContent>
                      </Tooltip>
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <dt className="sr-only">E-mail</dt>
                    <dd className="truncate text-sm">
                      <a
                        href={`mailto:${billing!.email}`}
                        className="hover:underline"
                      >
                        {billing!.email}
                      </a>
                    </dd>
                  </div>
                </div>

                {billingPhone && (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <dt className="sr-only">Telefone</dt>
                      <dd className="truncate text-sm">{billingPhone}</dd>
                    </div>
                  </div>
                )}

                {billing!.confirmedAt && (
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Confirmado em {formatDateTime(billing!.confirmedAt)}
                  </p>
                )}
              </dl>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                O cliente ainda não preencheu os dados de cobrança.
              </p>
            )}
          </div>

          {/* mobile separator between billing and session columns */}
          <Separator className="md:hidden" />

          {/* ---------- PAYMENT SESSION ---------- */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Sessão de pagamento
            </h3>

            {hasSession && sessionTheme ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                      sessionTheme.bg,
                      sessionTheme.text,
                      sessionTheme.ring,
                    )}
                  >
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full', sessionTheme.dot)}
                      aria-hidden
                    />
                    {sessionTheme.label}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-inset ring-stone-200">
                    {METHOD_LABELS[paymentSession!.method]}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800 ring-1 ring-inset ring-indigo-200">
                    via Asaas
                  </span>
                </div>

                <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Valor</dt>
                  <dd className="font-mono tabular-nums">
                    {formatPrice(paymentSession!.amount)}
                  </dd>

                  <dt className="text-muted-foreground">Criada</dt>
                  <dd className="tabular-nums">
                    {formatDateTime(paymentSession!.createdAt)}
                  </dd>

                  {paymentSession!.lastWebhookAt && (
                    <>
                      <dt className="text-muted-foreground">Webhook</dt>
                      <dd className="tabular-nums">
                        {formatDateTime(paymentSession!.lastWebhookAt)}
                      </dd>
                    </>
                  )}

                  {countdown !== null && (
                    <>
                      <dt className="text-muted-foreground">Expira em</dt>
                      <dd
                        className={cn(
                          'inline-flex items-center gap-1 font-mono tabular-nums',
                          countdown === 'expirado'
                            ? 'text-rose-700'
                            : 'text-amber-800',
                        )}
                      >
                        <Timer className="h-3.5 w-3.5" aria-hidden />
                        {countdown}
                      </dd>
                    </>
                  )}

                  {countdown === null && expiresAt && (
                    <>
                      <dt className="text-muted-foreground">Expira</dt>
                      <dd className="tabular-nums">
                        {formatDateTime(paymentSession!.expiresAt)}
                      </dd>
                    </>
                  )}
                </dl>

                <a
                  href={getAsaasConsoleUrl(paymentSession!.chargeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Ver no Asaas
                </a>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm italic text-muted-foreground">
                <CircleDot className="h-4 w-4" aria-hidden />
                Nenhuma cobrança aberta no momento.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}
