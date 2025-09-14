'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Recipe } from '@/types/recipe';
import { IngredientUnit } from '@/types/ingredient';
import { 
  getCategoryDisplayName, 
  getDifficultyDisplayName
} from '@/lib/recipes';
import { 
  Clock,
  Users,
  ChefHat,
  DollarSign,
  Package,
  Edit,
  X,
  Scale,
  BookOpen
} from 'lucide-react';

interface RecipeDetailViewProps {
  recipe: Recipe;
  onClose: () => void;
  onEdit: () => void;
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

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'hard':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export function RecipeDetailView({ recipe, onClose, onEdit }: RecipeDetailViewProps) {
  const portionSize = recipe.generatedAmount / recipe.servings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-momento-text">{recipe.name}</h2>
          {recipe.description && (
            <p className="text-muted-foreground">{recipe.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onEdit} size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo de Preparo</p>
                <p className="font-semibold">{recipe.preparationTime} min</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Porções</p>
                <p className="font-semibold">{recipe.servings} porções</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Scale className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rendimento</p>
                <p className="font-semibold">
                  {recipe.generatedAmount} {getUnitDisplayName(recipe.generatedUnit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo por Porção</p>
                <p className="font-semibold">{formatPrice(recipe.costPerServing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Informações da Receita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <p className="font-medium">{getCategoryDisplayName(recipe.category)}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Dificuldade:</span>
                <Badge className={getDifficultyColor(recipe.difficulty)}>
                  {getDifficultyDisplayName(recipe.difficulty)}
                </Badge>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Tamanho da Porção:</span>
              <p className="font-medium">
                {portionSize.toFixed(2)} {getUnitDisplayName(recipe.generatedUnit)}
              </p>
            </div>

            {recipe.notes && (
              <div>
                <span className="text-sm text-muted-foreground">Observações:</span>
                <p className="mt-1 text-sm bg-muted p-3 rounded-md">{recipe.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Análise de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Custo Total:</span>
              <span className="font-medium">{formatPrice(recipe.totalCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Custo por Porção:</span>
              <span className="font-medium">{formatPrice(recipe.costPerServing)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Custo de Mão de Obra:</span>
              <span className="font-medium">{formatPrice(recipe.laborCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm text-muted-foreground">Preço Sugerido:</span>
              <span className="font-semibold text-green-600">{formatPrice(recipe.suggestedPrice)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingredients and Instructions side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingredients Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Ingredientes e Sub-receitas ({recipe.recipeItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.recipeItems.length > 0 ? (
              <div className="space-y-3">
                {recipe.recipeItems.map((item, index) => (
                  <div key={item.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {item.type === 'ingredient' ? (
                          <Package className="h-4 w-4 text-gray-600" />
                        ) : (
                          <ChefHat className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {item.ingredientName || item.subRecipeName || 'Item não identificado'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} {getUnitDisplayName(item.unit)}
                          {item.notes && ` • ${item.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(item.cost)}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.type === 'ingredient' ? 'Ingrediente' : 'Sub-receita'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ingrediente cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Modo de Preparo ({recipe.instructions.length} passos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recipe.instructions.length > 0 ? (
              <div className="space-y-4">
                {recipe.instructions
                  .sort((a, b) => a.stepNumber - b.stepNumber)
                  .map((step, index) => (
                  <div key={step.id || `step-${step.stepNumber}-${index}`} className="flex gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-medium text-sm">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{step.instruction}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {step.timeMinutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {step.timeMinutes} min
                          </div>
                        )}
                        {step.notes && (
                          <p className="italic">• {step.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma instrução cadastrada
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}