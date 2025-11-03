import { z } from 'zod';

/**
 * Product Recipe Item validation schema
 * Validates a recipe associated with a product and portion quantity
 */
const productRecipeItemValidation = z.object({
  id: z.string().optional(),
  recipeId: z.string().min(1, 'Recipe ID is required'),
  recipeName: z.string().min(1, 'Recipe name is required'),
  portions: z.number()
    .min(0.1, 'Portions must be at least 0.1')
    .max(999.99, 'Portions cannot exceed 999.99'),
  recipeCost: z.number().min(0, 'Recipe cost cannot be negative')
});

/**
 * Product Package Item validation schema
 * Validates a packaging item associated with a product and quantity
 */
const productPackageItemValidation = z.object({
  id: z.string().optional(),
  packagingId: z.string().min(1, 'Packaging ID is required'),
  packagingName: z.string().min(1, 'Packaging name is required'),
  quantity: z.number()
    .min(1, 'Quantity must be at least 1')
    .max(999, 'Quantity cannot exceed 999'),
  packageCost: z.number().min(0, 'Package cost cannot be negative')
});

/**
 * Main product validation schema
 * Used for creating and updating products with full validation
 */
export const productValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  categoryId: z.string()
    .min(1, 'Categoria é obrigatória'),
  subcategoryId: z.string()
    .min(1, 'Subcategoria é obrigatória'),
  price: z.number()
    .min(0.01, 'Preço deve ser maior que 0')
    .max(999999.99, 'Preço muito alto'),
  markup: z.number()
    .min(0, 'Markup deve ser no mínimo 0%')
    .max(500, 'Markup não pode ser maior que 500%'),
  productRecipes: z.array(productRecipeItemValidation)
    .min(1, 'Produto deve ter pelo menos uma receita'),
  productPackages: z.array(productPackageItemValidation).optional()
});

/**
 * Product creation validation schema
 * Extends product validation with required fields for creation
 */
export const createProductValidation = productValidation.extend({
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  price: z.number().min(0.01, 'Price must be greater than 0'),
  productRecipes: z.array(productRecipeItemValidation).min(1, 'At least one recipe is required')
});

/**
 * Product update validation schema
 * All fields are optional for partial updates
 */
export const updateProductValidation = productValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

/**
 * Product category validation schema
 * Used for creating and updating product categories
 */
export const productCategoryValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(10, 'Código deve ter no máximo 10 caracteres')
    .toUpperCase(),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  displayOrder: z.number()
    .min(0, 'Display order must be 0 or greater')
    .int('Display order must be a whole number')
});

/**
 * Product category creation validation schema
 */
export const createProductCategoryValidation = productCategoryValidation;

/**
 * Product category update validation schema
 * All fields are optional for partial updates
 */
export const updateProductCategoryValidation = productCategoryValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

/**
 * Product subcategory validation schema
 * Used for creating and updating product subcategories
 */
export const productSubcategoryValidation = z.object({
  categoryId: z.string()
    .min(1, 'Categoria é obrigatória'),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  code: z.string()
    .min(1, 'Código é obrigatório')
    .max(10, 'Código deve ter no máximo 10 caracteres')
    .toUpperCase(),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  displayOrder: z.number()
    .min(0, 'Display order must be 0 or greater')
    .int('Display order must be a whole number')
});

/**
 * Product subcategory creation validation schema
 */
export const createProductSubcategoryValidation = productSubcategoryValidation;

/**
 * Product subcategory update validation schema
 * All fields are optional for partial updates
 */
export const updateProductSubcategoryValidation = productSubcategoryValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

/**
 * Product filters validation schema
 * Used for query parameter validation
 */
export const productFiltersValidation = z.object({
  searchQuery: z.string().optional(),
  categoryId: z.string().optional(),
  subcategoryId: z.string().optional(),
  maxPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  minMargin: z.number().min(0).max(100).optional(),
  maxMargin: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
});

// Type exports from schemas
export type ProductValidation = z.infer<typeof productValidation>;
export type CreateProductValidation = z.infer<typeof createProductValidation>;
export type UpdateProductValidation = z.infer<typeof updateProductValidation>;
export type ProductCategoryValidation = z.infer<typeof productCategoryValidation>;
export type CreateProductCategoryValidation = z.infer<typeof createProductCategoryValidation>;
export type UpdateProductCategoryValidation = z.infer<typeof updateProductCategoryValidation>;
export type ProductSubcategoryValidation = z.infer<typeof productSubcategoryValidation>;
export type CreateProductSubcategoryValidation = z.infer<typeof createProductSubcategoryValidation>;
export type UpdateProductSubcategoryValidation = z.infer<typeof updateProductSubcategoryValidation>;
export type ProductFiltersValidation = z.infer<typeof productFiltersValidation>;
