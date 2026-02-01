'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, FolderOpen, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { FolderGrid, FolderForm, FolderShareDialog } from '@/components/folders'
import { ImageFolder, FolderQueryFilters } from '@/types/folder'
import { Client } from '@/types/client'
import { fetchFolders, createFolder, deleteFolder } from '@/lib/folders'
import { fetchClients } from '@/lib/clients'
import { fetchImage } from '@/lib/images'
import { useAuthContext } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

export default function FoldersPage() {
  const router = useRouter()
  const { user } = useAuthContext()

  // State
  const [folders, setFolders] = React.useState<ImageFolder[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [coverImages, setCoverImages] = React.useState<Map<string, string>>(new Map())
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('')
  const [clientFilter, setClientFilter] = React.useState<string>('')
  const [publicFilter, setPublicFilter] = React.useState<string>('')

  // Dialogs
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [isShareOpen, setIsShareOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [selectedFolder, setSelectedFolder] = React.useState<ImageFolder | null>(null)

  // Load folders and clients
  const loadData = React.useCallback(async () => {
    try {
      setIsLoading(true)

      const filters: FolderQueryFilters = {
        searchQuery: searchQuery || undefined,
        clientId: clientFilter || undefined,
        isPublic: publicFilter === 'public' ? true : publicFilter === 'private' ? false : undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }

      const [foldersResponse, clientsResponse] = await Promise.all([
        fetchFolders(filters),
        fetchClients()
      ])

      setFolders(foldersResponse.folders)
      setClients(clientsResponse.clients)

      // Load cover images
      const coverImageMap = new Map<string, string>()
      const coverImagePromises = foldersResponse.folders
        .filter(f => f.coverImageId)
        .map(async (folder) => {
          try {
            const image = await fetchImage(folder.coverImageId!)
            coverImageMap.set(folder.coverImageId!, image.url)
          } catch {
            // Ignore missing images
          }
        })

      await Promise.all(coverImagePromises)
      setCoverImages(coverImageMap)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Não foi possível carregar as pastas.')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, clientFilter, publicFilter])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  // Handlers
  const handleCreateFolder = () => {
    setSelectedFolder(null)
    setIsFormOpen(true)
  }

  const handleEditFolder = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setIsFormOpen(true)
  }

  const handleViewFolder = (folder: ImageFolder) => {
    router.push(`/images/folders/${folder.id}`)
  }

  const handleShareFolder = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setIsShareOpen(true)
  }

  const handleDeleteClick = (folder: ImageFolder) => {
    setSelectedFolder(folder)
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedFolder) return

    try {
      setIsSubmitting(true)
      await deleteFolder(selectedFolder.id)
      toast.success('Pasta excluída com sucesso!')
      loadData()
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Não foi possível excluir a pasta.')
    } finally {
      setIsSubmitting(false)
      setIsDeleteOpen(false)
      setSelectedFolder(null)
    }
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
      loadData()
    } catch (error) {
      console.error('Error saving folder:', error)
      toast.error('Não foi possível salvar a pasta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pastas</h1>
          <p className="text-muted-foreground">
            Organize suas imagens em pastas para compartilhar com clientes.
          </p>
        </div>
        <Button onClick={handleCreateFolder}>
          <Plus className="h-4 w-4 mr-2" />
          Nova pasta
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pastas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os clientes</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={publicFilter} onValueChange={setPublicFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Visibilidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            <SelectItem value="public">Públicas</SelectItem>
            <SelectItem value="private">Privadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <FolderGrid
          folders={folders}
          coverImages={coverImages}
          onEdit={handleEditFolder}
          onDelete={handleDeleteClick}
          onView={handleViewFolder}
          onShare={handleShareFolder}
          emptyMessage="Nenhuma pasta encontrada. Crie uma nova pasta para começar."
        />
      )}

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

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pasta "{selectedFolder?.name}"?
              Esta ação não pode ser desfeita. As imagens não serão excluídas,
              apenas a pasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
