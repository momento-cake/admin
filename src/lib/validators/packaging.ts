import { z } from 'zod';
import { PackagingUnit, PackagingCategory } from '@/types/packaging';

export const packagingValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  description: z.string().optional(),
  unit: z.nativeEnum(PackagingUnit),
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
  supplierId: z.string().optional(),
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo'),
  currentStock: z.number()
    .min(0, 'Estoque atual deve ser positivo'),
  category: z.nativeEnum(PackagingCategory).optional(),
});

export const updatePackagingValidation = packagingValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

export const packagingFiltersValidation = z.object({
  category: z.nativeEnum(PackagingCategory).optional(),
  supplierId: z.string().optional(),
  stockStatus: z.enum(['good', 'low', 'critical', 'out']).optional(),
  searchQuery: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50)
});

// Stock update validation
export const stockUpdateValidation = z.object({
  packagingId: z.string().min(1, 'ID da embalagem é obrigatório'),
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
  packagingId: z.string().min(1, 'ID da embalagem é obrigatório'),
  price: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  quantity: z.number()
    .min(0.01, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  notes: z.string().max(500, 'Observações devem ter no máximo 500 caracteres').optional()
});

// Enhanced packaging validation with business rules
export const enhancedPackagingValidation = packagingValidation.extend({
  // Ensure minimum stock is reasonable
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo')
    .max(999999.99, 'Estoque mínimo muito alto'),

  // Ensure current stock is valid
  currentStock: z.number()
    .min(0, 'Estoque atual deve ser positivo')
    .max(999999.99, 'Estoque atual muito alto')
}).refine((data) => {
  // Always allow, but we can add warnings in the UI
  return data.currentStock >= 0;
}, {
  message: 'Estoque atual está muito abaixo do mínimo recomendado',
  path: ['currentStock']
});

// Type exports for form use
export type PackagingFormData = z.infer<typeof packagingValidation>;
export type UpdatePackagingFormData = z.infer<typeof updatePackagingValidation>;
export type PackagingFiltersData = z.infer<typeof packagingFiltersValidation>;
export type StockUpdateData = z.infer<typeof stockUpdateValidation>;
export type CreatePriceHistoryData = z.infer<typeof createPriceHistoryValidation>;
export type EnhancedPackagingValidationData = z.infer<typeof enhancedPackagingValidation>;

// Validation helper functions
export function validatePackagingName(name: string): { isValid: boolean; error?: string } {
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

export function validateQuantity(quantity: number): { isValid: boolean; error?: string } {
  try {
    const quantitySchema = z.number()
      .min(0.01, 'Quantidade deve ser maior que zero')
      .max(999999.99, 'Quantidade muito alta');

    quantitySchema.parse(quantity);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0]?.message };
    }
    return { isValid: false, error: 'Quantidade inválida' };
  }
}
