import { 
  Ingredient, 
  CreateIngredientData, 
  UpdateIngredientData,
  IngredientFilters,
  StockStatus,
  IngredientUnit,
  UnitConversion
} from '@/types/ingredient';

// API functions for ingredients
export async function fetchIngredients(filters?: IngredientFilters) {
  const searchParams = new URLSearchParams();
  
  if (filters?.category) searchParams.append('category', filters.category);
  if (filters?.supplierId) searchParams.append('supplierId', filters.supplierId);
  if (filters?.stockStatus) searchParams.append('stockStatus', filters.stockStatus);
  if (filters?.searchQuery) searchParams.append('searchQuery', filters.searchQuery);
  
  const response = await fetch(`/api/ingredients?${searchParams.toString()}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar ingredientes');
  }
  
  return response.json();
}

export async function fetchIngredient(id: string): Promise<Ingredient> {
  const response = await fetch(`/api/ingredients/${id}`);
  
  if (!response.ok) {
    throw new Error('Erro ao buscar ingrediente');
  }
  
  return response.json();
}

export async function createIngredient(data: CreateIngredientData): Promise<Ingredient> {
  const response = await fetch('/api/ingredients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar ingrediente');
  }
  
  return response.json();
}

export async function updateIngredient(data: UpdateIngredientData): Promise<Ingredient> {
  const { id, ...updateData } = data;
  
  const response = await fetch(`/api/ingredients/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar ingrediente');
  }
  
  return response.json();
}

export async function deleteIngredient(id: string): Promise<void> {
  const response = await fetch(`/api/ingredients/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao remover ingrediente');
  }
}

// Utility functions
export function getStockStatus(currentStock: number, minStock: number): StockStatus {
  if (currentStock === 0) return 'out';
  
  const stockRatio = currentStock / minStock;
  
  if (stockRatio <= 0.5) return 'critical';
  if (stockRatio <= 1) return 'low';
  return 'good';
}

export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'good':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'low':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'out':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getStockStatusText(status: StockStatus): string {
  switch (status) {
    case 'good':
      return 'Estoque bom';
    case 'low':
      return 'Estoque baixo';
    case 'critical':
      return 'Estoque crítico';
    case 'out':
      return 'Sem estoque';
    default:
      return 'Status desconhecido';
  }
}

// Unit conversion utilities
export function getUnitDisplayName(unit: IngredientUnit): string {
  const unitNames = {
    [IngredientUnit.KILOGRAM]: 'kg',
    [IngredientUnit.GRAM]: 'g',
    [IngredientUnit.LITER]: 'L',
    [IngredientUnit.MILLILITER]: 'ml',
    [IngredientUnit.UNIT]: 'unidade',
    [IngredientUnit.POUND]: 'lb',
    [IngredientUnit.OUNCE]: 'oz',
    [IngredientUnit.CUP]: 'xícara',
    [IngredientUnit.TABLESPOON]: 'colher de sopa',
    [IngredientUnit.TEASPOON]: 'colher de chá'
  };
  
  return unitNames[unit] || unit;
}

// Basic unit conversions (metric conversions)
export function convertUnits(from: IngredientUnit, to: IngredientUnit, value: number): number {
  // If same unit, return value
  if (from === to) return value;
  
  // Convert to base unit (grams for weight, milliliters for volume)
  let baseValue = value;
  
  // Weight conversions to grams
  switch (from) {
    case IngredientUnit.KILOGRAM:
      baseValue = value * 1000;
      break;
    case IngredientUnit.POUND:
      baseValue = value * 453.592;
      break;
    case IngredientUnit.OUNCE:
      baseValue = value * 28.3495;
      break;
    case IngredientUnit.GRAM:
      baseValue = value;
      break;
  }
  
  // Volume conversions to milliliters
  switch (from) {
    case IngredientUnit.LITER:
      baseValue = value * 1000;
      break;
    case IngredientUnit.CUP:
      baseValue = value * 240; // US cup
      break;
    case IngredientUnit.TABLESPOON:
      baseValue = value * 15;
      break;
    case IngredientUnit.TEASPOON:
      baseValue = value * 5;
      break;
    case IngredientUnit.MILLILITER:
      baseValue = value;
      break;
  }
  
  // Convert from base unit to target unit
  switch (to) {
    case IngredientUnit.KILOGRAM:
      return baseValue / 1000;
    case IngredientUnit.GRAM:
      return baseValue;
    case IngredientUnit.POUND:
      return baseValue / 453.592;
    case IngredientUnit.OUNCE:
      return baseValue / 28.3495;
    case IngredientUnit.LITER:
      return baseValue / 1000;
    case IngredientUnit.MILLILITER:
      return baseValue;
    case IngredientUnit.CUP:
      return baseValue / 240;
    case IngredientUnit.TABLESPOON:
      return baseValue / 15;
    case IngredientUnit.TEASPOON:
      return baseValue / 5;
    default:
      return value; // For units that can't be converted
  }
}

// Format price for display
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

// Format stock quantity for display
export function formatStock(quantity: number, unit: IngredientUnit): string {
  const unitDisplay = getUnitDisplayName(unit);
  return `${quantity.toFixed(2)} ${unitDisplay}`;
}