'use client'

import { Pedido, PedidoStatus } from '@/types/pedido'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/products'
import { STATUS_THEME } from './statusTheme'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  status: PedidoStatus
  pedidos: Pedido[]
  isDragOver: boolean
  draggingId: string | null
  updatingId: string | null
  disabled?: boolean
  onCardClick?: (pedido: Pedido) => void
  onCardDragStart: (e: React.DragEvent<HTMLElement>, pedido: Pedido) => void
  onCardDragEnd: (e: React.DragEvent<HTMLElement>) => void
  onColumnDragOver: (e: React.DragEvent<HTMLElement>, status: PedidoStatus) => void
  onColumnDragLeave: (e: React.DragEvent<HTMLElement>) => void
  onColumnDrop: (e: React.DragEvent<HTMLElement>, status: PedidoStatus) => void
}

function columnTotal(items: Pedido[]): number {
  return items.reduce((sum, p) => {
    const active = p.orcamentos.find((o) => o.isAtivo)
    return sum + (active?.total ?? 0)
  }, 0)
}

export function KanbanColumn({
  status,
  pedidos,
  isDragOver,
  draggingId,
  updatingId,
  disabled,
  onCardClick,
  onCardDragStart,
  onCardDragEnd,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDrop,
}: KanbanColumnProps) {
  const theme = STATUS_THEME[status]
  const total = columnTotal(pedidos)

  return (
    <section
      onDragOver={(e) => onColumnDragOver(e, status)}
      onDragLeave={onColumnDragLeave}
      onDrop={(e) => onColumnDrop(e, status)}
      className={cn(
        'flex flex-col w-[300px] shrink-0 rounded-2xl border bg-background/40',
        'transition-all duration-200',
        theme.columnBorder,
        isDragOver && [theme.dragOverBg, 'ring-2 ring-offset-2', theme.dragOverRing],
      )}
    >
      {/* Column header — small top accent bar, title row, meta row */}
      <header
        className={cn(
          'rounded-t-2xl border-b px-4 pt-3 pb-3 space-y-2',
          theme.columnHeaderBg,
          theme.columnBorder,
        )}
      >
        <div
          className={cn(
            'h-1 w-12 rounded-full bg-gradient-to-r',
            theme.columnAccent,
          )}
          aria-hidden
        />
        <div className="flex items-baseline justify-between gap-2">
          <h2 className={cn(
            'text-[11px] font-semibold tracking-[0.18em] uppercase',
            theme.columnHeaderText,
          )}>
            {theme.label}
          </h2>
          <span className={cn(
            'inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5',
            'rounded-full text-[11px] font-semibold tabular-nums bg-white/70 ring-1',
            theme.softText,
            theme.softRing,
          )}>
            {pedidos.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {total > 0 ? formatPrice(total) : '—'}
        </p>
      </header>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2.5 overflow-y-auto min-h-[120px] max-h-[calc(100vh-340px)]">
        {pedidos.length === 0 ? (
          <div className={cn(
            'flex items-center justify-center h-24 rounded-lg border border-dashed text-xs text-muted-foreground/70',
            theme.columnBorder,
            isDragOver && 'text-foreground/80',
          )}>
            {isDragOver ? 'Solte aqui' : 'Sem pedidos'}
          </div>
        ) : (
          pedidos.map((pedido) => (
            <KanbanCard
              key={pedido.id}
              pedido={pedido}
              disabled={disabled}
              isDragging={draggingId === pedido.id}
              isUpdating={updatingId === pedido.id}
              onClick={onCardClick}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
            />
          ))
        )}
      </div>
    </section>
  )
}
