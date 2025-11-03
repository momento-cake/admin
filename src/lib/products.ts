import {
  Product,
  ProductCategory,
  ProductSubcategory,
  CreateProductData,
  UpdateProductData,
  CreateProductCategoryData,
  UpdateProductCategoryData,
  CreateProductSubcategoryData,
  UpdateProductSubcategoryData,
  ProductFilters
} from '@/types/product';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  DocumentSnapshot,
  runTransaction,
  Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { fetchRecipe } from '@/lib/recipes';
import { fetchPackagingItem } from '@/lib/packaging';

const PRODUCTS_COLLECTION = 'products';
const CATEGORIES_COLLECTION = 'productCategories';
const SUBCATEGORIES_COLLECTION = 'productSubcategories';
const SKU_COUNTER_COLLECTION = 'skuCounters';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Firestore product document to Product interface
 */
function docToProduct(docSnapshot: DocumentSnapshot): Product {
  const data = docSnapshot.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: docSnapshot.id,
    name: data.name,
    description: data.description,
    categoryId: data.categoryId,
    categoryName: data.categoryName,
    subcategoryId: data.subcategoryId,
    subcategoryName: data.subcategoryName,
    sku: data.sku,
    price: data.price,
    costPrice: data.costPrice,
    suggestedPrice: data.suggestedPrice,
    markup: data.markup,
    profitMargin: data.profitMargin,
    productRecipes: data.productRecipes || [],
    productPackages: data.productPackages || [],
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy
  };
}

/**
 * Convert Firestore category document to ProductCategory interface
 */
function docToProductCategory(docSnapshot: DocumentSnapshot): ProductCategory {
  const data = docSnapshot.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: docSnapshot.id,
    name: data.name,
    code: data.code,
    description: data.description,
    displayOrder: data.displayOrder,
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    createdBy: data.createdBy
  };
}

/**
 * Convert Firestore subcategory document to ProductSubcategory interface
 */
function docToProductSubcategory(docSnapshot: DocumentSnapshot): ProductSubcategory {
  const data = docSnapshot.data();
  if (!data) throw new Error('Document data is undefined');

  return {
    id: docSnapshot.id,
    categoryId: data.categoryId,
    name: data.name,
    code: data.code,
    description: data.description,
    displayOrder: data.displayOrder,
    isActive: data.isActive !== false,
    createdAt: data.createdAt,
    createdBy: data.createdBy
  };
}

// ============================================================================
// PRODUCT CRUD OPERATIONS
// ============================================================================

/**
 * Fetch all active products with optional filtering
 * Handles edge cases like deleted categories gracefully
 */
