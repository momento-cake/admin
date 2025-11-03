/**
 * Product Management Types
 *
 * @remarks
 * Defines the complete Product ecosystem including products, categories, subcategories,
 * recipe associations, and package associations. Products are finished goods that
 * combine multiple recipes and optional packaging materials.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Complete product definition with recipes, packages, and cost analysis.
 *
 * @example
 * ```typescript
 * const chocolateCake: Product = {
 *   id: 'prod_001',
 *   name: 'Bolo de Chocolate',
 *   categoryId: 'cat_001',
 *   categoryName: 'Bolos',
 *   subcategoryId: 'subcat_001',
 *   subcategoryName: 'Chocolate',
 *   sku: 'BOLO-CHOC-001',
 *   price: 89.90,
 *   costPrice: 35.50,
 *   suggestedPrice: 88.75,
 *   markup: 150,
 *   profitMargin: 60.5,
 *   productRecipes: [...],
 *   productPackages: [...],
 *   isActive: true,
 *   createdAt: now,
 *   updatedAt: now,
 *   createdBy: 'user123'
 * };
 * ```
 */
export interface Product {
  /** Unique Firestore document ID */
  id: string;

  /** Product name (required, max 100 chars) */
  name: string;

  /** Optional product description */
  description?: string;

  // Categorization
  /** Reference to ProductCategory document */
  categoryId: string;

  /** Denormalized category name for display */
  categoryName: string;

  /** Reference to ProductSubcategory document */
  subcategoryId: string;

  /** Denormalized subcategory name for display */
  subcategoryName: string;

  // SKU and pricing
  /** Auto-generated SKU: {CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT} */
  sku: string;

  /** Fixed selling price in Brazilian Real (R$) */
  price: number;

  /** Calculated cost from recipes + packages */
  costPrice: number;

  /** Suggested price based on cost × (1 + markup%) */
  suggestedPrice: number;

  /** Markup percentage for cost-to-price calculation */
  markup: number;

  /** Calculated profit margin percentage: (price - costPrice) / price */
  profitMargin: number;

  // Recipe and Package associations
  /** Associated recipes with portion quantities */
  productRecipes: ProductRecipeItem[];

  /** Optional associated packaging materials */
  productPackages?: ProductPackageItem[];

  // Metadata
  /** Whether product is active (soft delete via isActive = false) */
  isActive: boolean;

  /** When the product was created */
  createdAt: Timestamp;

  /** When the product was last updated */
  updatedAt: Timestamp;

  /** UID of user who created this product */
  createdBy: string;
}

/**
 * Association between a product and a recipe with quantity information.
 *
 * Stores denormalized recipe information for quick display without fetching
 * the full recipe document. Cost is calculated at save time.
 */
export interface ProductRecipeItem {
  /** Unique ID for this recipe item association */
  id: string;

  /** Reference to Recipe document */
  recipeId: string;

  /** Denormalized recipe name for display */
  recipeName: string;

  /** Number of portions of this recipe needed for the product */
  portions: number;

  /** Calculated cost: recipe.costPerServing × portions */
  recipeCost: number;
}

/**
 * Association between a product and a packaging item with quantity information.
 *
 * Stores denormalized packaging information for quick display. Cost is calculated
 * at save time. This association is optional - not all products require packaging.
 */
export interface ProductPackageItem {
  /** Unique ID for this package item association */
  id: string;

  /** Reference to Packaging document */
  packagingId: string;

  /** Denormalized packaging name for display */
  packagingName: string;

  /** Quantity of this packaging item needed for the product */
  quantity: number;

  /** Calculated cost: packaging.currentPrice × quantity */
  packageCost: number;
}

/**
 * Product category for hierarchical organization.
 *
 * Categories are the parent level in a two-level hierarchy.
 * Each category can have multiple subcategories.
 * The code field is used for SKU generation.
 *
 * @example
 * ```typescript
 * const cakeCategory: ProductCategory = {
 *   id: 'cat_001',
 *   name: 'Bolos',
 *   code: 'BOLO',
 *   description: 'Bolos diversos',
 *   displayOrder: 1,
 *   isActive: true,
 *   createdAt: now,
 *   createdBy: 'user123'
 * };
 * ```
 */
