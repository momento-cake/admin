'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Share2,
  Plus,
  Minus,
  Eye,
  EyeOff,
  User,
  Calendar,
  Images,
  Loader2,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ImageGrid } from '@/components/images/ImageCard'
import { FolderForm, FolderShareDialog } from '@/components/folders'
import { ImageFolderWithImages } from '@/types/folder'
import { GalleryImageWithTags, ImageTag } from '@/types/image'
import { Client } from '@/types/client'
import { fetchFolderWithImages, updateFolder, deleteFolder, removeImagesFromFolder } from '@/lib/folders'
import { fetchClients } from '@/lib/clients'
import { fetchTags } from '@/lib/images'
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

export default function FolderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const folderId = params.id as string

  // State
  const [folder, setFolder] = React.useState<ImageFolderWithImages | null>(null)
  const [tags, setTags] = React.useState<ImageTag[]>([])
  const [clients, setClients] = React.useState<Client[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedImages, setSelectedImages] = React.useState<string[]>([])

  // Dialogs
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isShareOpen, setIsShareOpen] = React.useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false)
  const [isRemoveImagesOpen, setIsRemoveImagesOpen] = React.useState(false)

  // Load folder data
  const loadFolder = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const [folderData, tagsData, clientsData] = await Promise.all([
        fetchFolderWithImages(folderId),
        fetchTags(),
        fetchClients()
      ])
      setFolder(folderData)
      setTags(tagsData.tags)
      setClients(clientsData.clients)
    } catch (error) {
      console.error('Error loading folder:', error)
      toast.error('Não foi possível carregar a pasta.')
      router.push('/images/folders')
    } finally {
      setIsLoading(false)
    }
  }, [folderId, router])

  React.useEffect(() => {
    if (folderId) {
      loadFolder()
    }
  }, [folderId, loadFolder])

  // Convert images to include tags
  const imagesWithTags: GalleryImageWithTags[] = React.useMemo(() => {
    if (!folder) return []

    const tagMap = new Map<string, ImageTag>()
    tags.forEach((tag) => tagMap.set(tag.id, tag))

    return folder.images.map((image) => ({
      ...image,
      tagIds: image.tags || [],
      tags: (image.tags || [])
        .map((tagId) => tagMap.get(tagId))
        .filter((tag): tag is ImageTag => tag !== undefined)
    }))
  }, [folder, tags])

  // Handlers
  const handleBack = () => {
    router.push('/images/folders')
  }

  const handleEdit = () => {
    setIsEditOpen(true)
  }

  const handleShare = () => {
    setIsShareOpen(true)
  }

  const handleDeleteClick = () => {
    setIsDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      setIsSubmitting(true)
      await deleteFolder(folderId)
      toast.success('Pasta excluída com sucesso!')
      router.push('/images/folders')
    } catch (error) {
      console.error('Error deleting folder:', error)
      toast.error('Não foi possível excluir a pasta.')
    } finally {
      setIsSubmitting(false)
      setIsDeleteOpen(false)
    }
  }

  const handleRemoveImagesClick = () => {
    if (selectedImages.length === 0) {
      toast.error('Selecione as imagens que deseja remover da pasta.')
      return
    }
    setIsRemoveImagesOpen(true)
  }

  const handleRemoveImagesConfirm = async () => {
    try {
      setIsSubmitting(true)
      await removeImagesFromFolder(folderId, selectedImages)
      toast.success(`${selectedImages.length} imagem(ns) removida(s) da pasta.`)
      setSelectedImages([])
      loadFolder()
    } catch (error) {
      console.error('Error removing images:', error)
      toast.error('Não foi possível remover as imagens.')
    } finally {
      setIsSubmitting(false)
      setIsRemoveImagesOpen(false)
    }
  }

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true)
      await updateFolder(folderId, data)
      toast.success('Pasta atualizada com sucesso!')
      setIsEditOpen(false)
      loadFolder()
    } catch (error) {
      console.error('Error updating folder:', error)
      toast.error('Não foi possível atualizar a pasta.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!folder) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{folder.name}</h1>
              <Badge variant={folder.isPublic ? 'default' : 'secondary'}>
                {folder.isPublic ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Público
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Privado
                  </>
                )}
              </Badge>
            </div>
            {folder.description && (
              <p className="text-muted-foreground mt-1">{folder.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Images className="h-4 w-4" />
                {folder.images.length} {folder.images.length === 1 ? 'imagem' : 'imagens'}
              </span>
              {folder.clientName && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {folder.clientName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(folder.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {folder.isPublic && (
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          )}
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="destructive" onClick={handleDeleteClick}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Selection actions */}
      {selectedImages.length > 0 && (
        <div className="flex items-center justify-between bg-muted rounded-lg p-4">
          <span className="text-sm">
            {selectedImages.length} {selectedImages.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedImages([])}>
              Cancelar seleção
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemoveImagesClick}
            >
              <Minus className="h-4 w-4 mr-2" />
              Remover da pasta
            </Button>
          </div>
        </div>
      )}

      {/* Images grid */}
      <ImageGrid
        images={imagesWithTags}
        selectable
        selectedImages={selectedImages}
        onSelectionChange={setSelectedImages}
        emptyMessage="Esta pasta não contém imagens."
      />

      {/* Edit Dialog */}
      <FolderForm
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        folder={folder}
        clients={clients}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      {/* Share Dialog */}
      <FolderShareDialog
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        folder={folder}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pasta "{folder.name}"?
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

      {/* Remove Images Confirmation */}
      <AlertDialog open={isRemoveImagesOpen} onOpenChange={setIsRemoveImagesOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover imagens</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {selectedImages.length} imagem(ns) desta pasta?
              As imagens não serão excluídas da galeria, apenas removidas desta pasta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveImagesConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
