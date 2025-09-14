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
import { 
  Ingredient, 
  IngredientCategory, 
  IngredientFilters,
  StockStatus 
} from '@/types/ingredient';
import { 
  fetchIngredients, 
  getStockStatus, 
  getStockStatusText, 
  formatPrice, 
  formatStock,
  formatMeasurement,
  getUnitDisplayName
} from '@/lib/ingredients';
import { fetchSuppliers } from '@/lib/suppliers';
import { Search, Plus, Package, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngredientListProps {
  onIngredientEdit?: (ingredient: Ingredient) => void;
  onIngredientDelete?: (ingredient: Ingredient) => void;
  onIngredientView?: (ingredient: Ingredient) => void;
  onIngredientCreate?: () => void;
  onIngredientsLoaded?: (ingredients: Ingredient[]) => void;
  onRefresh?: () => void;
  className?: string;
}


export function IngredientList({
  onIngredientEdit,
  onIngredientDelete,
  onIngredientView,
  onIngredientCreate,
  onIngredientsLoaded,
  onRefresh,
  className
}: IngredientListProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<IngredientFilters>({
    searchQuery: '',
    category: undefined,
    supplierId: undefined,
    stockStatus: undefined
  });

  // Debounce the search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const loadedIngredients = await fetchIngredients(filters);
      setIngredients(loadedIngredients);
      setError(null);
      
      // Notify parent component
      if (onIngredientsLoaded) {
        onIngredientsLoaded(loadedIngredients);
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
      setError(error instanceof Error ? error.message : 'Erro interno do servidor');
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const response = await fetchSuppliers();
      setSuppliers(response.suppliers || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, searchQuery: debouncedSearchQuery }));
  }, [debouncedSearchQuery]);

  useEffect(() => {
    loadIngredients();
  }, [filters]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: value === 'all' ? undefined : value as IngredientCategory 
    }));
  };

  const handleSupplierChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      supplierId: value === 'all' ? undefined : value 
    }));
  };

  const handleStockStatusChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      stockStatus: value === 'all' ? undefined : value as StockStatus 
    }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      category: undefined,
      supplierId: undefined,
      stockStatus: undefined
    });
  };

  const hasActiveFilters = Boolean(
    filters.searchQuery || 
    filters.category || 
    filters.supplierId || 
    filters.stockStatus
  );

  const getCategoryName = (category: IngredientCategory) => {
    const names = {
      [IngredientCategory.FLOUR]: 'Farinha',
      [IngredientCategory.SUGAR]: 'Açúcar',
      [IngredientCategory.DAIRY]: 'Laticínios',
      [IngredientCategory.EGGS]: 'Ovos',
      [IngredientCategory.FATS]: 'Gorduras',
      [IngredientCategory.LEAVENING]: 'Fermentos',
      [IngredientCategory.FLAVORING]: 'Aromas',
      [IngredientCategory.NUTS]: 'Castanhas',
      [IngredientCategory.FRUITS]: 'Frutas',
      [IngredientCategory.CHOCOLATE]: 'Chocolate',
      [IngredientCategory.SPICES]: 'Temperos',
      [IngredientCategory.PRESERVATIVES]: 'Conservantes',
      [IngredientCategory.OTHER]: 'Outros'
    };
    return names[category];
  };

  const getStockStatusName = (status: StockStatus) => {
    const names = {
      good: 'Estoque bom',
      low: 'Estoque baixo', 
      critical: 'Estoque crítico',
      out: 'Sem estoque'
    };
    return names[status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando ingredientes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
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
              placeholder="Buscar ingredientes..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {onIngredientCreate && (
            <Button onClick={onIngredientCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.values(IngredientCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.supplierId || 'all'} onValueChange={handleSupplierChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os fornecedores</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.stockStatus || 'all'} onValueChange={handleStockStatusChange}>
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
            {filters.searchQuery && (
              <Badge variant="secondary">
                Busca: {filters.searchQuery}
              </Badge>
            )}
            {filters.category && (
              <Badge variant="secondary">
                {getCategoryName(filters.category)}
              </Badge>
            )}
            {filters.supplierId && (
              <Badge variant="secondary">
                {suppliers.find(s => s.id === filters.supplierId)?.name}
              </Badge>
            )}
            {filters.stockStatus && (
              <Badge variant="secondary">
                {getStockStatusName(filters.stockStatus)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {ingredients.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "Nenhum ingrediente encontrado" : "Nenhum ingrediente cadastrado"}
          description={
            hasActiveFilters 
              ? "Tente ajustar os filtros para encontrar ingredientes"
              : "Adicione ingredientes para criar receitas e controlar seu estoque"
          }
          action={onIngredientCreate ? {
            label: "Adicionar Ingrediente",
            onClick: onIngredientCreate
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {ingredients.length} ingrediente{ingredients.length !== 1 ? 's' : ''} encontrado{ingredients.length !== 1 ? 's' : ''}
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            )}
          </div>

          <div className="border rounded-md">
            <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ingrediente</TableHead>
                      <TableHead>Medida</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ingredient) => {
                      const stockStatus = getStockStatus(ingredient.currentStock, ingredient.minStock);
                      return (
                        <TableRow key={ingredient.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {ingredient.name}
                                {ingredient.brand && <span className="text-muted-foreground"> - {ingredient.brand}</span>}
                              </div>
                              {ingredient.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {ingredient.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm">
                              {formatMeasurement(ingredient.measurementValue, ingredient.unit)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getCategoryName(ingredient.category)}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {formatStock(ingredient.currentStock)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Mín: {formatStock(ingredient.minStock)}
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm font-medium">
                              {formatPrice(ingredient.currentPrice)}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge 
                              variant={stockStatus === 'good' ? 'default' : stockStatus === 'out' ? 'destructive' : 'secondary'}
                              className={cn(
                                'text-xs',
                                stockStatus === 'low' && 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
                                stockStatus === 'critical' && 'bg-orange-100 text-orange-800 hover:bg-orange-100'
                              )}
                            >
                              {getStockStatusText(stockStatus)}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {onIngredientView && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onIngredientView(ingredient)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {onIngredientEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onIngredientEdit(ingredient)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              {onIngredientDelete && (
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
                                        Tem certeza de que deseja excluir o ingrediente "{ingredient.name}"? 
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          setDeletingId(ingredient.id);
                                          onIngredientDelete(ingredient);
                                          setDeletingId(null);
                                        }}
                                        disabled={deletingId === ingredient.id}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        {deletingId === ingredient.id ? 'Excluindo...' : 'Excluir'}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}