export interface ProductCategory {
  /** Unique Firestore document ID */
  id: string;

  /** Category name (required, max 100 chars) */
  name: string;

  /** Code for SKU generation, max 10 chars, uppercase (e.g., "BOLO", "CUPCAKE") */
  code: string;

  /** Optional category description */
  description?: string;

  /** Display order for sorting categories */
  displayOrder: number;

  /** Whether category is active (soft delete via isActive = false) */
  isActive: boolean;

  /** When the category was created */
  createdAt: Timestamp;

  /** UID of user who created this category */
  createdBy: string;
}

/**
 * Product subcategory for detailed organization.
 *
 * Subcategories are children of categories in a two-level hierarchy.
 * Multiple subcategories belong to one parent category.
 * The code field is used for SKU generation.
 *
 * @example
 * ```typescript
 * const vanillaSubcategory: ProductSubcategory = {
 *   id: 'subcat_001',
 *   categoryId: 'cat_001',
 *   name: 'Bolo de Chocolate',
 *   code: 'CHOC',
 *   displayOrder: 1,
 *   isActive: true,
 *   createdAt: now,
 *   createdBy: 'user123'
 * };
 * ```
 */
export interface ProductSubcategory {
  /** Unique Firestore document ID */
  id: string;

  /** Reference to parent ProductCategory document */
  categoryId: string;

  /** Subcategory name (required, max 100 chars) */
  name: string;

  /** Code for SKU generation, max 10 chars, uppercase (e.g., "VANILLA", "CHOC") */
  code: string;

  /** Optional subcategory description */
  description?: string;

  /** Display order for sorting within category */
  displayOrder: number;

  /** Whether subcategory is active (soft delete via isActive = false) */
  isActive: boolean;

  /** When the subcategory was created */
  createdAt: Timestamp;

  /** UID of user who created this subcategory */
  createdBy: string;
}

// Form/Request data interfaces

/**
 * Data required to create a new product.
 * Used in create forms and API requests.
 */
export interface CreateProductData {
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  markup: number;
  productRecipes: ProductRecipeItem[];
  productPackages?: ProductPackageItem[];
}

/**
 * Data used to update an existing product.
 * All fields are optional to support partial updates.
 */
export interface UpdateProductData {
  id: string;
  name?: string;
  description?: string;
  categoryId?: string;
  subcategoryId?: string;
  price?: number;
  markup?: number;
  productRecipes?: ProductRecipeItem[];
  productPackages?: ProductPackageItem[];
}

/**
 * Data required to create a product category.
 */
export interface CreateProductCategoryData {
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
}

/**
 * Data used to update a product category.
 */
export interface UpdateProductCategoryData {
  id: string;
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Data required to create a product subcategory.
 */
export interface CreateProductSubcategoryData {
  categoryId: string;
  name: string;
  code: string;
  description?: string;
  displayOrder: number;
}

/**
 * Data used to update a product subcategory.
 */
export interface UpdateProductSubcategoryData {
  id: string;
  categoryId?: string;
  name?: string;
  code?: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Filters for searching and filtering products.
 */
export interface ProductFilters {
  /** Search query for product name or description */
  searchQuery?: string;

  /** Filter by product category */
  categoryId?: string;

  /** Filter by product subcategory */
  subcategoryId?: string;

  /** Maximum price filter (optional) */
  maxPrice?: number;

  /** Minimum price filter (optional) */
  minPrice?: number;

  /** Filter by profit margin range (optional) */
  minMargin?: number;
  maxMargin?: number;
}

/**
 * API response for fetching products list.
 */
export interface ProductsResponse {
  products: Product[];
  total: number;
  count: number;
}

/**
 * API response for fetching categories list.
 */
export interface ProductCategoriesResponse {
  categories: ProductCategory[];
  total: number;
}

/**
 * API response for fetching subcategories list.
 */
export interface ProductSubcategoriesResponse {
  subcategories: ProductSubcategory[];
  total: number;
}
