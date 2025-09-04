'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileText, Download, TrendingUp, Calendar, DollarSign, Package, AlertTriangle } from 'lucide-react';
import { Ingredient, Recipe, CostTrend, ExportOptions } from '@/types/ingredient';
import { 
  exportInventoryToPDF, 
  exportRecipeCostsToPDF, 
  exportInventoryToExcel, 
  exportRecipesToExcel, 
  exportInventoryToCSV,
  exportChartToPNG,
  prepareDataForExport 
} from '@/lib/export-utils';
import { fetchSuppliers } from '@/lib/suppliers';
import { format, subDays } from 'date-fns';

interface ReportsDashboardProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
}

export function ReportsDashboard({ ingredients, recipes }: ReportsDashboardProps) {
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Filters
  const [reportType, setReportType] = useState<'inventory' | 'costs' | 'usage' | 'suppliers'>('inventory');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load cost trends
      const costTrendsResponse = await fetch('/api/analytics/cost-trends?days=30');
      if (costTrendsResponse.ok) {
        const data = await costTrendsResponse.json();
        setCostTrends(data.costTrends || []);
      }

      // Load suppliers
      const suppliersData = await fetchSuppliers();
      setSuppliers((suppliersData.suppliers || []).map((s: any) => ({
        id: s.id,
        name: s.name
      })));
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalInventoryValue = ingredients.reduce((sum, ing) => sum + (ing.currentPrice * ing.currentStock), 0);
  const lowStockIngredients = ingredients.filter(ing => ing.currentStock <= ing.minStock);
  const averageRecipeCost = recipes.filter(r => r.totalCost).reduce((sum, r) => sum + (r.totalCost || 0), 0) / recipes.filter(r => r.totalCost).length || 0;
  const expensiveRecipes = recipes.filter(r => (r.totalCost || 0) > averageRecipeCost);

  // Prepare chart data
  const categoryDistribution = ingredients.reduce((acc, ingredient) => {
    acc[ingredient.category] = (acc[ingredient.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryDistribution).map(([category, count], index) => ({
    name: category,
    value: count,
    color: `hsl(${(index * 360) / Object.keys(categoryDistribution).length}, 70%, 60%)`,
  }));

  const stockStatusData = [
    { name: 'Estoque Normal', value: ingredients.filter(ing => ing.currentStock > ing.minStock).length, color: '#10b981' },
    { name: 'Estoque Baixo', value: lowStockIngredients.length, color: '#f59e0b' },
    { name: 'Sem Estoque', value: ingredients.filter(ing => ing.currentStock === 0).length, color: '#ef4444' },
  ];

  const topExpensiveIngredients = ingredients
    .sort((a, b) => (b.currentPrice * b.currentStock) - (a.currentPrice * a.currentStock))
    .slice(0, 10)
    .map(ing => ({
      name: ing.name.length > 15 ? ing.name.substring(0, 15) + '...' : ing.name,
      value: ing.currentPrice * ing.currentStock,
      price: ing.currentPrice,
      stock: ing.currentStock,
    }));

  // Export functions
  const handleExport = async (format: 'pdf' | 'excel' | 'csv', type: string) => {
    try {
      setExporting(`${format}_${type}`);

      const exportOptions: ExportOptions = {
        format,
        includeCharts: true,
        dateRange: dateRange.from && dateRange.to ? {
          from: new Date(dateRange.from),
          to: new Date(dateRange.to)
        } : undefined,
        filters: {
          category: categoryFilter as any || undefined,
          supplierId: supplierFilter || undefined,
        }
      };

      const filteredIngredients = prepareDataForExport(ingredients, exportOptions);
      const filteredRecipes = prepareDataForExport(recipes, exportOptions);

      switch (format) {
        case 'pdf':
          if (type === 'inventory') {
            await exportInventoryToPDF(filteredIngredients as Ingredient[], exportOptions);
          } else if (type === 'recipes') {
            await exportRecipeCostsToPDF(filteredRecipes as Recipe[], ingredients);
          }
          break;
        case 'excel':
          if (type === 'inventory') {
            await exportInventoryToExcel(filteredIngredients as Ingredient[]);
          } else if (type === 'recipes') {
            await exportRecipesToExcel(filteredRecipes as Recipe[], ingredients);
          }
          break;
        case 'csv':
          if (type === 'inventory') {
            await exportInventoryToCSV(filteredIngredients as Ingredient[]);
          }
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Erro ao exportar relatório. Tente novamente.');
    } finally {
      setExporting(null);
    }
  };

  const isExporting = (format: string, type: string) => exporting === `${format}_${type}`;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Carregando dados de relatórios...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor do Inventário</p>
                <p className="text-2xl font-bold">{totalInventoryValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Ingredientes</p>
                <p className="text-2xl font-bold">{ingredients.length}</p>
              </div>
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockIngredients.length}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Custo Médio Receita</p>
                <p className="text-2xl font-bold">{averageRecipeCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={(value: any) => setReportType(value)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventário</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="usage">Consumo</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Export Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Inventário</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas as categorias</SelectItem>
                        {Object.keys(categoryDistribution).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os fornecedores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os fornecedores</SelectItem>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleExport('pdf', 'inventory')}
                    disabled={isExporting('pdf', 'inventory')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {isExporting('pdf', 'inventory') ? 'Exportando...' : 'Exportar PDF'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('excel', 'inventory')}
                    disabled={isExporting('excel', 'inventory')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting('excel', 'inventory') ? 'Exportando...' : 'Exportar Excel'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExport('csv', 'inventory')}
                    disabled={isExporting('csv', 'inventory')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting('csv', 'inventory') ? 'Exportando...' : 'Exportar CSV'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div id="category-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status do Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div id="stock-status-chart">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stockStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {stockStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Expensive Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredientes Mais Valiosos</CardTitle>
            </CardHeader>
            <CardContent>
              <div id="expensive-ingredients-chart">
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topExpensiveIngredients}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${value.toFixed(2)}`, 'Valor Total']}
                    />
                    <Bar dataKey="value" fill="#c4a484" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          {/* Recipe Costs Export */}
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Custos de Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleExport('pdf', 'recipes')}
                  disabled={isExporting('pdf', 'recipes')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {isExporting('pdf', 'recipes') ? 'Exportando...' : 'Exportar PDF'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport('excel', 'recipes')}
                  disabled={isExporting('excel', 'recipes')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting('excel', 'recipes') ? 'Exportando...' : 'Exportar Excel'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cost Trends */}
          {costTrends.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tendência de Custos (30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div id="cost-trends-chart">
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={costTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tickFormatter={(value) => format(new Date(value), 'dd/MM')} />
                      <YAxis tickFormatter={(value) => `R$ ${value.toFixed(0)}`} />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          `R$ ${value.toFixed(2)}`,
                          name === 'totalCost' ? 'Custo Total' : 'Custo Médio'
                        ]}
                        labelFormatter={(label) => `Data: ${format(new Date(label), 'dd/MM/yyyy')}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="totalCost" 
                        stackId="1"
                        stroke="#c4a484" 
                        fill="#c4a484"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Relatório de Consumo</h3>
                <p>Dados de consumo em desenvolvimento. Use a aba "Análise" para visualizar padrões de consumo atuais.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Relatório de Fornecedores</h3>
                <p>Análise de performance de fornecedores em desenvolvimento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}