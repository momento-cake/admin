/**
 * Represents a single packaging item in the inventory system.
 *
 * @remarks
 * Packaging items are fundamental materials tracked in Firestore with price history,
 * supplier information, and stock management. Each packaging has a unit of
 * measurement and tracking of current stock levels against minimum thresholds.
 *
 * @example
 * ```typescript
 * const packaging: Packaging = {
 *   id: 'pkg_001',
 *   name: 'Caixa nº 5 alta',
 *   brand: 'Silver Plast',
 *   unit: 'box',
 *   measurementValue: 1,
 *   currentPrice: 2.50,
 *   currentStock: 500,
 *   minStock: 100,
 *   isActive: true
 * };
 * ```
 */
export interface Packaging {
  /** Unique Firestore document ID */
  id: string;

  /** Packaging name (required, max 100 chars) */
  name: string;

  /** Optional description of the packaging */
  description?: string;

  /** Brand/manufacturer name (e.g., "Silver Plast") */
  brand?: string;

  /** Unit of measurement (unit, box, set, etc.) */
  unit: PackagingUnit;

  /** Measurement value (e.g., 1 for "1 box") */
  measurementValue: number;

  /** Current price in Brazilian Real (R$) */
  currentPrice: number;

  /** ID of preferred supplier (optional) */
  supplierId?: string;

  /** Current stock quantity in measurement units */
  currentStock: number;

  /** Minimum stock level threshold before reorder */
  minStock: number;

  /** Optional category for organization (box, base, topper, carrier, etc.) */
  category?: PackagingCategory;

  /** Whether packaging is still active for use */
  isActive: boolean;

  /** Timestamp of packaging creation */
  createdAt: Date;

  /** Timestamp of last packaging update */
  updatedAt: Date;

  /** UID of user who created this packaging */
  createdBy: string;
}

/**
 * Units of measurement for packaging items.
 * Supports both individual units and group units.
 */
export enum PackagingUnit {
  /** Individual unit */
  UNIT = 'unit',
  /** Box/carton */
  BOX = 'box',
  /** Set/pack */
  SET = 'set',
  /** Dozen */
  DOZEN = 'dozen',
  /** Ream (500 sheets) */
  REAM = 'ream'
}

/**
 * Categories for organizing and grouping packaging items.
 * Used for inventory management and filtering.
 */
export enum PackagingCategory {
  /** Cake boxes and containers */
  BOX = 'box',
  /** Cake bases and boards */
  BASE = 'base',
  /** Cake toppers and decorations */
  TOPPER = 'topper',
  /** Carriers and delivery containers */
  CARRIER = 'carrier',
  /** Bags and packaging materials */
  BAG = 'bag',
  /** Paper and wrapping materials */
  PAPER = 'paper',
  /** Ribbons and decorative items */
  RIBBON = 'ribbon',
  /** Other packaging materials */
  OTHER = 'other'
}

// Create/Update types for forms

/**
 * Form data for creating a new packaging item.
 * Used in packaging creation forms and API requests.
 */
export interface CreatePackagingData {
  /** Packaging name (required, max 100 chars) */
  name: string;

  /** Optional description of the packaging */
  description?: string;

  /** Brand/manufacturer name (e.g., "Silver Plast") */
  brand?: string;

  /** Unit of measurement (unit, box, set, dozen, ream) */
  unit: PackagingUnit;

  /** Measurement value (e.g., 1 for "1 box") */
  measurementValue: number;

  /** Current price in Brazilian Real (R$) */
  currentPrice: number;

  /** ID of preferred supplier (optional) */
  supplierId?: string;

  /** Current stock quantity in measurement units */
  currentStock: number;

  /** Minimum stock level threshold before reorder */
  minStock: number;

  /** Optional category for organization */
  category?: PackagingCategory;
}

/**
 * Form data for updating an existing packaging item.
 * Extends CreatePackagingData but makes all fields optional
 * and requires the packaging ID.
 */
export interface UpdatePackagingData extends Partial<CreatePackagingData> {
  /** Unique identifier of the packaging to update */
  id: string;
}

/**
 * Form data for adjusting packaging stock levels.
 * Used when adding or removing stock due to purchases, usage, waste, etc.
 */
export interface StockUpdateData {
  /** ID of the packaging item */
  packagingId: string;

  /** Type of stock movement */
  type: StockMovementType;

  /** Quantity to adjust (positive or negative) */
  quantity: number;

  /** ID of the supplier (for purchases) */
  supplierId?: string;

  /** Unit cost for this stock movement */
  unitCost?: number;

  /** Notes about this stock movement */
  notes?: string;

  /** Reason for the adjustment */
  reason?: string;
}

/**
 * Type of stock movement.
 */
export type StockMovementType = 'adjustment' | 'purchase' | 'usage' | 'waste' | 'correction';

/**
 * A historical record of a stock movement.
 * Used to track stock changes and provide audit trail.
 */
export interface StockHistoryEntry {
  /** Unique stock history record ID */
  id: string;

  /** ID of the packaging item */
  packagingId: string;

  /** Type of stock movement */
  type: StockMovementType;

  /** Quantity changed (positive or negative) */
  quantity: number;

  /** Stock level before this movement */
  previousStock: number;

  /** Stock level after this movement */
  newStock: number;

  /** ID of the supplier (for purchases) */
  supplierId?: string;

  /** Unit cost for this movement */
  unitCost?: number;

  /** Notes about this movement */
  notes?: string;

  /** Reason for the adjustment */
  reason?: string;

  /** When this stock movement was recorded */
  createdAt: Date;

  /** UID of user who recorded this movement */
  createdBy: string;
}

/**
 * Form data for creating a new price history entry.
 * Tracks when and where packaging was purchased and at what price.
 */
export interface CreatePriceHistoryData {
  /** ID of the packaging item */
  packagingId: string;

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
 * A historical record of a packaging price.
 * Used to track price changes and purchasing patterns over time.
 */
export interface PriceHistoryEntry {
  /** Unique price history record ID */
  id: string;

  /** ID of the packaging item */
  packagingId: string;

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

  /** UID of user who recorded this price */
  createdBy: string;
}

/**
 * Status indicator for packaging stock levels.
 * - `good`: Stock is above minimum threshold
 * - `low`: Stock is below minimum but above critical (50-75% of minimum)
 * - `critical`: Stock is very low, immediate reorder needed (<50% of minimum)
 * - `out`: Packaging is out of stock
 */
export type StockStatus = 'good' | 'low' | 'critical' | 'out';

/**
 * Filters for searching and filtering packaging items.
 */
export interface PackagingFilters {
  /** Filter by packaging category */
  category?: PackagingCategory;

  /** Filter by supplier */
  supplierId?: string;

  /** Filter by stock status level */
  stockStatus?: StockStatus;

  /** Search query for packaging name, brand, or description */
  searchQuery?: string;
}

// API response types

/**
 * API response for fetching packaging items list.
 */
export interface PackagingResponse {
  packaging: Packaging[];
  total: number;
  page: number;
  limit: number;
}

/**
 * API response for fetching stock history.
 */
export interface StockHistoryResponse {
  stockHistory: StockHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}

/**
 * API response for fetching price history.
 */
export interface PriceHistoryResponse {
  priceHistory: PriceHistoryEntry[];
  total: number;
  page: number;
  limit: number;
}
