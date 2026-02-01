'use client';

import * as React from 'react';
import {
  MoreVertical,
  Edit,
  Trash2,
  Download,
  ExternalLink,
  Tag,
  Calendar,
  FileImage
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TagList } from './TagBadge';
import { GalleryImageWithTags } from '@/types/image';
import { formatFileSize, getMimeTypeLabel } from '@/lib/validators/image';

interface ImageCardProps {
  image: GalleryImageWithTags;
  onEdit?: (image: GalleryImageWithTags) => void;
  onDelete?: (image: GalleryImageWithTags) => void;
  onView?: (image: GalleryImageWithTags) => void;
  selected?: boolean;
  onSelect?: (image: GalleryImageWithTags, selected: boolean) => void;
  selectable?: boolean;
  className?: string;
}

export function ImageCard({
  image,
  onEdit,
  onDelete,
  onView,
  selected = false,
  onSelect,
  selectable = false,
  className
}: ImageCardProps) {
  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(image, !selected);
    } else if (onView) {
      onView(image);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(image.url, '_blank');
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div
      className={cn(
        'group relative rounded-lg border bg-card overflow-hidden transition-all',
        selectable && 'cursor-pointer',
        selected && 'ring-2 ring-primary',
        !selected && selectable && 'hover:border-primary/50',
        className
      )}
      onClick={handleClick}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="absolute top-2 left-2 z-10">
          <div
            className={cn(
              'h-5 w-5 rounded border-2 bg-white/80 backdrop-blur-sm transition-colors flex items-center justify-center',
              selected ? 'border-primary bg-primary' : 'border-gray-400'
            )}
          >
            {selected && (
              <svg
                className="h-3 w-3 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        <img
          src={image.thumbnailUrl || image.url}
          alt={image.description || image.originalName}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay with actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex items-center gap-2">
            {onView && (
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(image);
                }}
                className="h-8"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Ver
              </Button>
            )}
          </div>
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
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(image);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </DropdownMenuItem>
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(image);
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
        <p className="text-sm font-medium truncate" title={image.originalName}>
          {image.originalName}
        </p>

        {/* Tags */}
        {image.tags.length > 0 && (
          <TagList tags={image.tags} size="sm" maxVisible={3} />
        )}

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileImage className="h-3 w-3" />
            {getMimeTypeLabel(image.mimeType)}
          </span>
          <span>{formatFileSize(image.fileSize)}</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(image.uploadedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface ImageGridProps {
  images: GalleryImageWithTags[];
  onEdit?: (image: GalleryImageWithTags) => void;
  onDelete?: (image: GalleryImageWithTags) => void;
  onView?: (image: GalleryImageWithTags) => void;
  selectedImages?: string[];
  onSelectionChange?: (imageIds: string[]) => void;
  selectable?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function ImageGrid({
  images,
  onEdit,
  onDelete,
  onView,
  selectedImages = [],
  onSelectionChange,
  selectable = false,
  emptyMessage = 'Nenhuma imagem encontrada',
  className
}: ImageGridProps) {
  const handleSelect = (image: GalleryImageWithTags, selected: boolean) => {
    if (!onSelectionChange) return;

    if (selected) {
      onSelectionChange([...selectedImages, image.id]);
    } else {
      onSelectionChange(selectedImages.filter(id => id !== image.id));
    }
  };

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileImage className="h-12 w-12 mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4',
        className
      )}
    >
      {images.map((image) => (
        <ImageCard
          key={image.id}
          image={image}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          selected={selectedImages.includes(image.id)}
          onSelect={selectable ? handleSelect : undefined}
          selectable={selectable}
        />
      ))}
    </div>
  );
}
