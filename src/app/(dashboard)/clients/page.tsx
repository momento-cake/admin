'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Client } from '@/types/client'
import { ClientsList } from '@/components/clients/ClientsList'
import { ClientFormModal } from '@/components/clients/ClientFormModal'
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal'

export default function ClientsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)

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
  }

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
      </div>

      {/* Clients List */}
      <ClientsList
        onClientEdit={handleEdit}
        onClientView={(client) => setViewingClient(client)}
        onClientCreate={handleCreate}
      />

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
