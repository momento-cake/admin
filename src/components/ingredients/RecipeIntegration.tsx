'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChefHat, Calculator, Utensils, DollarSign, AlertCircle, Scale, RefreshCw } from 'lucide-react';
import { Ingredient, Recipe } from '@/types/ingredient';
import { fetchRecipes, calculateRecipeCost, updateRecipeCosts, findRecipesByIngredient, getIngredientUsageInRecipes } from '@/lib/recipes';

interface RecipeIntegrationProps {
  ingredients: Ingredient[];
  selectedIngredientId?: string;
  onRecipeClick?: (recipe: Recipe) => void;
}

interface RecipeWithCost extends Recipe {
  calculatedCost?: number;
  calculatedCostPerServing?: number;
  hasOutdatedCosts?: boolean;
}

export function RecipeIntegration({ ingredients, selectedIngredientId, onRecipeClick }: RecipeIntegrationProps) {
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatingCosts, setCalculatingCosts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [scaleFactor, setScaleFactor] = useState('1');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [costRangeFilter, setCostRangeFilter] = useState('');

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const { recipes: fetchedRecipes } = await fetchRecipes();
      
      // Calculate costs for all recipes and check if they're outdated
      const recipesWithCosts = await Promise.all(
        fetchedRecipes.map(async (recipe) => {
          try {
            const { totalCost, costPerServing } = await calculateRecipeCost(recipe, ingredients);
            
            // Check if costs are outdated (more than 7 days old or never calculated)
            const isOutdated = !recipe.lastCalculated || 
              (new Date().getTime() - recipe.lastCalculated.getTime()) > 7 * 24 * 60 * 60 * 1000;

            return {
              ...recipe,
              calculatedCost: totalCost,
              calculatedCostPerServing: costPerServing,
              hasOutdatedCosts: isOutdated,
            };
          } catch (error) {
            console.error(`Error calculating cost for recipe ${recipe.id}:`, error);
            return {
              ...recipe,
              hasOutdatedCosts: true,
            };
          }
        })
      );

      setRecipes(recipesWithCosts);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateCosts = async (recipeId?: string) => {
    const recipesToUpdate = recipeId ? [recipeId] : recipes.map(r => r.id);
    
    try {
      setCalculatingCosts(recipesToUpdate);
      
      for (const id of recipesToUpdate) {
        await updateRecipeCosts(id);
      }
      
      // Reload recipes to get updated costs
      await loadRecipes();
    } catch (error) {
      console.error('Error recalculating costs:', error);
      alert('Erro ao recalcular custos das receitas');
    } finally {
      setCalculatingCosts([]);
    }
  };

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    if (categoryFilter && recipe.category !== categoryFilter) return false;
    
    if (costRangeFilter && recipe.calculatedCost !== undefined) {
      const cost = recipe.calculatedCost;
      switch (costRangeFilter) {
        case 'low':
          if (cost > 20) return false;
          break;
        case 'medium':
          if (cost <= 20 || cost > 50) return false;
          break;
        case 'high':
          if (cost <= 50) return false;
          break;
      }
    }

    if (selectedIngredientId) {
      return recipe.ingredients.some(ing => ing.ingredientId === selectedIngredientId);
    }

    return true;
  });

  // Get unique categories
  const categories = [...new Set(recipes.map(r => r.category))];

  // Cost analysis data
  const costAnalysisData = filteredRecipes
    .filter(r => r.calculatedCost !== undefined)
    .sort((a, b) => (b.calculatedCost || 0) - (a.calculatedCost || 0))
    .slice(0, 10)
    .map(recipe => ({
      name: recipe.name.length > 20 ? recipe.name.substring(0, 20) + '...' : recipe.name,
      cost: recipe.calculatedCost || 0,
      costPerServing: recipe.calculatedCostPerServing || 0,
      servings: recipe.servings,
    }));

  // Ingredient usage analysis (if specific ingredient selected)
  const ingredientUsage = selectedIngredientId ? 
    getIngredientUsageInRecipes(recipes, selectedIngredientId) : null;

  const selectedIngredient = selectedIngredientId ? 
    ingredients.find(ing => ing.id === selectedIngredientId) : null;

  // Recipes that need cost updates
  const outdatedRecipes = recipes.filter(r => r.hasOutdatedCosts);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Carregando integração com receitas...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {outdatedRecipes.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {outdatedRecipes.length} receita(s) com custos desatualizados ou não calculados
              </span>
              <Button
                size="sm"
                onClick={() => handleRecalculateCosts()}
                disabled={calculatingCosts.length > 0}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                {calculatingCosts.length > 0 ? 'Calculando...' : 'Recalcular Tudo'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="costs">Análise de Custos</TabsTrigger>
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Receitas</p>
                    <p className="text-2xl font-bold">{recipes.length}</p>
                  </div>
                  <ChefHat className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Custo Médio</p>
                    <p className="text-2xl font-bold">
                      {recipes.filter(r => r.calculatedCost).length > 0 ? 
                        `R$ ${(recipes.filter(r => r.calculatedCost).reduce((sum, r) => sum + (r.calculatedCost || 0), 0) / recipes.filter(r => r.calculatedCost).length).toFixed(2)}` :
                        'R$ 0,00'
                      }
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Receitas Ativas</p>
                    <p className="text-2xl font-bold">{recipes.filter(r => r.isActive).length}</p>
                  </div>
                  <Utensils className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Custos Desatualizados</p>
                    <p className="text-2xl font-bold text-orange-500">{outdatedRecipes.length}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ingredient Usage Analysis (if specific ingredient selected) */}
          {selectedIngredient && ingredientUsage && (
            <Card>
              <CardHeader>
                <CardTitle>Uso do Ingrediente: {selectedIngredient.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-momento-primary">{ingredientUsage.totalRecipes}</p>
                    <p className="text-sm text-muted-foreground">Receitas que usam</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-momento-primary">
                      {ingredientUsage.totalQuantityUsed.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Quantidade total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-momento-primary">
                      {ingredientUsage.averageQuantityPerRecipe.toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Média por receita</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Receitas que usam este ingrediente:</h4>
                  {ingredientUsage.recipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between p-2 border rounded">
                      <span>{recipe.name}</span>
                      <Badge variant="outline">
                        {recipe.quantity} {recipe.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <Label>Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as categorias</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Faixa de Custo</Label>
                  <Select value={costRangeFilter} onValueChange={setCostRangeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="low">Até R$ 20</SelectItem>
                      <SelectItem value="medium">R$ 20 - R$ 50</SelectItem>
                      <SelectItem value="high">Acima de R$ 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipe List */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecipes.length > 0 ? (
                <div className="space-y-3">
                  {filteredRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{recipe.name}</h4>
                            {recipe.hasOutdatedCosts && (
                              <Badge variant="outline" className="text-orange-600">
                                Custo Desatualizado
                              </Badge>
                            )}
                            {!recipe.isActive && (
                              <Badge variant="secondary">Inativa</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {recipe.category} • {recipe.servings} porções • {recipe.prepTime + recipe.bakeTime} min
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {recipe.ingredients.length} ingredientes
                          </p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        {recipe.calculatedCost !== undefined ? (
                          <>
                            <p className="font-medium">
                              Total: {recipe.calculatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Por porção: {(recipe.calculatedCostPerServing || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Custo não calculado</p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRecalculateCosts(recipe.id)}
                            disabled={calculatingCosts.includes(recipe.id)}
                          >
                            {calculatingCosts.includes(recipe.id) ? 'Calculando...' : 'Recalcular'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRecipeClick && onRecipeClick(recipe)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma receita encontrada com os filtros aplicados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Cost Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Análise de Custos - Top 10 Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              {costAnalysisData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={costAnalysisData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'cost' ? `R$ ${value.toFixed(2)}` : `R$ ${value.toFixed(2)}`,
                        name === 'cost' ? 'Custo Total' : 'Custo por Porção'
                      ]}
                    />
                    <Bar dataKey="cost" fill="#c4a484" name="cost" />
                    <Bar dataKey="costPerServing" fill="#a38771" name="costPerServing" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum dado de custo disponível
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          {/* Recipe Cost Calculator */}
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Escalabilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scaleFactor">Fator de Escala</Label>
                  <Input
                    id="scaleFactor"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={scaleFactor}
                    onChange={(e) => setScaleFactor(e.target.value)}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Ex: 2 = dobrar receita, 0.5 = metade da receita
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRecipes.slice(0, 6).map((recipe) => {
                    const scale = parseFloat(scaleFactor) || 1;
                    const scaledCost = (recipe.calculatedCost || 0) * scale;
                    const scaledServings = Math.round(recipe.servings * scale);

                    return (
                      <Card key={recipe.id} className="border-2">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{recipe.name}</h4>
                              <Scale className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Original: {recipe.servings} porções → Escalonado: {scaledServings} porções
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Custo original: </span>
                              <span>{(recipe.calculatedCost || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="text-lg font-bold text-momento-primary">
                              Custo escalonado: {scaledCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Por porção: {(scaledCost / scaledServings).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}