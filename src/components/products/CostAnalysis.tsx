'use client';

import { useMemo } from 'react';
import { Product } from '@/types/product';
import { formatPrice, calculateProfitMargin, isMarginViable } from '@/lib/products';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostAnalysisProps {
  product: Partial<Product>;
  className?: string;
}

/**
 * CostAnalysis Component
 *
 * Read-only display component that shows:
 * - Recipe costs breakdown (portions × cost per serving)
 * - Package costs breakdown
 * - Subtotals and grand total
 * - Pricing analysis (current vs suggested price)
 * - Profit margin percentage and viability
 */
export function CostAnalysis({ product, className }: CostAnalysisProps) {
  // Calculate recipe subtotal
  const recipeSubtotal = useMemo(() => {
    return product.productRecipes?.reduce((sum, recipe) => sum + (recipe.recipeCost || 0), 0) || 0;
  }, [product.productRecipes]);

  // Calculate package subtotal
  const packageSubtotal = useMemo(() => {
    return product.productPackages?.reduce((sum, pkg) => sum + (pkg.packageCost || 0), 0) || 0;
  }, [product.productPackages]);

  // Calculate total cost
  const totalCost = useMemo(() => {
    return recipeSubtotal + packageSubtotal;
  }, [recipeSubtotal, packageSubtotal]);

  // Calculate profit margin
  const profitMargin = useMemo(() => {
    if (!product.price || product.price === 0) return 0;
    return calculateProfitMargin(product.price, product.costPrice || totalCost);
  }, [product.price, product.costPrice, totalCost]);

  // Determine margin viability
  const marginViability = useMemo(() => {
    return isMarginViable(profitMargin);
  }, [profitMargin]);

  // Get color based on margin viability
  const getMarginColor = (viability: 'good' | 'warning' | 'poor') => {
    switch (viability) {
      case 'good':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Análise de Custos e Precificação</CardTitle>
        <CardDescription>Detalhamento completo de custos e margens</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recipe Costs Section */}
        {product.productRecipes && product.productRecipes.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Custo de Receitas</h3>
            <div className="space-y-2">
              {product.productRecipes.map((recipe) => (
                <div key={recipe.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{recipe.recipeName || 'Receita (não encontrada)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {recipe.portions || 0} porção(ões)
                    </p>
                  </div>
                  <p className="font-mono text-right">
                    {formatPrice(recipe.recipeCost || 0)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <p className="font-medium text-muted-foreground">Subtotal Receitas</p>
              <p className="font-semibold font-mono">{formatPrice(recipeSubtotal)}</p>
            </div>
          </div>
        )}

        {/* Package Costs Section */}
        {product.productPackages && product.productPackages.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Custo de Embalagens</h3>
            <div className="space-y-2">
              {product.productPackages.map((pkg) => (
                <div key={pkg.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-medium">{pkg.packagingName || 'Embalagem (não encontrada)'}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.quantity || 0} unidade(s)
                    </p>
                  </div>
                  <p className="font-mono text-right">
                    {formatPrice(pkg.packageCost || 0)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <p className="font-medium text-muted-foreground">Subtotal Embalagens</p>
              <p className="font-semibold font-mono">{formatPrice(packageSubtotal)}</p>
            </div>
          </div>
        )}

        {/* No items message */}
        {(!product.productRecipes || product.productRecipes.length === 0) &&
          (!product.productPackages || product.productPackages.length === 0) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <p>Selecione receitas para calcular custos</p>
            </div>
          )}

        {/* Total Cost Section */}
        <Separator />
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-semibold">Custo Total do Produto</p>
            <p className="text-lg font-bold font-mono">{formatPrice(totalCost)}</p>
          </div>
        </div>

        {/* Pricing Analysis Section */}
        <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold text-sm">Análise de Precificação</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Preço Atual</p>
              <p className="text-lg font-semibold font-mono">
                {formatPrice(product.price || 0)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Preço Sugerido</p>
              <p className="text-lg font-semibold font-mono text-blue-600">
                {formatPrice(product.suggestedPrice || 0)}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Markup</p>
              <p className="text-lg font-semibold font-mono">
                {product.markup || 0}%
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Lucro</p>
              <p className="text-lg font-semibold font-mono text-green-600">
                {formatPrice((product.price || 0) - totalCost)}
              </p>
            </div>
          </div>

          <Separator className="my-2" />

          {/* Profit Margin */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <p className="font-medium">Margem de Lucro</p>
              <div className="flex items-center gap-2">
                <p className={cn('text-lg font-bold', getMarginColor(marginViability))}>
                  {profitMargin.toFixed(1)}%
                </p>
                <Badge
                  variant={marginViability === 'good' ? 'default' : marginViability === 'warning' ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {marginViability === 'good' ? 'Ótima' : marginViability === 'warning' ? 'Aviso' : 'Crítica'}
                </Badge>
              </div>
            </div>

            {/* Margin Guidance */}
            {marginViability === 'poor' && (
              <p className="text-xs text-red-600">
                Margem muito baixa. Considere aumentar o preço ou reduzir custos.
              </p>
            )}
            {marginViability === 'warning' && (
              <p className="text-xs text-yellow-600">
                Margem abaixo do ideal (10-20%). Considere revisar a precificação.
              </p>
            )}
            {marginViability === 'good' && (
              <p className="text-xs text-green-600">
                Margem saudável. Ótimo para sustentabilidade do negócio.
              </p>
            )}
          </div>
        </div>

        {/* Price Recommendation */}
        {product.price && product.suggestedPrice && product.price < product.suggestedPrice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-1">Recomendação de Preço</p>
            <p className="text-sm text-blue-800">
              O preço sugerido ({formatPrice(product.suggestedPrice)}) é superior ao preço atual.
              Isso garantiria uma margem de lucro saudável.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
