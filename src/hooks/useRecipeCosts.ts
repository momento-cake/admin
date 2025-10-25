import { useState, useEffect } from 'react';
import { Recipe, CostBreakdown } from '@/types/recipe';
import { calculateRecipeCosts } from '@/lib/recipes';

interface UseRecipeCostsResult {
  costBreakdown: CostBreakdown | null;
  isCalculating: boolean;
  error: string | null;
  recalculate: () => Promise<void>;
}

export function useRecipeCosts(recipe: Recipe): UseRecipeCostsResult {
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recalculate = async () => {
    if (!recipe?.id) return;

    setIsCalculating(true);
    setError(null);

    try {
      console.log('🔄 Recalculating costs for recipe:', recipe.name);
      const breakdown = await calculateRecipeCosts(recipe.id);
      setCostBreakdown(breakdown);
      console.log('✅ Costs calculated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao calcular custos';
      console.error('❌ Error calculating costs:', err);
      setError(errorMessage);
    } finally {
      setIsCalculating(false);
    }
  };

  // Calculate costs when recipe changes
  useEffect(() => {
    if (recipe?.id) {
      recalculate();
    }
  }, [recipe.id, recipe.recipeItems, recipe.preparationTime, recipe.servings, recipe.generatedAmount]);

  return {
    costBreakdown,
    isCalculating,
    error,
    recalculate
  };
}