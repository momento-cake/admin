'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Plus, Trash2, Clock } from 'lucide-react';
import { 
  Recipe, 
  CreateRecipeData,
  CreateRecipeItemData,
  CreateRecipeStepData,
  RecipeCategory, 
  RecipeDifficulty 
} from '@/types/recipe';
import { Ingredient, IngredientUnit } from '@/types/ingredient';
import { 
  getCategoryDisplayName, 
  getDifficultyDisplayName,
  fetchRecipes
} from '@/lib/recipes';
import { fetchIngredients } from '@/lib/ingredients';

interface RecipeFormProps {
  recipe?: Recipe;
  onSubmit: (data: CreateRecipeData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

// Helper to get unit display name
const getUnitDisplayName = (unit: IngredientUnit): string => {
  const unitNames: Record<IngredientUnit, string> = {
    [IngredientUnit.GRAM]: 'g',
    [IngredientUnit.KILOGRAM]: 'kg',
    [IngredientUnit.MILLILITER]: 'ml',
    [IngredientUnit.LITER]: 'l',
    [IngredientUnit.UNIT]: 'unidade'
  };
  return unitNames[unit] || unit;
};


// Helper to check if unit should be disabled (locked)
const isUnitLocked = (item: CreateRecipeItemData, ingredients: Ingredient[], recipes: Recipe[]): boolean => {
  if (item.type === 'ingredient' && item.ingredientId) {
    const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
    return !!ingredient; // Lock unit if ingredient is selected
  }
  if (item.type === 'recipe' && item.subRecipeId) {
    const recipe = recipes.find(r => r.id === item.subRecipeId);
    return !!recipe; // Lock unit if recipe is selected
  }
  return false;
};

export function RecipeForm({ recipe, onSubmit, onCancel, isSubmitting }: RecipeFormProps) {
  const [formData, setFormData] = useState<CreateRecipeData>({
    name: recipe?.name || '',
    description: recipe?.description || '',
    category: recipe?.category || RecipeCategory.OTHER,
    difficulty: recipe?.difficulty || RecipeDifficulty.EASY,
    generatedAmount: recipe?.generatedAmount || 1,
    generatedUnit: recipe?.generatedUnit || IngredientUnit.GRAM,
    servings: recipe?.servings || 1,
    recipeItems: recipe?.recipeItems || [],
    instructions: recipe?.instructions || [],
    notes: recipe?.notes || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calculatedPrepTime, setCalculatedPrepTime] = useState(0);
  const [portionSize, setPortionSize] = useState(0);
  
  // Autocomplete data
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Calculate portion size whenever generatedAmount or servings change
  useEffect(() => {
    if (formData.generatedAmount && formData.servings) {
      setPortionSize(formData.generatedAmount / formData.servings);
    }
  }, [formData.generatedAmount, formData.servings]);

  // Calculate total preparation time from steps
  useEffect(() => {
    const totalTime = formData.instructions.reduce((total, step) => 
      total + (step.timeMinutes || 0), 0
    );
    setCalculatedPrepTime(totalTime);
  }, [formData.instructions]);

  // Load ingredients and recipes data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadIngredients(),
      loadRecipes()
    ]);
  };

