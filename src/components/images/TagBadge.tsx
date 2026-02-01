'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageTag } from '@/types/image';

interface TagBadgeProps {
  tag: ImageTag;
  onRemove?: () => void;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  selected?: boolean;
  className?: string;
}

export function TagBadge({
  tag,
  onRemove,
  onClick,
  size = 'md',
  interactive = false,
  selected = false,
  className
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-xs gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2'
  };

  // Calculate contrasting text color based on background
  const getContrastColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const textColor = getContrastColor(tag.color);
  const backgroundColor = tag.color;

  return (
    <span
      onClick={interactive ? onClick : undefined}
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-all',
        sizeClasses[size],
        interactive && 'cursor-pointer hover:opacity-80',
        selected && 'ring-2 ring-offset-1 ring-primary',
        className
      )}
      style={{
        backgroundColor,
        color: textColor
      }}
    >
      <span className="truncate max-w-[120px]">{tag.name}</span>

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full hover:bg-black/20 p-0.5 -mr-0.5 transition-colors"
        >
          <X className={cn(
            size === 'sm' && 'h-3 w-3',
            size === 'md' && 'h-3.5 w-3.5',
            size === 'lg' && 'h-4 w-4'
          )} />
        </button>
      )}
    </span>
  );
}

interface TagListProps {
  tags: ImageTag[];
  onRemoveTag?: (tagId: string) => void;
  onTagClick?: (tag: ImageTag) => void;
  selectedTags?: string[];
  size?: 'sm' | 'md' | 'lg';
  maxVisible?: number;
  className?: string;
}

export function TagList({
  tags,
  onRemoveTag,
  onTagClick,
  selectedTags = [],
  size = 'md',
  maxVisible,
  className
}: TagListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible ? Math.max(0, tags.length - maxVisible) : 0;

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleTags.map(tag => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onRemove={onRemoveTag ? () => onRemoveTag(tag.id) : undefined}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
          interactive={!!onTagClick}
          selected={selectedTags.includes(tag.id)}
        />
      ))}

      {hiddenCount > 0 && (
        <span className={cn(
          'inline-flex items-center rounded-full bg-muted text-muted-foreground font-medium',
          size === 'sm' && 'px-1.5 py-0.5 text-xs',
          size === 'md' && 'px-2 py-1 text-xs',
          size === 'lg' && 'px-3 py-1.5 text-sm'
        )}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
