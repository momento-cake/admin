import { cn } from '@/lib/utils'
import {
  STATUS_PAGAMENTO_LABELS,
  type StatusPagamento,
} from '@/types/pedido'

const THEME: Record<StatusPagamento, { wrapper: string; dot: string }> = {
  PAGO: {
    wrapper: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  PARCIAL: {
    wrapper: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  VENCIDO: {
    wrapper: 'bg-rose-50 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
  },
  PENDENTE: {
    wrapper: 'bg-stone-100 text-stone-700 ring-stone-200',
    dot: 'bg-stone-400',
  },
}

interface PaymentStatusBadgeProps {
  status: StatusPagamento | null | undefined
  hideWhenPendente?: boolean
  className?: string
}

export function PaymentStatusBadge({
  status,
  hideWhenPendente = false,
  className,
}: PaymentStatusBadgeProps) {
  const resolved: StatusPagamento = status ?? 'PENDENTE'
  if (resolved === 'PENDENTE' && hideWhenPendente) return null
  const theme = THEME[resolved]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1',
        theme.wrapper,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
      {STATUS_PAGAMENTO_LABELS[resolved]}
    </span>
  )
}
