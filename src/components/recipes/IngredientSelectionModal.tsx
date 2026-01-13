'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Check, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Ingredient } from '@/types/ingredient';
import { Recipe } from '@/types/recipe';
import { getCategoryDisplayName } from '@/lib/recipes';
import { getCategoryDisplayName as getIngredientCategoryDisplayName } from '@/lib/ingredients';

interface IngredientSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSelectIngredient: (ingredient: Ingredient) => void;
  onSelectRecipe: (recipe: Recipe) => void;
  loadingIngredients?: boolean;
  loadingRecipes?: boolean;
  onCreateNewIngredient?: () => void;
  onCreateNewRecipe?: () => void;
}

export function IngredientSelectionModal({
  open,
  onOpenChange,
  ingredients,
  recipes,
  onSelectIngredient,
  onSelectRecipe,
  loadingIngredients = false,
  loadingRecipes = false,
  onCreateNewIngredient,
  onCreateNewRecipe
}: IngredientSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ingredients' | 'recipes'>('ingredients');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSearchTerm('');
      setSelectedTab('ingredients');
      setCurrentPage(1);
    }
  }, [open]);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedTab]);

  // Filter ingredients based on search term
  const filteredIngredients = useMemo(() => {
    if (!searchTerm.trim()) return ingredients;
    
    const searchLower = searchTerm.toLowerCase();
    return ingredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchLower) ||
      ingredient.brand?.toLowerCase().includes(searchLower) ||
      ingredient.category?.toLowerCase().includes(searchLower)
    );
  }, [ingredients, searchTerm]);

  // Filter recipes based on search term
  const filteredRecipes = useMemo(() => {
    if (!searchTerm.trim()) return recipes;
    
    const searchLower = searchTerm.toLowerCase();
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(searchLower) ||
      recipe.description?.toLowerCase().includes(searchLower) ||
      getCategoryDisplayName(recipe.category).toLowerCase().includes(searchLower)
    );
  }, [recipes, searchTerm]);

  // Pagination logic
  const currentItems = selectedTab === 'ingredients' ? filteredIngredients : filteredRecipes;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  const canGoNext = currentPage < totalPages;
  const canGoPrev = currentPage > 1;

  const handleSelectIngredient = (ingredient: Ingredient) => {
    onSelectIngredient(ingredient);
    onOpenChange(false);
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    onSelectRecipe(recipe);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Ingrediente ou Sub-receita</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ingredientes ou receitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Tabs */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant={selectedTab === 'ingredients' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTab('ingredients')}
              >
                Ingredientes ({filteredIngredients.length})
              </Button>
              <Button
                variant={selectedTab === 'recipes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTab('recipes')}
              >
                Sub-receitas ({filteredRecipes.length})
              </Button>
            </div>
            
            {/* Create New Button */}
            {selectedTab === 'ingredients' && onCreateNewIngredient && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateNewIngredient}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                Novo Ingrediente
              </Button>
            )}
            {selectedTab === 'recipes' && onCreateNewRecipe && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCreateNewRecipe}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova Receita
              </Button>
            )}
          </div>

          <Separator />

          {/* Content */}
          <div className="flex-1 overflow-y-auto max-h-96 relative">
            {selectedTab === 'ingredients' ? (
              <div className="space-y-2">
                {loadingIngredients ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando ingredientes...
                  </div>
                ) : paginatedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum ingrediente encontrado para a busca.' : 'Nenhum ingrediente disponível.'}
                  </div>
                ) : (
                  (paginatedItems as Ingredient[]).map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      onClick={() => handleSelectIngredient(ingredient)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{ingredient.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {ingredient.brand && (
                            <span className="mr-2">Marca: {ingredient.brand}</span>
                          )}
                          {ingredient.category && (
                            <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs mr-2">
                              {getIngredientCategoryDisplayName(ingredient.category)}
                            </span>
                          )}
                          <span className="text-xs">
                            Unidade: {ingredient.unit === 'gram' ? 'g' :
                                     ingredient.unit === 'kilogram' ? 'kg' :
                                     ingredient.unit === 'milliliter' ? 'ml' :
                                     ingredient.unit === 'liter' ? 'l' : 'unidade'}
                          </span>
                        </div>
                      </div>
                      <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {loadingRecipes ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando receitas...
                  </div>
                ) : paginatedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhuma receita encontrada para a busca.' : 'Nenhuma receita disponível.'}
                  </div>
                ) : (
                  (paginatedItems as Recipe[]).map((recipe) => (
                    <div
                      key={recipe.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                      onClick={() => handleSelectRecipe(recipe)}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{recipe.name}</div>
                        <div className="text-sm text-muted-foreground">
                          <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs mr-2">
                            {getCategoryDisplayName(recipe.category)}
                          </span>
                          {recipe.description && (
                            <span className="mr-2">{recipe.description}</span>
                          )}
                          <span className="text-xs">
                            Rende: {recipe.generatedAmount} {
                              recipe.generatedUnit === 'gram' ? 'g' :
                              recipe.generatedUnit === 'kilogram' ? 'kg' :
                              recipe.generatedUnit === 'milliliter' ? 'ml' :
                              recipe.generatedUnit === 'liter' ? 'l' : 'unidade'
                            }
                          </span>
                        </div>
                      </div>
                      <Check className="h-4 w-4 opacity-0 group-hover:opacity-100" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({currentItems.length} itens)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={!canGoNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </div>
        
        {/* Footer */}
        <Separator />
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}