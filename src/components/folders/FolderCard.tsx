'use client'

import * as React from 'react'
import {
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  FolderOpen,
  Images,
  Calendar,
  User,
  Link,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { ImageFolder } from '@/types/folder'

interface FolderCardProps {
  folder: ImageFolder
  coverImageUrl?: string
  onEdit?: (folder: ImageFolder) => void
  onDelete?: (folder: ImageFolder) => void
  onView?: (folder: ImageFolder) => void
  onShare?: (folder: ImageFolder) => void
  className?: string
}

export function FolderCard({
  folder,
  coverImageUrl,
  onEdit,
  onDelete,
  onView,
  onShare,
  className
}: FolderCardProps) {
  const formatDate = (timestamp: any) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  const handleClick = () => {
    if (onView) {
      onView(folder)
    }
  }

  const copyPublicUrl = () => {
    const publicUrl = `${window.location.origin}/gallery/${folder.slug}`
    navigator.clipboard.writeText(publicUrl)
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden transition-all cursor-pointer hover:border-primary/50 hover:shadow-md',
        className
      )}
      onClick={handleClick}
    >
      {/* Cover Image */}
      <div className="aspect-video relative overflow-hidden bg-muted">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={folder.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}

        {/* Public/Private badge */}
        <div className="absolute top-2 left-2">
          <Badge variant={folder.isPublic ? 'default' : 'secondary'} className="gap-1">
            {folder.isPublic ? (
              <>
                <Eye className="h-3 w-3" />
                Público
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                Privado
              </>
            )}
          </Badge>
        </div>

        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/80 backdrop-blur-sm"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onView(folder)
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(folder)
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {folder.isPublic && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    copyPublicUrl()
                  }}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Copiar link público
                </DropdownMenuItem>
              )}
              {onShare && folder.isPublic && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onShare(folder)
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Compartilhar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(folder)
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium truncate" title={folder.name}>
          {folder.name}
        </p>

        {folder.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {folder.description}
          </p>
        )}

        {/* Client binding */}
        {folder.clientName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate">{folder.clientName}</span>
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Images className="h-3 w-3" />
            {folder.imageIds.length} {folder.imageIds.length === 1 ? 'imagem' : 'imagens'}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(folder.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

interface FolderGridProps {
  folders: ImageFolder[]
  coverImages?: Map<string, string>
  onEdit?: (folder: ImageFolder) => void
  onDelete?: (folder: ImageFolder) => void
  onView?: (folder: ImageFolder) => void
  onShare?: (folder: ImageFolder) => void
  emptyMessage?: string
  className?: string
}

export function FolderGrid({
  folders,
  coverImages = new Map(),
  onEdit,
  onDelete,
  onView,
  onShare,
  emptyMessage = 'Nenhuma pasta encontrada',
  className
}: FolderGridProps) {
  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
        className
      )}
    >
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          coverImageUrl={coverImages.get(folder.coverImageId || '')}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onShare={onShare}
        />
      ))}
    </div>
  )
}
