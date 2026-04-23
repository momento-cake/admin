'use client'

import { Pedido } from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'
import { Calendar, GripVertical, Package2, Phone, Truck, Store } from 'lucide-react'
import { STATUS_THEME } from './statusTheme'

interface KanbanCardProps {
  pedido: Pedido
  isDragging?: boolean
  isUpdating?: boolean
  disabled?: boolean
  onClick?: (pedido: Pedido) => void
  onDragStart: (e: React.DragEvent<HTMLElement>, pedido: Pedido) => void
  onDragEnd: (e: React.DragEvent<HTMLElement>) => void
}

function activeTotal(p: Pedido): number {
  return p.orcamentos.find((o) => o.isAtivo)?.total ?? 0
}

function activeItemCount(p: Pedido): number {
  const active = p.orcamentos.find((o) => o.isAtivo)
  return active?.itens.reduce((sum, it) => sum + (it.quantidade || 0), 0) ?? 0
}

function formatDate(ts: unknown): string | null {
  if (!ts) return null
  let date: Date
  const v = ts as { toDate?: () => Date; _seconds?: number }
  if (typeof v === 'object' && v && 'toDate' in v && typeof v.toDate === 'function') {
    date = v.toDate()
  } else if (typeof v === 'object' && v && '_seconds' in v && typeof v._seconds === 'number') {
    date = new Date(v._seconds * 1000)
  } else {
    date = new Date(ts as string | number)
  }
  if (isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

export function KanbanCard({
  pedido,
  isDragging,
  isUpdating,
  disabled,
  onClick,
  onDragStart,
  onDragEnd,
}: KanbanCardProps) {
  const theme = STATUS_THEME[pedido.status]
  const total = activeTotal(pedido)
  const itemCount = activeItemCount(pedido)
  const entregaDate = formatDate(pedido.dataEntrega)
  const tipo = pedido.entrega?.tipo

  return (
    <article
      draggable={!disabled}
      onDragStart={(e) => onDragStart(e, pedido)}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(pedido)}
      className={cn(
        'group relative rounded-xl bg-card border border-border/80 shadow-sm',
        'transition-all duration-200 ease-out cursor-pointer',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40',
        !disabled && 'active:cursor-grabbing',
        isDragging && 'opacity-40 rotate-1 scale-95',
        isUpdating && 'pointer-events-none',
      )}
    >
      {/* Left accent stripe */}
      <div
        className={cn(
          'absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-gradient-to-b',
          theme.columnAccent,
        )}
        aria-hidden
      />

      {/* Updating overlay */}
      {isUpdating && (
        <div className="absolute inset-0 z-10 rounded-xl bg-card/70 backdrop-blur-[1px] flex items-center justify-center">
          <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      <div className="pl-4 pr-3 py-3 space-y-2.5">
        {/* Header: numero + drag handle */}
        <header className="flex items-start justify-between gap-2">
          <code className="text-[11px] font-mono tracking-tight text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
            {pedido.numeroPedido}
          </code>
          <GripVertical
            className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
            aria-hidden
          />
        </header>

        {/* Client name */}
        <h3 className="font-semibold text-sm leading-tight text-foreground line-clamp-1">
          {pedido.clienteNome}
        </h3>

        {/* Phone (if present) */}
        {pedido.clienteTelefone && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" aria-hidden />
            <span className="truncate">{pedido.clienteTelefone}</span>
          </p>
        )}

        {/* Meta row: items + delivery type */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package2 className="h-3 w-3" aria-hidden />
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
          {tipo === 'ENTREGA' && (
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" aria-hidden />
              Entrega
            </span>
          )}
          {tipo === 'RETIRADA' && (
            <span className="flex items-center gap-1">
              <Store className="h-3 w-3" aria-hidden />
              Retirada
            </span>
          )}
        </div>

        {/* Footer: delivery date + total */}
        <footer className="flex items-center justify-between pt-1.5 border-t border-border/70">
          <span className={cn(
            'flex items-center gap-1 text-xs',
            entregaDate ? 'text-foreground/80' : 'text-muted-foreground/60',
          )}>
            <Calendar className="h-3 w-3" aria-hidden />
            {entregaDate ?? 'sem data'}
          </span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {formatPrice(total)}
          </span>
        </footer>
      </div>
    </article>
  )
}
