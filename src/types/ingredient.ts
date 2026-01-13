/**
 * Represents a single ingredient in the inventory system.
 *
 * @remarks
 * Ingredients are fundamental units tracked in Firestore with price history,
 * supplier information, and stock management. Each ingredient has a unit of
 * measurement and tracking of current stock levels against minimum thresholds.
 *
 * @example
 * ```typescript
 * const ingredient: Ingredient = {
 *   id: 'ing_001',
 *   name: 'Farinha de Trigo',
 *   category: 'flour',
 *   unit: 'kilogram',
 *   currentPrice: 5.50,
 *   currentStock: 100,
 *   minStock: 10,
 *   isActive: true
 * };
 * ```
 */
export interface Ingredient {
  /** Unique Firestore document ID */
  id: string;

  /** Ingredient name (required, max 100 chars) */
  name: string;

  /** Optional description of the ingredient */
  description?: string;

  /** Unit of measurement (kg, g, l, ml, unit) */
  unit: IngredientUnit;

  /** Measurement value (e.g., 1 for "1 KG Sugar") */
  measurementValue: number;

  /** Brand/supplier name (e.g., "União" for sugar brand) */
  brand?: string;

  /** Current price in Brazilian Real (R$) */
  currentPrice: number;

  /** ID of preferred supplier (optional) */
  supplierId?: string;

  /** Last time ingredient information was updated */
  lastUpdated: Date;

  /** Minimum stock level threshold before reorder */
  minStock: number;

  /** Current stock quantity in measurement units */
  currentStock: number;

  /** Category for organization and filtering */
  category: IngredientCategory;

  /** List of allergens present in this ingredient */
  allergens: string[];

  /** Whether ingredient is still active for use */
  isActive: boolean;

  /** Timestamp of ingredient creation */
  createdAt: Date;

  /** UID of user who created this ingredient */
  createdBy: string;
}

/**
 * Units of measurement for ingredients.
 * Supports both metric and individual unit measurements.
 */
export enum IngredientUnit {
  /** Kilogram (1000 grams) */
  KILOGRAM = 'kilogram',
  /** Gram (1/1000 kilogram) */
  GRAM = 'gram',
  /** Liter (1000 milliliters) */
  LITER = 'liter',
  /** Milliliter (1/1000 liter) */
  MILLILITER = 'milliliter',
  /** Individual unit (eggs, items, etc.) */
  UNIT = 'unit'
}

/**
 * Categories for organizing and grouping ingredients.
 * Used for inventory management and recipe filtering.
 */
export enum IngredientCategory {
  /** Flour and grain products */
  FLOUR = 'flour',
  /** Sugar and sweeteners */
  SUGAR = 'sugar',
  /** Milk, cheese, butter, yogurt */
  DAIRY = 'dairy',
  /** Eggs and egg products */
  EGGS = 'eggs',
  /** Oils, butter, shortening */
  FATS = 'fats',
  /** Baking powder, baking soda, yeast */
  LEAVENING = 'leavening',
  /** Vanilla, extracts, essences */
  FLAVORING = 'flavoring',
  /** Nuts and nut products */
  NUTS = 'nuts',
  /** Fresh and dried fruits */
  FRUITS = 'fruits',
  /** Cocoa and chocolate products */
  CHOCOLATE = 'chocolate',
  /** Cinnamon, nutmeg, etc. */
  SPICES = 'spices',
  /** Preservatives and additives */
  PRESERVATIVES = 'preservatives',
  /** Other ingredients */
  OTHER = 'other'
}

/**
 * Represents a supplier/vendor of ingredients.
 *
 * @remarks
 * Suppliers are tracked with contact information, location, and ratings.
 * Supports Brazilian address format and business identification (CNPJ/CPF).
 */
export interface Supplier {
  /** Unique Firestore document ID */
  id: string;

  /** Supplier/vendor name */
  name: string;

  /** Contact person name at supplier */
  contactPerson?: string;

  /** Phone number in Brazilian format */
  phone?: string;

  /** Email address for supplier contact */
  email?: string;

  // Brazilian address structure
  /** CEP (Brazilian postal code) */
  cep?: string;
  /** State abbreviation (e.g., SP, MG) */
  estado?: string;
  /** City name */
  cidade?: string;
  /** Neighborhood */
  bairro?: string;
  /** Street address */
  endereco?: string;
  /** Street number */
  numero?: string;
  /** Address complement/notes */
  complemento?: string;

  // Legacy address field for backward compatibility
  /** Legacy address field (deprecated, use structured address fields) */
  address?: string;

  // Brazilian business fields
  /** CNPJ or CPF number */
  cpfCnpj?: string;
  /** State registration number (optional) */
  inscricaoEstadual?: string;

  // Existing fields
  /** Rating from 1-5 stars */
  rating: number;

  /** Categories of products this supplier provides */
  categories: string[];

  /** Whether supplier is still active */
  isActive: boolean;

  /** Additional notes about the supplier */
  notes?: string;

  /** Timestamp of supplier creation */
  createdAt: Date;

  /** Timestamp of last supplier update */
  updatedAt: Date;
}

