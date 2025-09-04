'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, SortAsc, SortDesc } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { IngredientCategory, StockStatus, IngredientUnit, IngredientFilters } from '@/types/ingredient';
import { useDebounce } from '@/hooks/useDebounce';

interface AdvancedSearchProps {
  onFiltersChange: (filters: AdvancedFilters) => void;
  suppliers?: Array<{ id: string; name: string }>;
  totalResults?: number;
}

export interface AdvancedFilters extends IngredientFilters {
  sortBy?: 'name' | 'price' | 'stock' | 'lastUpdated' | 'category';
  sortOrder?: 'asc' | 'desc';
  priceRange?: [number, number];
  stockRange?: [number, number];
  units?: IngredientUnit[];
  categories?: IngredientCategory[];
  stockStatuses?: StockStatus[];
  includeInactive?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  lastUpdatedAfter?: string;
  lastUpdatedBefore?: string;
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'price', label: 'Preço' },
  { value: 'stock', label: 'Estoque' },
  { value: 'lastUpdated', label: 'Última atualização' },
  { value: 'category', label: 'Categoria' }
];

export function AdvancedSearch({ onFiltersChange, suppliers = [], totalResults }: AdvancedSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<AdvancedFilters>({
    searchQuery: '',
    sortBy: 'name',
    sortOrder: 'asc',
    priceRange: [0, 1000],
    stockRange: [0, 100],
    units: [],
    categories: [],
    stockStatuses: [],
    includeInactive: false
  });

  const debouncedSearchQuery = useDebounce(searchInput, 300);

  useEffect(() => {
    const updatedFilters = { ...filters, searchQuery: debouncedSearchQuery };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  const updateFilters = (updates: Partial<AdvancedFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const toggleArrayFilter = <T,>(
    array: T[],
    value: T,
    setArray: (newArray: T[]) => void
  ) => {
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      sortBy: 'name',
      sortOrder: 'asc',
      priceRange: [0, 1000],
      stockRange: [0, 100],
      units: [],
      categories: [],
      stockStatuses: [],
      includeInactive: false
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.category) count++;
    if (filters.supplierId) count++;
    if (filters.stockStatus) count++;
    if (filters.units?.length) count++;
    if (filters.categories?.length) count++;
    if (filters.stockStatuses?.length) count++;
    if (filters.includeInactive) count++;
    if (filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000)) count++;
    if (filters.stockRange && (filters.stockRange[0] > 0 || filters.stockRange[1] < 100)) count++;
    if (filters.createdAfter || filters.createdBefore) count++;
    if (filters.lastUpdatedAfter || filters.lastUpdatedBefore) count++;
    return count;
  };

  const getCategoryName = (category: IngredientCategory) => {
    const names = {
      [IngredientCategory.FLOUR]: 'Farinhas',
      [IngredientCategory.SUGAR]: 'Açúcares',
      [IngredientCategory.DAIRY]: 'Laticínios',
      [IngredientCategory.EGGS]: 'Ovos',
      [IngredientCategory.FATS]: 'Gorduras',
      [IngredientCategory.LEAVENING]: 'Fermentos',
      [IngredientCategory.FLAVORING]: 'Aromatizantes',
      [IngredientCategory.NUTS]: 'Castanhas',
      [IngredientCategory.FRUITS]: 'Frutas',
      [IngredientCategory.CHOCOLATE]: 'Chocolate',
      [IngredientCategory.SPICES]: 'Temperos',
      [IngredientCategory.PRESERVATIVES]: 'Conservantes',
      [IngredientCategory.OTHER]: 'Outros'
    };
    return names[category];
  };

  const getUnitName = (unit: IngredientUnit) => {
    const names = {
      [IngredientUnit.KILOGRAM]: 'Kg',
      [IngredientUnit.GRAM]: 'g',
      [IngredientUnit.LITER]: 'L',
      [IngredientUnit.MILLILITER]: 'ml',
      [IngredientUnit.UNIT]: 'Unidade',
      [IngredientUnit.POUND]: 'lb',
      [IngredientUnit.OUNCE]: 'oz',
      [IngredientUnit.CUP]: 'Xícara',
      [IngredientUnit.TABLESPOON]: 'Colher de sopa',
      [IngredientUnit.TEASPOON]: 'Colher de chá'
    };
    return names[unit];
  };

  const getStatusName = (status: StockStatus) => {
    const names = {
      good: 'Estoque bom',
      low: 'Estoque baixo',
      critical: 'Estoque crítico',
      out: 'Sem estoque'
    };
    return names[status];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Busca Avançada
            {getActiveFiltersCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFiltersCount()} filtros ativos
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {totalResults !== undefined && (
              <span className="text-sm text-muted-foreground">
                {totalResults} resultados
              </span>
            )}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-2" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar ingredientes por nome, descrição ou categoria..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-sm">Ordenar por:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => updateFilters({ sortBy: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc'
                })}
              >
                {filters.sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-6">
              {/* Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={filters.category || 'all'}
                    onValueChange={(value) => updateFilters({
                      category: value === 'all' ? undefined : value as IngredientCategory
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {Object.values(IngredientCategory).map(category => (
                        <SelectItem key={category} value={category}>
                          {getCategoryName(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {suppliers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select
                      value={filters.supplierId || 'all'}
                      onValueChange={(value) => updateFilters({
                        supplierId: value === 'all' ? undefined : value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os fornecedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os fornecedores</SelectItem>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Status do Estoque</Label>
                  <Select
                    value={filters.stockStatus || 'all'}
                    onValueChange={(value) => updateFilters({
                      stockStatus: value === 'all' ? undefined : value as StockStatus
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {Object.values({ good: 'good', low: 'low', critical: 'critical', out: 'out' }).map(status => (
                        <SelectItem key={status} value={status}>
                          {getStatusName(status as StockStatus)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Faixa de Preço (R$)</Label>
                  <Slider
                    value={filters.priceRange || [0, 1000]}
                    onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                    max={1000}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>R$ {filters.priceRange?.[0] || 0}</span>
                    <span>R$ {filters.priceRange?.[1] || 1000}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Faixa de Estoque</Label>
                  <Slider
                    value={filters.stockRange || [0, 100]}
                    onValueChange={(value) => updateFilters({ stockRange: value as [number, number] })}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{filters.stockRange?.[0] || 0}</span>
                    <span>{filters.stockRange?.[1] || 100}</span>
                  </div>
                </div>
              </div>

              {/* Multiple Selection Filters */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Unidades de Medida</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                    {Object.values(IngredientUnit).map(unit => (
                      <div key={unit} className="flex items-center space-x-2">
                        <Checkbox
                          id={`unit-${unit}`}
                          checked={filters.units?.includes(unit) || false}
                          onCheckedChange={(checked) => {
                            const newUnits = checked
                              ? [...(filters.units || []), unit]
                              : (filters.units || []).filter(u => u !== unit);
                            updateFilters({ units: newUnits });
                          }}
                        />
                        <Label htmlFor={`unit-${unit}`} className="text-sm">
                          {getUnitName(unit)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Categorias Específicas</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.values(IngredientCategory).map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={filters.categories?.includes(category) || false}
                          onCheckedChange={(checked) => {
                            const newCategories = checked
                              ? [...(filters.categories || []), category]
                              : (filters.categories || []).filter(c => c !== category);
                            updateFilters({ categories: newCategories });
                          }}
                        />
                        <Label htmlFor={`category-${category}`} className="text-sm">
                          {getCategoryName(category)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Criado após</Label>
                  <Input
                    type="date"
                    value={filters.createdAfter || ''}
                    onChange={(e) => updateFilters({ createdAfter: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Criado antes</Label>
                  <Input
                    type="date"
                    value={filters.createdBefore || ''}
                    onChange={(e) => updateFilters({ createdBefore: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atualizado após</Label>
                  <Input
                    type="date"
                    value={filters.lastUpdatedAfter || ''}
                    onChange={(e) => updateFilters({ lastUpdatedAfter: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atualizado antes</Label>
                  <Input
                    type="date"
                    value={filters.lastUpdatedBefore || ''}
                    onChange={(e) => updateFilters({ lastUpdatedBefore: e.target.value })}
                  />
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-inactive"
                  checked={filters.includeInactive || false}
                  onCheckedChange={(checked) => updateFilters({ includeInactive: !!checked })}
                />
                <Label htmlFor="include-inactive">
                  Incluir ingredientes inativos
                </Label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={clearAllFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
                <Button onClick={() => setIsExpanded(false)}>
                  Aplicar Filtros
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
}