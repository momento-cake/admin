'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductRecipeItem } from '@/types/product';
import { Recipe } from '@/types/recipe';
import { fetchRecipes } from '@/lib/recipes';
import { formatPrice } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { formatErrorMessage, logError } from '@/lib/error-handler';

interface RecipeSelectorProps {
  isOpen: boolean;
  selectedRecipes?: ProductRecipeItem[];
  onSelect: (recipes: ProductRecipeItem[]) => void;
  onCancel: () => void;
}

export function RecipeSelector({
  isOpen,
  selectedRecipes = [],
  onSelect,
  onCancel
}: RecipeSelectorProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(
    new Set(selectedRecipes.map(r => r.recipeId))
  );
  const [portions, setPortions] = useState<Record<string, number>>(
    selectedRecipes.reduce((acc, r) => ({ ...acc, [r.recipeId]: r.portions }), {})
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load recipes on mount
  useEffect(() => {
    const loadRecipes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchRecipes();
        setRecipes(response.recipes);
      } catch (err) {
        const errorMessage = formatErrorMessage(err);
        setError(errorMessage);
        logError('RecipeSelector.loadRecipes', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadRecipes();
    }
  }, [isOpen]);

  // Filter recipes based on search
  const filteredRecipes = useMemo(() => {
    if (!debouncedSearch) return recipes;
    const query = debouncedSearch.toLowerCase();
    return recipes.filter(recipe =>
      recipe.name.toLowerCase().includes(query) ||
      recipe.category.toLowerCase().includes(query)
    );
  }, [recipes, debouncedSearch]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    let total = 0;
    selectedRecipeIds.forEach(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (recipe) {
        const recipePortion = portions[recipeId] || 1;
        const costPerServing = recipe.costPerServing || 0;
        total += costPerServing * recipePortion;
      }
    });
    return total;
  }, [selectedRecipeIds, portions, recipes]);

  // Handle recipe selection
  const handleRecipeToggle = (recipeId: string) => {
    const newSelectedIds = new Set(selectedRecipeIds);
    if (newSelectedIds.has(recipeId)) {
      newSelectedIds.delete(recipeId);
      const newPortions = { ...portions };
      delete newPortions[recipeId];
      setPortions(newPortions);
    } else {
      newSelectedIds.add(recipeId);
      setPortions(prev => ({ ...prev, [recipeId]: 1 }));
    }
    setSelectedRecipeIds(newSelectedIds);
  };

  // Handle portions change
  const handlePortionsChange = (recipeId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0.1 && numValue <= 999.99) {
      setPortions(prev => ({ ...prev, [recipeId]: numValue }));
    }
  };

  // Handle save
  const handleSave = () => {
    // Validation: at least one recipe required
    if (selectedRecipeIds.size === 0) {
      setValidationError('Selecione pelo menos uma receita');
      return;
    }

    // Build product recipe items
    const productRecipes: ProductRecipeItem[] = Array.from(selectedRecipeIds).map(recipeId => {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe) throw new Error(`Recipe ${recipeId} not found`);

      const recipePortion = portions[recipeId] || 1;
      const costPerServing = recipe.costPerServing || 0;
      const recipeCost = costPerServing * recipePortion;

      return {
        id: `${recipeId}-${Date.now()}`, // Generate unique ID
        recipeId,
        recipeName: recipe.name,
        portions: recipePortion,
        recipeCost
      };
    });

    onSelect(productRecipes);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Receitas</DialogTitle>
          <DialogDescription>
            Selecione as receitas e especifique a quantidade de porções para cada uma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <Input
            placeholder="Buscar receitas por nome ou categoria..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
          />

          {/* Error State */}
          {error && !loading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader className="h-6 w-6 animate-spin mr-2" />
              <span>Carregando receitas...</span>
            </div>
          )}

          {/* Recipes List */}
          {!loading && filteredRecipes.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredRecipes.map(recipe => (
                <Card key={recipe.id} className={selectedRecipeIds.has(recipe.id) ? 'border-blue-500' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          id={`recipe-${recipe.id}`}
                          checked={selectedRecipeIds.has(recipe.id)}
                          onCheckedChange={() => handleRecipeToggle(recipe.id)}
                        />
                        <div className="flex-1">
                          <Label htmlFor={`recipe-${recipe.id}`} className="cursor-pointer">
                            <p className="font-medium">{recipe.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Categoria: {recipe.category}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Custo por porção: {formatPrice(recipe.costPerServing || 0)}
                            </p>
                          </Label>
                        </div>
                      </div>

                      {/* Portions Input - Only show when selected */}
                      {selectedRecipeIds.has(recipe.id) && (
                        <div className="flex flex-col gap-1 ml-4">
                          <Label htmlFor={`portions-${recipe.id}`} className="text-xs font-medium">
                            Porções
                          </Label>
                          <Input
                            id={`portions-${recipe.id}`}
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="999.99"
                            value={portions[recipe.id] || 1}
                            onChange={(e) => handlePortionsChange(recipe.id, e.target.value)}
                            className="w-20"
                          />
                          <div className="text-xs text-muted-foreground">
                            {formatPrice((portions[recipe.id] || 1) * (recipe.costPerServing || 0))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredRecipes.length === 0 && recipes.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma receita encontrada com o termo "{debouncedSearch}"
              </AlertDescription>
            </Alert>
          )}

          {/* No Recipes State */}
          {!loading && recipes.length === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma receita disponível. Crie uma receita primeiro.
              </AlertDescription>
            </Alert>
          )}

          {/* Cost Summary */}
          {selectedRecipeIds.size > 0 && (
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle className="text-base">Custo Total das Receitas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPrice(totalCost)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || selectedRecipeIds.size === 0}>
            {selectedRecipeIds.size > 0 ? `Confirmar (${selectedRecipeIds.size})` : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
