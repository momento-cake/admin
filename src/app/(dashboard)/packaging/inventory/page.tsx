'use client'

/**
 * Packaging Inventory Page
 *
 * Displays a list of all packaging items with the ability to:
 * - Search and filter packaging items
 * - Create new packaging items
 * - Edit existing packaging items
 * - Manage stock levels
 * - View stock and price history
 */

import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { PackagingList } from '@/components/packaging/PackagingList'
import { PackagingForm } from '@/components/packaging/PackagingForm'
import { Packaging, CreatePackagingData, UpdatePackagingData } from '@/types/packaging'
import { createPackaging, updatePackaging, deletePackaging } from '@/lib/packaging'
import { PackagingFormData } from '@/lib/validators/packaging'

// Simple toast notification
const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`[${type.toUpperCase()}] ${message}`)
}

export default function PackagingInventoryPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedPackaging, setSelectedPackaging] = useState<Packaging | null>(null)
  const listRefreshTrigger = useRef<() => void>(() => {})

  // Handle create packaging
  const handlePackagingCreate = useCallback(() => {
    setSelectedPackaging(null)
    setIsCreateDialogOpen(true)
  }, [])

  // Handle edit packaging
  const handlePackagingEdit = useCallback((packaging: Packaging) => {
    setSelectedPackaging(packaging)
    setIsEditDialogOpen(true)
  }, [])

  // Handle delete packaging
  const handlePackagingDelete = useCallback(async (packaging: Packaging) => {
    try {
      await deletePackaging(packaging.id)
      showNotification(`Embalagem "${packaging.name}" removida com sucesso`, 'success')
      // Refresh the list
      listRefreshTrigger.current()
    } catch (error) {
      console.error('Erro ao deletar embalagem:', error)
      showNotification(error instanceof Error ? error.message : 'Erro ao deletar embalagem', 'error')
    }
  }, [])

  // Handle manage stock
  const handleManageStock = useCallback((packaging: Packaging) => {
    // TODO: Implement stock management modal
    console.log('Manage stock for:', packaging.id)
    showNotification('Gerenciamento de estoque será implementado em breve', 'success')
  }, [])

  // Handle refresh list
  const handleRefresh = useCallback(() => {
    listRefreshTrigger.current()
  }, [])

  // Handle form submit (create or update)
  const handleFormSubmit = async (data: PackagingFormData) => {
    try {
      setIsSubmitting(true)

      if (selectedPackaging) {
        // Update existing packaging
        const updateData: UpdatePackagingData = {
          id: selectedPackaging.id,
          ...data,
        }
        await updatePackaging(updateData)
        showNotification(`Embalagem "${data.name}" atualizada com sucesso`, 'success')
        setIsEditDialogOpen(false)
      } else {
        // Create new packaging
        const createData: CreatePackagingData = data
        await createPackaging(createData)
        showNotification(`Embalagem "${data.name}" criada com sucesso`, 'success')
        setIsCreateDialogOpen(false)
      }

      // Refresh the list
      listRefreshTrigger.current()
    } catch (error) {
      console.error('Erro ao salvar embalagem:', error)
      showNotification(error instanceof Error ? error.message : 'Erro ao salvar embalagem', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-momento-text">Embalagens</h1>
        <p className="text-muted-foreground">
          Gerencie todos os materiais de embalagem do seu inventário
        </p>
      </div>

      {/* Packaging List */}
      <PackagingList
        onPackagingCreate={handlePackagingCreate}
        onPackagingEdit={handlePackagingEdit}
        onPackagingDelete={handlePackagingDelete}
        onManageStock={handleManageStock}
        onRefresh={handleRefresh}
        refreshTrigger={listRefreshTrigger}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Embalagem</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova embalagem no inventário
            </DialogDescription>
          </DialogHeader>
          <PackagingForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsCreateDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Embalagem</DialogTitle>
            <DialogDescription>
              Atualize os dados da embalagem "{selectedPackaging?.name}"
            </DialogDescription>
          </DialogHeader>
          {selectedPackaging && (
            <PackagingForm
              packaging={selectedPackaging}
              onSubmit={handleFormSubmit}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