export async function fetchProducts(
  filters?: ProductFilters,
  limitVal: number = 20,
  offsetVal: number = 0
): Promise<{ products: Product[]; total: number }> {
  try {
    let q: Query = query(
      collection(db, PRODUCTS_COLLECTION),
      where('isActive', '==', true),
      orderBy('name')
    );

    // Add filter conditions
    const conditions = [where('isActive', '==', true)];

    if (filters?.searchQuery) {
      // Simple search: check if product name contains query (case-insensitive)
      // For production, consider using full-text search or Algolia
      conditions.push(
        where('name', '>=', filters.searchQuery),
        where('name', '<=', filters.searchQuery + '\uf8ff')
      );
    }

    if (filters?.categoryId) {
      // Verify category still exists before filtering
      const category = await fetchProductCategory(filters.categoryId);
      if (!category) {
        // Category was deleted, return empty results with helpful error
        console.warn(`Category ${filters.categoryId} not found - may have been deleted`);
        return { products: [], total: 0 };
      }
      conditions.push(where('categoryId', '==', filters.categoryId));
    }

    if (filters?.subcategoryId) {
      // Verify subcategory still exists before filtering
      const subcategory = await fetchProductSubcategory(filters.subcategoryId);
      if (!subcategory) {
        // Subcategory was deleted, return empty results
        console.warn(`Subcategory ${filters.subcategoryId} not found - may have been deleted`);
        return { products: [], total: 0 };
      }
      conditions.push(where('subcategoryId', '==', filters.subcategoryId));
    }

    // Build query with conditions
    // Note: Firestore doesn't support offset, so we load limit + 1 for pagination check
    q = query(
      collection(db, PRODUCTS_COLLECTION),
      ...conditions,
      orderBy('name'),
      firestoreLimit(limitVal + 1) // +1 to check if there are more
    );

    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(docToProduct);

    // Get total count (expensive, consider caching)
    const totalQuery = query(
      collection(db, PRODUCTS_COLLECTION),
      ...conditions
    );
    const totalSnapshot = await getDocs(totalQuery);
    const total = totalSnapshot.size;

    return { products: products.slice(0, limitVal), total };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Fetch a single product by ID
 */
export async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const docSnapshot = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
    if (!docSnapshot.exists()) {
      return null;
    }
    return docToProduct(docSnapshot);
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new product
 */
export async function createProduct(
  data: CreateProductData,
  createdBy: string
): Promise<Product> {
  try {
    // Generate SKU
    const sku = await generateSKU(data.categoryId, data.subcategoryId);

    // Calculate cost
    const costPrice = calculateProductCost(data);

    // Calculate suggested price
    const suggestedPrice = calculateSuggestedPrice(costPrice, data.markup);

    // Calculate profit margin
    const profitMargin = (data.price - costPrice) / (data.price || 1);

    // Get category and subcategory names for denormalization
    const category = await fetchProductCategory(data.categoryId);
    const subcategory = await fetchProductSubcategory(data.subcategoryId);

    if (!category || !subcategory) {
      throw new Error('Category or subcategory not found');
    }

    const now = Timestamp.now();
    const productData = {
      ...data,
      sku,
      costPrice,
      suggestedPrice,
      profitMargin,
      categoryName: category.name,
      subcategoryName: subcategory.name,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy
    };

    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), productData);

    return {
      id: docRef.id,
      ...productData
    } as Product;
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  id: string,
  data: Partial<UpdateProductData>
): Promise<Product> {
  try {
    const existingProduct = await fetchProduct(id);
    if (!existingProduct) {
      throw new Error('Product not found');
    }

    // Merge with existing data
    const updatedData = { ...existingProduct, ...data };

    // Recalculate costs if recipes or packages changed
    const costPrice = calculateProductCost(updatedData);
    const suggestedPrice = calculateSuggestedPrice(costPrice, updatedData.markup);
    const profitMargin = (updatedData.price - costPrice) / (updatedData.price || 1);

    // If category or subcategory changed, update denormalized fields
    let categoryName = updatedData.categoryName;
    let subcategoryName = updatedData.subcategoryName;

    if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
      const category = await fetchProductCategory(data.categoryId);
      if (category) {
        categoryName = category.name;
      }
    }

    if (data.subcategoryId && data.subcategoryId !== existingProduct.subcategoryId) {
      const subcategory = await fetchProductSubcategory(data.subcategoryId);
      if (subcategory) {
        subcategoryName = subcategory.name;
      }
    }

    const now = Timestamp.now();
    const updatePayload = {
      ...data,
      categoryName,
      subcategoryName,
      costPrice,
      suggestedPrice,
      profitMargin,
      updatedAt: now
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(
      key => updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
    );

    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), updatePayload);

    return {
      ...updatedData,
      ...updatePayload
    } as Product;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a product (soft delete via isActive = false)
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
      isActive: false,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// PRODUCT CATEGORY OPERATIONS
// ============================================================================

/**
 * Fetch all active product categories
 */
export async function fetchProductCategories(): Promise<ProductCategory[]> {
  try {
    const q = query(
      collection(db, CATEGORIES_COLLECTION),
      where('isActive', '==', true),
      orderBy('displayOrder')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToProductCategory);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    throw error;
  }
}

/**
 * Fetch a single product category by ID
 */
export async function fetchProductCategory(id: string): Promise<ProductCategory | null> {
  try {
    const docSnapshot = await getDoc(doc(db, CATEGORIES_COLLECTION, id));
    if (!docSnapshot.exists()) {
      return null;
    }
    return docToProductCategory(docSnapshot);
  } catch (error) {
    console.error(`Error fetching category ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new product category
 */
export async function createProductCategory(
  data: CreateProductCategoryData,
  createdBy: string
): Promise<ProductCategory> {
  try {
    const now = Timestamp.now();
    const categoryData = {
      ...data,
      code: data.code.toUpperCase(),
      isActive: true,
      createdAt: now,
      createdBy
    };

    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), categoryData);

    return {
      id: docRef.id,
      ...categoryData
    } as ProductCategory;
  } catch (error) {
    console.error('Error creating product category:', error);
    throw error;
  }
}

/**
 * Update a product category
 */
export async function updateProductCategory(
  id: string,
  data: Partial<UpdateProductCategoryData>
): Promise<ProductCategory> {
  try {
    const existingCategory = await fetchProductCategory(id);
    if (!existingCategory) {
      throw new Error('Category not found');
    }

    const updatePayload = {
      ...data,
      ...(data.code && { code: data.code.toUpperCase() }),
      updatedAt: Timestamp.now()
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(
      key => updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
    );

    await updateDoc(doc(db, CATEGORIES_COLLECTION, id), updatePayload);

    return {
      ...existingCategory,
      ...updatePayload
    } as ProductCategory;
  } catch (error) {
    console.error(`Error updating category ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a product category (soft delete)
 */
export async function deleteProductCategory(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, CATEGORIES_COLLECTION, id), {
      isActive: false
    });
  } catch (error) {
    console.error(`Error deleting category ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// PRODUCT SUBCATEGORY OPERATIONS
// ============================================================================

/**
 * Fetch all active subcategories for a category
 */
export async function fetchProductSubcategories(categoryId: string): Promise<ProductSubcategory[]> {
  try {
    const q = query(
      collection(db, SUBCATEGORIES_COLLECTION),
      where('categoryId', '==', categoryId),
      where('isActive', '==', true),
      orderBy('displayOrder')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(docToProductSubcategory);
  } catch (error) {
    console.error(`Error fetching subcategories for category ${categoryId}:`, error);
    throw error;
  }
}

/**
 * Fetch a single product subcategory by ID
 */
export async function fetchProductSubcategory(id: string): Promise<ProductSubcategory | null> {
  try {
    const docSnapshot = await getDoc(doc(db, SUBCATEGORIES_COLLECTION, id));
    if (!docSnapshot.exists()) {
      return null;
    }
    return docToProductSubcategory(docSnapshot);
  } catch (error) {
    console.error(`Error fetching subcategory ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new product subcategory
 */
export async function createProductSubcategory(
  data: CreateProductSubcategoryData,
  createdBy: string
): Promise<ProductSubcategory> {
  try {
    const now = Timestamp.now();
    const subcategoryData = {
      ...data,
      code: data.code.toUpperCase(),
      isActive: true,
      createdAt: now,
      createdBy
    };

    const docRef = await addDoc(collection(db, SUBCATEGORIES_COLLECTION), subcategoryData);

    return {
      id: docRef.id,
      ...subcategoryData
    } as ProductSubcategory;
  } catch (error) {
    console.error('Error creating product subcategory:', error);
    throw error;
  }
}

/**
 * Update a product subcategory
 */
export async function updateProductSubcategory(
  id: string,
  data: Partial<UpdateProductSubcategoryData>
): Promise<ProductSubcategory> {
  try {
    const existingSubcategory = await fetchProductSubcategory(id);
    if (!existingSubcategory) {
      throw new Error('Subcategory not found');
    }

    const updatePayload = {
      ...data,
      ...(data.code && { code: data.code.toUpperCase() })
    };

    // Remove undefined fields
    Object.keys(updatePayload).forEach(
      key => updatePayload[key as keyof typeof updatePayload] === undefined && delete updatePayload[key as keyof typeof updatePayload]
    );

    await updateDoc(doc(db, SUBCATEGORIES_COLLECTION, id), updatePayload);

    return {
      ...existingSubcategory,
      ...updatePayload
    } as ProductSubcategory;
  } catch (error) {
    console.error(`Error updating subcategory ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a product subcategory (soft delete)
 */
export async function deleteProductSubcategory(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, SUBCATEGORIES_COLLECTION, id), {
      isActive: false
    });
  } catch (error) {
    console.error(`Error deleting subcategory ${id}:`, error);
    throw error;
  }
}

// ============================================================================
// COST AND PRICING CALCULATIONS
// ============================================================================

/**
 * Calculate total product cost from recipes and packages
 * Formula: (recipe.costPerServing × portions) + (package.currentPrice × quantity)
 *
 * This is a synchronous calculation using the cached costs in the product data.
 * For real-time updates, use calculateProductCostRealTime() instead.
 */
export function calculateProductCost(product: Partial<Product> | CreateProductData): number {
  let totalCost = 0;

  // Sum recipe costs
  if (product.productRecipes) {
    totalCost += product.productRecipes.reduce((sum, recipe) => {
      return sum + (recipe.recipeCost || 0);
    }, 0);
  }

  // Sum package costs
  if (product.productPackages) {
    totalCost += product.productPackages.reduce((sum, pkg) => {
      return sum + (pkg.packageCost || 0);
    }, 0);
  }

  return totalCost;
}

/**
 * Calculate product cost with real-time recipe and package data
 * Fetches current prices from recipe and packaging libraries
 * Use this when you need up-to-date costs (e.g., when displaying or saving)
 */
export async function calculateProductCostRealTime(product: Partial<Product> | CreateProductData): Promise<number> {
  try {
    let totalCost = 0;

    // Fetch and sum recipe costs with real-time data
    if (product.productRecipes && product.productRecipes.length > 0) {
      for (const recipeItem of product.productRecipes) {
        try {
          const recipe = await fetchRecipe(recipeItem.recipeId);
          if (recipe) {
            const costPerServing = recipe.costPerServing || 0;
            const recipeCost = costPerServing * recipeItem.portions;
            totalCost += recipeCost;
          }
        } catch (error) {
          console.error(`Error fetching recipe ${recipeItem.recipeId}:`, error);
          // Fall back to cached cost if fetch fails
          totalCost += recipeItem.recipeCost || 0;
        }
      }
    }

    // Fetch and sum package costs with real-time data
    if (product.productPackages && product.productPackages.length > 0) {
      for (const packageItem of product.productPackages) {
        try {
          const packaging = await fetchPackagingItem(packageItem.packagingId);
          if (packaging) {
            const packageCost = packaging.currentPrice * packageItem.quantity;
            totalCost += packageCost;
          }
        } catch (error) {
          console.error(`Error fetching package ${packageItem.packagingId}:`, error);
          // Fall back to cached cost if fetch fails
          totalCost += packageItem.packageCost || 0;
        }
      }
    }

    return totalCost;
  } catch (error) {
    console.error('Error calculating real-time product cost:', error);
    // Fall back to cached calculation
    return calculateProductCost(product);
  }
}

/**
 * Calculate suggested price based on cost and markup percentage
 * Formula: costPrice × (1 + markup / 100)
 */
export function calculateSuggestedPrice(costPrice: number, markup: number): number {
  return costPrice * (1 + markup / 100);
}

/**
 * Calculate profit margin percentage
 * Formula: (price - costPrice) / price × 100
 */
export function calculateProfitMargin(price: number, costPrice: number): number {
  if (price === 0) return 0;
  return ((price - costPrice) / price) * 100;
}

/**
 * Determine if profit margin is viable
 * - 'good': > 20%
 * - 'warning': 10-20%
 * - 'poor': < 10%
 */
export function isMarginViable(margin: number): 'good' | 'warning' | 'poor' {
  if (margin > 20) return 'good';
  if (margin > 10) return 'warning';
  return 'poor';
}

// ============================================================================
// SKU GENERATION
// ============================================================================

/**
 * Generate a unique SKU for a product
 * Format: {CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT}
 * Example: CAKE-VANILLA-001
 *
 * Uses Firestore transaction to ensure thread-safe counter increment
 */
export async function generateSKU(categoryId: string, subcategoryId: string): Promise<string> {
  try {
    // Fetch category and subcategory to get codes
    const [category, subcategory] = await Promise.all([
      fetchProductCategory(categoryId),
      fetchProductSubcategory(subcategoryId)
    ]);

    if (!category || !subcategory) {
      throw new Error('Category or subcategory not found');
    }

    // Use Firestore transaction for atomic counter increment
    const skuCounterRef = doc(db, SKU_COUNTER_COLLECTION, `${categoryId}-${subcategoryId}`);

    const newSku = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(skuCounterRef);

      // Get current counter or initialize to 0
      const currentCounter = counterDoc.exists() ? counterDoc.data().count : 0;
      const nextCounter = currentCounter + 1;

      // Update counter atomically
      if (counterDoc.exists()) {
        transaction.update(skuCounterRef, { count: nextCounter });
      } else {
        transaction.set(skuCounterRef, { count: nextCounter });
      }

      // Format SKU with zero-padded counter (3 digits)
      const paddedCounter = String(nextCounter).padStart(3, '0');
      return `${category.code}-${subcategory.code}-${paddedCounter}`;
    });

    return newSku;
  } catch (error) {
    console.error('Error generating SKU:', error);
    throw error;
  }
}

// ============================================================================
// FORMATTING AND DISPLAY UTILITIES
// ============================================================================

/**
 * Format currency value to Brazilian Real
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

/**
 * Get display name for a product category
 */
export function getCategoryDisplayName(category: ProductCategory): string {
  return `${category.name} (${category.code})`;
}

/**
 * Get display name for a product subcategory
 */
export function getSubcategoryDisplayName(subcategory: ProductSubcategory): string {
  return `${subcategory.name} (${subcategory.code})`;
}

/**
 * Format margin percentage with color indicator
 */
export function getMarginStatus(margin: number): string {
  const viability = isMarginViable(margin);
  return `${margin.toFixed(2)}% (${viability})`;
}