/**
 * Unit conversion helper interface.
 *
 * @remarks
 * Defines how to convert between different measurement units (e.g., 1 kg = 1000 g).
 * Used in ingredient conversions and recipe scaling calculations.
 *
 * @example
 * ```typescript
 * const gramToKilogramConversion: UnitConversion = {
 *   fromUnit: IngredientUnit.GRAM,
 *   toUnit: IngredientUnit.KILOGRAM,
 *   conversionFactor: 0.001,
 *   notes: '1 gram = 0.001 kilogram'
 * };
 * ```
 */
export interface UnitConversion {
  /** Source unit of measurement */
  fromUnit: IngredientUnit;

  /** Target unit of measurement */
  toUnit: IngredientUnit;

  /** Multiplier to convert from source to target (targetValue = sourceValue * conversionFactor) */
  conversionFactor: number;

  /** Optional notes about the conversion (e.g., "1 kg = 1000 g") */
  notes?: string;
}

// Create/Update types for forms

/**
 * Form data for creating a new ingredient.
 * Used in ingredient creation forms and API requests.
 */
export interface CreateIngredientData {
  /** Ingredient name (required, max 100 chars) */
  name: string;

  /** Optional description of the ingredient */
  description?: string;

  /** Unit of measurement (kg, g, l, ml, unit) */
  unit: IngredientUnit;

  /** Measurement value (e.g., 1 for "1 KG Sugar") */
  measurementValue: number;

  /** Brand/supplier name (e.g., "União" for sugar brand) */
  brand?: string;

  /** Current price in Brazilian Real (R$) */
  currentPrice: number;

  /** ID of preferred supplier (optional) */
  supplierId?: string;

  /** Name of preferred supplier (optional) */
  supplierName?: string;

  /** Additional notes about the ingredient */
  notes?: string;

  /** Minimum stock level threshold before reorder */
  minStock: number;

  /** Current stock quantity in measurement units */
  currentStock: number;

  /** Category for organization and filtering */
  category: IngredientCategory;

  /** List of allergens present in this ingredient */
  allergens: string[];
}

/**
 * Form data for updating an existing ingredient.
 * Extends CreateIngredientData but makes all fields optional
 * and requires the ingredient ID.
 */
export interface UpdateIngredientData extends Partial<CreateIngredientData> {
  /** Unique identifier of the ingredient to update */
  id: string;
}

/**
 * Form data for creating a new supplier.
 */
export interface CreateSupplierData {
  /** Supplier name (required) */
  name: string;

  /** Contact person name at supplier */
  contactPerson?: string;

  /** Phone number in Brazilian format */
  phone?: string;

  /** Email address for supplier contact */
  email?: string;

  // Brazilian address structure
  /** CEP (Brazilian postal code) */
  cep?: string;

  /** State abbreviation (e.g., SP, MG) */
  estado?: string;

  /** City name */
  cidade?: string;

  /** Neighborhood */
  bairro?: string;

  /** Street address */
  endereco?: string;

  /** Street number */
  numero?: string;

  /** Address complement/notes */
  complemento?: string;

  // Legacy address field for backward compatibility
  /** Legacy address field (deprecated) */
  address?: string;

  // Brazilian business fields
  /** CNPJ or CPF number */
  cpfCnpj?: string;

  /** State registration number (optional) */
  inscricaoEstadual?: string;

  // Existing fields
  /** Rating from 1-5 stars */
  rating: number;

  /** Categories of products this supplier provides */
  categories: string[];
}

/**
 * Form data for updating an existing supplier.
 */
export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  /** Unique identifier of the supplier to update */
  id: string;
}

/**
 * Form data for recording a price history entry.
 * Tracks when and where an ingredient was purchased and at what price.
 */
export interface CreatePriceHistoryData {
  /** ID of the ingredient being purchased */
  ingredientId: string;

  /** Purchase price in Brazilian Real (R$) */
  price: number;

  /** ID of the supplier providing this price */
  supplierId: string;

  /** Quantity purchased at this price */
  quantity: number;

  /** Optional notes about this purchase */
  notes?: string;
}

/**
 * A historical record of an ingredient purchase.
 * Used to track price changes and purchasing patterns over time.
 */
export interface PriceHistoryEntry {
  /** Unique price history record ID */
  id: string;

  /** ID of the ingredient being purchased */
  ingredientId: string;

  /** Purchase price in Brazilian Real (R$) */
  price: number;

  /** ID of the supplier providing this price */
  supplierId: string;

  /** Amount purchased at this price */
  quantity: number;

  /** Optional notes about this purchase */
  notes?: string;

  /** When this price record was created */
  createdAt: Date;

  /** Date field for price history tracking (alias for createdAt) */
  date?: Date;

  /** Percentage change from previous price */
  changePercentage?: number;

  /** UID of user who recorded this price */
  createdBy: string;
}

/**
 * Status indicator for ingredient stock levels.
 * - `good`: Stock is above minimum threshold
 * - `low`: Stock is below minimum but above critical
 * - `critical`: Stock is very low, immediate reorder needed
 * - `out`: Ingredient is out of stock
 */
export type StockStatus = 'good' | 'low' | 'critical' | 'out';

/**
 * Filters for searching and filtering ingredients.
 */
export interface IngredientFilters {
  /** Filter by ingredient category */
  category?: IngredientCategory;

  /** Filter by supplier */
  supplierId?: string;

  /** Filter by stock status level */
  stockStatus?: StockStatus;

  /** Search query for ingredient name or description */
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