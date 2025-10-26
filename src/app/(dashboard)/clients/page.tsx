'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Users, Plus, Loader2, Trash2, Search, ChevronLeft, ChevronRight, X, Edit2 } from 'lucide-react'
import { Client, ClientListResponse, ClientType, RelatedPerson, SpecialDate } from '@/types/client'
import { ClientFormModal } from '@/components/clients/ClientFormModal'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'person' | 'business'>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)

  const limit = 12

  useEffect(() => {
    fetchClients()
  }, [searchQuery, typeFilter, page])

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(searchQuery && { searchQuery }),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar clientes')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (clientId: string) => {
    if (!confirm('Tem certeza que deseja remover este cliente?')) {
      return
    }

    try {
      setDeleting(clientId)
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar cliente')
      }

      // Refresh the list
      fetchClients()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar cliente')
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setShowModal(true)
  }

  const handleCreate = () => {
    setEditingClient(null)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClient(null)
  }

  const handleModalSuccess = () => {
    handleCloseModal()
    fetchClients()
  }

  const startIndex = (page - 1) * limit + 1
  const endIndex = Math.min(page * limit, total)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e suas informações
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as any)
            setPage(1)
          }}
          className="px-3 py-1 h-9 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos</option>
          <option value="person">Pessoa Física</option>
          <option value="business">Pessoa Jurídica</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Carregando clientes...</p>
          </div>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description={searchQuery || typeFilter !== 'all'
            ? 'Tente ajustar seus filtros'
            : 'Comece adicionando seu primeiro cliente para gerenciar contatos e informações'}
          action={{
            label: 'Novo Cliente',
            onClick: handleCreate
          }}
        />
      ) : (
        <>
          {/* Client Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map(client => (
              <div
                key={client.id}
                className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground line-clamp-2">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </p>
                </div>

                <div className="space-y-2 mb-3 text-sm">
                  {client.email && (
                    <p className="text-muted-foreground truncate">{client.email}</p>
                  )}

                  {client.cpfCnpj && (
                    <p className="text-muted-foreground">
                      {client.type === 'person' ? 'CPF' : 'CNPJ'}: {client.cpfCnpj}
                    </p>
                  )}

                  {client.phone && (
                    <p className="text-muted-foreground">{client.phone}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingClient(client)}
                    className="flex-1"
                  >
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(client)}
                    className="flex-1"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(client.id)}
                    disabled={deleting === client.id}
                    className="px-2"
                  >
                    {deleting === client.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
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
                disabled={page === 1}
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
                disabled={!hasMore}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <ClientFormModal
          client={editingClient}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* View Details Modal */}
      {viewingClient && (
        <ClientDetailsModal
          client={viewingClient}
          onClose={() => setViewingClient(null)}
          onEdit={(client) => {
            setViewingClient(null)
            handleEdit(client)
          }}
        />
      )}
    </div>
  )
}

function ClientDetailsModal({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: (client: Client) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-background">
          <h2 className="text-xl font-semibold text-foreground">Detalhes do Cliente</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Nome</label>
              <p className="font-medium text-foreground">{client.name}</p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tipo</label>
              <p className="font-medium text-foreground">
                {client.type === 'person' ? 'Pessoa Física' : 'Pessoa Jurídica'}
              </p>
            </div>
            {client.email && (
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <p className="font-medium text-foreground">{client.email}</p>
              </div>
            )}
            {client.cpfCnpj && (
              <div>
                <label className="text-sm text-muted-foreground">{client.type === 'person' ? 'CPF' : 'CNPJ'}</label>
                <p className="font-medium text-foreground">{client.cpfCnpj}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <label className="text-sm text-muted-foreground">Telefone</label>
                <p className="font-medium text-foreground">{client.phone}</p>
              </div>
            )}
          </div>

          {/* Contact Methods */}
          {client.contactMethods && client.contactMethods.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Métodos de Contato</h3>
              <div className="space-y-2">
                {client.contactMethods.map(m => (
                  <div key={m.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground capitalize">{m.type}</span>
                      {m.isPrimary && <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">Principal</span>}
                    </div>
                    <p className="text-muted-foreground">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag, idx) => (
                  <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Related Persons */}
          {client.relatedPersons && client.relatedPersons.length > 0 && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Pessoas Relacionadas</h3>
              <div className="space-y-2">
                {client.relatedPersons.map(person => (
                  <div key={person.id} className="text-sm p-3 border border-border rounded">
                    <p className="font-medium text-foreground">{person.name}</p>
                    <p className="text-muted-foreground capitalize text-xs">{person.relationship}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div>
              <h3 className="font-semibold text-foreground mb-3">Notas</h3>
              <p className="text-foreground whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border sticky bottom-0 bg-background">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Fechar
          </Button>
          <Button className="flex-1" onClick={() => onEdit(client)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>
    </div>
  )
}
