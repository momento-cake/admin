'use client';

import * as React from 'react';
import { Plus, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { TagBadge, TagList } from './TagBadge';
import { TagForm } from './TagForm';
import { ImageTag, DEFAULT_TAG_COLOR } from '@/types/image';
import { CreateTagFormData } from '@/lib/validators/image';

interface TagSelectorProps {
  tags: ImageTag[];
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
  onCreateTag?: (data: CreateTagFormData) => Promise<ImageTag>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TagSelector({
  tags,
  selectedTags,
  onTagsChange,
  onCreateTag,
  disabled = false,
  placeholder = 'Selecione tags...',
  className
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedTagObjects = React.useMemo(
    () => tags.filter(tag => selectedTags.includes(tag.id)),
    [tags, selectedTags]
  );

  const filteredTags = React.useMemo(
    () => tags.filter(tag =>
      tag.name.toLowerCase().includes(search.toLowerCase())
    ),
    [tags, search]
  );

  const handleToggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter(id => id !== tagId));
  };

  const handleCreateTag = async (data: CreateTagFormData) => {
    if (onCreateTag) {
      const newTag = await onCreateTag(data);
      // Auto-select the newly created tag
      onTagsChange([...selectedTags, newTag.id]);
    }
    setShowCreateForm(false);
    setSearch('');
  };

  // Check if search matches an existing tag
  const searchMatchesExisting = search && tags.some(
    tag => tag.name.toLowerCase() === search.toLowerCase()
  );

  // Check if we should show create option
  const showCreateOption = search && !searchMatchesExisting && onCreateTag;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagObjects.map(tag => (
            <TagBadge
              key={tag.id}
              tag={tag}
              onRemove={disabled ? undefined : () => handleRemoveTag(tag.id)}
              size="md"
            />
          ))}
        </div>
      )}

      {/* Tag selector popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">
              {selectedTags.length > 0
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selecionada${selectedTags.length > 1 ? 's' : ''}`
                : placeholder}
            </span>
            <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[300px] p-0" align="start">
          {/* Search input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Buscar ou criar tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Tag list */}
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filteredTags.length === 0 && !showCreateOption ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {search ? 'Nenhuma tag encontrada' : 'Nenhuma tag disponível'}
              </p>
            ) : (
              <div className="space-y-0.5">
                {filteredTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        'flex items-center w-full px-2 py-1.5 rounded-sm text-sm hover:bg-accent',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <div
                        className="h-3 w-3 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-left truncate">{tag.name}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create new tag option */}
          {showCreateOption && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center w-full px-2 py-1.5 rounded-sm text-sm hover:bg-accent text-primary"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span>Criar tag &quot;{search}&quot;</span>
              </button>
            </div>
          )}

          {/* Create button for new tag without search */}
          {onCreateTag && !search && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center w-full px-2 py-1.5 rounded-sm text-sm hover:bg-accent text-primary"
              >
                <Plus className="h-4 w-4 mr-2 shrink-0" />
                <span>Criar nova tag</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Create tag form */}
      {onCreateTag && (
        <TagForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSubmit={handleCreateTag}
          existingNames={tags.map(t => t.name)}
        />
      )}
    </div>
  );
}
