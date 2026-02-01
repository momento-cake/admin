'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Search, X, Check, Images, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ImageCard, ImageGrid } from '@/components/images/ImageCard'
import { ImageFilters as ImageFiltersComponent } from '@/components/images/ImageFilters'
import { fetchImagesWithTags, fetchTags } from '@/lib/images'
import { GalleryImageWithTags, ImageTag, ImageFilters } from '@/types/image'
import { cn } from '@/lib/utils'

interface ImageSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedImageIds: string[]
  onConfirm: (imageIds: string[]) => void
  title?: string
  description?: string
}

export function ImageSelectorDialog({
  open,
  onOpenChange,
  selectedImageIds,
  onConfirm,
  title = 'Selecionar Imagens',
  description = 'Selecione as imagens que deseja adicionar à pasta.'
}: ImageSelectorDialogProps) {
  // Only render content when dialog is open to prevent hydration issues
  if (!open) {
    return null
  }

  return (
    <ImageSelectorDialogContent
      open={open}
      onOpenChange={onOpenChange}
      selectedImageIds={selectedImageIds}
      onConfirm={onConfirm}
      title={title}
      description={description}
    />
  )
}

function ImageSelectorDialogContent({
  open,
  onOpenChange,
  selectedImageIds,
  onConfirm,
  title,
  description
}: ImageSelectorDialogProps) {
  const [images, setImages] = useState<GalleryImageWithTags[]>([])
  const [tags, setTags] = useState<ImageTag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ImageFilters>({})
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedImageIds)

  // Load images and tags
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [imagesData, tagsResponse] = await Promise.all([
          fetchImagesWithTags(filters),
          fetchTags()
        ])

        setImages(imagesData)
        setTags(tagsResponse.tags)
      } catch (err) {
        console.error('Error loading images:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar imagens')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filters])

  // Reset local selection when dialog opens with new selectedImageIds
  useEffect(() => {
    setLocalSelectedIds(selectedImageIds)
  }, [selectedImageIds, open])

  const handleSelectionChange = (imageIds: string[]) => {
    setLocalSelectedIds(imageIds)
  }

  const handleSelectAll = () => {
    setLocalSelectedIds(images.map(img => img.id))
  }

  const handleDeselectAll = () => {
    setLocalSelectedIds([])
  }

  const handleConfirm = () => {
    onConfirm(localSelectedIds)
    onOpenChange(false)
  }

  const handleCancel = () => {
    setLocalSelectedIds(selectedImageIds)
    onOpenChange(false)
  }

  const selectedCount = localSelectedIds.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col px-6">
          {/* Filters */}
          <div className="py-4 border-b">
            <ImageFiltersComponent
              filters={filters}
              onFiltersChange={setFilters}
              tags={tags}
            />
          </div>

          {/* Selection toolbar */}
          <div className="flex items-center justify-between py-3 border-b">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedCount} {selectedCount === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
              </span>
              {images.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    disabled={selectedCount === images.length}
                  >
                    Selecionar todas
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedCount === 0}
                  >
                    Limpar seleção
                  </Button>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {images.length} {images.length === 1 ? 'imagem disponível' : 'imagens disponíveis'}
            </span>
          </div>

          {/* Images grid */}
          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-destructive">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setFilters({})}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Images className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma imagem encontrada</p>
                {Object.keys(filters).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setFilters({})}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <ImageGrid
                images={images}
                selectedImages={localSelectedIds}
                onSelectionChange={handleSelectionChange}
                selectable={true}
                emptyMessage="Nenhuma imagem encontrada"
              />
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center gap-3 w-full justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Images className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{selectedCount}</span>
              <span className="text-muted-foreground">
                {selectedCount === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar seleção
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
