import { z } from 'zod';
import { IngredientUnit, IngredientCategory } from '@/types/ingredient';

export const ingredientValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  description: z.string().optional(),
  unit: z.nativeEnum(IngredientUnit),
  currentPrice: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  supplierId: z.string().optional(),
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo'),
  currentStock: z.number()
    .min(0, 'Estoque atual deve ser positivo'),
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

// Type exports for form use
export type IngredientFormData = z.infer<typeof ingredientValidation>;
export type UpdateIngredientFormData = z.infer<typeof updateIngredientValidation>;
export type SupplierFormData = z.infer<typeof supplierValidation>;
export type UpdateSupplierFormData = z.infer<typeof updateSupplierValidation>;
export type IngredientFiltersData = z.infer<typeof ingredientFiltersValidation>;
export type UnitConversionData = z.infer<typeof unitConversionValidation>;