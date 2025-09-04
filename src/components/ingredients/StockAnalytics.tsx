'use client';

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Package, BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ingredient, IngredientCategory, StockStatus } from '@/types/ingredient';
import { fetchIngredients, getStockStatus, getStockStatusText, formatPrice } from '@/lib/ingredients';

interface StockMetrics {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  categoryBreakdown: Record<IngredientCategory, { count: number; value: number }>;
  statusBreakdown: Record<StockStatus, number>;
  averageStockLevel: number;
  topValueIngredients: Ingredient[];
  lowStockIngredients: Ingredient[];
}

interface StockAnalyticsProps {
  onIngredientClick?: (ingredient: Ingredient) => void;
}

export function StockAnalytics({ onIngredientClick }: StockAnalyticsProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      setLoading(true);
      const data = await fetchIngredients();
      setIngredients(data.ingredients || []);
    } catch (error) {
      console.error('Erro ao carregar ingredientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo((): StockMetrics => {
    if (ingredients.length === 0) {
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockCount: 0,
        criticalStockCount: 0,
        outOfStockCount: 0,
        categoryBreakdown: {} as Record<IngredientCategory, { count: number; value: number }>,
        statusBreakdown: { good: 0, low: 0, critical: 0, out: 0 },
        averageStockLevel: 0,
        topValueIngredients: [],
        lowStockIngredients: []
      };
    }

    const categoryBreakdown: Record<IngredientCategory, { count: number; value: number }> = {} as any;
    const statusBreakdown: Record<StockStatus, number> = { good: 0, low: 0, critical: 0, out: 0 };
    let totalValue = 0;
    let totalStockRatio = 0;

    const lowStockItems: Ingredient[] = [];

    ingredients.forEach(ingredient => {
      const status = getStockStatus(ingredient.currentStock, ingredient.minStock);
      const itemValue = ingredient.currentStock * ingredient.currentPrice;
      
      totalValue += itemValue;
      statusBreakdown[status]++;
      
      if (status === 'low' || status === 'critical' || status === 'out') {
        lowStockItems.push(ingredient);
      }
      
      // Category breakdown
      if (!categoryBreakdown[ingredient.category]) {
        categoryBreakdown[ingredient.category] = { count: 0, value: 0 };
      }
      categoryBreakdown[ingredient.category].count++;
      categoryBreakdown[ingredient.category].value += itemValue;
      
      // Stock level ratio
      const stockRatio = ingredient.minStock > 0 ? ingredient.currentStock / ingredient.minStock : 0;
      totalStockRatio += stockRatio;
    });

    // Sort by value (descending)
    const topValueIngredients = [...ingredients]
      .sort((a, b) => (b.currentStock * b.currentPrice) - (a.currentStock * a.currentPrice))
      .slice(0, 5);

    // Sort low stock items by urgency
    const sortedLowStock = lowStockItems
      .sort((a, b) => {
        const statusA = getStockStatus(a.currentStock, a.minStock);
        const statusB = getStockStatus(b.currentStock, b.minStock);
        const priority: Record<StockStatus, number> = { out: 0, critical: 1, low: 2, good: 3 };
        return priority[statusA] - priority[statusB];
      })
      .slice(0, 10);

    return {
      totalItems: ingredients.length,
      totalValue,
      lowStockCount: statusBreakdown.low,
      criticalStockCount: statusBreakdown.critical,
      outOfStockCount: statusBreakdown.out,
      categoryBreakdown,
      statusBreakdown,
      averageStockLevel: ingredients.length > 0 ? (totalStockRatio / ingredients.length) * 100 : 0,
      topValueIngredients,
      lowStockIngredients: sortedLowStock
    };
  }, [ingredients]);

  const getCategoryDisplayName = (category: IngredientCategory): string => {
    const names = {
      [IngredientCategory.FLOUR]: 'Farinhas',
      [IngredientCategory.SUGAR]: 'Açúcares',
      [IngredientCategory.DAIRY]: 'Laticínios',
      [IngredientCategory.EGGS]: 'Ovos',
      [IngredientCategory.FATS]: 'Gorduras',
      [IngredientCategory.LEAVENING]: 'Fermentos',
      [IngredientCategory.FLAVORING]: 'Aromatizantes',
      [IngredientCategory.NUTS]: 'Castanhas',
      [IngredientCategory.FRUITS]: 'Frutas',
      [IngredientCategory.CHOCOLATE]: 'Chocolate',
      [IngredientCategory.SPICES]: 'Temperos',
      [IngredientCategory.PRESERVATIVES]: 'Conservantes',
      [IngredientCategory.OTHER]: 'Outros'
    };
    return names[category] || category;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
          <div className="h-96 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise de Estoque</h2>
          <p className="text-muted-foreground">Visão geral e métricas do inventário</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="1y">1 ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{metrics.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-green-600">Inventário ativo</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatPrice(metrics.totalValue)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">
                Média: {formatPrice(metrics.totalValue / Math.max(metrics.totalItems, 1))} por item
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas de Estoque</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics.criticalStockCount + metrics.outOfStockCount}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">
                + {metrics.lowStockCount} com estoque baixo
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nível Médio</p>
                <p className="text-2xl font-bold">{metrics.averageStockLevel.toFixed(0)}%</p>
              </div>
              <PieChart className="h-8 w-8 text-blue-600" />
            </div>
            <Progress value={metrics.averageStockLevel} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.categoryBreakdown)
                .sort(([,a], [,b]) => b.value - a.value)
                .slice(0, 8)
                .map(([category, data]) => {
                  const percentage = (data.value / metrics.totalValue) * 100;
                  return (
                    <div key={category}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {getCategoryDisplayName(category as IngredientCategory)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {data.count} itens
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatPrice(data.value)}
                          </span>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>

        {/* Stock Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Status do Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{metrics.statusBreakdown.good}</p>
                  <p className="text-sm text-green-600">Estoque Adequado</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-2xl font-bold text-yellow-700">{metrics.statusBreakdown.low}</p>
                  <p className="text-sm text-yellow-600">Estoque Baixo</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{metrics.statusBreakdown.critical}</p>
                  <p className="text-sm text-red-600">Estoque Crítico</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-2xl font-bold text-gray-700">{metrics.statusBreakdown.out}</p>
                  <p className="text-sm text-gray-600">Sem Estoque</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Ingredientes Mais Valiosos</h4>
                <div className="space-y-2">
                  {metrics.topValueIngredients.slice(0, 5).map((ingredient) => {
                    const value = ingredient.currentStock * ingredient.currentPrice;
                    return (
                      <div key={ingredient.id} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{ingredient.name}</span>
                        <span className="font-medium ml-2">{formatPrice(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items */}
      {metrics.lowStockIngredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Itens que Precisam de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.lowStockIngredients.map((ingredient) => {
                const status = getStockStatus(ingredient.currentStock, ingredient.minStock);
                const stockPercentage = (ingredient.currentStock / ingredient.minStock) * 100;
                
                return (
                  <div 
                    key={ingredient.id}
                    className={`p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
                      status === 'out' 
                        ? 'bg-red-50 border-red-200'
                        : status === 'critical'
                        ? 'bg-red-50/50 border-red-100'
                        : 'bg-yellow-50/50 border-yellow-100'
                    }`}
                    onClick={() => onIngredientClick?.(ingredient)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{ingredient.name}</h4>
                      <Badge variant="outline" className={
                        status === 'out' 
                          ? 'border-red-500 text-red-700'
                          : status === 'critical'
                          ? 'border-red-400 text-red-600'
                          : 'border-yellow-400 text-yellow-700'
                      }>
                        {getStockStatusText(status)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, stockPercentage))} 
                        className="h-2"
                        indicatorClassName={
                          status === 'out' 
                            ? "bg-red-500"
                            : status === 'critical'
                            ? "bg-red-400" 
                            : "bg-yellow-400"
                        }
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Atual: {ingredient.currentStock.toFixed(2)}</span>
                        <span>Mínimo: {ingredient.minStock.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}