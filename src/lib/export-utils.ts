import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { Ingredient, Recipe, PriceHistory, ExportOptions } from '@/types/ingredient';
import { format } from 'date-fns';

// PDF Export Functions
export async function exportInventoryToPDF(
  ingredients: Ingredient[],
  options: ExportOptions
): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.text('Relatório de Inventário - Momento Cake', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  pdf.setFontSize(12);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPosition);
  yPosition += 10;

  if (options.dateRange) {
    pdf.text(`Período: ${format(options.dateRange.from, 'dd/MM/yyyy')} - ${format(options.dateRange.to, 'dd/MM/yyyy')}`, 20, yPosition);
    yPosition += 10;
  }

  yPosition += 10;

  // Summary
  pdf.setFontSize(16);
  pdf.text('Resumo', 20, yPosition);
  yPosition += 15;

  const totalValue = ingredients.reduce((sum, ing) => sum + (ing.currentPrice * ing.currentStock), 0);
  const activeIngredients = ingredients.filter(ing => ing.isActive).length;
  const lowStockCount = ingredients.filter(ing => ing.currentStock <= ing.minStock).length;

  pdf.setFontSize(12);
  pdf.text(`Total de ingredientes: ${ingredients.length}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Ingredientes ativos: ${activeIngredients}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Ingredientes com estoque baixo: ${lowStockCount}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Valor total do inventário: ${totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
  yPosition += 20;

  // Table header
  pdf.setFontSize(14);
  pdf.text('Detalhes dos Ingredientes', 20, yPosition);
  yPosition += 15;

  // Table
  const tableHeaders = ['Nome', 'Categoria', 'Estoque', 'Preço', 'Valor Total'];
  const colWidths = [60, 40, 25, 25, 30];
  let xPosition = 20;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');

  // Headers
  tableHeaders.forEach((header, index) => {
    pdf.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });
  yPosition += 8;

  // Draw header line
  pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
  yPosition += 5;

  // Data rows
  pdf.setFont('helvetica', 'normal');
  ingredients.forEach((ingredient) => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 20;
    }

    xPosition = 20;
    const rowData = [
      ingredient.name.length > 25 ? ingredient.name.substring(0, 25) + '...' : ingredient.name,
      ingredient.category,
      `${ingredient.currentStock} ${ingredient.unit}`,
      ingredient.currentPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      (ingredient.currentPrice * ingredient.currentStock).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    ];

    rowData.forEach((data, index) => {
      pdf.text(data || '', xPosition, yPosition);
      xPosition += colWidths[index];
    });
    yPosition += 8;
  });

  pdf.save(`inventario_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportRecipeCostsToPDF(
  recipes: Recipe[],
  ingredients: Ingredient[]
): Promise<void> {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.text('Relatório de Custos de Receitas - Momento Cake', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  pdf.setFontSize(12);
  pdf.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, yPosition);
  yPosition += 20;

  // Summary
  pdf.setFontSize(16);
  pdf.text('Resumo', 20, yPosition);
  yPosition += 15;

  const totalRecipes = recipes.length;
  const averageCost = recipes.filter(r => r.totalCost).reduce((sum, r) => sum + (r.totalCost || 0), 0) / recipes.filter(r => r.totalCost).length;

  pdf.setFontSize(12);
  pdf.text(`Total de receitas: ${totalRecipes}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Custo médio por receita: ${averageCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
  yPosition += 20;

  // Recipes details
  recipes.forEach((recipe) => {
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(recipe.name, 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Categoria: ${recipe.category || 'N/A'} | Porções: ${recipe.servings} | Dificuldade: ${recipe.difficulty || 'N/A'}`, 20, yPosition);
    yPosition += 8;

    if (recipe.totalCost) {
      pdf.text(`Custo total: ${recipe.totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPosition);
      pdf.text(`Custo por porção: ${(recipe.costPerServing || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 120, yPosition);
      yPosition += 8;
    }

    // Ingredients
    pdf.text('Ingredientes:', 20, yPosition);
    yPosition += 6;

    recipe.ingredients.forEach((recipeIng) => {
      const ingredient = ingredients.find(ing => ing.id === recipeIng.ingredientId);
      if (ingredient) {
        pdf.text(`• ${ingredient.name}: ${recipeIng.quantity} ${recipeIng.unit || ''}`, 25, yPosition);
        yPosition += 6;
      }
    });

    yPosition += 10;
  });

  pdf.save(`custos_receitas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// Excel Export Functions
export async function exportInventoryToExcel(
  ingredients: Ingredient[],
  priceHistory?: PriceHistory[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Ingredients sheet
  const ingredientsData = ingredients.map(ingredient => ({
    'Nome': ingredient.name,
    'Descrição': ingredient.description || '',
    'Categoria': ingredient.category,
    'Unidade': ingredient.unit,
    'Preço Atual': ingredient.currentPrice,
    'Estoque Atual': ingredient.currentStock,
    'Estoque Mínimo': ingredient.minStock,
    'Valor Total': ingredient.currentPrice * ingredient.currentStock,
    'Status do Estoque': ingredient.currentStock <= ingredient.minStock ? 'Baixo' : 'OK',
    'Ativo': ingredient.isActive ? 'Sim' : 'Não',
    'Fornecedor': ingredient.supplierId || '',
    'Alérgenos': ingredient.allergens.join(', '),
    'Última Atualização': format(ingredient.lastUpdated, 'dd/MM/yyyy HH:mm'),
    'Criado em': format(ingredient.createdAt, 'dd/MM/yyyy'),
  }));

  const ingredientsSheet = XLSX.utils.json_to_sheet(ingredientsData);
  XLSX.utils.book_append_sheet(workbook, ingredientsSheet, 'Ingredientes');

  // Price history sheet (if provided)
  if (priceHistory && priceHistory.length > 0) {
    const priceHistoryData = priceHistory.map(entry => {
      const ingredient = ingredients.find(ing => ing.id === entry.ingredientId);
      return {
        'Ingrediente': ingredient?.name || 'Desconhecido',
        'Preço': entry.price,
        'Data': format(entry.date, 'dd/MM/yyyy HH:mm'),
        'Variação %': entry.changePercentage?.toFixed(2) || '',
        'Fornecedor': entry.supplierId || '',
        'Observações': entry.notes || '',
      };
    });

    const priceHistorySheet = XLSX.utils.json_to_sheet(priceHistoryData);
    XLSX.utils.book_append_sheet(workbook, priceHistorySheet, 'Histórico de Preços');
  }

  // Summary sheet
  const totalValue = ingredients.reduce((sum, ing) => sum + (ing.currentPrice * ing.currentStock), 0);
  const summaryData = [
    { 'Métrica': 'Total de Ingredientes', 'Valor': ingredients.length },
    { 'Métrica': 'Ingredientes Ativos', 'Valor': ingredients.filter(ing => ing.isActive).length },
    { 'Métrica': 'Estoque Baixo', 'Valor': ingredients.filter(ing => ing.currentStock <= ing.minStock).length },
    { 'Métrica': 'Valor Total do Inventário', 'Valor': totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) },
    { 'Métrica': 'Relatório Gerado em', 'Valor': format(new Date(), 'dd/MM/yyyy HH:mm') },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  XLSX.writeFile(workbook, `inventario_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

export async function exportRecipesToExcel(
  recipes: Recipe[],
  ingredients: Ingredient[]
): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // Recipes summary sheet
  const recipesData = recipes.map(recipe => ({
    'Nome': recipe.name,
    'Categoria': recipe.category,
    'Descrição': recipe.description || '',
    'Porções': recipe.servings,
    'Tempo Preparo (min)': recipe.prepTime,
    'Tempo Cozimento (min)': recipe.bakeTime,
    'Tempo Total (min)': recipe.prepTime + recipe.bakeTime,
    'Dificuldade': recipe.difficulty,
    'Custo Total': recipe.totalCost?.toFixed(2) || '',
    'Custo por Porção': recipe.costPerServing?.toFixed(2) || '',
    'Ativo': recipe.isActive ? 'Sim' : 'Não',
    'Criado em': format(recipe.createdAt, 'dd/MM/yyyy'),
    'Último Cálculo': recipe.lastCalculated ? format(recipe.lastCalculated, 'dd/MM/yyyy') : '',
  }));

  const recipesSheet = XLSX.utils.json_to_sheet(recipesData);
  XLSX.utils.book_append_sheet(workbook, recipesSheet, 'Receitas');

  // Recipe ingredients details sheet
  const recipeIngredientsData: Array<{
    receita: string;
    ingrediente: string;
    quantidade: number;
    unidade: string;
    custo?: number;
    observacoes?: string;
  }> = [];
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(recipeIng => {
      const ingredient = ingredients.find(ing => ing.id === recipeIng.ingredientId);
      recipeIngredientsData.push({
        'Receita': recipe.name,
        'Ingrediente': ingredient?.name || 'Desconhecido',
        'Quantidade': recipeIng.quantity,
        'Unidade': recipeIng.unit || '',
        'Custo Unitário': ingredient?.currentPrice || 0,
        'Custo Total Ingrediente': recipeIng.cost || 0,
        'Observações': recipeIng.notes || '',
      });
    });
  });

  const recipeIngredientsSheet = XLSX.utils.json_to_sheet(recipeIngredientsData);
  XLSX.utils.book_append_sheet(workbook, recipeIngredientsSheet, 'Ingredientes das Receitas');

  XLSX.writeFile(workbook, `receitas_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}

// CSV Export Functions
export async function exportInventoryToCSV(ingredients: Ingredient[]): Promise<void> {
  const headers = [
    'Nome',
    'Categoria',
    'Unidade',
    'Preço Atual',
    'Estoque Atual',
    'Estoque Mínimo',
    'Valor Total',
    'Status',
    'Ativo'
  ];

  const csvContent = [
    headers.join(','),
    ...ingredients.map(ingredient => [
      `"${ingredient.name}"`,
      ingredient.category,
      ingredient.unit,
      ingredient.currentPrice,
      ingredient.currentStock,
      ingredient.minStock,
      ingredient.currentPrice * ingredient.currentStock,
      ingredient.currentStock <= ingredient.minStock ? 'Baixo' : 'OK',
      ingredient.isActive ? 'Sim' : 'Não'
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Chart export function (requires chart element to be rendered)
export async function exportChartToPNG(chartElementId: string, filename?: string): Promise<void> {
  const chartElement = document.getElementById(chartElementId);
  if (!chartElement) {
    throw new Error('Chart element not found');
  }

  try {
    const canvas = await html2canvas(chartElement, {
      backgroundColor: '#ffffff',
      scale: 2,
    });

    const link = document.createElement('a');
    link.download = filename || `chart_${format(new Date(), 'yyyy-MM-dd')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error('Failed to export chart');
  }
}

// Utility function to prepare data for export
export function prepareDataForExport(
  data: Record<string, unknown>[],
  options: ExportOptions
): Record<string, unknown>[] {
  let filteredData = [...data];

  // Apply date range filter if specified
  if (options.dateRange) {
    filteredData = filteredData.filter(item => {
      const itemDate = item.date || item.createdAt || item.lastUpdated;
      if (!itemDate) return true;
      
      const date = itemDate instanceof Date ? itemDate : new Date(itemDate);
      return date >= options.dateRange!.from && date <= options.dateRange!.to;
    });
  }

  // Apply other filters if specified
  if (options.filters) {
    if (options.filters.category) {
      filteredData = filteredData.filter(item => item.category === options.filters!.category);
    }
    if (options.filters.supplierId) {
      filteredData = filteredData.filter(item => item.supplierId === options.filters!.supplierId);
    }
    if (options.filters.stockStatus) {
      filteredData = filteredData.filter(item => {
        const status = item.currentStock <= item.minStock ? 'low' : 'good';
        return status === options.filters!.stockStatus;
      });
    }
  }

  return filteredData;
}