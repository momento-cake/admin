'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { Ingredient, PriceHistory, Supplier } from '@/types/ingredient';
import { fetchPriceHistory, addPriceEntry, calculatePriceChange, getAveragePrice, detectPriceAlerts, generatePriceTrendData } from '@/lib/price-history';
import { format } from 'date-fns';

interface PriceTrackerProps {
  ingredient: Ingredient;
  suppliers?: Supplier[];
  onPriceUpdate?: (ingredient: Ingredient) => void;
}

export function PriceTracker({ ingredient, suppliers = [], onPriceUpdate }: PriceTrackerProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPrice, setShowAddPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [days, setDays] = useState(30);

  // Form state
  const [newPrice, setNewPrice] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPriceHistory();
  }, [ingredient.id, days]);

  const loadPriceHistory = async () => {
    try {
      setLoading(true);
      const { priceHistory: history } = await fetchPriceHistory(ingredient.id, 100, new Date(Date.now() - days * 24 * 60 * 60 * 1000));
      setPriceHistory(history);
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async () => {
    if (!newPrice || isNaN(parseFloat(newPrice))) return;

    try {
      setIsSubmitting(true);
      await addPriceEntry(
        ingredient.id,
        parseFloat(newPrice),
        selectedSupplierId || undefined,
        notes || undefined,
        'user' // In a real app, this would come from auth context
      );

      // Reload history
      await loadPriceHistory();
      
      // Reset form
      setNewPrice('');
      setSelectedSupplierId('');
      setNotes('');
      setShowAddPrice(false);

      // Notify parent if needed
      if (onPriceUpdate) {
        onPriceUpdate({ ...ingredient, currentPrice: parseFloat(newPrice) });
      }
    } catch (error) {
      console.error('Error adding price entry:', error);
      alert('Erro ao adicionar entrada de preço');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate metrics
  const averagePrice = getAveragePrice(priceHistory, days);
  const priceChange = priceHistory.length >= 2 ? calculatePriceChange(priceHistory[0].price, priceHistory[1].price) : null;
  const priceAlerts = detectPriceAlerts(priceHistory);
  const trendData = generatePriceTrendData(priceHistory, days);

  const getTrendIcon = () => {
    if (!priceChange) return <Minus className="h-4 w-4" />;
    if (priceChange.trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (priceChange.trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (!priceChange) return 'text-muted-foreground';
    if (priceChange.trend === 'up') return 'text-red-500';
    if (priceChange.trend === 'down') return 'text-green-500';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Carregando histórico de preços...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Alerts */}
      {priceAlerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {priceAlerts.map((alert, index) => (
                <div key={index} className="font-medium">
                  {alert.type === 'increase' ? 'Aumento' : 'Redução'} de preço: {alert.percentage.toFixed(1)}%
                  ({alert.current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} → {alert.previous.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Current Price and Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preço Atual</p>
                <p className="text-2xl font-bold">{ingredient.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preço Médio ({days}d)</p>
                <p className="text-2xl font-bold">{averagePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variação</p>
                <div className="flex items-center space-x-2">
                  {priceChange && (
                    <>
                      <p className={`text-2xl font-bold ${getTrendColor()}`}>
                        {priceChange.percentage > 0 ? '+' : ''}{priceChange.percentage.toFixed(1)}%
                      </p>
                      {getTrendIcon()}
                    </>
                  )}
                  {!priceChange && (
                    <p className="text-2xl font-bold text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Registros</p>
                <p className="text-2xl font-bold">{priceHistory.length}</p>
              </div>
              <div className="text-right">
                <Button variant="outline" size="sm" onClick={() => setShowAddPrice(true)}>
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Preços</CardTitle>
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
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Tooltip 
                  formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Preço']}
                  labelFormatter={(label) => `Data: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#c4a484" 
                  strokeWidth={2} 
                  dot={{ fill: '#c4a484', strokeWidth: 2, r: 4 }}
                />
                <ReferenceLine y={averagePrice} stroke="#666" strokeDasharray="5 5" label={`Média: R$ ${averagePrice.toFixed(2)}`} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum dado de preço disponível para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          {priceHistory.length > 0 ? (
            <div className="space-y-2">
              {priceHistory.slice(0, 10).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{entry.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      <p className="text-sm text-muted-foreground">{format(entry.date, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    {entry.changePercentage !== undefined && (
                      <Badge variant={entry.changePercentage > 0 ? 'destructive' : 'default'}>
                        {entry.changePercentage > 0 ? '+' : ''}{entry.changePercentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    {entry.supplierId && suppliers.find(s => s.id === entry.supplierId) && (
                      <p className="text-sm font-medium">
                        {suppliers.find(s => s.id === entry.supplierId)?.name}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground">{entry.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico de preços registrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Price Dialog */}
      {showAddPrice && (
        <Card className="border-2 border-momento-primary">
          <CardHeader>
            <CardTitle>Adicionar Registro de Preço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newPrice">Novo Preço *</Label>
                <Input
                  id="newPrice"
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label htmlFor="supplier">Fornecedor</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
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
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre esta alteração de preço..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddPrice(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddPrice} disabled={isSubmitting || !newPrice}>
                {isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}