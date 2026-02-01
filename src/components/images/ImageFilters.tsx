'use client';

import * as React from 'react';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { TagBadge, TagList } from './TagBadge';
import { ImageTag, ImageFilters as ImageFiltersType, TagFilterMode } from '@/types/image';

interface ImageFiltersProps {
  filters: ImageFiltersType;
  onFiltersChange: (filters: ImageFiltersType) => void;
  tags: ImageTag[];
  className?: string;
}

export function ImageFilters({
  filters,
  onFiltersChange,
  tags,
  className
}: ImageFiltersProps) {
  const [searchValue, setSearchValue] = React.useState(filters.searchQuery || '');
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== filters.searchQuery) {
        onFiltersChange({ ...filters, searchQuery: searchValue || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleIncludeTagToggle = (tagId: string) => {
    const current = filters.includeTags || [];
    const updated = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    onFiltersChange({
      ...filters,
      includeTags: updated.length > 0 ? updated : undefined
    });
  };

  const handleExcludeTagToggle = (tagId: string) => {
    const current = filters.excludeTags || [];
    const updated = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    onFiltersChange({
      ...filters,
      excludeTags: updated.length > 0 ? updated : undefined
    });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange({});
  };

  const hasActiveFilters = !!(
    filters.searchQuery ||
    (filters.includeTags && filters.includeTags.length > 0) ||
    (filters.excludeTags && filters.excludeTags.length > 0)
  );

  const includeTagObjects = React.useMemo(
    () => tags.filter(tag => filters.includeTags?.includes(tag.id)),
    [tags, filters.includeTags]
  );

  const excludeTagObjects = React.useMemo(
    () => tags.filter(tag => filters.excludeTags?.includes(tag.id)),
    [tags, filters.excludeTags]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and filter bar */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou descrição..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchValue('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Advanced filters popover */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button
              variant={hasActiveFilters ? 'default' : 'outline'}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">
                  {(filters.includeTags?.length || 0) + (filters.excludeTags?.length || 0)}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filtros Avançados</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-8 text-muted-foreground"
                  >
                    Limpar todos
                  </Button>
                )}
              </div>

              <Separator />

              {/* Include tags section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Incluir tags</Label>
                  <Select
                    value={filters.includeMode || 'OR'}
                    onValueChange={(value: TagFilterMode) =>
                      onFiltersChange({ ...filters, includeMode: value })
                    }
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OR">Qualquer</SelectItem>
                      <SelectItem value="AND">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {filters.includeMode === 'AND'
                    ? 'Imagens devem ter TODAS as tags selecionadas'
                    : 'Imagens devem ter PELO MENOS UMA das tags selecionadas'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => {
                    const isSelected = filters.includeTags?.includes(tag.id);
                    const isExcluded = filters.excludeTags?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={isExcluded}
                        onClick={() => handleIncludeTagToggle(tag.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all',
                          isSelected
                            ? 'ring-2 ring-primary ring-offset-1'
                            : 'opacity-60 hover:opacity-100',
                          isExcluded && 'opacity-30 cursor-not-allowed'
                        )}
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Exclude tags section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Excluir tags</Label>
                  <Select
                    value={filters.excludeMode || 'AND'}
                    onValueChange={(value: TagFilterMode) =>
                      onFiltersChange({ ...filters, excludeMode: value })
                    }
                  >
                    <SelectTrigger className="w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OR">Qualquer</SelectItem>
                      <SelectItem value="AND">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {filters.excludeMode === 'AND'
                    ? 'Excluir imagens que tenham TODAS as tags selecionadas'
                    : 'Excluir imagens que tenham QUALQUER uma das tags selecionadas'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(tag => {
                    const isSelected = filters.excludeTags?.includes(tag.id);
                    const isIncluded = filters.includeTags?.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        disabled={isIncluded}
                        onClick={() => handleExcludeTagToggle(tag.id)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-all',
                          isSelected
                            ? 'ring-2 ring-destructive ring-offset-1'
                            : 'opacity-60 hover:opacity-100',
                          isIncluded && 'opacity-30 cursor-not-allowed'
                        )}
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Sort options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Ordenar por</Label>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || 'uploadedAt'}
                    onValueChange={(value: 'uploadedAt' | 'originalName' | 'fileSize') =>
                      onFiltersChange({ ...filters, sortBy: value })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uploadedAt">Data de upload</SelectItem>
                      <SelectItem value="originalName">Nome</SelectItem>
                      <SelectItem value="fileSize">Tamanho</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder || 'desc'}
                    onValueChange={(value: 'asc' | 'desc') =>
                      onFiltersChange({ ...filters, sortOrder: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Decrescente</SelectItem>
                      <SelectItem value="asc">Crescente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {(includeTagObjects.length > 0 || excludeTagObjects.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {includeTagObjects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Incluir:</span>
              <div className="flex flex-wrap gap-1">
                {includeTagObjects.map(tag => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onRemove={() => handleIncludeTagToggle(tag.id)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                ({filters.includeMode === 'AND' ? 'todas' : 'qualquer'})
              </span>
            </div>
          )}
          {excludeTagObjects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Excluir:</span>
              <div className="flex flex-wrap gap-1">
                {excludeTagObjects.map(tag => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onRemove={() => handleExcludeTagToggle(tag.id)}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-1">
                ({filters.excludeMode === 'AND' ? 'todas' : 'qualquer'})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
