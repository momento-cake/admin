'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RecipeList } from '@/components/recipes/RecipeList';
import { RecipeForm } from '@/components/recipes/RecipeForm';
import { RecipeDetailView } from '@/components/recipes/RecipeDetailView';
import { Recipe } from '@/types/recipe';
import { createRecipe, updateRecipe, deleteRecipe, CreateRecipeData, UpdateRecipeData } from '@/lib/recipes';
import { fetchIngredients } from '@/lib/ingredients';

export default function RecipesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [availableIngredients, setAvailableIngredients] = useState<Array<{ id: string; name: string; unit: string }>>([]);
  const [availableRecipes, setAvailableRecipes] = useState<Array<{ id: string; name: string; generatedAmount: number; generatedUnit: string }>>([]);

  const handleCreateRecipe = () => {
    setSelectedRecipe(null);
    setShowCreateForm(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowEditForm(true);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowViewModal(true);
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    try {
      await deleteRecipe(recipe.id);
      console.log(`Receita removida: ${recipe.name}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao remover receita:', error);
      alert('Erro ao remover receita: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    }
  };

  const handleSubmitCreate = async (data: CreateRecipeData) => {
    try {
      setIsSubmitting(true);
      await createRecipe(data);
      setShowCreateForm(false);
      console.log(`Receita criada: ${data.name}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao criar receita:', error);
      alert('Erro ao criar receita: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEdit = async (data: CreateRecipeData) => {
    if (!selectedRecipe) return;

    try {
      setIsSubmitting(true);
      const updateData: UpdateRecipeData = {
        id: selectedRecipe.id,
        ...data
      };
      await updateRecipe(updateData);
      setShowEditForm(false);
      setSelectedRecipe(null);
      console.log(`Receita atualizada: ${data.name}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao atualizar receita:', error);
      alert('Erro ao atualizar receita: ' + (error instanceof Error ? error.message : 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setShowEditForm(false);
    setSelectedRecipe(null);
  };

  const handleCloseView = () => {
    setShowViewModal(false);
    setSelectedRecipe(null);
  };

  const handleEditFromView = () => {
    setShowViewModal(false);
    setShowEditForm(true);
  };

  const handleRefreshRecipes = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Load available ingredients and recipes for the form
  const loadFormData = async () => {
    try {
      // Load ingredients
      const ingredientsData = await fetchIngredients();
      setAvailableIngredients((ingredientsData.ingredients || []).map((ingredient: any) => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit
      })));

      // Load recipes - we'll implement this
      setAvailableRecipes([]);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  useEffect(() => {
    loadFormData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-momento-text">Sistema de Receitas</h1>
        <p className="text-muted-foreground">
          Crie e gerencie suas receitas com ingredientes e sub-receitas
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Receitas</CardTitle>
            <CardDescription>
              Gerencie suas receitas, ingredientes e calcule custos automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecipeList
              onRecipeCreate={handleCreateRecipe}
              onRecipeEdit={handleEditRecipe}
              onRecipeView={handleViewRecipe}
              onRecipeDelete={handleDeleteRecipe}
              onRefresh={handleRefreshRecipes}
              key={refreshTrigger}
            />
          </CardContent>
        </Card>
      </div>

      {/* Create Recipe Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Criar Nova Receita</DialogTitle>
          </DialogHeader>
          <RecipeForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
            availableIngredients={availableIngredients}
            availableRecipes={availableRecipes}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] h-[95vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Editar Receita</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <RecipeForm
              recipe={selectedRecipe}
              onSubmit={handleSubmitEdit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
              availableIngredients={availableIngredients}
              availableRecipes={availableRecipes}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Recipe Dialog */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="w-[85vw] max-w-[85vw] min-w-[85vw] max-h-[85vh] overflow-y-auto !max-w-none m-0 p-6" style={{ width: '85vw', maxWidth: '85vw' }}>
          <DialogHeader>
            <DialogTitle>Detalhes da Receita</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <RecipeDetailView
              recipe={selectedRecipe}
              onClose={handleCloseView}
              onEdit={handleEditFromView}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}