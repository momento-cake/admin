'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { stockUpdateValidation, type StockUpdateData } from '@/lib/validators/packaging';
import { Packaging, StockHistoryEntry } from '@/types/packaging';
import { Supplier } from '@/types/ingredient';
import { fetchSuppliers } from '@/lib/suppliers';
import { fetchStockHistory } from '@/lib/packaging';
import { Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StockManagerProps {
  packaging: Packaging;
  onStockUpdated: (updatedPackaging: Packaging) => void;
  onCancel?: () => void;
}

const STOCK_MOVEMENT_TYPES = [
  { value: 'adjustment', label: 'Ajuste Manual' },
  { value: 'purchase', label: 'Compra' },
  { value: 'usage', label: 'Uso' },
  { value: 'waste', label: 'Desperdício' },
  { value: 'correction', label: 'Correção' }
];

export function StockManager({
  packaging,
  onStockUpdated,
  onCancel
}: StockManagerProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<StockUpdateData>({
    resolver: zodResolver(stockUpdateValidation),
    defaultValues: {
      packagingId: packaging.id,
      quantity: 0,
      type: 'adjustment',
      notes: undefined,
      reason: undefined,
      supplierId: undefined,
      unitCost: undefined
    }
  });

  const selectedType = form.watch('type');

  // Load suppliers and stock history
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingSuppliers(true);
        setLoadingHistory(true);

        const [suppliersRes, historyRes] = await Promise.all([
          fetchSuppliers(),
          fetchStockHistory(packaging.id, 10)
        ]);

        setSuppliers(suppliersRes.suppliers || []);
        setStockHistory(historyRes);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Erro ao carregar dados');
      } finally {
        setLoadingSuppliers(false);
        setLoadingHistory(false);
      }
    };

    loadData();
  }, [packaging.id]);

  const handleSubmit = async (data: StockUpdateData) => {
    try {
      setError(null);
      setIsSubmitting(true);

      // Calculate new stock
      const newStock = packaging.currentStock + (selectedType === 'usage' || selectedType === 'waste' ? -data.quantity : data.quantity);

      // Create updated packaging (this is mock - real update would come from onStockUpdated handler)
      const updated: Packaging = {
        ...packaging,
        currentStock: Math.max(0, newStock)
      };

      onStockUpdated(updated);
    } catch (err) {
      console.error('Error updating stock:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar estoque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQuantity = form.watch('quantity');
  const newStock = packaging.currentStock + (selectedType === 'usage' || selectedType === 'waste' ? -currentQuantity : currentQuantity);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Current Stock Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Estoque Atual</p>
                  <p className="text-2xl font-bold">{packaging.currentStock}</p>
                </div>
                <div className="flex items-center justify-center">
                  {selectedType === 'usage' || selectedType === 'waste' ? (
                    <ArrowDown className="h-6 w-6 text-red-500" />
                  ) : (
                    <ArrowUp className="h-6 w-6 text-green-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Novo Estoque</p>
                  <p className={`text-2xl font-bold ${newStock < 0 ? 'text-red-600' : ''}`}>
                    {Math.max(0, newStock)}
                  </p>
                </div>
              </div>
              {newStock < 0 && (
                <p className="text-xs text-red-600 mt-3 text-center">
                  ⚠️ O estoque ficará negativo. A quantidade será limitada a {packaging.currentStock}.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Movement Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Movimentação *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STOCK_MOVEMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    step="0.01"
                    min="0"
                    value={field.value || ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  {selectedType === 'usage' || selectedType === 'waste' ? 'Quantidade a remover' : 'Quantidade a adicionar'}
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Supplier (for purchase) */}
          {selectedType === 'purchase' && (
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingSuppliers
                            ? "Carregando fornecedores..."
                            : "Selecione um fornecedor"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Unit Cost (for purchase) */}
          {selectedType === 'purchase' && (
            <FormField
              control={form.control}
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custo Unitário (R$) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Reason */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Motivo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Compra de emergência, Quebra durante transporte"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Observações adicionais"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Atualizar Estoque
            </Button>
          </div>
        </form>
      </Form>

      {/* Stock History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : stockHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma movimentação registrada
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {stockHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-md"
                >
                  <div className="flex-1">
                    <div className="font-medium capitalize">{entry.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(entry.createdAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${entry.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {entry.quantity < 0 ? '' : '+'}{entry.quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.previousStock} → {entry.newStock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
