'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageFolder } from '@/types/folder'
import { FoldersList } from '@/components/folders/FoldersList'
import { FolderForm } from '@/components/folders/FolderForm'
import { FolderShareDialog } from '@/components/folders/FolderShareDialog'
import { useAuthContext } from '@/contexts/AuthContext'
import { createFolder } from '@/lib/folders'
import { toast } from 'sonner'

export default function FoldersPage() {
  const router = useRouter()
  const { user } = useAuthContext()

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<ImageFolder | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [clients, setClients] = useState<any[]>([])

  const handleCreate = () => {
    setSelectedFolder(null)
    setIsFormOpen(true)
  }

  const handleEdit = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setIsFormOpen(true)
  }

  const handleView = (folder: ImageFolder) => {
    router.push(`/images/folders/${folder.id}`)
  }

  const handleShare = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setIsShareOpen(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)

      if (selectedFolder) {
        // Update existing folder
        const response = await fetch(`/api/folders/${selectedFolder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })

        if (!response.ok) {
          throw new Error('Failed to update folder')
        }

        toast.success('Pasta atualizada com sucesso!')
      } else {
        // Create new folder
        await createFolder(data, user?.uid || 'system')
        toast.success('Pasta criada com sucesso!')
      }

      setIsFormOpen(false)
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Error saving folder:', error)
      toast.error('Não foi possível salvar a pasta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pastas</h1>
        <p className="text-muted-foreground">
          Organize suas imagens em pastas para compartilhar com clientes
        </p>
      </div>

      <FoldersList
        key={refreshKey}
        onFolderCreate={handleCreate}
        onFolderEdit={handleEdit}
        onFolderView={handleView}
        onFolderShare={handleShare}
        onRefresh={handleRefresh}
        onClientsLoaded={setClients}
      />

      {/* Create/Edit Dialog */}
      <FolderForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        folder={selectedFolder}
        clients={clients}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      {/* Share Dialog */}
      <FolderShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        folder={selectedFolder}
      />
    </div>
  )
}
