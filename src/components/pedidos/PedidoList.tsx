'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Search,
  Plus,
  ShoppingCart,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  List,
  LayoutGrid,
  Phone,
  Package2,
  Calendar,
  Truck,
  Store,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatErrorMessage, logError } from '@/lib/error-handler'
import { Pedido, PedidoStatus } from '@/types/pedido'
import { formatPrice } from '@/lib/products'
import { PedidoStatusBadge } from './PedidoStatusBadge'
import { STATUS_THEME } from './statusTheme'
import {
  PedidoDateRangeFilter,
  type PedidoDateFilterValue,
} from './PedidoDateRangeFilter'

const STATUS_TABS: Array<{ value: PedidoStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Rascunho' },
  { value: 'AGUARDANDO_APROVACAO', label: 'Aguardando' },
  { value: 'CONFIRMADO', label: 'Confirmado' },
  { value: 'EM_PRODUCAO', label: 'Em Produção' },
  { value: 'PRONTO', label: 'Pronto' },
  { value: 'ENTREGUE', label: 'Entregue' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

interface PedidoListProps {
  onPedidoCreate?: () => void
  onPedidoView?: (pedido: Pedido) => void
  onPedidoEdit?: (pedido: Pedido) => void
  onPedidoDelete?: (pedido: Pedido) => Promise<void>
  onRefresh?: () => void
  className?: string
}

export function PedidoList({
  onPedidoCreate,
  onPedidoView,
  onPedidoEdit,
  onPedidoDelete,
  onRefresh,
  className,
}: PedidoListProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<PedidoStatus | 'ALL'>('ALL')
  const [dateFilter, setDateFilter] = useState<PedidoDateFilterValue>({ preset: null })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [statusCounts, setStatusCounts] = useState<Record<PedidoStatus | 'ALL', number>>({
    ALL: 0,
    RASCUNHO: 0,
    AGUARDANDO_APROVACAO: 0,
    CONFIRMADO: 0,
    EM_PRODUCAO: 0,
    PRONTO: 0,
    ENTREGUE: 0,
    CANCELADO: 0,
  })
  const [summaryValue, setSummaryValue] = useState(0)
  const perPage = 20

  const debouncedSearch = useDebounce(searchInput, 300)

  const loadPedidos = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (debouncedSearch) params.set('searchQuery', debouncedSearch)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (dateFilter.dateFrom) params.set('dateFrom', dateFilter.dateFrom)
      if (dateFilter.dateTo) params.set('dateTo', dateFilter.dateTo)
      params.set('page', String(page))
      params.set('limit', String(perPage))

      const response = await fetch('/api/pedidos?' + params.toString())
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao carregar pedidos')

      setPedidos(result.data)
      setTotal(result.total)
    } catch (err) {
      const msg = formatErrorMessage(err)
      setError(msg)
      logError('PedidoList.loadPedidos', err)
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }

  // Load global counts (all statuses) for the summary bar and filter pills
  const loadCounts = async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('searchQuery', debouncedSearch)
      if (dateFilter.dateFrom) params.set('dateFrom', dateFilter.dateFrom)
      if (dateFilter.dateTo) params.set('dateTo', dateFilter.dateTo)
      params.set('limit', '500')
      params.set('page', '1')

      const response = await fetch('/api/pedidos?' + params.toString())
      const result = await response.json()
      if (!result.success) return

      const all = result.data as Pedido[]
      const counts: Record<PedidoStatus | 'ALL', number> = {
        ALL: all.length,
        RASCUNHO: 0,
        AGUARDANDO_APROVACAO: 0,
        CONFIRMADO: 0,
        EM_PRODUCAO: 0,
        PRONTO: 0,
        ENTREGUE: 0,
        CANCELADO: 0,
      }
      let value = 0
      all.forEach((p) => {
        counts[p.status] = (counts[p.status] || 0) + 1
        const active = p.orcamentos.find((o) => o.isAtivo)
        value += active?.total ?? 0
      })
      setStatusCounts(counts)
      setSummaryValue(value)
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter, dateFilter.dateFrom, dateFilter.dateTo])

  useEffect(() => {
    loadPedidos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, dateFilter.dateFrom, dateFilter.dateTo, page])

  useEffect(() => {
    loadCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, dateFilter.dateFrom, dateFilter.dateTo])

  const getActiveOrcamentoTotal = (pedido: Pedido): number => {
    const active = pedido.orcamentos.find((o) => o.isAtivo)
    return active?.total ?? 0
  }

  const getActiveItemCount = (pedido: Pedido): number => {
    const active = pedido.orcamentos.find((o) => o.isAtivo)
    return active?.itens.reduce((sum, it) => sum + (it.quantidade || 0), 0) ?? 0
  }

  const formatDate = (timestamp: unknown, opts?: { short?: boolean }): string => {
    if (!timestamp) return '-'
    let date: Date
    const v = timestamp as { toDate?: () => Date; _seconds?: number }
    if (typeof v === 'object' && v && 'toDate' in v && typeof v.toDate === 'function') {
      date = v.toDate()
    } else if (typeof v === 'object' && v && '_seconds' in v && typeof v._seconds === 'number') {
      date = new Date(v._seconds * 1000)
    } else {
      date = new Date(timestamp as string | number)
    }
    if (isNaN(date.getTime())) return '-'
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: opts?.short ? 'short' : '2-digit',
      year: opts?.short ? undefined : 'numeric',
    }).format(date)
  }

  const inProgressCount = useMemo(
    () =>
      statusCounts.AGUARDANDO_APROVACAO +
      statusCounts.CONFIRMADO +
      statusCounts.EM_PRODUCAO +
      statusCounts.PRONTO,
    [statusCounts],
  )

  const totalPages = Math.ceil(total / perPage)

  if (loading && pedidos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
        <div className="hidden md:block border rounded-xl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
    <div className={cn('space-y-6', className)}>
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          label="Total de pedidos"
          value={String(statusCounts.ALL)}
          caption="registrados"
        />
        <StatTile
          label="Em andamento"
          value={String(inProgressCount)}
          caption="pedidos abertos"
          accent="from-amber-400 to-amber-300"
        />
        <StatTile
          label="Prontos"
          value={String(statusCounts.PRONTO)}
          caption="aguardando entrega"
          accent="from-emerald-400 to-emerald-300"
        />
        <StatTile
          label="Valor total"
          value={formatPrice(summaryValue)}
          caption="todos os pedidos"
          accent="from-[#a77047] to-[#c28a5e]"
          mono
        />
      </div>

      {/* Search, view toggle, actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número do pedido ou nome do cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>

        <PedidoDateRangeFilter value={dateFilter} onChange={setDateFilter} />

        <div className="inline-flex items-center rounded-lg border bg-card p-0.5 shadow-sm">
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 pointer-events-none shadow-sm"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
          <Link href="/orders/kanban" className="shrink-0">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Button>
          </Link>
        </div>

        {onPedidoCreate && (
          <Button onClick={onPedidoCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        )}
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.value
          const count = statusCounts[tab.value]
          const theme = tab.value !== 'ALL' ? STATUS_THEME[tab.value] : null
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 h-8 text-xs font-medium',
                'border transition-all duration-150',
                isActive
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-card text-foreground border-border hover:border-foreground/40 hover:bg-muted/50',
              )}
            >
              {theme && (
                <span
                  className={cn('h-1.5 w-1.5 rounded-full', theme.dot)}
                  aria-hidden
                />
              )}
              <span>{tab.label}</span>
              <span
                className={cn(
                  'tabular-nums',
                  isActive ? 'text-background/70' : 'text-muted-foreground',
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Results */}
      {pedidos.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={
            debouncedSearch || statusFilter !== 'ALL'
              ? 'Nenhum pedido encontrado'
              : 'Nenhum pedido cadastrado'
          }
          description={
            debouncedSearch || statusFilter !== 'ALL'
              ? 'Tente ajustar os filtros para encontrar pedidos'
              : 'Crie o primeiro pedido para começar'
          }
          action={
            onPedidoCreate
              ? { label: 'Novo Pedido', onClick: onPedidoCreate }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium text-foreground">{pedidos.length}</span>{' '}
              de <span className="font-medium text-foreground">{total}</span> pedido{total !== 1 ? 's' : ''}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRefresh?.()
                loadPedidos()
                loadCounts()
              }}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {/* Mobile card layout */}
          <div className="block md:hidden space-y-3">
            {pedidos.map((pedido) => {
              const theme = STATUS_THEME[pedido.status]
              const itemCount = getActiveItemCount(pedido)
              const tipo = pedido.entrega?.tipo
              return (
                <div
                  key={pedido.id}
                  className="relative rounded-xl border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-primary/30"
                >
                  <div
                    className={cn(
                      'absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b',
                      theme.columnAccent,
                    )}
                    aria-hidden
                  />
                  <div className="pl-4 pr-4 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {pedido.numeroPedido}
                      </code>
                      <PedidoStatusBadge status={pedido.status} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{pedido.clienteNome}</p>
                      {pedido.clienteTelefone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" aria-hidden />
                          {pedido.clienteTelefone}
                        </p>
                      )}
                    </div>
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
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden />
                        {pedido.dataEntrega
                          ? formatDate(pedido.dataEntrega, { short: true })
                          : formatDate(pedido.createdAt)}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatPrice(getActiveOrcamentoTotal(pedido))}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-1 pt-1">
                      {onPedidoView && (
                        <Button variant="ghost" size="sm" onClick={() => onPedidoView(pedido)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onPedidoEdit && (
                        <Button variant="ghost" size="sm" onClick={() => onPedidoEdit(pedido)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onPedidoDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o pedido &quot;{pedido.numeroPedido}&quot;?
                                O pedido será desativado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  setDeletingId(pedido.id)
                                  try {
                                    await onPedidoDelete(pedido)
                                    await loadPedidos()
                                    await loadCounts()
                                  } finally {
                                    setDeletingId(null)
                                  }
                                }}
                                disabled={deletingId === pedido.id}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {deletingId === pedido.id ? 'Excluindo...' : 'Excluir'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block border rounded-xl overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Pedido
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Cliente
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Itens
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Entrega
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">
                    Total
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => {
                  const theme = STATUS_THEME[pedido.status]
                  const itemCount = getActiveItemCount(pedido)
                  const tipo = pedido.entrega?.tipo
                  return (
                    <TableRow
                      key={pedido.id}
                      className="group hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onPedidoView?.(pedido)}
                    >
                      <TableCell className="relative">
                        <span
                          className={cn(
                            'absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-gradient-to-b',
                            theme.columnAccent,
                          )}
                          aria-hidden
                        />
                        <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded ml-2">
                          {pedido.numeroPedido}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{pedido.clienteNome}</p>
                          {pedido.clienteTelefone && (
                            <p className="text-xs text-muted-foreground">{pedido.clienteTelefone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <PedidoStatusBadge status={pedido.status} />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Package2 className="h-3 w-3" aria-hidden />
                          {itemCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          <span className="flex items-center gap-1 text-foreground">
                            {tipo === 'ENTREGA' ? (
                              <>
                                <Truck className="h-3 w-3" aria-hidden />
                                Entrega
                              </>
                            ) : tipo === 'RETIRADA' ? (
                              <>
                                <Store className="h-3 w-3" aria-hidden />
                                Retirada
                              </>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </span>
                          {pedido.dataEntrega && (
                            <span className="text-muted-foreground">
                              {formatDate(pedido.dataEntrega, { short: true })}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold tabular-nums">
                          {formatPrice(getActiveOrcamentoTotal(pedido))}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            {onPedidoView && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPedidoView(pedido)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver pedido</TooltipContent>
                              </Tooltip>
                            )}
                            {onPedidoEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onPedidoEdit(pedido)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar pedido</TooltipContent>
                              </Tooltip>
                            )}
                            {onPedidoDelete && (
                              <AlertDialog>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir pedido</TooltipContent>
                                </Tooltip>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o pedido &quot;{pedido.numeroPedido}&quot;?
                                      O pedido será desativado.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={async () => {
                                        setDeletingId(pedido.id)
                                        try {
                                          await onPedidoDelete(pedido)
                                          await loadPedidos()
                                          await loadCounts()
                                        } finally {
                                          setDeletingId(null)
                                        }
                                      }}
                                      disabled={deletingId === pedido.id}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {deletingId === pedido.id ? 'Excluindo...' : 'Excluir'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Próxima
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  caption,
  accent,
  mono,
}: {
  label: string
  value: string
  caption: string
  accent?: string
  mono?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          accent ?? 'from-primary to-secondary',
        )}
        aria-hidden
      />
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
        {label}
      </p>
      <p
        className={cn(
          'mt-1.5 text-2xl font-semibold tracking-tight',
          mono && 'tabular-nums',
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{caption}</p>
    </div>
  )
}
