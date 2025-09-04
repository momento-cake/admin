'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, AlertCircle } from 'lucide-react';
import { Ingredient, ConsumptionPattern, UsageHeatmap } from '@/types/ingredient';
import { format, eachDayOfInterval, subDays } from 'date-fns';

interface UsageAnalyticsProps {
  ingredients: Ingredient[];
  onIngredientClick?: (ingredient: Ingredient) => void;
}

export function UsageAnalytics({ ingredients, onIngredientClick }: UsageAnalyticsProps) {
  const [consumptionPatterns, setConsumptionPatterns] = useState<ConsumptionPattern[]>([]);
  const [usageHeatmaps, setUsageHeatmaps] = useState<UsageHeatmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>('');
  const [viewType, setViewType] = useState<'patterns' | 'heatmap'>('patterns');

  useEffect(() => {
    loadUsageData();
  }, [days, selectedIngredientId, viewType]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      
      if (viewType === 'patterns') {
        const response = await fetch(`/api/analytics/usage-patterns?days=${days}${selectedIngredientId ? `&ingredientId=${selectedIngredientId}` : ''}&type=patterns`);
        if (response.ok) {
          const data = await response.json();
          setConsumptionPatterns(data.patterns || []);
        }
      } else {
        const response = await fetch(`/api/analytics/usage-patterns?days=${days}${selectedIngredientId ? `&ingredientId=${selectedIngredientId}` : ''}&type=heatmap`);
        if (response.ok) {
          const data = await response.json();
          setUsageHeatmaps(data.heatmaps || []);
        }
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-red-500';
      case 'decreasing':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getVarianceColor = (usage: number, average: number) => {
    const variance = Math.abs((usage - average) / average);
    if (variance > 0.5) return '#ef4444'; // High variance - red
    if (variance > 0.2) return '#f59e0b'; // Medium variance - orange  
    return '#10b981'; // Low variance - green
  };

  // Prepare chart data for consumption patterns
  const chartData = consumptionPatterns.map(pattern => {
    const ingredient = ingredients.find(i => i.id === pattern.ingredientId);
    return {
      name: ingredient?.name || 'Unknown',
      average: pattern.averageUsage,
      peak: pattern.peakUsage,
      low: pattern.lowUsage,
      trend: pattern.trend,
      seasonal: pattern.seasonalPattern,
      ingredientId: pattern.ingredientId,
    };
  }).sort((a, b) => b.average - a.average);

  // Prepare pie chart data for top ingredients by usage
  const topIngredientsData = chartData.slice(0, 10).map((item, index) => ({
    name: item.name,
    value: item.average,
    color: `hsl(${(index * 360) / 10}, 70%, 60%)`,
  }));

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Carregando dados de consumo...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <Select value={days.toString()} onValueChange={(value) => setDays(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="365">1 ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ingrediente</label>
              <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos os ingredientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os ingredientes</SelectItem>
                  {ingredients.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Visualização</label>
              <Select value={viewType} onValueChange={(value: 'patterns' | 'heatmap') => setViewType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patterns">Padrões</SelectItem>
                  <SelectItem value="heatmap">Mapa de Calor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {viewType === 'patterns' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Ingredientes Ativos</p>
                    <p className="text-2xl font-bold">{consumptionPatterns.length}</p>
                  </div>
                  <Activity className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Consumo Médio Total</p>
                    <p className="text-2xl font-bold">
                      {consumptionPatterns.reduce((sum, p) => sum + p.averageUsage, 0).toFixed(1)}
                    </p>
                  </div>
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tendência Crescente</p>
                    <p className="text-2xl font-bold text-red-500">
                      {consumptionPatterns.filter(p => p.trend === 'increasing').length}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Padrão Sazonal</p>
                    <p className="text-2xl font-bold text-orange-500">
                      {consumptionPatterns.filter(p => p.seasonalPattern).length}
                    </p>
                  </div>
                  <AlertCircle className="h-6 w-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Consumo Médio por Ingrediente</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any, name: string) => [value.toFixed(2), 'Quantidade Média']}
                      />
                      <Bar 
                        dataKey="average" 
                        fill="#c4a484"
                        onClick={(data: any) => {
                          if (onIngredientClick) {
                            const ingredient = ingredients.find(i => i.id === data.ingredientId);
                            if (ingredient) onIngredientClick(ingredient);
                          }
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado de consumo disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Ingredientes</CardTitle>
              </CardHeader>
              <CardContent>
                {topIngredientsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={topIngredientsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topIngredientsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [value.toFixed(2), 'Quantidade Média']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Consumption Patterns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Padrões de Consumo Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              {consumptionPatterns.length > 0 ? (
                <div className="space-y-3">
                  {consumptionPatterns.map((pattern) => {
                    const ingredient = ingredients.find(i => i.id === pattern.ingredientId);
                    if (!ingredient) return null;

                    return (
                      <div key={pattern.ingredientId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-medium">{ingredient.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Média: {pattern.averageUsage.toFixed(2)} {ingredient.unit}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getTrendIcon(pattern.trend)}
                            <span className={`text-sm font-medium ${getTrendColor(pattern.trend)}`}>
                              {pattern.trend === 'increasing' ? 'Crescente' :
                               pattern.trend === 'decreasing' ? 'Decrescente' : 'Estável'}
                            </span>
                          </div>
                          {pattern.seasonalPattern && (
                            <Badge variant="outline">
                              Sazonal
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Pico: {pattern.peakUsage.toFixed(2)} • Mín: {pattern.lowUsage.toFixed(2)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onIngredientClick && onIngredientClick(ingredient)}
                          >
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum padrão de consumo encontrado para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Heatmap View */
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Calor de Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            {usageHeatmaps.length > 0 ? (
              <div className="space-y-6">
                {usageHeatmaps.map((heatmap) => (
                  <div key={heatmap.ingredientId} className="space-y-2">
                    <h4 className="font-medium">{heatmap.ingredientName}</h4>
                    <div className="grid grid-cols-7 gap-1">
                      {heatmap.dailyUsage.map((day, index) => (
                        <div
                          key={index}
                          className="aspect-square rounded text-xs flex items-center justify-center text-white font-medium"
                          style={{
                            backgroundColor: getVarianceColor(
                              day.usage,
                              heatmap.dailyUsage.reduce((sum, d) => sum + d.usage, 0) / heatmap.dailyUsage.length
                            ),
                            opacity: 0.3 + (day.intensity * 0.7),
                          }}
                          title={`${format(day.date, 'dd/MM')}: ${day.usage.toFixed(1)}`}
                        >
                          {format(day.date, 'd')}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de mapa de calor disponível
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}