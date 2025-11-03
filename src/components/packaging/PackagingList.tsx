'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Packaging, PackagingCategory, StockStatus } from '@/types/packaging';
import { fetchPackaging } from '@/lib/packaging';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Edit, Trash2, Plus, Package, Search, RefreshCw } from 'lucide-react';
import { StockLevelIndicator } from './StockLevelIndicator';
import { LoadMoreButton } from './LoadMoreButton';
import { EmptyState } from './EmptyState';
import { getStockStatus, formatPrice, getCategoryDisplayName } from '@/lib/packaging';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface PackagingListProps {
  onPackagingCreate?: () => void;
  onPackagingEdit?: (packaging: Packaging) => void;
  onPackagingView?: (packaging: Packaging) => void;
  onPackagingDelete?: (packaging: Packaging) => void;
  onManageStock?: (packaging: Packaging) => void;
  onRefresh?: () => void;
  refreshTrigger?: React.MutableRefObject<() => void>;
  className?: string;
}

const ITEMS_PER_PAGE = 50;

export function PackagingList({
  onPackagingCreate,
  onPackagingEdit,
  onPackagingView,
  onPackagingDelete,
  onManageStock,
  onRefresh,
  refreshTrigger,
  className
}: PackagingListProps) {
  const [packagings, setPackagings] = useState<Packaging[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState<PackagingCategory | undefined>(undefined);
  const [filterStock, setFilterStock] = useState<StockStatus | undefined>(undefined);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);

  // Debounce the search query
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  // Load packaging items
  const loadPackagings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPackaging();
      setPackagings(data);
    } catch (err) {
      console.error('Error loading packagings:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar embalagens');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set refresh trigger if provided
  useEffect(() => {
    if (refreshTrigger) {
      refreshTrigger.current = loadPackagings;
    }
  }, [loadPackagings, refreshTrigger]);

  useEffect(() => {
    loadPackagings();
  }, [loadPackagings]);

  // Filter and sort packagings
  const filteredAndSortedPackagings = useMemo(() => {
    let filtered = packagings.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesCategory = !filterCategory || p.category === filterCategory;
      const matchesStock = !filterStock || getStockStatus(p.currentStock, p.minStock) === filterStock;

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Sort
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'price':
          compareValue = a.currentPrice - b.currentPrice;
          break;
        case 'stock':
          compareValue = a.currentStock - b.currentStock;
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [packagings, debouncedSearchQuery, sortBy, sortOrder, filterCategory, filterStock]);

  // Check if any filters are active
  const hasActiveFilters = Boolean(debouncedSearchQuery || filterCategory || filterStock);

  // Helper functions for filter display
  const getStockStatusName = (status: StockStatus) => {
    const names = {
      good: 'Estoque bom',
      low: 'Estoque baixo',
      critical: 'Estoque crítico',
      out: 'Sem estoque'
    };
    return names[status];
  };

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const handleCategoryChange = (value: string) => {
    setFilterCategory(value === 'all' ? undefined : (value as PackagingCategory));
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const handleStockStatusChange = (value: string) => {
    setFilterStock(value === 'all' ? undefined : (value as StockStatus));
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilterCategory(undefined);
    setFilterStock(undefined);
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const displayedPackagings = filteredAndSortedPackagings.slice(0, displayedCount);
  const hasMore = displayedCount < filteredAndSortedPackagings.length;

  const handleLoadMore = useCallback(() => {
    setDisplayedCount(prev => prev + ITEMS_PER_PAGE);
  }, []);

  const handleSort = useCallback((column: 'name' | 'price' | 'stock') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const handleDelete = useCallback(async (packaging: Packaging) => {
    if (confirm(`Tem certeza que deseja deletar "${packaging.name}"?`)) {
      try {
        onPackagingDelete(packaging);
        setPackagings(prev => prev.filter(p => p.id !== packaging.id));
      } catch (err) {
        console.error('Error deleting packaging:', err);
        setError('Erro ao deletar embalagem');
      }
    }
  }, [onPackagingDelete]);

  const SortableHeader = ({
    column,
    label
  }: {
    column: 'name' | 'price' | 'stock';
    label: string
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === column && (
          <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  if (loading && packagings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Carregando embalagens...</p>
        </div>
      </div>
    );
  }

  if (error && packagings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onRefresh}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  if (packagings.length === 0) {
    return <EmptyState onCreateClick={onPackagingCreate} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar embalagens..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {onPackagingCreate && (
            <Button onClick={onPackagingCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterCategory || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.values(PackagingCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStock || 'all'} onValueChange={handleStockStatusChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Status do estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="good">Estoque bom</SelectItem>
                <SelectItem value="low">Estoque baixo</SelectItem>
                <SelectItem value="critical">Estoque crítico</SelectItem>
                <SelectItem value="out">Sem estoque</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="ml-2">
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {debouncedSearchQuery && (
              <Badge variant="secondary">
                Busca: {debouncedSearchQuery}
              </Badge>
            )}
            {filterCategory && (
              <Badge variant="secondary">
                {getCategoryDisplayName(filterCategory)}
              </Badge>
            )}
            {filterStock && (
              <Badge variant="secondary">
                {getStockStatusName(filterStock)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {packagings.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "Nenhuma embalagem encontrada" : "Nenhuma embalagem cadastrada"}
          description={
            hasActiveFilters
              ? "Tente ajustar os filtros para encontrar embalagens"
              : "Adicione embalagens para controlar seu inventário"
          }
          action={onPackagingCreate ? {
            label: "Adicionar Embalagem",
            onClick: onPackagingCreate
          } : undefined}
        />
      ) : (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedPackagings.length} embalagem{filteredAndSortedPackagings.length !== 1 ? 's' : ''} encontrada{filteredAndSortedPackagings.length !== 1 ? 's' : ''}
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader column="name" label="Nome" />
                <TableHead className="w-[150px]">Marca</TableHead>
                <TableHead className="w-[100px]">Unidade</TableHead>
                <SortableHeader column="price" label="Preço (R$)" />
                <SortableHeader column="stock" label="Estoque" />
                <TableHead className="w-[80px]">Mín.</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedPackagings.map((packaging) => {
                const status = getStockStatus(packaging.currentStock, packaging.minStock);

                return (
                  <TableRow key={packaging.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{packaging.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {packaging.brand || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{packaging.unit}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatPrice(packaging.currentPrice)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {packaging.currentStock}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {packaging.minStock}
                    </TableCell>
                    <TableCell>
                      <StockLevelIndicator
                        currentStock={packaging.currentStock}
                        minStock={packaging.minStock}
                        status={status}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onManageStock && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onManageStock(packaging)}
                            title="Gerenciar Estoque"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        )}
                        {onPackagingEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPackagingEdit(packaging)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onPackagingDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(packaging)}
                            title="Deletar"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Load More Button */}
          {hasMore && (
            <LoadMoreButton
              onClick={handleLoadMore}
              isLoading={loading}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders when parent component updates
// but props haven't changed
export const MemoizedPackagingList = memo(PackagingList);
