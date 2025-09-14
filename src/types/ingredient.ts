export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: IngredientUnit;
  measurementValue: number; // e.g., 1 for "1 KG Sugar"
  brand?: string; // e.g., "União" for sugar brand
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
  UNIT = 'unit'
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
  // Brazilian address structure
  cep?: string; // CEP (postal code)
  estado?: string; // State
  cidade?: string; // City
  bairro?: string; // Neighborhood
  endereco?: string; // Street address
  numero?: string; // Street number
  complemento?: string; // Address complement
  // Legacy address field for backward compatibility
  address?: string;
  // Brazilian business fields
  cpfCnpj?: string; // CPF or CNPJ
  inscricaoEstadual?: string; // State registration (optional)
  // Existing fields
  rating: number;
  categories: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Create/Update types for forms
export interface CreateIngredientData {
  name: string;
  description?: string;
  unit: IngredientUnit;
  measurementValue: number; // e.g., 1 for "1 KG Sugar"
  brand?: string; // e.g., "União" for sugar brand
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
  // Brazilian address structure
  cep?: string;
  estado?: string;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  // Legacy address field for backward compatibility
  address?: string;
  // Brazilian business fields
  cpfCnpj?: string;
  inscricaoEstadual?: string;
  // Existing fields
  rating: number;
  categories: string[];
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  id: string;
}

export interface CreatePriceHistoryData {
  ingredientId: string;
  price: number;
  supplierId: string;
  quantity: number;
  notes?: string;
}

// Price history types
export interface PriceHistoryEntry {
  id: string;
  ingredientId: string;
  price: number;
  supplierId: string;
  quantity: number; // Amount purchased at this price
  notes?: string;
  createdAt: Date;
  createdBy: string;
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

export interface PriceHistoryResponse {
  priceHistory: PriceHistoryEntry[];
  total: number;
  page: number;
  limit: number;
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