  const loadIngredients = useCallback(async () => {
    try {
      setLoadingIngredients(true);
      const ingredientsList = await fetchIngredients();
      setIngredients(ingredientsList);
    } catch (error) {
      console.error('Error loading ingredients:', error);
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  const loadRecipes = useCallback(async () => {
    try {
      setLoadingRecipes(true);
      const recipesResponse = await fetchRecipes();
      // Filter out the current recipe if editing to avoid circular dependencies
      const filteredRecipes = recipe 
        ? recipesResponse.recipes.filter(r => r.id !== recipe.id)
        : recipesResponse.recipes;
      setRecipes(filteredRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  }, [recipe]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da receita é obrigatório';
    }

    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (!formData.difficulty) {
      newErrors.difficulty = 'Dificuldade é obrigatória';
    }

    if (!formData.generatedAmount || formData.generatedAmount <= 0) {
      newErrors.generatedAmount = 'Quantidade gerada deve ser maior que zero';
    }

    if (!formData.servings || formData.servings < 1) {
      newErrors.servings = 'Número de porções deve ser maior que zero';
    }

    if (formData.instructions.length === 0) {
      newErrors.instructions = 'Adicione pelo menos um passo de preparação';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof CreateRecipeData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Recipe Items (Ingredients + Sub-recipes) Management
  const addRecipeItem = () => {
    const newItem: CreateRecipeItemData = {
      type: 'ingredient',
      ingredientId: '',
      quantity: 1,
      unit: IngredientUnit.GRAM,
      notes: ''
    };
    handleInputChange('recipeItems', [...formData.recipeItems, newItem]);
  };

  const updateRecipeItem = (index: number, field: keyof CreateRecipeItemData, value: any) => {
    const updatedItems = [...formData.recipeItems];
    const currentItem = { ...updatedItems[index], [field]: value };
    
    // Prevent unit changes when locked to ingredient/recipe unit
    if (field === 'unit') {
      const isLocked = isUnitLocked(currentItem, ingredients, recipes);
      if (isLocked) {
        // Don't allow manual unit changes when locked, return early
        return;
      }
    }
    
    // Auto-lock metric based on selected ingredient or recipe
    if (field === 'ingredientId' && currentItem.type === 'ingredient' && value) {
      const selectedIngredient = ingredients.find(ing => ing.id === value);
      if (selectedIngredient) {
        currentItem.unit = selectedIngredient.unit;
        // Keep existing quantity or set to 1 if empty
        if (!currentItem.quantity || currentItem.quantity === 0) {
          currentItem.quantity = 1;
        }
      }
    } else if (field === 'subRecipeId' && currentItem.type === 'recipe' && value) {
      const selectedRecipe = recipes.find(recipe => recipe.id === value);
      if (selectedRecipe) {
        currentItem.unit = selectedRecipe.generatedUnit;
        // Keep existing quantity or set to 1 if empty
        if (!currentItem.quantity || currentItem.quantity === 0) {
          currentItem.quantity = 1;
        }
      }
    } else if (field === 'type') {
      // When switching type, reset related fields
      if (value === 'ingredient') {
        currentItem.subRecipeId = undefined;
        currentItem.ingredientId = '';
        currentItem.unit = IngredientUnit.GRAM;
        currentItem.quantity = 1;
      } else if (value === 'recipe') {
        currentItem.ingredientId = undefined;
        currentItem.subRecipeId = '';
        currentItem.unit = IngredientUnit.GRAM;
        currentItem.quantity = 1;
      }
    }
    
    updatedItems[index] = currentItem;
    handleInputChange('recipeItems', updatedItems);
  };

  const removeRecipeItem = (index: number) => {
    const updatedItems = formData.recipeItems.filter((_, i) => i !== index);
    handleInputChange('recipeItems', updatedItems);
  };

  // Instructions Management
  const addInstruction = () => {
    const newStep: CreateRecipeStepData = {
      stepNumber: formData.instructions.length + 1,
      instruction: '',
      timeMinutes: 0,
      notes: ''
    };
    handleInputChange('instructions', [...formData.instructions, newStep]);
  };

  const updateInstruction = (index: number, field: keyof CreateRecipeStepData, value: any) => {
    const updatedInstructions = [...formData.instructions];
    updatedInstructions[index] = { ...updatedInstructions[index], [field]: value };
    
    // Update step numbers
    updatedInstructions.forEach((step, i) => {
      step.stepNumber = i + 1;
    });
    
    handleInputChange('instructions', updatedInstructions);
  };

  const removeInstruction = (index: number) => {
    const updatedInstructions = formData.instructions.filter((_, i) => i !== index);
    
    // Update step numbers
    updatedInstructions.forEach((step, i) => {
      step.stepNumber = i + 1;
    });
    
    handleInputChange('instructions', updatedInstructions);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Informações Básicas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Receita *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Digite o nome da receita"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value as RecipeCategory)}
            >
              <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RecipeCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {getCategoryDisplayName(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-sm text-destructive">{errors.category}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Descrição da receita"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty">Dificuldade *</Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => handleInputChange('difficulty', value as RecipeDifficulty)}
            >
              <SelectTrigger className={errors.difficulty ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione a dificuldade" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(RecipeDifficulty).map((difficulty) => (
                  <SelectItem key={difficulty} value={difficulty}>
                    {getDifficultyDisplayName(difficulty)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.difficulty && (
              <p className="text-sm text-destructive">{errors.difficulty}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tempo Total de Preparo</Label>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {calculatedPrepTime > 0 
                  ? `${calculatedPrepTime} minutos` 
                  : 'Será calculado dos passos'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Generated Output */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Rendimento da Receita</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="generatedAmount">Quantidade Gerada *</Label>
            <Input
              id="generatedAmount"
              type="number"
              min="0.001"
              step="0.001"
              value={formData.generatedAmount}
              onChange={(e) => handleInputChange('generatedAmount', parseFloat(e.target.value) || 1)}
              className={errors.generatedAmount ? 'border-destructive' : ''}
            />
            {errors.generatedAmount && (
              <p className="text-sm text-destructive">{errors.generatedAmount}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="generatedUnit">Unidade *</Label>
            <Select
              value={formData.generatedUnit}
              onValueChange={(value) => handleInputChange('generatedUnit', value as IngredientUnit)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(IngredientUnit).map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {getUnitDisplayName(unit)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="servings">Porções *</Label>
            <Input
              id="servings"
              type="number"
              min="1"
              value={formData.servings}
              onChange={(e) => handleInputChange('servings', parseInt(e.target.value) || 1)}
              className={errors.servings ? 'border-destructive' : ''}
            />
            {errors.servings && (
              <p className="text-sm text-destructive">{errors.servings}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tamanho da Porção</Label>
            <div className="p-2 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {portionSize > 0 
                  ? `${portionSize.toFixed(2)} ${getUnitDisplayName(formData.generatedUnit)}` 
                  : 'Calculado automaticamente'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Recipe Items (Ingredients + Sub-recipes) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Ingredientes e Sub-receitas</h3>
          <Button type="button" onClick={addRecipeItem} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Item
          </Button>
        </div>

        {formData.recipeItems.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Nenhum ingrediente ou sub-receita adicionado.
            </p>
            <Button type="button" onClick={addRecipeItem} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Primeiro Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.recipeItems.map((item, index) => (
              <div key={index} className="flex gap-3 p-3 border rounded-lg">
                <Select
                  value={item.type}
                  onValueChange={(value) => updateRecipeItem(index, 'type', value as 'ingredient' | 'recipe')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ingredient">Ingrediente</SelectItem>
                    <SelectItem value="recipe">Sub-receita</SelectItem>
                  </SelectContent>
                </Select>

                {item.type === 'ingredient' ? (
                  <Autocomplete
                    options={ingredients.map(ingredient => ({
                      value: ingredient.id,
                      label: ingredient.name,
                      searchTerms: [ingredient.brand, ingredient.category].filter(Boolean) as string[]
                    }))}
                    value={item.ingredientId || ''}
                    onValueChange={(value) => updateRecipeItem(index, 'ingredientId', value)}
                    placeholder="Selecione um ingrediente"
                    emptyText="Nenhum ingrediente encontrado"
                    loading={loadingIngredients}
                    className="flex-1"
                  />
                ) : (
                  <Autocomplete
                    options={recipes.map(recipe => ({
                      value: recipe.id,
                      label: recipe.name,
                      searchTerms: [getCategoryDisplayName(recipe.category), recipe.description].filter(Boolean) as string[]
                    }))}
                    value={item.subRecipeId || ''}
                    onValueChange={(value) => updateRecipeItem(index, 'subRecipeId', value)}
                    placeholder="Selecione uma sub-receita"
                    emptyText="Nenhuma receita encontrada"
                    loading={loadingRecipes}
                    className="flex-1"
                  />
                )}

                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateRecipeItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  placeholder="Quantidade"
                  className="w-24"
                />

                <Select
                  value={item.unit}
                  onValueChange={(value) => updateRecipeItem(index, 'unit', value as IngredientUnit)}
                  disabled={isUnitLocked(item, ingredients, recipes)}
                >
                  <SelectTrigger className={`w-32 ${isUnitLocked(item, ingredients, recipes) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(IngredientUnit).map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {getUnitDisplayName(unit)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRecipeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Preparation Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Passos de Preparação</h3>
          <Button type="button" onClick={addInstruction} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar Passo
          </Button>
        </div>

        {errors.instructions && (
          <p className="text-sm text-destructive">{errors.instructions}</p>
        )}

        {formData.instructions.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">
              Nenhum passo de preparação adicionado.
            </p>
            <Button type="button" onClick={addInstruction} variant="outline" className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Primeiro Passo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {formData.instructions.map((step, index) => (
              <div key={index} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Passo {step.stepNumber}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeInstruction(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <Textarea
                  value={step.instruction}
                  onChange={(e) => updateInstruction(index, 'instruction', e.target.value)}
                  placeholder="Descreva o passo de preparação..."
                  rows={2}
                />
                
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`time-${index}`}>Tempo (minutos):</Label>
                    <Input
                      id={`time-${index}`}
                      type="number"
                      min="0"
                      value={step.timeMinutes}
                      onChange={(e) => updateInstruction(index, 'timeMinutes', parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <Input
                      value={step.notes || ''}
                      onChange={(e) => updateInstruction(index, 'notes', e.target.value)}
                      placeholder="Observações (opcional)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Observações</h3>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Observações sobre a receita"
            rows={4}
          />
        </div>
      </div>

      <Separator />

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (recipe ? 'Atualizar' : 'Criar')}
        </Button>
      </div>
    </form>
  );
}