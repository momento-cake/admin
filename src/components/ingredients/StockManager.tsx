'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Minus, Package, TrendingUp, TrendingDown, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ingredient } from '@/types/ingredient';
import { updateIngredient, getStockStatus, getStockStatusColor, getStockStatusText, formatStock } from '@/lib/ingredients';

const stockUpdateSchema = z.object({
  type: z.enum(['receive', 'consume', 'adjust']),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  reason: z.string().optional(),
  notes: z.string().optional(),
  supplierId: z.string().optional(),
  cost: z.number().optional()
});

type StockUpdateData = z.infer<typeof stockUpdateSchema>;

interface StockTransaction {
  id: string;
  type: 'receive' | 'consume' | 'adjust';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  notes?: string;
  timestamp: Date;
  userId: string;
  cost?: number;
  supplierId?: string;
}

interface StockManagerProps {
  ingredient: Ingredient;
  onStockUpdated: (updatedIngredient: Ingredient) => void;
  suppliers?: Array<{ id: string; name: string }>;
}

export function StockManager({ ingredient, onStockUpdated, suppliers = [] }: StockManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StockTransaction[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<StockUpdateData>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      type: 'receive',
      quantity: 0
    }
  });

  const watchedType = watch('type');
  const watchedQuantity = watch('quantity');

  const currentStatus = getStockStatus(ingredient.currentStock, ingredient.minStock);
  
  // Calculate new stock based on operation type
  const calculateNewStock = (type: string, quantity: number): number => {
    switch (type) {
      case 'receive':
        return ingredient.currentStock + quantity;
      case 'consume':
        return Math.max(0, ingredient.currentStock - quantity);
      case 'adjust':
        return quantity;
      default:
        return ingredient.currentStock;
    }
  };

  const newStock = calculateNewStock(watchedType, watchedQuantity || 0);
  const newStatus = getStockStatus(newStock, ingredient.minStock);

  const handleStockUpdate = async (data: StockUpdateData) => {
    try {
      setLoading(true);
      setError(null);

      const updatedIngredient = await updateIngredient({
        id: ingredient.id,
        currentStock: newStock
        // lastUpdated will be handled by the API
      });

      // In a real implementation, you would also save the transaction to history
      const transaction: StockTransaction = {
        id: Date.now().toString(),
        type: data.type,
        quantity: data.quantity,
        previousStock: ingredient.currentStock,
        newStock,
        reason: data.reason,
        notes: data.notes,
        timestamp: new Date(),
        userId: 'current-user-id', // Would come from auth context
        cost: data.cost,
        supplierId: data.supplierId
      };

      setHistory(prev => [transaction, ...prev]);
      onStockUpdated(updatedIngredient);
      reset();
    } catch (error: any) {
      setError(error.message || 'Erro ao atualizar estoque');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receive':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'consume':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'adjust':
        return <Package className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'receive':
        return 'Receber Estoque';
      case 'consume':
        return 'Consumir Estoque';
      case 'adjust':
        return 'Ajustar Estoque';
      default:
        return type;
    }
  };

  const getTypeDescription = (type: string) => {
    switch (type) {
      case 'receive':
        return 'Adicionar produtos recebidos ao estoque';
      case 'consume':
        return 'Remover produtos consumidos do estoque';
      case 'adjust':
        return 'Corrigir o valor atual do estoque';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Gerenciar Estoque - {ingredient.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="update" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="update">Atualizar Estoque</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="update" className="space-y-4">
              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Estoque Atual</p>
                  <p className="text-2xl font-bold">
                    {formatStock(ingredient.currentStock, ingredient.unit)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <Badge className={getStockStatusColor(currentStatus)}>
                    {getStockStatusText(currentStatus)}
                  </Badge>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Estoque Mínimo</p>
                  <p className="text-lg font-medium">
                    {formatStock(ingredient.minStock, ingredient.unit)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(handleStockUpdate)} className="space-y-4">
                {error && (
                  <Alert>
                    <AlertDescription className="text-red-600">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label>Tipo de Operação</Label>
                  <Select 
                    value={watchedType} 
                    onValueChange={(value) => setValue('type', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receive">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-green-600" />
                          <div>
                            <p>Receber Estoque</p>
                            <p className="text-xs text-muted-foreground">Adicionar produtos recebidos</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="consume">
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-red-600" />
                          <div>
                            <p>Consumir Estoque</p>
                            <p className="text-xs text-muted-foreground">Remover produtos utilizados</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="adjust">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-600" />
                          <div>
                            <p>Ajustar Estoque</p>
                            <p className="text-xs text-muted-foreground">Corrigir quantidade atual</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>
                    {watchedType === 'adjust' ? 'Nova Quantidade' : 'Quantidade'}
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Quantidade em ${ingredient.unit}`}
                    {...register('quantity', { valueAsNumber: true })}
                  />
                  {errors.quantity && (
                    <p className="text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>

                {/* Preview */}
                {watchedQuantity > 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Previsão:</span>
                      <div className="flex items-center gap-2">
                        {newStock > ingredient.currentStock ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : newStock < ingredient.currentStock ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <Package className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                    <p className="text-lg">
                      {formatStock(ingredient.currentStock, ingredient.unit)} → {' '}
                      <span className="font-bold">
                        {formatStock(newStock, ingredient.unit)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">Novo status:</span>
                      <Badge className={getStockStatusColor(newStatus)}>
                        {getStockStatusText(newStatus)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Additional Fields */}
                {watchedType === 'receive' && suppliers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Fornecedor (opcional)</Label>
                    <Select onValueChange={(value) => setValue('supplierId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {watchedType === 'receive' && (
                  <div className="space-y-2">
                    <Label>Custo Total (opcional)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Valor pago pelos produtos"
                      {...register('cost', { valueAsNumber: true })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Input
                    placeholder="Ex: Recebimento do fornecedor, Uso na receita X"
                    {...register('reason')}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    placeholder="Informações adicionais sobre esta operação"
                    {...register('notes')}
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading || watchedQuantity <= 0}
                  className="w-full"
                >
                  {loading ? 'Atualizando...' : 'Atualizar Estoque'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma transação registrada</p>
                  <p className="text-sm">As movimentações de estoque aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {getTypeIcon(transaction.type)}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-sm">
                                  {getTypeLabel(transaction.type)}
                                </h4>
                                <Badge variant="outline" className="text-xs">
                                  {formatStock(transaction.quantity, ingredient.unit)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatStock(transaction.previousStock, ingredient.unit)} → {' '}
                                {formatStock(transaction.newStock, ingredient.unit)}
                              </p>
                              {transaction.reason && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Motivo: {transaction.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {transaction.timestamp.toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.timestamp.toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}