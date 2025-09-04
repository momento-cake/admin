'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { IngredientCard, IngredientCardCompact } from './IngredientCard';
import { 
  Ingredient, 
  IngredientCategory, 
  IngredientFilters,
  StockStatus 
} from '@/types/ingredient';
import { fetchIngredients } from '@/lib/ingredients';
import { fetchSuppliers } from '@/lib/suppliers';
import { Search, Filter, Grid, List, Plus, Package, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngredientListProps {
  onIngredientEdit?: (ingredient: Ingredient) => void;
  onIngredientDelete?: (ingredient: Ingredient) => void;
  onIngredientView?: (ingredient: Ingredient) => void;
  onIngredientCreate?: () => void;
  onIngredientsLoaded?: (ingredients: Ingredient[]) => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export function IngredientList({
  onIngredientEdit,
  onIngredientDelete,
  onIngredientView,
  onIngredientCreate,
  onIngredientsLoaded,
  className
}: IngredientListProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchInput, setSearchInput] = useState('');
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
      const response = await fetchIngredients(filters);
      const loadedIngredients = response.ingredients || [];
      setIngredients(loadedIngredients);
      
      // Notify parent component
      if (onIngredientsLoaded) {
        onIngredientsLoaded(loadedIngredients);
      }
    } catch (error) {
      console.error('Error loading ingredients:', error);
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
      <div className={cn('space-y-6', className)}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Carregando ingredientes...</span>
        </div>
      </div>
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
          
          <div className="flex gap-2">
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="border-0 rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="border-0 rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            {onIngredientCreate && (
              <Button onClick={onIngredientCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
              <SelectTrigger>
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
              <SelectTrigger>
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
              <SelectTrigger>
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
          </div>

          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {ingredients.length} {ingredients.length === 1 ? 'ingrediente' : 'ingredientes'}
            </p>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ingredients.map((ingredient) => (
                <IngredientCard
                  key={ingredient.id}
                  ingredient={ingredient}
                  onEdit={onIngredientEdit}
                  onDelete={onIngredientDelete}
                  onView={onIngredientView}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ingredient) => (
                <IngredientCardCompact
                  key={ingredient.id}
                  ingredient={ingredient}
                  onEdit={onIngredientEdit}
                  onDelete={onIngredientDelete}
                  onView={onIngredientView}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}