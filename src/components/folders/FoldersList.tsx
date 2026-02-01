'use client'

import { useState, useEffect } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ImageFolder } from '@/types/folder'
import { Client } from '@/types/client'
import { Search, Plus, FolderOpen, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FolderCard, FolderGrid } from './FolderCard'
import { fetchFolders, deleteFolder } from '@/lib/folders'
import { fetchClients } from '@/lib/clients'
import { fetchImage } from '@/lib/images'
import { toast } from 'sonner'

interface FoldersListProps {
  onFolderEdit?: (folder: ImageFolder) => void
  onFolderDelete?: (folder: ImageFolder) => void
  onFolderView?: (folder: ImageFolder) => void
  onFolderShare?: (folder: ImageFolder) => void
  onFolderCreate?: () => void
  onRefresh?: () => void
  onClientsLoaded?: (clients: Client[]) => void
  className?: string
}

export function FoldersList({
  onFolderEdit,
  onFolderDelete,
  onFolderView,
  onFolderShare,
  onFolderCreate,
  onRefresh,
  onClientsLoaded,
  className
}: FoldersListProps) {
  const [folders, setFolders] = useState<ImageFolder[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [coverImages, setCoverImages] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [publicFilter, setPublicFilter] = useState<string>('all')
  const [deletingFolder, setDeletingFolder] = useState<ImageFolder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const debouncedSearchQuery = useDebounce(searchInput, 300)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [foldersResponse, clientsResponse] = await Promise.all([
        fetchFolders({
          searchQuery: debouncedSearchQuery || undefined,
          clientId: clientFilter !== 'all' ? clientFilter : undefined,
          isPublic: publicFilter === 'public' ? true : publicFilter === 'private' ? false : undefined,
          sortBy: 'createdAt',
          sortOrder: 'desc'
        }),
        fetchClients()
      ])

      setFolders(foldersResponse.folders)
      setClients(clientsResponse.clients)

      if (onClientsLoaded) {
        onClientsLoaded(clientsResponse.clients)
      }

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
    } catch (err) {
      console.error('Error loading folders:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar pastas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [debouncedSearchQuery, clientFilter, publicFilter])

  const handleDelete = async () => {
    if (!deletingFolder) return

    try {
      setIsDeleting(true)
      await deleteFolder(deletingFolder.id)
      toast.success('Pasta excluída com sucesso!')
      setDeletingFolder(null)
      loadData()
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Error deleting folder:', err)
      toast.error('Erro ao excluir pasta')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = () => {
    loadData()
    if (onRefresh) onRefresh()
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pastas..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os clientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
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
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="public">Públicas</SelectItem>
            <SelectItem value="private">Privadas</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>

        {onFolderCreate && (
          <Button onClick={onFolderCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nova pasta
          </Button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && folders.length === 0 && (
        <EmptyState
          icon={FolderOpen}
          title="Nenhuma pasta encontrada"
          description="Crie uma nova pasta para organizar suas imagens e compartilhar com clientes."
          action={onFolderCreate ? {
            label: 'Nova pasta',
            onClick: onFolderCreate
          } : undefined}
        />
      )}

      {/* Folders grid */}
      {!loading && !error && folders.length > 0 && (
        <FolderGrid
          folders={folders}
          coverImages={coverImages}
          onEdit={onFolderEdit}
          onDelete={(folder) => setDeletingFolder(folder)}
          onView={onFolderView}
          onShare={onFolderShare}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pasta "{deletingFolder?.name}"?
              Esta ação não pode ser desfeita. As imagens não serão excluídas,
              apenas a pasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
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
