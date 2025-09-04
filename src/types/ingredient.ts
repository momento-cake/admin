export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: IngredientUnit;
  currentPrice: number;
  supplierId?: string;
  lastUpdated: Date;
  minStock: number;
  currentStock: number;
  category: IngredientCategory;
  allergens: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export enum IngredientUnit {
  KILOGRAM = 'kilogram',
  GRAM = 'gram',
  LITER = 'liter',
  MILLILITER = 'milliliter',
  UNIT = 'unit',
  POUND = 'pound',
  OUNCE = 'ounce',
  CUP = 'cup',
  TABLESPOON = 'tablespoon',
  TEASPOON = 'teaspoon'
}

export enum IngredientCategory {
  FLOUR = 'flour',
  SUGAR = 'sugar',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  FATS = 'fats',
  LEAVENING = 'leavening',
  FLAVORING = 'flavoring',
  NUTS = 'nuts',
  FRUITS = 'fruits',
  CHOCOLATE = 'chocolate',
  SPICES = 'spices',
  PRESERVATIVES = 'preservatives',
  OTHER = 'other'
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating: number;
  categories: string[];
  isActive: boolean;
  createdAt: Date;
}

// Create/Update types for forms
export interface CreateIngredientData {
  name: string;
  description?: string;
  unit: IngredientUnit;
  currentPrice: number;
  supplierId?: string;
  minStock: number;
  currentStock: number;
  category: IngredientCategory;
  allergens: string[];
}

export interface UpdateIngredientData extends Partial<CreateIngredientData> {
  id: string;
}

export interface CreateSupplierData {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating: number;
  categories: string[];
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  id: string;
}

// Stock level indicator types
export type StockStatus = 'good' | 'low' | 'critical' | 'out';

// Filter and search types
export interface IngredientFilters {
  category?: IngredientCategory;
  supplierId?: string;
  stockStatus?: StockStatus;
  searchQuery?: string;
}

// Unit conversion types
export interface UnitConversion {
  from: IngredientUnit;
  to: IngredientUnit;
  value: number;
  result: number;
}

// API response types
export interface IngredientsResponse {
  ingredients: Ingredient[];
  total: number;
  page: number;
  limit: number;
}

export interface SuppliersResponse {
  suppliers: Supplier[];
  total: number;
  page: number;
  limit: number;
}

// Phase 3: Cost History & Price Tracking
export interface PriceHistory {
  id: string;
  ingredientId: string;
  price: number;
  supplierId?: string;
  date: Date;
  changePercentage?: number;
  notes?: string;
  createdBy: string;
}

export interface PriceAlert {
  id: string;
  ingredientId: string;
  threshold: number; // percentage threshold for alerts
  alertType: 'increase' | 'decrease' | 'both';
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
}

// Phase 3: Usage Analytics & Consumption Patterns
export interface IngredientUsage {
  id: string;
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  date: Date;
  usageType: 'production' | 'waste' | 'adjustment' | 'sampling';
  recipeId?: string;
  notes?: string;
  createdBy: string;
}

export interface ConsumptionPattern {
  ingredientId: string;
  period: 'daily' | 'weekly' | 'monthly';
  averageUsage: number;
  peakUsage: number;
  lowUsage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalPattern?: boolean;
}

// Phase 3: Recipe Integration System
export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category: string;
  servings: number;
  prepTime: number; // minutes
  bakeTime: number; // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  totalCost?: number;
  costPerServing?: number;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  lastCalculated?: Date;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
  cost?: number;
  notes?: string;
}

// Phase 3: Advanced Analytics Types
export interface CostTrend {
  period: Date;
  totalCost: number;
  averageCost: number;
  ingredientCount: number;
  topExpensiveIngredients: Array<{
    ingredientId: string;
    name: string;
    cost: number;
    percentage: number;
  }>;
}

export interface UsageHeatmap {
  ingredientId: string;
  ingredientName: string;
  dailyUsage: Array<{
    date: Date;
    usage: number;
    intensity: number; // 0-1 scale for visualization
  }>;
}

// Phase 3: Report Types
export interface InventoryReport {
  id: string;
  type: 'inventory_valuation' | 'cost_analysis' | 'usage_report' | 'supplier_performance';
  title: string;
  dateRange: {
    from: Date;
    to: Date;
  };
  data: Record<string, unknown>;
  generatedAt: Date;
  generatedBy: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  filters?: IngredientFilters;
}

// Phase 3: Advanced Integration Types
export interface BarcodeData {
  code: string;
  ingredientId: string;
  format: 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' | 'QR';
  createdAt: Date;
}

export interface BatchOperation {
  id: string;
  type: 'price_update' | 'stock_adjustment' | 'supplier_change';
  items: Array<{
    ingredientId: string;
    data: Record<string, unknown>;
  }>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: Date;
  completedAt?: Date;
  errors?: string[];
}

export interface ReorderSuggestion {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  suggestedQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  estimatedCost: number;
  preferredSupplierId?: string;
  calculatedAt: Date;
}

export interface IngredientSubstitution {
  ingredientId: string;
  substitutes: Array<{
    ingredientId: string;
    name: string;
    conversionRatio: number; // how much substitute to use
    suitability: number; // 0-1 score
    notes?: string;
  }>;
}