'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  QrCode, 
  Upload, 
  Download, 
  Search, 
  Package, 
  ShoppingCart, 
  RefreshCw,
  FileSpreadsheet,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Ingredient, BatchOperation, ReorderSuggestion, IngredientSubstitution } from '@/types/ingredient';

interface AdvancedFeaturesProps {
  ingredients: Ingredient[];
  onIngredientUpdate?: (ingredient: Ingredient) => void;
  onBatchComplete?: () => void;
}

export function AdvancedFeatures({ ingredients, onIngredientUpdate, onBatchComplete }: AdvancedFeaturesProps) {
  const [activeTab, setActiveTab] = useState('barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [batchOperations, setBatchOperations] = useState<BatchOperation[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [substitutions, setSubstitutions] = useState<IngredientSubstitution[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch operations state
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [batchType, setBatchType] = useState<'price_update' | 'stock_adjustment' | 'supplier_change'>('price_update');
  const [batchValue, setBatchValue] = useState('');
  const [batchNotes, setBatchNotes] = useState('');

  // Import/Export state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  useEffect(() => {
    generateReorderSuggestions();
    generateSubstitutions();
  }, [ingredients]);

  // Barcode scanning simulation (in real app, would use camera API)
  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) return;

    // Simulate barcode lookup
    const mockResults = [
      {
        barcode: barcodeInput,
        ingredient: ingredients.find(ing => ing.name.toLowerCase().includes('farinha')) || ingredients[0],
        confidence: 0.95,
        source: 'database',
      }
    ];

    setScanResults(mockResults);
    setBarcodeInput('');
  };

  // Batch operations
  const handleBatchOperation = async () => {
    if (selectedIngredients.length === 0 || !batchValue) return;

    setLoading(true);
    try {
      const batchOperation: BatchOperation = {
        id: Date.now().toString(),
        type: batchType,
        items: selectedIngredients.map(id => ({
          ingredientId: id,
          data: { value: parseFloat(batchValue), notes: batchNotes }
        })),
        status: 'processing',
        progress: 0,
        createdAt: new Date(),
      };

      setBatchOperations(prev => [...prev, batchOperation]);

      // Simulate batch processing
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setBatchOperations(prev => 
          prev.map(op => 
            op.id === batchOperation.id 
              ? { ...op, progress: i, status: i === 100 ? 'completed' : 'processing' }
              : op
          )
        );
      }

      // Reset form
      setSelectedIngredients([]);
      setBatchValue('');
      setBatchNotes('');
      
      if (onBatchComplete) {
        onBatchComplete();
      }
    } catch (error) {
      console.error('Batch operation error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate reorder suggestions based on usage patterns
  const generateReorderSuggestions = () => {
    const suggestions: ReorderSuggestion[] = ingredients
      .filter(ing => ing.currentStock <= ing.minStock * 1.5) // Include items approaching min stock
      .map(ingredient => {
        const stockRatio = ingredient.currentStock / ingredient.minStock;
        let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
        let suggestedQuantity = ingredient.minStock * 2; // Default to 2x min stock

        if (stockRatio <= 0.25) {
          urgency = 'critical';
          suggestedQuantity = ingredient.minStock * 3;
        } else if (stockRatio <= 0.5) {
          urgency = 'high';
          suggestedQuantity = ingredient.minStock * 2.5;
        } else if (stockRatio <= 0.75) {
          urgency = 'medium';
          suggestedQuantity = ingredient.minStock * 2;
        }

        return {
          ingredientId: ingredient.id,
          ingredientName: ingredient.name,
          currentStock: ingredient.currentStock,
          suggestedQuantity,
          urgency,
          reasoning: `Estoque atual (${ingredient.currentStock}) está ${stockRatio <= 0.5 ? 'muito baixo' : 'baixo'} comparado ao mínimo (${ingredient.minStock})`,
          estimatedCost: suggestedQuantity * ingredient.currentPrice,
          preferredSupplierId: ingredient.supplierId,
          calculatedAt: new Date(),
        };
      })
      .sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

    setReorderSuggestions(suggestions);
  };

  // Generate ingredient substitutions
  const generateSubstitutions = () => {
    const subs: IngredientSubstitution[] = ingredients.map(ingredient => {
      // Find similar ingredients based on category
      const similarIngredients = ingredients.filter(ing => 
        ing.id !== ingredient.id && 
        ing.category === ingredient.category &&
        ing.isActive
      );

      const substitutes = similarIngredients.map(sub => ({
        ingredientId: sub.id,
        name: sub.name,
        conversionRatio: 1, // Simplified - in reality would be more complex
        suitability: Math.random() * 0.5 + 0.5, // Mock suitability score
        notes: `Substituto da mesma categoria (${ingredient.category})`,
      })).slice(0, 3); // Limit to 3 substitutes

      return {
        ingredientId: ingredient.id,
        substitutes,
      };
    }).filter(sub => sub.substitutes.length > 0);

    setSubstitutions(subs);
  };

  // Import file handling
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);

    try {
      const text = await file.text();
      
      if (file.name.endsWith('.csv')) {
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const preview = lines.slice(1, 6).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
            return obj;
          }, {} as any);
        });
        setImportPreview(preview);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Erro ao ler arquivo');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="barcode">Código de Barras</TabsTrigger>
          <TabsTrigger value="batch">Operações em Lote</TabsTrigger>
          <TabsTrigger value="import">Importar/Exportar</TabsTrigger>
          <TabsTrigger value="reorder">Sugestões</TabsTrigger>
          <TabsTrigger value="substitutions">Substituições</TabsTrigger>
        </TabsList>

        <TabsContent value="barcode" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scanner de Código de Barras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite ou escaneie o código de barras"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                />
                <Button onClick={handleBarcodeSubmit}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Buscar
                </Button>
              </div>

              {scanResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Resultados da Busca:</h4>
                  {scanResults.map((result, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{result.ingredient.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Código: {result.barcode} • Confiança: {(result.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                        <Button size="sm" onClick={() => onIngredientUpdate && onIngredientUpdate(result.ingredient)}>
                          Atualizar Estoque
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operações em Lote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo de Operação</Label>
                  <Select value={batchType} onValueChange={(value: any) => setBatchType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_update">Atualização de Preços</SelectItem>
                      <SelectItem value="stock_adjustment">Ajuste de Estoque</SelectItem>
                      <SelectItem value="supplier_change">Mudança de Fornecedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Valor/Quantidade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    placeholder={batchType === 'price_update' ? 'Novo preço' : 'Quantidade'}
                  />
                </div>

                <div>
                  <Label>Observações</Label>
                  <Input
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    placeholder="Observações da operação"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Ingredientes Selecionados ({selectedIngredients.length})</Label>
                  <div className="space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedIngredients(ingredients.map(i => i.id))}
                    >
                      Selecionar Todos
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedIngredients([])}
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {ingredients.map((ingredient) => (
                    <div key={ingredient.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        checked={selectedIngredients.includes(ingredient.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIngredients(prev => [...prev, ingredient.id]);
                          } else {
                            setSelectedIngredients(prev => prev.filter(id => id !== ingredient.id));
                          }
                        }}
                      />
                      <span className="flex-1">{ingredient.name}</span>
                      <Badge variant="outline">{ingredient.category}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={handleBatchOperation}
                disabled={selectedIngredients.length === 0 || !batchValue || loading}
                className="w-full"
              >
                <Zap className="h-4 w-4 mr-2" />
                {loading ? 'Processando...' : 'Executar Operação em Lote'}
              </Button>

              {/* Batch Operations Status */}
              {batchOperations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Status das Operações:</h4>
                  {batchOperations.map((operation) => (
                    <Card key={operation.id} className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {operation.type === 'price_update' ? 'Atualização de Preços' :
                           operation.type === 'stock_adjustment' ? 'Ajuste de Estoque' :
                           'Mudança de Fornecedor'}
                        </span>
                        <div className="flex items-center space-x-2">
                          {operation.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {operation.status === 'processing' && <Clock className="h-4 w-4 text-blue-500" />}
                          {operation.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                          <span className="text-sm capitalize">{operation.status}</span>
                        </div>
                      </div>
                      <Progress value={operation.progress} className="mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {operation.items.length} item(s) • {operation.progress}% concluído
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          {/* Import Section */}
          <Card>
            <CardHeader>
              <CardTitle>Importar Dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="import-file">Arquivo (CSV/Excel)</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileImport}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos suportados: CSV, Excel (.xlsx, .xls)
                </p>
              </div>

              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Prévia da Importação:</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            {Object.keys(importPreview[0]).map((header) => (
                              <th key={header} className="px-3 py-2 text-left">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, index) => (
                            <tr key={index} className="border-t">
                              {Object.values(row).map((value: any, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2">{value}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button>
                      <Upload className="h-4 w-4 mr-2" />
                      Confirmar Importação
                    </Button>
                    <Button variant="outline" onClick={() => setImportPreview([])}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle>Exportar Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <FileSpreadsheet className="h-6 w-6 mx-auto mb-1" />
                    <span>Template CSV</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <Download className="h-6 w-6 mx-auto mb-1" />
                    <span>Backup Completo</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-20">
                  <div className="text-center">
                    <Package className="h-6 w-6 mx-auto mb-1" />
                    <span>Dados de Estoque</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sugestões de Reposição</CardTitle>
                <Button variant="outline" size="sm" onClick={generateReorderSuggestions}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Sugestões
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {reorderSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {reorderSuggestions.map((suggestion) => (
                    <div key={suggestion.ingredientId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{suggestion.ingredientName}</h4>
                          <Badge variant={getUrgencyColor(suggestion.urgency)}>
                            {suggestion.urgency === 'critical' ? 'Crítico' :
                             suggestion.urgency === 'high' ? 'Alto' :
                             suggestion.urgency === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {suggestion.estimatedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {suggestion.suggestedQuantity} unidades
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{suggestion.reasoning}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Estoque atual: {suggestion.currentStock} • Sugerido: {suggestion.suggestedQuantity}
                        </span>
                        <Button size="sm">
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          Fazer Pedido
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma Sugestão</h3>
                  <p>Todos os ingredientes estão com estoque adequado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substitutions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Substituições de Ingredientes</CardTitle>
            </CardHeader>
            <CardContent>
              {substitutions.slice(0, 10).map((substitution) => {
                const ingredient = ingredients.find(ing => ing.id === substitution.ingredientId);
                if (!ingredient || substitution.substitutes.length === 0) return null;

                return (
                  <div key={substitution.ingredientId} className="p-4 border rounded-lg space-y-3">
                    <h4 className="font-medium">{ingredient.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {substitution.substitutes.map((substitute, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <p className="font-medium text-sm">{substitute.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Adequação: {(substitute.suitability * 100).toFixed(0)}% • 
                            Proporção: {substitute.conversionRatio}:1
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}