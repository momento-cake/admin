'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Client, ClientListResponse, ClientType } from '@/types/client'
import { Search, Plus, Users, RefreshCw, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientsListProps {
  onClientEdit?: (client: Client) => void
  onClientDelete?: (client: Client) => void
  onClientView?: (client: Client) => void
  onClientCreate?: () => void
  onClientsLoaded?: (clients: Client[]) => void
  onRefresh?: () => void
  className?: string
}

export function ClientsList({
  onClientEdit,
  onClientDelete,
  onClientView,
  onClientCreate,
  onClientsLoaded,
  onRefresh,
  className
}: ClientsListProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'person' | 'business'>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const limit = 12
  const debouncedSearchQuery = useDebounce(searchInput, 300)

  const fetchClients = async (currentPage: number = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        ...(debouncedSearchQuery && { searchQuery: debouncedSearchQuery }),
        ...(typeFilter !== 'all' && { type: typeFilter })
      })

      const response = await fetch(`/api/clients?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json() as ClientListResponse

      setClients(data.clients || [])
      setHasMore(data.hasMore || false)
      setTotal(data.total || 0)
      setError(null)

      if (onClientsLoaded) {
        onClientsLoaded(data.clients || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar clientes')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, typeFilter])

  useEffect(() => {
    fetchClients(page)
  }, [debouncedSearchQuery, typeFilter, page])

  const handleRefresh = () => {
    fetchClients(page)
    if (onRefresh) {
      onRefresh()
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
  }

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value as 'all' | 'person' | 'business')
  }

  const handleDelete = async (client: Client) => {
    try {
      setDeletingId(client.id)
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar cliente')
      }

      if (onClientDelete) {
        onClientDelete(client)
      }

      fetchClients(page)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar cliente')
    } finally {
      setDeletingId(null)
    }
  }

  const getClientTypeLabel = (type: ClientType) => {
    return type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'
  }

  const getClientTypeColor = (type: ClientType) => {
    return type === 'person' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  if (loading && clients.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando clientes...</span>
      </div>
    )
  }

  if (error && clients.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={typeFilter} onValueChange={handleTypeFilterChange}>
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="person">Pessoa Física</SelectItem>
              <SelectItem value="business">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>

          {onClientCreate && (
            <Button onClick={onClientCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description={searchInput || typeFilter !== 'all'
            ? 'Tente ajustar seus filtros'
            : 'Comece adicionando seu primeiro cliente para gerenciar contatos e informações'}
          action={onClientCreate ? {
            label: 'Novo Cliente',
            onClick: onClientCreate
          } : undefined}
        />
      ) : (
        <>
          {/* Results Header */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {clients.length} cliente{clients.length !== 1 ? 's' : ''} encontrado{clients.length !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="font-medium">{client.name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', getClientTypeColor(client.type))}>
                        {getClientTypeLabel(client.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.cpfCnpj ? (
                        <span className="text-sm">{client.cpfCnpj}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.phone ? (
                        <span className="text-sm">{client.phone}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onClientView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClientView(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onClientEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClientEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onClientDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deletingId === client.id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza de que deseja excluir o cliente "{client.name}"?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(client)}
                                  disabled={deletingId === client.id}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deletingId === client.id ? 'Excluindo...' : 'Excluir'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Exibindo <span className="font-semibold">{startIndex}-{endIndex}</span> de <span className="font-semibold">{total}</span> clientes
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-3 py-2 text-sm font-medium">
                Página {page}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
