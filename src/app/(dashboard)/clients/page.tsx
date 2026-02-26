'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Client } from '@/types/client'
import { ClientsList } from '@/components/clients/ClientsList'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal'
import { usePermissions } from '@/hooks/usePermissions'

export default function ClientsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { canPerformAction } = usePermissions()

  const canCreate = canPerformAction('clients', 'create')
  const canUpdate = canPerformAction('clients', 'update')
  const canDelete = canPerformAction('clients', 'delete')

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

  const handleDelete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleModalSuccess = () => {
    const action = editingClient ? 'atualizado' : 'criado'
    handleCloseModal()
    setRefreshTrigger(prev => prev + 1)
    toast.success(`Cliente ${action} com sucesso!`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-momento-text">Clientes</h1>
        <p className="text-muted-foreground">
          Gerencie seus clientes e suas informações
        </p>
      </div>

      {/* Clients List Container */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Clientes</CardTitle>
            <CardDescription>
              Gerencie seus clientes, contatos e informações personalizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientsList
              onClientEdit={canUpdate ? handleEdit : undefined}
              onClientView={(client) => setViewingClient(client)}
              onClientCreate={canCreate ? handleCreate : undefined}
              onClientDelete={canDelete ? handleDelete : undefined}
              refreshTrigger={refreshTrigger}
            />
          </CardContent>
        </Card>
      </div>

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
          onEdit={canUpdate ? (client) => {
            setViewingClient(null)
            handleEdit(client)
          } : undefined}
        />
      )}
    </div>
  )
}
