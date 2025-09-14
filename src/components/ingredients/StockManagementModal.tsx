'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Ingredient, Supplier } from '@/types/ingredient';
import { getStockStatus, getStockStatusColor, getStockStatusText, formatStock, formatPrice, formatMeasurement } from '@/lib/ingredients';
import { Package, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockManagementModalProps {
  ingredient: Ingredient | null;
  suppliers: Supplier[];
  isOpen: boolean;
  onClose: () => void;
  onStockUpdate: (ingredientId: string, data: StockUpdateData) => Promise<void>;
}

interface StockUpdateData {
  quantity: number;
  type: 'adjustment' | 'purchase' | 'usage' | 'waste' | 'correction';
  notes?: string;
  reason?: string;
  supplierId?: string;
  unitCost?: number;
}

const stockTypes = [
  { value: 'purchase', label: 'Compra', icon: TrendingUp, color: 'text-green-600' },
  { value: 'adjustment', label: 'Ajuste', icon: Package, color: 'text-blue-600' },
  { value: 'usage', label: 'Uso/Produção', icon: TrendingDown, color: 'text-orange-600' },
  { value: 'waste', label: 'Descarte', icon: AlertTriangle, color: 'text-red-600' },
  { value: 'correction', label: 'Correção', icon: CheckCircle, color: 'text-purple-600' }
];

export function StockManagementModal({
  ingredient,
  suppliers,
  isOpen,
  onClose,
  onStockUpdate
}: StockManagementModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StockUpdateData>({
    quantity: 0,
    type: 'adjustment',
    notes: '',
    reason: '',
    supplierId: '',
    unitCost: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredient || loading) return;

    // Validate purchase-specific fields
    if (formData.type === 'purchase') {
      if (!formData.supplierId || formData.supplierId === '') {
        alert('Fornecedor é obrigatório para compras');
        return;
      }
      if (!formData.unitCost || formData.unitCost <= 0) {
        alert('Custo unitário é obrigatório para compras');
        return;
      }
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        supplierId: formData.supplierId || undefined,
        unitCost: formData.unitCost || undefined
      };

      await onStockUpdate(ingredient.id, submitData);
      
      // Reset form
      setFormData({
        quantity: 0,
        type: 'adjustment',
        notes: '',
        reason: '',
        supplierId: '',
        unitCost: 0
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        quantity: 0,
        type: 'adjustment',
        notes: '',
        reason: '',
        supplierId: '',
        unitCost: 0
      });
      onClose();
    }
  };

  if (!ingredient) return null;

  const stockStatus = getStockStatus(ingredient.currentStock, ingredient.minStock);
  const selectedType = stockTypes.find(type => type.value === formData.type);
  const isAdditive = ['purchase', 'adjustment', 'correction'].includes(formData.type);
  const newStock = isAdditive 
    ? ingredient.currentStock + Math.abs(formData.quantity)
    : Math.max(0, ingredient.currentStock - Math.abs(formData.quantity));

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gerenciar Estoque - {ingredient.name}
          </DialogTitle>
          <DialogDescription>
            Atualize o estoque do ingrediente registrando compras, ajustes ou uso do produto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stock Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Situação Atual</h4>
              <Badge className={cn("text-xs", getStockStatusColor(stockStatus))}>
                {getStockStatusText(stockStatus)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Estoque atual:</span>
                <p className="font-medium">{formatStock(ingredient.currentStock)}</p>
                <p className="text-xs text-muted-foreground">({formatMeasurement(ingredient.measurementValue, ingredient.unit)} cada)</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estoque mínimo:</span>
                <p className="font-medium">{formatStock(ingredient.minStock)}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Movement Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Movimentação *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stockTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", type.color)} />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantidade de Pacotes * {selectedType && (
                  <span className={cn("text-xs font-normal", selectedType.color)}>
                    ({isAdditive ? '+' : '-'} {Math.abs(formData.quantity)} {Math.abs(formData.quantity) === 1 ? 'unidade' : 'unidades'})
                  </span>
                )}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                placeholder="0"
                required
              />
              <p className="text-xs text-muted-foreground">
                Cada unidade = {formatMeasurement(ingredient.measurementValue, ingredient.unit)}
              </p>
            </div>

            {/* Supplier (for purchases) */}
            {formData.type === 'purchase' && (
              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor *</Label>
                <Select 
                  value={formData.supplierId || ''} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplierId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
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

            {/* Unit Cost (for purchases) */}
            {formData.type === 'purchase' && (
              <div className="space-y-2">
                <Label htmlFor="unitCost">
                  Custo por Unidade (R$) *
                  {formData.unitCost && formData.unitCost > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Total: {formatPrice(formData.quantity * formData.unitCost)})
                    </span>
                  )}
                </Label>
                <Input
                  id="unitCost"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.unitCost}
                  onChange={(e) => setFormData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                  required
                />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ex: Compra mensal, ajuste de inventário..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informações adicionais sobre esta movimentação..."
                rows={3}
              />
            </div>

            {/* Preview */}
            {formData.quantity > 0 && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <h4 className="font-medium text-sm mb-2">Preview da Atualização</h4>
                <div className="flex items-center gap-4 text-sm">
                  <span>
                    {formatStock(ingredient.currentStock)}
                  </span>
                  <span className={cn("font-medium", selectedType?.color)}>
                    {isAdditive ? '+' : '-'} {formatStock(Math.abs(formData.quantity))}
                  </span>
                  <span>→</span>
                  <span className="font-medium">
                    {formatStock(newStock)}
                  </span>
                </div>
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading || formData.quantity <= 0}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Atualizando...
              </>
            ) : (
              'Atualizar Estoque'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}