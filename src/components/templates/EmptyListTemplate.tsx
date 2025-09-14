'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Search, Plus, Package, RefreshCw, Eye, Edit, Trash2, Filter, X, SortAsc, SortDesc } from 'lucide-react';
import { cn } from '@/lib/utils';

// Example interfaces for demonstration
interface ExampleItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  value: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ExampleFilters {
  searchQuery?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'pending';
  minValue?: number;
  maxValue?: number;
}

interface EmptyListTemplateProps {
  onItemCreate?: () => void;
  onItemEdit?: (item: ExampleItem) => void;
  onItemView?: (item: ExampleItem) => void;
  onItemDelete?: (item: ExampleItem) => void;
  onRefresh?: () => void;
  className?: string;
}

/**
 * EmptyListTemplate - A comprehensive template showing all common patterns for list screens
 * 
 * This template demonstrates:
 * - Search functionality with debouncing
 * - Multiple filter types (dropdown, range, status)
 * - Active filter display with badges
 * - Empty states (no items vs no search results)
 * - Loading states
 * - Error handling
 * - Table with sorting indicators
 * - Action buttons (view, edit, delete)
 * - Confirmation dialogs
 * - Pagination (structure shown)
 * - Bulk actions (structure shown)
 * - Export functionality (structure shown)
 * 
 * Usage patterns:
 * 1. Copy this file as a starting point for new list screens
 * 2. Replace ExampleItem with your actual data type
 * 3. Replace ExampleFilters with your actual filter type
 * 4. Implement the actual data fetching logic
 * 5. Customize the table columns for your data
 * 6. Update the filter options for your use case
 * 7. Customize the empty state messages and icons
 */
export function EmptyListTemplate({
  onItemCreate,
  onItemEdit,
  onItemView,
  onItemDelete,
  onRefresh,
  className
}: EmptyListTemplateProps) {
  // State management
  const [items, setItems] = useState<ExampleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof ExampleItem>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Filters state
  const [filters, setFilters] = useState<ExampleFilters>({
    searchQuery: '',
    category: undefined,
    status: undefined,
    minValue: undefined,
    maxValue: undefined
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Debounce search to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  // Mock data loading function
  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock empty result for demonstration
      setItems([]);
      setTotalItems(0);
      
    } catch (error) {
      console.error('Error loading items:', error);
      setError(error instanceof Error ? error.message : 'Erro interno do servidor');
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, searchQuery: debouncedSearchQuery }));
  }, [debouncedSearchQuery]);

  // Reload data when filters change
  useEffect(() => {
    loadItems();
  }, [filters, sortField, sortOrder, currentPage, itemsPerPage]);

  // Event handlers
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: value === 'all' ? undefined : value 
    }));
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      status: value === 'all' ? undefined : value as 'active' | 'inactive' | 'pending'
    }));
    setCurrentPage(1);
  };

  const handleValueRangeChange = (field: 'minValue' | 'maxValue', value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      [field]: value === '' ? undefined : parseFloat(value)
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      category: undefined,
      status: undefined,
      minValue: undefined,
      maxValue: undefined
    });
    setCurrentPage(1);
  };

  const handleSort = (field: keyof ExampleItem) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItems(
      selectedItems.length === items.length 
        ? [] 
        : items.map(item => item.id)
    );
  };

  // Utility functions
  const hasActiveFilters = Boolean(
    filters.searchQuery || 
    filters.category || 
    filters.status || 
    filters.minValue !== undefined || 
    filters.maxValue !== undefined
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(date);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando itens...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadItems}
            className="ml-2"
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        {/* Search and Primary Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar itens..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {onItemCreate && (
              <Button onClick={onItemCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
            
            {/* Bulk Actions (shown when items are selected) */}
            {selectedItems.length > 0 && (
              <Button variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir ({selectedItems.length})
              </Button>
            )}
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                <SelectItem value="category1">Categoria 1</SelectItem>
                <SelectItem value="category2">Categoria 2</SelectItem>
                <SelectItem value="category3">Categoria 3</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
              </SelectContent>
            </Select>

            {/* Value Range Filters */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                placeholder="Valor mín."
                value={filters.minValue || ''}
                onChange={(e) => handleValueRangeChange('minValue', e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Valor máx."
                value={filters.maxValue || ''}
                onChange={(e) => handleValueRangeChange('maxValue', e.target.value)}
                className="w-24"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2">
            {filters.searchQuery && (
              <Badge variant="secondary">
                Busca: {filters.searchQuery}
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary">
                Categoria: {filters.category}
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary">
                Status: {filters.status}
              </Badge>
            )}
            {(filters.minValue !== undefined || filters.maxValue !== undefined) && (
              <Badge variant="secondary">
                Valor: {filters.minValue || '0'} - {filters.maxValue || '∞'}
              </Badge>
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Results Section */}
      {items.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "Nenhum item encontrado" : "Nenhum item cadastrado"}
          description={
            hasActiveFilters 
              ? "Tente ajustar os filtros para encontrar itens"
              : "Adicione itens para começar a gerenciar sua lista"
          }
          action={onItemCreate ? {
            label: "Adicionar Item",
            onClick: onItemCreate
          } : undefined}
        />
      ) : (
        /* Data Table */
        <div className="space-y-4">
          {/* Results Summary and Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                {totalItems} item{totalItems !== 1 ? 's' : ''} encontrado{totalItems !== 1 ? 's' : ''}
                {selectedItems.length > 0 && (
                  <span className="ml-2">
                    ({selectedItems.length} selecionado{selectedItems.length !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
              
              {/* Items per page selector */}
              <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                <SelectTrigger className="w-auto">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="25">25 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              )}
              
              {/* Export functionality */}
              <Button variant="outline" size="sm">
                Exportar
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {/* Select All Checkbox */}
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length && items.length > 0}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </TableHead>
                  
                  {/* Sortable Columns */}
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('name')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Nome
                      {sortField === 'name' && (
                        sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('value')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Valor
                      {sortField === 'value' && (
                        sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('updatedAt')}
                      className="h-auto p-0 font-medium hover:bg-transparent"
                    >
                      Atualizado
                      {sortField === 'updatedAt' && (
                        sortOrder === 'asc' ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    {/* Select Checkbox */}
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className="rounded"
                      />
                    </TableCell>
                    
                    {/* Item Details */}
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(item.status)} className="text-xs">
                        {item.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-medium">
                        {formatValue(item.value)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(item.updatedAt)}
                      </div>
                    </TableCell>
                    
                    {/* Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onItemView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemView(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onItemEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onItemEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onItemDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza de que deseja excluir o item "{item.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeletingId(item.id);
                                    onItemDelete(item);
                                    setDeletingId(null);
                                  }}
                                  disabled={deletingId === item.id}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deletingId === item.id ? 'Excluindo...' : 'Excluir'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalItems > itemsPerPage && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} até {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} itens
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => (
                    <Button
                      key={i + 1}
                      variant={currentPage === i + 1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / itemsPerPage), prev + 1))}
                  disabled={currentPage === Math.ceil(totalItems / itemsPerPage)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}