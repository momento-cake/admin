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
  Recipe, 
  RecipeCategory, 
  RecipeDifficulty,
  RecipeFilters
} from '@/types/recipe';
import { 
  fetchRecipes, 
  getCategoryDisplayName, 
  getDifficultyDisplayName,
  getDifficultyColor,
  formatTime,
  formatPrice
} from '@/lib/recipes';
import { Search, Plus, ChefHat, RefreshCw, Eye, Edit, Trash2, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeListProps {
  onRecipeEdit?: (recipe: Recipe) => void;
  onRecipeDelete?: (recipe: Recipe) => void;
  onRecipeView?: (recipe: Recipe) => void;
  onRecipeCreate?: () => void;
  onRecipesLoaded?: (recipes: Recipe[]) => void;
  onRefresh?: () => void;
  className?: string;
}

export function RecipeList({
  onRecipeEdit,
  onRecipeDelete,
  onRecipeView,
  onRecipeCreate,
  onRecipesLoaded,
  onRefresh,
  className
}: RecipeListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<RecipeFilters>({
    searchQuery: '',
    category: undefined,
    difficulty: undefined
  });

  // Debounce the search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchInput, 300);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const response = await fetchRecipes(filters);
      setRecipes(response.recipes);
      setError(null);
      
      // Notify parent component
      if (onRecipesLoaded) {
        onRecipesLoaded(response.recipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
      setError(error instanceof Error ? error.message : 'Erro interno do servidor');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters(prev => ({ ...prev, searchQuery: debouncedSearchQuery }));
  }, [debouncedSearchQuery]);

  useEffect(() => {
    loadRecipes();
  }, [filters]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleCategoryChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      category: value === 'all' ? undefined : value as RecipeCategory 
    }));
  };

  const handleDifficultyChange = (value: string) => {
    setFilters(prev => ({ 
      ...prev, 
      difficulty: value === 'all' ? undefined : value as RecipeDifficulty 
    }));
  };


  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      searchQuery: '',
      category: undefined,
      difficulty: undefined
    });
  };

  const hasActiveFilters = Boolean(
    filters.searchQuery || 
    filters.category || 
    filters.difficulty
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando receitas...</span>
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
              placeholder="Buscar receitas..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {onRecipeCreate && (
            <Button onClick={onRecipeCreate}>
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
                {Object.values(RecipeCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.difficulty || 'all'} onValueChange={handleDifficultyChange}>
              <SelectTrigger className="w-auto min-w-32">
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                {Object.values(RecipeDifficulty).map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {getDifficultyDisplayName(difficulty)}
                  </SelectItem>
                ))}
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
                {getCategoryDisplayName(filters.category)}
              </Badge>
            )}
            {filters.difficulty && (
              <Badge variant="secondary">
                {getDifficultyDisplayName(filters.difficulty)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {recipes.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title={hasActiveFilters ? "Nenhuma receita encontrada" : "Nenhuma receita cadastrada"}
          description={
            hasActiveFilters 
              ? "Tente ajustar os filtros para encontrar receitas"
              : "Adicione receitas para começar a gerenciar seu catálogo"
          }
          action={onRecipeCreate ? {
            label: "Adicionar Receita",
            onClick: onRecipeCreate
          } : undefined}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {recipes.length} receita{recipes.length !== 1 ? 's' : ''} encontrada{recipes.length !== 1 ? 's' : ''}
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
                  <TableHead>Receita</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Dificuldade</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Porções</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => (
                  <TableRow key={recipe.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {recipe.name}
                        </div>
                        {recipe.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {recipe.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryDisplayName(recipe.category)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn('text-xs border', getDifficultyColor(recipe.difficulty))}
                      >
                        {getDifficultyDisplayName(recipe.difficulty)}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatTime(recipe.preparationTime)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {recipe.servings}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {formatPrice(recipe.costPerServing)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          por porção
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onRecipeView && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRecipeView(recipe)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onRecipeEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRecipeEdit(recipe)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onRecipeDelete && (
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
                                  Tem certeza de que deseja excluir a receita "{recipe.name}"? 
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeletingId(recipe.id);
                                    onRecipeDelete(recipe);
                                    setDeletingId(null);
                                  }}
                                  disabled={deletingId === recipe.id}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {deletingId === recipe.id ? 'Excluindo...' : 'Excluir'}
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