'use client'

import Link from 'next/link'
import { Cake } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMesLabel } from '@/lib/mesversario-utils'

interface MesversarioBadgeProps {
  mesversarioId: string
  mesNumero?: number
  className?: string
}

/**
 * Small badge shown on the Pedidos screens when an order belongs to a
 * mesversário milestone. Links back to the journey. Styled to match
 * `PedidoStatusBadge` (soft pill + ring), using the indigo tone the timeline
 * already uses for PEDIDO_CRIADO.
 */
export function MesversarioBadge({ mesversarioId, mesNumero, className }: MesversarioBadgeProps) {
  return (
    <Link
      href={`/orders/mesversarios/${mesversarioId}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        'bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100 transition-colors',
        className,
      )}
    >
      <Cake className="h-3 w-3" aria-hidden />
      Mesversário{typeof mesNumero === 'number' ? ` · ${getMesLabel(mesNumero)}` : ''}
    </Link>
  )
}
