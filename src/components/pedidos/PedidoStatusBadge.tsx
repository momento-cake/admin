'use client'

import { PedidoStatus } from '@/types/pedido'
import { cn } from '@/lib/utils'
import { STATUS_THEME } from './statusTheme'

interface PedidoStatusBadgeProps {
  status: PedidoStatus
  className?: string
}

export function PedidoStatusBadge({ status, className }: PedidoStatusBadgeProps) {
  const theme = STATUS_THEME[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        theme.softBg,
        theme.softText,
        theme.softRing,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} aria-hidden />
      {theme.label}
    </span>
  )
}
