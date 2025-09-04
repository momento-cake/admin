'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Package, Bell, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ingredient, StockStatus } from '@/types/ingredient';
import { fetchIngredients, getStockStatus, getStockStatusColor, getStockStatusText, formatStock } from '@/lib/ingredients';

interface StockAlert {
  ingredient: Ingredient;
  status: StockStatus;
  percentageRemaining: number;
  daysUntilEmpty?: number;
}

interface StockAlertsProps {
  onIngredientClick?: (ingredient: Ingredient) => void;
  showDismissed?: boolean;
}

export function StockAlerts({ onIngredientClick, showDismissed = false }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockAlerts();
  }, []);

  const loadStockAlerts = async () => {
    try {
      setLoading(true);
      const data = await fetchIngredients();
      const ingredients = data.ingredients || [];
      
      const stockAlerts: StockAlert[] = ingredients
        .map((ingredient: Ingredient) => {
          const status = getStockStatus(ingredient.currentStock, ingredient.minStock);
          const percentageRemaining = (ingredient.currentStock / ingredient.minStock) * 100;
          
          return {
            ingredient,
            status,
            percentageRemaining: Math.max(0, Math.min(100, percentageRemaining)),
            daysUntilEmpty: calculateDaysUntilEmpty(ingredient)
          };
        })
        .filter((alert: StockAlert) => alert.status === 'critical' || alert.status === 'low' || alert.status === 'out')
        .sort((a: StockAlert, b: StockAlert) => {
          const statusPriority: Record<StockStatus, number> = { 'out': 0, 'critical': 1, 'low': 2, 'good': 3 };
          return statusPriority[a.status] - statusPriority[b.status];
        });

      setAlerts(stockAlerts);
    } catch (error) {
      console.error('Erro ao carregar alertas de estoque:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilEmpty = (ingredient: Ingredient): number | undefined => {
    // Simple calculation based on average consumption (would be better with real usage data)
    const dailyUsage = ingredient.minStock / 30; // Assume min stock is 30 days worth
    if (dailyUsage > 0 && ingredient.currentStock > 0) {
      return Math.ceil(ingredient.currentStock / dailyUsage);
    }
    return undefined;
  };

  const dismissAlert = (ingredientId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(ingredientId));
  };

  const restoreAlert = (ingredientId: string) => {
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      newSet.delete(ingredientId);
      return newSet;
    });
  };

  const getAlertIcon = (status: StockStatus) => {
    switch (status) {
      case 'out':
        return <X className="h-4 w-4 text-red-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'low':
        return <Bell className="h-4 w-4 text-yellow-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getAlertPriority = (status: StockStatus): 'high' | 'medium' | 'low' => {
    switch (status) {
      case 'out':
        return 'high';
      case 'critical':
        return 'high';
      case 'low':
        return 'medium';
      default:
        return 'low';
    }
  };

  const filteredAlerts = alerts.filter(alert => 
    showDismissed ? 
      dismissedAlerts.has(alert.ingredient.id) : 
      !dismissedAlerts.has(alert.ingredient.id)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas de Estoque
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.filter(a => !dismissedAlerts.has(a.ingredient.id)).length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            {showDismissed ? (
              <div className="text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum alerta foi dispensado</p>
              </div>
            ) : (
              <div className="text-green-600">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <p className="font-medium">Todos os estoques estão adequados!</p>
                <p className="text-sm text-muted-foreground">
                  Nenhum ingrediente precisa de atenção no momento.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <Alert
                key={alert.ingredient.id}
                className={`border-l-4 ${
                  alert.status === 'out' 
                    ? 'border-l-red-500 bg-red-50/50' 
                    : alert.status === 'critical'
                    ? 'border-l-red-400 bg-red-50/30'
                    : 'border-l-yellow-400 bg-yellow-50/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {alert.ingredient.name}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={
                            alert.status === 'out' 
                              ? 'border-red-500 text-red-700'
                              : alert.status === 'critical'
                              ? 'border-red-400 text-red-600'
                              : 'border-yellow-400 text-yellow-700'
                          }
                        >
                          {getStockStatusText(alert.status)}
                        </Badge>
                      </div>
                      
                      <AlertDescription className="text-xs text-muted-foreground mb-2">
                        Estoque atual: {formatStock(alert.ingredient.currentStock, alert.ingredient.unit)} 
                        de {formatStock(alert.ingredient.minStock, alert.ingredient.unit)} mínimo
                        {alert.daysUntilEmpty && alert.status !== 'out' && (
                          <span className="block">
                            Estimativa: {alert.daysUntilEmpty} dias restantes
                          </span>
                        )}
                      </AlertDescription>
                      
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={alert.percentageRemaining} 
                          className="flex-1 h-2"
                          indicatorClassName={
                            alert.percentageRemaining === 0
                              ? "bg-red-500"
                              : alert.percentageRemaining <= 25
                              ? "bg-red-400" 
                              : "bg-yellow-400"
                          }
                        />
                        <span className="text-xs text-muted-foreground min-w-fit">
                          {alert.percentageRemaining.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {onIngredientClick && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onIngredientClick(alert.ingredient)}
                        className="h-8 px-2 text-xs"
                      >
                        Ver
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => 
                        showDismissed 
                          ? restoreAlert(alert.ingredient.id)
                          : dismissAlert(alert.ingredient.id)
                      }
                      className="h-8 px-2"
                    >
                      {showDismissed ? (
                        <Package className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </Alert>
            ))}
            
            {!showDismissed && dismissedAlerts.size > 0 && (
              <div className="text-center pt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDismissedAlerts(new Set())}
                  className="text-muted-foreground"
                >
                  Restaurar {dismissedAlerts.size} alertas dispensados
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}