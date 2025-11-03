'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Product, ProductCategory, ProductFilters } from '@/types/product';
import { fetchProducts, fetchProductCategories, fetchProductSubcategories, formatPrice } from '@/lib/products';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, Package, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatErrorMessage, logError } from '@/lib/error-handler';

interface ProductListProps {
  onProductEdit?: (product: Product) => void;
  onProductDelete?: (product: Product) => void;
  onProductView?: (product: Product) => void;
  onProductCreate?: () => void;
  onProductsLoaded?: (products: Product[]) => void;
  onRefresh?: () => void;
  className?: string;
}

export function ProductList({
  onProductEdit,
  onProductDelete,
  onProductView,
  onProductCreate,
  onProductsLoaded,
  onRefresh,
  className
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [marginFilter, setMarginFilter] = useState<'all' | 'good' | 'warning' | 'poor'>('all');
  const [filters, setFilters] = useState<ProductFilters>({
    searchQuery: '',
    categoryId: undefined,
    subcategoryId: undefined
  });

  // Debounce the search query
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  // Load products
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await fetchProducts(filters);
      setProducts(response.products);
      setError(null);

      if (onProductsLoaded) {
        onProductsLoaded(response.products);
      }
    } catch (err) {
      const errorMessage = formatErrorMessage(err);
      setError(errorMessage);
      logError('ProductList.loadProducts', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await fetchProductCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    loadCategories();
  }, []);

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, searchQuery: debouncedSearchQuery }));
  }, [debouncedSearchQuery]);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [filters]);

  // Load subcategories when category changes
  const handleCategoryChange = async (categoryId: string) => {
    try {
      setFilters(prev => ({
        ...prev,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        subcategoryId: undefined
      }));

      if (categoryId !== 'all') {
        const subs = await fetchProductSubcategories(categoryId);
        setSubcategories(subs);
      } else {
        setSubcategories([]);
      }
    } catch (err) {
      console.error('Error loading subcategories:', err);
    }
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setFilters(prev => ({
      ...prev,
      subcategoryId: subcategoryId === 'all' ? undefined : subcategoryId
    }));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const clearFilters = () => {
    setSearchInput('');
    setMarginFilter('all');
    setFilters({
      searchQuery: '',
      categoryId: undefined,
      subcategoryId: undefined
    });
    setSubcategories([]);
  };

  const hasActiveFilters = Boolean(
    filters.searchQuery ||
    filters.categoryId ||
    filters.subcategoryId
  );

  // Calculate profit margin color
  const getMarginColor = (margin: number) => {
    if (margin > 0.2) return 'text-green-600';
    if (margin > 0.1) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get margin viability status
  const getMarginStatus = (margin: number) => {
    if (margin > 0.2) return 'good';
    if (margin > 0.1) return 'warning';
    return 'poor';
  };

  // Filter products by margin if filter is active
  const filteredProductsByMargin = products.filter(product => {
    if (marginFilter === 'all') return true;
    return getMarginStatus(product.profitMargin) === marginFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando produtos...</span>
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
              placeholder="Buscar produtos..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {onProductCreate && (
            <Button onClick={onProductCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.categoryId || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.subcategoryId || 'all'}
            onValueChange={handleSubcategoryChange}
            disabled={!filters.categoryId || subcategories.length === 0}
          >
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue placeholder="Subcategoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as subcategorias</SelectItem>
              {subcategories.map((subcategory) => (
                <SelectItem key={subcategory.id} value={subcategory.id}>
                  {subcategory.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={marginFilter}
            onValueChange={(value: any) => setMarginFilter(value)}
          >
            <SelectTrigger className="w-auto min-w-40">
              <SelectValue placeholder="Margem de Lucro" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as margens</SelectItem>
              <SelectItem value="good">{`Ótima (>20%)`}</SelectItem>
              <SelectItem value="warning">Aviso (10-20%)</SelectItem>
              <SelectItem value="poor">{`Crítica (<10%)`}</SelectItem>
            </SelectContent>
          </Select>

          {(hasActiveFilters || marginFilter !== 'all') && (
            <Button variant="outline" onClick={clearFilters} className="ml-2">
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
            {filters.categoryId && (
              <Badge variant="secondary">
                {categories.find(c => c.id === filters.categoryId)?.name}
              </Badge>
            )}
            {filters.subcategoryId && (
              <Badge variant="secondary">
                {subcategories.find(s => s.id === filters.subcategoryId)?.name}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {filteredProductsByMargin.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters || marginFilter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
          description={
            hasActiveFilters || marginFilter !== 'all'
              ? 'Tente ajustar os filtros para encontrar produtos'
              : 'Adicione produtos para começar a gerenciar seu catálogo'
          }
          action={onProductCreate ? {
            label: 'Adicionar Produto',
            onClick: onProductCreate
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredProductsByMargin.length} produto{filteredProductsByMargin.length !== 1 ? 's' : ''} encontrado{filteredProductsByMargin.length !== 1 ? 's' : ''}
            </p>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            )}
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProductsByMargin.map((product) => (
                  <TableRow key={product.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        <Badge variant="outline" className="text-xs mb-1 block w-fit">
                          {product.categoryName}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.subcategoryName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {product.sku}
                      </code>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="font-medium">{formatPrice(product.price)}</div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {formatPrice(product.costPrice)}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className={cn('font-medium', getMarginColor(product.profitMargin))}>
                        {(product.profitMargin * 100).toFixed(1)}%
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onProductView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onProductView(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onProductEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onProductEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onProductDelete && (
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
                                  Tem certeza de que deseja excluir o produto "{product.name}"?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeletingId(product.id);
                                    onProductDelete(product);
                                    setDeletingId(null);
                                  }}
                                  disabled={deletingId === product.id}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deletingId === product.id ? 'Excluindo...' : 'Excluir'}
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
        </div>
      )}
    </div>
  );
}
