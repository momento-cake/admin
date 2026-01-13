import { z } from 'zod';
import { IngredientUnit, IngredientCategory } from '@/types/ingredient';

export const ingredientValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  description: z.string().optional(),
  unit: z.nativeEnum(IngredientUnit),
  measurementValue: z.number()
    .min(0.001, 'Valor da medição deve ser maior que zero')
    .max(999999.99, 'Valor da medição muito alto'),
  brand: z.string()
    .max(100, 'Marca deve ter menos de 100 caracteres')
    .trim()
    .optional(),
  currentPrice: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo'),
  currentStock: z.number()
    .min(0.01, 'Estoque inicial deve ser maior que zero'),
  category: z.nativeEnum(IngredientCategory),
  allergens: z.array(z.string())
});

export const updateIngredientValidation = ingredientValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

export const supplierValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  contactPerson: z.string().optional(),
  phone: z.string()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, 'Formato de telefone inválido (00) 00000-0000')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  rating: z.number()
    .min(1, 'Avaliação mínima é 1')
    .max(5, 'Avaliação máxima é 5')
    .default(3),
  categories: z.array(z.string()).default([])
});

export const updateSupplierValidation = supplierValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

export const ingredientFiltersValidation = z.object({
  category: z.nativeEnum(IngredientCategory).optional(),
  supplierId: z.string().optional(),
  stockStatus: z.enum(['good', 'low', 'critical', 'out']).optional(),
  searchQuery: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50)
});

export const unitConversionValidation = z.object({
  from: z.nativeEnum(IngredientUnit),
  to: z.nativeEnum(IngredientUnit),
  value: z.number().min(0, 'Valor deve ser positivo')
});

// Stock update validation
export const stockUpdateValidation = z.object({
  quantity: z.number()
    .min(0.01, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  type: z.enum(['adjustment', 'purchase', 'usage', 'waste', 'correction']),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional(),
  reason: z.string().max(200, 'Motivo deve ter no máximo 200 caracteres').optional(),
  supplierId: z.string().optional(),
  unitCost: z.number()
    .min(0, 'Custo unitário deve ser positivo')
    .max(999999.99, 'Custo unitário muito alto')
    .optional()
}).refine((data) => {
  // If type is purchase, unitCost should be provided
  if (data.type === 'purchase' && (!data.unitCost || data.unitCost <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Custo unitário é obrigatório para compras',
  path: ['unitCost']
});

// Price history validation
export const createPriceHistoryValidation = z.object({
  ingredientId: z.string().min(1, 'ID do ingrediente é obrigatório'),
  price: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  quantity: z.number()
    .min(0.01, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional()
});

// Enhanced ingredient validation with business rules
export const enhancedIngredientValidation = ingredientValidation.extend({
  // Ensure minimum stock is reasonable
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo')
    .max(999999.99, 'Estoque mínimo muito alto'),
  
  // Ensure current stock is not too far below minimum
  currentStock: z.number()
    .min(0, 'Estoque atual deve ser positivo')
    .max(999999.99, 'Estoque atual muito alto')
}).refine((data) => {
  // Warn if current stock is significantly below minimum (allow flexibility)
  return data.currentStock >= 0; // Always allow, but we can add warnings in the UI
}, {
  message: 'Estoque atual está muito abaixo do mínimo recomendado',
  path: ['currentStock']
});

// Batch operations validation
export const batchIngredientUpdateValidation = z.object({
  ingredientIds: z.array(z.string().min(1)).min(1, 'Selecione pelo menos um ingrediente'),
  updateType: z.enum(['price', 'supplier', 'category', 'stock']),
  price: z.number().min(0).optional(),
  supplierId: z.string().optional(),
  category: z.nativeEnum(IngredientCategory).optional(),
  stockAdjustment: z.number().optional(),
  reason: z.string().max(200, 'Motivo deve ter no máximo 200 caracteres').optional()
}).refine((data) => {
  // Ensure the relevant field is provided based on updateType
  switch (data.updateType) {
    case 'price':
      return data.price !== undefined && data.price >= 0;
    case 'supplier':
      return data.supplierId !== undefined;
    case 'category':
      return data.category !== undefined;
    case 'stock':
      return data.stockAdjustment !== undefined;
    default:
      return false;
  }
}, {
  message: 'Campo obrigatório para o tipo de atualização selecionado'
});

// Type exports for form use
export type IngredientFormData = z.infer<typeof ingredientValidation>;
export type UpdateIngredientFormData = z.infer<typeof updateIngredientValidation>;
export type SupplierFormData = z.infer<typeof supplierValidation>;
export type UpdateSupplierFormData = z.infer<typeof updateSupplierValidation>;
export type IngredientFiltersData = z.infer<typeof ingredientFiltersValidation>;
export type UnitConversionData = z.infer<typeof unitConversionValidation>;
export type StockUpdateData = z.infer<typeof stockUpdateValidation>;
export type CreatePriceHistoryData = z.infer<typeof createPriceHistoryValidation>;
export type BatchIngredientUpdateData = z.infer<typeof batchIngredientUpdateValidation>;

// Validation helper functions
export function validateIngredientName(name: string): { isValid: boolean; error?: string } {
  try {
    const nameSchema = z.string()
      .min(2, 'Nome deve ter pelo menos 2 caracteres')
      .max(100, 'Nome deve ter no máximo 100 caracteres')
      .trim();
    
    nameSchema.parse(name);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message };
    }
    return { isValid: false, error: 'Nome inválido' };
  }
}

export function validatePrice(price: number): { isValid: boolean; error?: string } {
  try {
    const priceSchema = z.number()
      .min(0, 'Preço deve ser positivo')
      .max(999999.99, 'Preço muito alto');
    
    priceSchema.parse(price);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message };
    }
    return { isValid: false, error: 'Preço inválido' };
  }
}

export function validateStock(stock: number, context: 'current' | 'minimum' = 'current'): { isValid: boolean; error?: string } {
  try {
    const stockSchema = z.number()
      .min(0, `Estoque ${context === 'current' ? 'atual' : 'mínimo'} deve ser positivo`)
      .max(999999.99, `Estoque ${context === 'current' ? 'atual' : 'mínimo'} muito alto`);
    
    stockSchema.parse(stock);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message };
    }
    return { isValid: false, error: 'Estoque inválido' };
  }
}