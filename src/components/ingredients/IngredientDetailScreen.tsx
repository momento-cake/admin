'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ingredient, Supplier, PriceHistoryEntry } from '@/types/ingredient';
import { 
  getStockStatus, 
  getStockStatusColor, 
  getStockStatusText, 
  formatStock,
  formatMeasurement, 
  formatPrice,
  updateIngredientStock,
  fetchStockHistory,
  fetchPriceHistory,
  getUnitDisplayName
} from '@/lib/ingredients';
import { StockManagementModal } from './StockManagementModal';
import { 
  Package, 
  DollarSign, 
  User, 
  AlertTriangle, 
  Calendar,
  TrendingUp,
  Edit,
  Plus,
  History,
  Loader2,
  TrendingDown,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngredientDetailScreenProps {
  ingredient: Ingredient;
  suppliers: Supplier[];
  onEdit: (ingredient: Ingredient) => void;
  onBack: () => void;
  onIngredientUpdate: (ingredient: Ingredient) => void;
}

interface StockHistoryItem {
  id: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export function IngredientDetailScreen({
  ingredient: initialIngredient,
  suppliers,
  onEdit,
  onBack,
  onIngredientUpdate
}: IngredientDetailScreenProps) {
  const [ingredient, setIngredient] = useState(initialIngredient);
  const [stockHistory, setStockHistory] = useState<StockHistoryItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [showStockModal, setShowStockModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingPriceHistory, setLoadingPriceHistory] = useState(false);

  const stockStatus = getStockStatus(ingredient.currentStock, ingredient.minStock);
  const supplier = suppliers.find(s => s.id === ingredient.supplierId);

  // Load stock history
  useEffect(() => {
    const loadStockHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await fetchStockHistory(ingredient.id);
        setStockHistory(response.history || []);
      } catch (error) {
        console.error('Error loading stock history:', error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadStockHistory();
  }, [ingredient.id]);

  // Load price history
  useEffect(() => {
    const loadPriceHistory = async () => {
      try {
        setLoadingPriceHistory(true);
        const response = await fetchPriceHistory(ingredient.id);
        setPriceHistory(response.priceHistory || []);
      } catch (error) {
        console.error('Error loading price history:', error);
      } finally {
        setLoadingPriceHistory(false);
      }
    };

    loadPriceHistory();
  }, [ingredient.id]);

  const handleStockUpdate = async (ingredientId: string, data: any) => {
    try {
      await updateIngredientStock(ingredientId, data);
      
      // Reload ingredient data (in a real app, you'd refetch from API)
      // For now, update the local state optimistically
      const isAdditive = ['purchase', 'adjustment', 'correction'].includes(data.type);
      const newStock = isAdditive 
        ? ingredient.currentStock + Math.abs(data.quantity)
        : Math.max(0, ingredient.currentStock - Math.abs(data.quantity));
      
      const updatedIngredient = {
        ...ingredient,
        currentStock: newStock,
        currentPrice: data.unitCost || ingredient.currentPrice,
        lastUpdated: new Date()
      };
      
      setIngredient(updatedIngredient);
      onIngredientUpdate(updatedIngredient);
      
      // Reload stock history
      const response = await fetchStockHistory(ingredient.id);
      setStockHistory(response.history || []);
      
      // If this was a purchase, reload price history too
      if (data.type === 'purchase') {
        const priceResponse = await fetchPriceHistory(ingredient.id);
        setPriceHistory(priceResponse.priceHistory || []);
      }
      
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  const getStockMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'usage': return <Package className="h-4 w-4 text-orange-600" />;
      case 'waste': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStockMovementText = (type: string) => {
    const types = {
      purchase: 'Compra',
      adjustment: 'Ajuste',
      usage: 'Uso/Produção',
      waste: 'Descarte',
      correction: 'Correção'
    };
    return types[type as keyof typeof types] || type;
  };

  const getPriceTrendIcon = (currentPrice: number, previousPrice?: number) => {
    if (!previousPrice) return <Clock className="h-4 w-4 text-muted-foreground" />;
    
    if (currentPrice > previousPrice) {
      return <TrendingUp className="h-4 w-4 text-red-600" />;
    } else if (currentPrice < previousPrice) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getPriceTrendText = (currentPrice: number, previousPrice?: number) => {
    if (!previousPrice) return 'Primeiro registro';
    
    const difference = currentPrice - previousPrice;
    const percentage = ((difference / previousPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return `+${percentage}% (${formatPrice(difference)})`;
    } else if (difference < 0) {
      return `${percentage}% (${formatPrice(difference)})`;
    }
    
    return 'Preço mantido';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {ingredient.name}
            {ingredient.brand && <span className="text-muted-foreground"> - {ingredient.brand}</span>}
          </h1>
          <p className="text-sm text-muted-foreground">
            Medida: {formatMeasurement(ingredient.measurementValue, ingredient.unit)}
          </p>
          {ingredient.description && (
            <p className="text-muted-foreground">{ingredient.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowStockModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Atualizar Estoque
          </Button>
          <Button onClick={() => onEdit(ingredient)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Atual</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStock(ingredient.currentStock)}
            </div>
            <div className="flex items-center justify-between mt-3">
              <Badge className={cn("text-xs", getStockStatusColor(stockStatus))}>
                {getStockStatusText(stockStatus)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getUnitDisplayName(ingredient.unit)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preço Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(ingredient.currentPrice)}</div>
            <div className="flex items-center gap-2 mt-2">
              {priceHistory.length > 1 && (
                <div className="flex items-center gap-1">
                  {getPriceTrendIcon(priceHistory[0]?.price || ingredient.currentPrice, priceHistory[1]?.price)}
                  <span className={cn("text-xs font-medium",
                    priceHistory[0] && priceHistory[1] && priceHistory[0].price > priceHistory[1].price ? "text-red-600" :
                    priceHistory[0] && priceHistory[1] && priceHistory[0].price < priceHistory[1].price ? "text-green-600" :
                    "text-muted-foreground"
                  )}>
                    {priceHistory[0] && priceHistory[1] && getPriceTrendText(priceHistory[0].price, priceHistory[1].price)}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Por unidade de estoque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="prices">
            <DollarSign className="h-4 w-4 mr-2" />
            Histórico de Preços
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Ingrediente</CardTitle>
              <CardDescription>
                Detalhes completos e propriedades do ingrediente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Informações Básicas</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Categoria:</span>
                        <span className="font-medium">{ingredient.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quantidade:</span>
                        <span className="font-medium">{ingredient.measurementValue} {getUnitDisplayName(ingredient.unit)}</span>
                      </div>
                      {ingredient.brand && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Marca:</span>
                          <span className="font-medium">{ingredient.brand}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estoque mínimo:</span>
                        <span className="font-medium">{formatStock(ingredient.minStock)} {getUnitDisplayName(ingredient.unit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={ingredient.isActive ? "default" : "secondary"}>
                          {ingredient.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-medium mb-2">Alérgenos</h4>
                    <div className="flex flex-wrap gap-1">
                      {ingredient.allergens && ingredient.allergens.length > 0 ? (
                        ingredient.allergens.map((allergen) => (
                          <Badge key={allergen} variant="outline" className="text-xs">
                            {allergen}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhum alérgeno cadastrado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Datas</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Criado em:</span>
                        <span className="font-medium">
                          {ingredient.createdAt ? new Date(ingredient.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última atualização:</span>
                        <span className="font-medium">
                          {ingredient.lastUpdated ? new Date(ingredient.lastUpdated).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Criado por:</span>
                        <span className="font-medium">{ingredient.createdBy}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div>
                    <h4 className="font-medium mb-2">Fornecedor</h4>
                    {supplier ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nome:</span>
                          <span className="font-medium">{supplier.name}</span>
                        </div>
                        {supplier.contactPerson && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contato:</span>
                            <span className="font-medium">{supplier.contactPerson}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Telefone:</span>
                            <span className="font-medium">{supplier.phone}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rating:</span>
                          <span className="font-medium">{supplier.rating.toFixed(1)}/5.0</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum fornecedor definido</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
              <CardDescription>
                Registro de todas as alterações de estoque deste ingrediente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando histórico...</span>
                </div>
              ) : stockHistory.length > 0 ? (
                <div className="space-y-4">
                  {stockHistory.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getStockMovementIcon(item.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{getStockMovementText(item.type)}</h4>
                          <span className="text-xs text-muted-foreground">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'N/A'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatStock(item.previousStock)} → {formatStock(item.newStock)}
                          <span className={cn("ml-2 font-medium", 
                            item.quantity > 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ({item.quantity > 0 ? '+' : ''}{formatStock(Math.abs(item.quantity))})
                          </span>
                        </p>
                        {item.reason && (
                          <p className="text-sm mt-1"><strong>Motivo:</strong> {item.reason}</p>
                        )}
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {item.createdBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Nenhum histórico encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    As movimentações de estoque aparecerão aqui
                  </p>
                  <Button onClick={() => setShowStockModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Primeira Movimentação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Preços</CardTitle>
              <CardDescription>
                Registro de todas as variações de preço deste ingrediente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPriceHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Carregando histórico de preços...</span>
                </div>
              ) : priceHistory.length > 0 ? (
                <div className="space-y-4">
                  {priceHistory.map((entry, index) => {
                    const previousPrice = index < priceHistory.length - 1 ? priceHistory[index + 1].price : undefined;
                    const supplierName = suppliers.find(s => s.id === entry.supplierId)?.name || 'Fornecedor não encontrado';
                    
                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-4 border rounded-lg">
                        {getPriceTrendIcon(entry.price, previousPrice)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-lg">{formatPrice(entry.price)}</h4>
                            <span className="text-xs text-muted-foreground">
                              {entry.createdAt ? new Date(entry.createdAt).toLocaleString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-muted-foreground">
                              Fornecedor: <span className="font-medium text-foreground">{supplierName}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Quantidade: <span className="font-medium text-foreground">{formatStock(entry.quantity)}</span>
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Variação: <span className={cn("font-medium", 
                                previousPrice && entry.price > previousPrice ? "text-red-600" :
                                previousPrice && entry.price < previousPrice ? "text-green-600" :
                                "text-muted-foreground"
                              )}>
                                {getPriceTrendText(entry.price, previousPrice)}
                              </span>
                            </p>
                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Nenhum histórico de preços encontrado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    O histórico de preços será criado automaticamente quando você fizer compras
                  </p>
                  <Button onClick={() => setShowStockModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar Compra
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Stock Management Modal */}
      <StockManagementModal
        ingredient={ingredient}
        suppliers={suppliers}
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        onStockUpdate={handleStockUpdate}
      />
    </div>
  );
}