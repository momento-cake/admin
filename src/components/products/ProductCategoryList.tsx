'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ProductCategory,
  ProductSubcategory
} from '@/types/product';
import { fetchProductCategories, fetchProductSubcategories } from '@/lib/products';
import {
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface ProductCategoryListProps {
  onCategoryEdit?: (category: ProductCategory) => void;
  onCategoryDelete?: (category: ProductCategory) => void;
  onCategoryCreate?: () => void;
  onSubcategoryEdit?: (subcategory: ProductSubcategory) => void;
  onSubcategoryDelete?: (subcategory: ProductSubcategory) => void;
  onSubcategoryCreate?: (parentCategoryId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

export function ProductCategoryList({
  onCategoryEdit,
  onCategoryDelete,
  onCategoryCreate,
  onSubcategoryEdit,
  onSubcategoryDelete,
  onSubcategoryCreate,
  onRefresh,
  className
}: ProductCategoryListProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [subcategories, setSubcategories] = useState<Record<string, ProductSubcategory[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 300);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const cats = await fetchProductCategories();
      setCategories(cats);

      // Load subcategories for each category
      const subcatsMap: Record<string, ProductSubcategory[]> = {};
      for (const cat of cats) {
        try {
          const subcats = await fetchProductSubcategories(cat.id);
          subcatsMap[cat.id] = subcats;
        } catch (err) {
          console.error(`Error loading subcategories for ${cat.id}:`, err);
          subcatsMap[cat.id] = [];
        }
      }
      setSubcategories(subcatsMap);
    } catch (err) {
      console.error('Error loading categories:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDeleteCategory = async (category: ProductCategory) => {
    try {
      if (onCategoryDelete) {
        await onCategoryDelete(category);
        // Reload categories after successful deletion
        await loadCategories();
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar categoria');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSubcategory = async (subcategory: ProductSubcategory) => {
    try {
      if (onSubcategoryDelete) {
        await onSubcategoryDelete(subcategory);
        // Reload subcategories after successful deletion
        await loadCategories();
      }
    } catch (err) {
      console.error('Error deleting subcategory:', err);
      setError(err instanceof Error ? err.message : 'Erro ao deletar subcategoria');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const filteredSubcategories = (categoryId: string) => {
    const subs = subcategories[categoryId] || [];
    if (!debouncedSearch) return subs;
    return subs.filter(sub =>
      sub.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando categorias...</span>
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

  if (filteredCategories.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={searchInput ? "Nenhuma categoria encontrada" : "Nenhuma categoria cadastrada"}
        description={
          searchInput
            ? "Tente ajustar seus critérios de busca"
            : "Comece criando sua primeira categoria"
        }
        action={onCategoryCreate ? {
          label: "Nova Categoria",
          onClick: onCategoryCreate
        } : undefined}
      />
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Search */}
      <div className="flex flex-col gap-4">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar categorias ou subcategorias..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>

          {onCategoryCreate && (
            <Button onClick={onCategoryCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {filteredCategories.length} categor{filteredCategories.length !== 1 ? 'ias' : 'ia'} encontrada{filteredCategories.length !== 1 ? 's' : ''}
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          )}
        </div>

        <div className="border rounded-md bg-white">
          <div className="space-y-0">
            {filteredCategories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const cats = filteredSubcategories(category.id);
              const hasSubcategories = cats.length > 0;

              return (
                <div key={category.id} className="border-b last:border-b-0">
                  {/* Category Header */}
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      {hasSubcategories && (
                        <button
                          onClick={() => toggleCategory(category.id)}
                          className="p-0 hover:bg-muted rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {!hasSubcategories && (
                        <div className="w-4" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="font-mono text-xs">
                            {category.code}
                          </Badge>
                          {category.description && (
                            <span className="text-xs">{category.description}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCategoryEdit?.(category)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        {deletingId === category.id && (
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar Categoria</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar &quot;{category.name}&quot;? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDeleteCategory(category)}
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        )}
                      </AlertDialog>

                      {hasSubcategories && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSubcategoryCreate?.(category.id)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Plus className="h-3 w-3" />
                          Subcategoria
                        </Button>
                      )}
                    </div>
                  </div>

                  {!hasSubcategories && (
                    <div className="px-4 pb-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSubcategoryCreate?.(category.id)}
                        className="h-8 gap-1 text-xs w-full"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar Subcategoria
                      </Button>
                    </div>
                  )}

                  {/* Subcategories */}
                  {isExpanded && hasSubcategories && (
                    <div className="border-t bg-muted/20">
                      {cats.map((subcategory) => (
                        <div
                          key={subcategory.id}
                          className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 ml-9">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium">{subcategory.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {subcategory.code}
                                </Badge>
                                {subcategory.description && (
                                  <span className="text-xs">{subcategory.description}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onSubcategoryEdit?.(subcategory)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingId(subcategory.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              {deletingId === subcategory.id && (
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deletar Subcategoria</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar &quot;{subcategory.name}&quot;? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDeleteSubcategory(subcategory)}
                                    >
                                      Deletar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
