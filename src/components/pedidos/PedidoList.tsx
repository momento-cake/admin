'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Search, Plus, ShoppingCart, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatErrorMessage, logError } from '@/lib/error-handler'
import { Pedido, PedidoStatus, PEDIDO_STATUS_LABELS } from '@/types/pedido'
import { fetchPedidos } from '@/lib/pedidos'
import { formatPrice } from '@/lib/products'
import { PedidoStatusBadge } from './PedidoStatusBadge'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 20

  const debouncedSearch = useDebounce(searchInput, 300)

  const loadPedidos = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetchPedidos({
        searchQuery: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        limit: perPage,
      })

      setPedidos(response.pedidos)
      setTotal(response.total)
    } catch (err) {
      const msg = formatErrorMessage(err)
      setError(msg)
      logError('PedidoList.loadPedidos', err)
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  useEffect(() => {
    loadPedidos()
  }, [debouncedSearch, statusFilter, page])

  const getActiveOrcamentoTotal = (pedido: Pedido): number => {
    const active = pedido.orcamentos.find((o) => o.isAtivo)
    return active?.total ?? 0
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
  }

  const totalPages = Math.ceil(total / perPage)

  if (loading && pedidos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        {/* Mobile skeleton */}
        <div className="block md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-48" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
        {/* Desktop skeleton */}
        <div className="hidden md:block border rounded-md">
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
      {/* Search and actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero do pedido ou nome do cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        {onPedidoCreate && (
          <Button onClick={onPedidoCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pedido
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
            className="text-xs"
          >
            {tab.label}
          </Button>
        ))}
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
              {total} pedido{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={() => { onRefresh(); loadPedidos(); }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            )}
          </div>

          {/* Mobile card layout */}
          <div className="block md:hidden space-y-3">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                    {pedido.numeroPedido}
                  </code>
                  <PedidoStatusBadge status={pedido.status} />
                </div>
                <div>
                  <p className="font-medium text-sm">{pedido.clienteNome}</p>
                  {pedido.clienteTelefone && (
                    <p className="text-xs text-muted-foreground">{pedido.clienteTelefone}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{formatPrice(getActiveOrcamentoTotal(pedido))}</span>
                  <span className="text-muted-foreground">{formatDate(pedido.createdAt)}</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-1 border-t">
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
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden md:block border rounded-md overflow-x-auto">
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
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id} className="hover:bg-muted/50">
                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
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
                    <TableCell className="text-right font-medium">
                      {formatPrice(getActiveOrcamentoTotal(pedido))}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{formatDate(pedido.createdAt)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex items-center justify-end gap-1">
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
                ))}
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
