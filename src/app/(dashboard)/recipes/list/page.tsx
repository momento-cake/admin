'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Plus, Search, Filter, Eye, Edit, Trash2, Copy, Clock, Users } from 'lucide-react';
import { Recipe, RecipeCategory, RecipeDifficulty, RecipeFilters } from '@/types/recipe';
import { 
  fetchRecipes, 
  createRecipe, 
  updateRecipe, 
  deleteRecipe, 
  duplicateRecipe,
  getCategoryDisplayName,
  getDifficultyDisplayName,
  getDifficultyColor,
  formatPrice,
  formatTime
} from '@/lib/recipes';

export default function RecipesListPage() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Filters state
  const [filters, setFilters] = useState<RecipeFilters>({
    searchQuery: '',
    category: undefined,
    difficulty: undefined,
    maxCostPerServing: undefined,
    maxPreparationTime: undefined
  });

  // Dialog states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load recipes
  const loadRecipes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchRecipes(filters);
      setRecipes(response.recipes);
      setFilteredRecipes(response.recipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar receitas');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    let filtered = [...recipes];

    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.name.toLowerCase().includes(searchLower) ||
        recipe.description?.toLowerCase().includes(searchLower) ||
        recipe.notes?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.category) {
      filtered = filtered.filter(recipe => recipe.category === filters.category);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(recipe => recipe.difficulty === filters.difficulty);
    }

    if (filters.maxCostPerServing) {
      filtered = filtered.filter(recipe => recipe.costPerServing <= filters.maxCostPerServing!);
    }

    if (filters.maxPreparationTime) {
      filtered = filtered.filter(recipe => recipe.preparationTime <= filters.maxPreparationTime!);
    }

    setFilteredRecipes(filtered);
  };

  // Event handlers
  const handleCreateRecipe = () => {
    router.push('/recipes/create');
  };

  const handleViewRecipe = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}`);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}/edit`);
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (window.confirm(`Tem certeza que deseja remover a receita "${recipe.name}"?`)) {
      try {
        await deleteRecipe(recipe.id);
        console.log(`Receita removida: ${recipe.name}`);
        setRefreshTrigger(prev => prev + 1);
        // TODO: Show success toast
      } catch (error) {
        console.error('Erro ao remover receita:', error);
        alert('Erro ao remover receita: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
      }
    }
  };

  const handleDuplicateRecipe = async (recipe: Recipe) => {
    const newName = prompt(`Digite o nome para a nova receita:`, `${recipe.name} (Cópia)`);
    if (newName && newName.trim()) {
      try {
        await duplicateRecipe(recipe.id, newName.trim());
        console.log(`Receita duplicada: ${newName}`);
        setRefreshTrigger(prev => prev + 1);
        // TODO: Show success toast
      } catch (error) {
        console.error('Erro ao duplicar receita:', error);
        alert('Erro ao duplicar receita: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
      }
    }
  };

  const handleFilterChange = (key: keyof RecipeFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      category: undefined,
      difficulty: undefined,
      maxCostPerServing: undefined,
      maxPreparationTime: undefined
    });
  };

  // Effects
  useEffect(() => {
    loadRecipes();
  }, [refreshTrigger]);

  useEffect(() => {
    applyFilters();
  }, [filters, recipes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-momento-text">Todas as Receitas</h1>
          <p className="text-muted-foreground">Carregando receitas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-momento-text">Todas as Receitas</h1>
          <p className="text-red-500">{error}</p>
        </div>
        <Button onClick={() => setRefreshTrigger(prev => prev + 1)}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-momento-text">Todas as Receitas</h1>
        <p className="text-muted-foreground">
          Gerencie seu catálogo completo de receitas e calcule custos automaticamente
        </p>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Catálogo de Receitas</CardTitle>
              <CardDescription>
                {filteredRecipes.length} de {recipes.length} receitas
              </CardDescription>
            </div>
            <Button onClick={handleCreateRecipe} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar receitas..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.category || 'all'}
              onValueChange={(value) => handleFilterChange('category', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.values(RecipeCategory).map(category => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.difficulty || 'all'}
              onValueChange={(value) => handleFilterChange('difficulty', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dificuldade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as dificuldades</SelectItem>
                {Object.values(RecipeDifficulty).map(difficulty => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {getDifficultyDisplayName(difficulty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Custo máximo por porção"
              value={filters.maxCostPerServing || ''}
              onChange={(e) => handleFilterChange('maxCostPerServing', e.target.value ? parseFloat(e.target.value) : undefined)}
            />

            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Tempo máx (min)"
                value={filters.maxPreparationTime || ''}
                onChange={(e) => handleFilterChange('maxPreparationTime', e.target.value ? parseInt(e.target.value) : undefined)}
              />
              <Button variant="outline" onClick={clearFilters}>
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Recipe Grid */}
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma receita encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {recipes.length === 0 
                  ? 'Comece criando sua primeira receita.'
                  : 'Tente ajustar os filtros ou criar uma nova receita.'
                }
              </p>
              <Button onClick={handleCreateRecipe}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Receita
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecipes.map((recipe) => (
                <Card key={recipe.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{recipe.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {recipe.description || 'Sem descrição'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary">
                        {getCategoryDisplayName(recipe.category)}
                      </Badge>
                      <Badge className={getDifficultyColor(recipe.difficulty)}>
                        {getDifficultyDisplayName(recipe.difficulty)}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {recipe.servings} porções
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(recipe.preparationTime)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Custo por porção:</span>
                        <span className="font-medium">
                          {recipe.costPerServing > 0 ? formatPrice(recipe.costPerServing) : 'N/A'}
                        </span>
                      </div>
                      {recipe.suggestedPrice > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Preço sugerido:</span>
                          <span className="font-medium text-green-600">
                            {formatPrice(recipe.suggestedPrice)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewRecipe(recipe)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditRecipe(recipe)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicateRecipe(recipe)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRecipe(recipe)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}