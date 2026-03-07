'use client'

import { Badge } from '@/components/ui/badge'
import { PedidoStatus, PEDIDO_STATUS_LABELS } from '@/types/pedido'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<PedidoStatus, string> = {
  RASCUNHO: 'bg-gray-100 text-gray-800 border-gray-200',
  AGUARDANDO_APROVACAO: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CONFIRMADO: 'bg-blue-100 text-blue-800 border-blue-200',
  EM_PRODUCAO: 'bg-purple-100 text-purple-800 border-purple-200',
  PRONTO: 'bg-green-100 text-green-800 border-green-200',
  ENTREGUE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELADO: 'bg-red-100 text-red-800 border-red-200',
}

interface PedidoStatusBadgeProps {
  status: PedidoStatus
  className?: string
}

export function PedidoStatusBadge({ status, className }: PedidoStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_COLORS[status], className)}
    >
      {PEDIDO_STATUS_LABELS[status]}
    </Badge>
  )
}
