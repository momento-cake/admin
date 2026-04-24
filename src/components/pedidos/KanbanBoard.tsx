'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Plus, RefreshCw, LayoutGrid, List } from 'lucide-react'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { Pedido, PedidoStatus } from '@/types/pedido'
import { formatErrorMessage, logError } from '@/lib/error-handler'
import { formatPrice } from '@/lib/products'
import { cn } from '@/lib/utils'
import { KANBAN_COLUMN_ORDER } from './statusTheme'
import { KanbanColumn } from './KanbanColumn'
import {
  PedidoDateRangeFilter,
  type PedidoDateFilterValue,
} from './PedidoDateRangeFilter'

interface KanbanBoardProps {
  onPedidoView?: (pedido: Pedido) => void
  onPedidoCreate?: () => void
  canUpdate?: boolean
}

export function KanbanBoard({ onPedidoView, onPedidoCreate, canUpdate = true }: KanbanBoardProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [dateFilter, setDateFilter] = useState<PedidoDateFilterValue>({ preset: null })
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<PedidoStatus | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const dragOriginStatus = useRef<PedidoStatus | null>(null)

  const debouncedSearch = useDebounce(searchInput, 300)

  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (debouncedSearch) params.set('searchQuery', debouncedSearch)
      if (dateFilter.dateFrom) params.set('dateFrom', dateFilter.dateFrom)
      if (dateFilter.dateTo) params.set('dateTo', dateFilter.dateTo)
      params.set('limit', '500')
      params.set('page', '1')

      const response = await fetch('/api/pedidos?' + params.toString())
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao carregar pedidos')

      setPedidos(result.data as Pedido[])
    } catch (err) {
      const msg = formatErrorMessage(err)
      setError(msg)
      logError('KanbanBoard.loadPedidos', err)
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, dateFilter.dateFrom, dateFilter.dateTo])

  useEffect(() => {
    loadPedidos()
  }, [loadPedidos])

  // Group pedidos by status
  const grouped = useMemo(() => {
    const map: Record<PedidoStatus, Pedido[]> = {
      RASCUNHO: [],
      AGUARDANDO_APROVACAO: [],
      CONFIRMADO: [],
      AGUARDANDO_PAGAMENTO: [],
      EM_PRODUCAO: [],
      PRONTO: [],
      ENTREGUE: [],
      CANCELADO: [],
    }
    pedidos.forEach((p) => {
      if (map[p.status]) map[p.status].push(p)
    })
    return map
  }, [pedidos])

  const totalCount = pedidos.length
  const totalValue = useMemo(
    () =>
      pedidos.reduce((sum, p) => {
        const active = p.orcamentos.find((o) => o.isAtivo)
        return sum + (active?.total ?? 0)
      }, 0),
    [pedidos],
  )

  const handleDragStart = (e: React.DragEvent<HTMLElement>, pedido: Pedido) => {
    if (!canUpdate) {
      e.preventDefault()
      return
    }
    setDraggingId(pedido.id)
    dragOriginStatus.current = pedido.status
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', pedido.id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverStatus(null)
    dragOriginStatus.current = null
  }

  const handleColumnDragOver = (e: React.DragEvent<HTMLElement>, status: PedidoStatus) => {
    if (!canUpdate || !draggingId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverStatus !== status) setDragOverStatus(status)
  }

  const handleColumnDragLeave = (e: React.DragEvent<HTMLElement>) => {
    // Only clear if we're leaving the column entirely, not hovering a child
    const related = e.relatedTarget as Node | null
    if (!related || !(e.currentTarget as Node).contains(related)) {
      setDragOverStatus((prev) => prev)
    }
  }

  const handleColumnDrop = async (
    e: React.DragEvent<HTMLElement>,
    targetStatus: PedidoStatus,
  ) => {
    e.preventDefault()
    const pedidoId = e.dataTransfer.getData('text/plain') || draggingId
    const origin = dragOriginStatus.current
    setDraggingId(null)
    setDragOverStatus(null)
    dragOriginStatus.current = null

    if (!pedidoId || !origin) return
    if (origin === targetStatus) return
    if (!canUpdate) {
      toast.error('Sem permissão para atualizar pedidos')
      return
    }

    const target = pedidos.find((p) => p.id === pedidoId)
    if (!target) return

    // Optimistic update
    setUpdatingId(pedidoId)
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: targetStatus } : p)),
    )

    try {
      const response = await fetch(`/api/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Falha ao atualizar status')
      toast.success('Status atualizado', {
        description: `Pedido ${target.numeroPedido} movido`,
      })
    } catch (err) {
      // Revert
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoId ? { ...p, status: origin } : p)),
      )
      toast.error('Erro ao mover pedido', { description: formatErrorMessage(err) })
      logError('KanbanBoard.updateStatus', err)
    } finally {
      setUpdatingId(null)
    }
  }

  // Filter grouped by search (re-run when debounced search changes server-side — already filtered)

  if (loading && pedidos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[calc(100vh-340px)] w-[300px] shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search bar + actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        <PedidoDateRangeFilter value={dateFilter} onChange={setDateFilter} />

        {/* View toggle */}
        <div className="inline-flex items-center rounded-lg border bg-card p-0.5 shadow-sm">
          <Link href="/orders" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </Link>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 pointer-events-none shadow-sm"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={loadPedidos} className="h-10">
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Atualizar
        </Button>

        {onPedidoCreate && (
          <Button onClick={onPedidoCreate} className="h-10">
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold tabular-nums">{totalCount}</span>
          <span className="text-muted-foreground">
            pedido{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Em aberto</span>
          <span className="font-semibold tabular-nums">
            {(grouped.AGUARDANDO_APROVACAO.length +
              grouped.CONFIRMADO.length +
              grouped.AGUARDANDO_PAGAMENTO.length +
              grouped.EM_PRODUCAO.length +
              grouped.PRONTO.length)}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Valor total</span>
          <span className="font-semibold tabular-nums">{formatPrice(totalValue)}</span>
        </div>
        {!canUpdate && (
          <span className="text-xs text-muted-foreground italic">
            Somente leitura — sem permissão para mover pedidos
          </span>
        )}
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        {KANBAN_COLUMN_ORDER.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            pedidos={grouped[status]}
            isDragOver={dragOverStatus === status}
            draggingId={draggingId}
            updatingId={updatingId}
            disabled={!canUpdate}
            onCardClick={onPedidoView}
            onCardDragStart={handleDragStart}
            onCardDragEnd={handleDragEnd}
            onColumnDragOver={handleColumnDragOver}
            onColumnDragLeave={handleColumnDragLeave}
            onColumnDrop={handleColumnDrop}
          />
        ))}
      </div>
    </div>
  )
}
