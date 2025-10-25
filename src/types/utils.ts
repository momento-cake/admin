/**
 * Type utility functions and guards for type safety.
 *
 * @remarks
 * This module provides runtime type guards and utility functions for working
 * with the application's data types. These help ensure type safety at runtime
 * when dealing with data from Firestore or external APIs.
 */

import {
  Ingredient,
  IngredientUnit,
  IngredientCategory,
  Supplier,
  UnitConversion,
  StockStatus,
  CreateIngredientData,
} from './ingredient';

import {
  Recipe,
  RecipeItem,
  RecipeStep,
  RecipeCategory,
  RecipeDifficulty,
  CostBreakdown,
  RecipeValidationError,
  CreateRecipeData,
} from './recipe';

import {
  UserModel,
  UserRole,
  UserInvitation,
  InvitationStatus,
  Client,
} from './index';

// ============================================================================
// Type Guards for Ingredients
// ============================================================================

/**
 * Type guard to check if an object is a valid Ingredient
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid Ingredient
 */
export function isIngredient(obj: unknown): obj is Ingredient {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Object.values(IngredientUnit).includes(candidate.unit) &&
    typeof candidate.currentPrice === 'number' &&
    typeof candidate.currentStock === 'number' &&
    typeof candidate.minStock === 'number' &&
    Object.values(IngredientCategory).includes(candidate.category) &&
    Array.isArray(candidate.allergens) &&
    typeof candidate.isActive === 'boolean' &&
    candidate.createdAt instanceof Date &&
    typeof candidate.createdBy === 'string'
  );
}

/**
 * Type guard to check if an object is a valid Supplier
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid Supplier
 */
export function isSupplier(obj: unknown): obj is Supplier {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.rating === 'number' &&
    Array.isArray(candidate.categories) &&
    typeof candidate.isActive === 'boolean' &&
    candidate.createdAt instanceof Date &&
    candidate.updatedAt instanceof Date
  );
}

/**
 * Type guard to check if an object is a valid UnitConversion
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid UnitConversion
 */
export function isUnitConversion(obj: unknown): obj is UnitConversion {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    Object.values(IngredientUnit).includes(candidate.fromUnit) &&
    Object.values(IngredientUnit).includes(candidate.toUnit) &&
    typeof candidate.conversionFactor === 'number' &&
    candidate.conversionFactor > 0
  );
}

/**
 * Type guard to check if a value is a valid StockStatus
 *
 * @param value - Value to check
 * @returns true if value is a valid StockStatus
 */
export function isStockStatus(value: unknown): value is StockStatus {
  return ['good', 'low', 'critical', 'out'].includes(value as string);
}

// ============================================================================
// Type Guards for Recipes
// ============================================================================

/**
 * Type guard to check if an object is a valid Recipe
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid Recipe
 */
export function isRecipe(obj: unknown): obj is Recipe {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Object.values(RecipeCategory).includes(candidate.category) &&
    typeof candidate.generatedAmount === 'number' &&
    Object.values(IngredientUnit).includes(candidate.generatedUnit) &&
    typeof candidate.servings === 'number' &&
    typeof candidate.portionSize === 'number' &&
    typeof candidate.preparationTime === 'number' &&
    Object.values(RecipeDifficulty).includes(candidate.difficulty) &&
    Array.isArray(candidate.recipeItems) &&
    Array.isArray(candidate.instructions) &&
    typeof candidate.totalCost === 'number' &&
    typeof candidate.costPerServing === 'number' &&
    typeof candidate.isActive === 'boolean' &&
    candidate.createdAt instanceof Date &&
    candidate.updatedAt instanceof Date &&
    typeof candidate.createdBy === 'string'
  );
}

/**
 * Type guard to check if an object is a valid RecipeItem
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid RecipeItem
 */
export function isRecipeItem(obj: unknown): obj is RecipeItem {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    ['ingredient', 'recipe'].includes(candidate.type) &&
    typeof candidate.quantity === 'number' &&
    Object.values(IngredientUnit).includes(candidate.unit) &&
    typeof candidate.cost === 'number' &&
    typeof candidate.sortOrder === 'number' &&
    (candidate.type === 'ingredient' ? typeof candidate.ingredientId === 'string' : true) &&
    (candidate.type === 'recipe' ? typeof candidate.subRecipeId === 'string' : true)
  );
}

/**
 * Type guard to check if an object is a valid RecipeStep
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid RecipeStep
 */
export function isRecipeStep(obj: unknown): obj is RecipeStep {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.stepNumber === 'number' &&
    typeof candidate.instruction === 'string' &&
    typeof candidate.timeMinutes === 'number'
  );
}

/**
 * Type guard to check if an object is a valid CostBreakdown
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid CostBreakdown
 */
export function isCostBreakdown(obj: unknown): obj is CostBreakdown {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.recipeId === 'string' &&
    Array.isArray(candidate.itemCosts) &&
    typeof candidate.ingredientCost === 'number' &&
    typeof candidate.subRecipeCost === 'number' &&
    typeof candidate.totalItemCost === 'number' &&
    typeof candidate.laborCost === 'number' &&
    typeof candidate.totalCost === 'number' &&
    typeof candidate.costPerServing === 'number' &&
    typeof candidate.suggestedPrice === 'number' &&
    typeof candidate.margin === 'number' &&
    typeof candidate.profitAmount === 'number' &&
    typeof candidate.profitPercentage === 'number' &&
    typeof candidate.servings === 'number' &&
    candidate.calculatedAt instanceof Date
  );
}

// ============================================================================
// Type Guards for Users
// ============================================================================

/**
 * Type guard to check if an object is a valid UserModel
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid UserModel
 */
export function isUser(obj: unknown): obj is UserModel {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.uid === 'string' &&
    typeof candidate.email === 'string' &&
    ['admin', 'viewer'].includes(candidate.role?.type) &&
    typeof candidate.emailVerified === 'boolean' &&
    typeof candidate.isActive === 'boolean' &&
    typeof candidate.metadata === 'object'
  );
}

/**
 * Type guard to check if an object is a valid UserInvitation
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid UserInvitation
 */
export function isUserInvitation(obj: unknown): obj is UserInvitation {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.name === 'string' &&
    ['admin', 'viewer'].includes(candidate.role) &&
    ['pending', 'accepted', 'expired', 'cancelled'].includes(candidate.status) &&
    typeof candidate.token === 'string' &&
    typeof candidate.invitedBy === 'string' &&
    candidate.invitedAt instanceof Date &&
    candidate.expiresAt instanceof Date
  );
}

/**
 * Type guard to check if a value is a valid UserRole
 *
 * @param value - Value to check
 * @returns true if value is a valid UserRole
 */
export function isUserRole(value: unknown): value is UserRole {
  return ['admin', 'viewer'].includes(value as string);
}

/**
 * Type guard to check if a value is a valid InvitationStatus
 *
 * @param value - Value to check
 * @returns true if value is a valid InvitationStatus
 */
export function isInvitationStatus(value: unknown): value is InvitationStatus {
  return ['pending', 'accepted', 'expired', 'cancelled'].includes(value as string);
}

/**
 * Type guard to check if an object is a valid Client
 *
 * @param obj - Unknown object to check
 * @returns true if obj is a valid Client
 */
export function isClient(obj: unknown): obj is Client {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.lastName === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.documentNumber === 'string' &&
    ['cpf', 'cnpj'].includes(candidate.documentType) &&
    ['person', 'business'].includes(candidate.clientType) &&
    Array.isArray(candidate.addresses) &&
    Array.isArray(candidate.contacts) &&
    typeof candidate.isActive === 'boolean' &&
    candidate.createdAt instanceof Date
  );
}

// ============================================================================
// Enum Value Validators
// ============================================================================

/**
 * Get all valid values for IngredientUnit enum
 *
 * @returns Array of valid IngredientUnit values
 */
export function getValidIngredientUnits(): IngredientUnit[] {
  return Object.values(IngredientUnit) as IngredientUnit[];
}

/**
 * Get all valid values for IngredientCategory enum
 *
 * @returns Array of valid IngredientCategory values
 */
export function getValidIngredientCategories(): IngredientCategory[] {
  return Object.values(IngredientCategory) as IngredientCategory[];
}

/**
 * Get all valid values for RecipeCategory enum
 *
 * @returns Array of valid RecipeCategory values
 */
export function getValidRecipeCategories(): RecipeCategory[] {
  return Object.values(RecipeCategory) as RecipeCategory[];
}

/**
 * Get all valid values for RecipeDifficulty enum
 *
 * @returns Array of valid RecipeDifficulty values
 */
export function getValidRecipeDifficulties(): RecipeDifficulty[] {
  return Object.values(RecipeDifficulty) as RecipeDifficulty[];
}

/**
 * Get all valid values for UserRole enum
 *
 * @returns Array of valid UserRole values
 */
export function getValidUserRoles(): UserRole[] {
  return ['admin', 'viewer'];
}

/**
 * Get all valid values for InvitationStatus enum
 *
 * @returns Array of valid InvitationStatus values
 */
export function getValidInvitationStatuses(): InvitationStatus[] {
  return ['pending', 'accepted', 'expired', 'cancelled'];
}

/**
 * Get all valid values for StockStatus enum
 *
 * @returns Array of valid StockStatus values
 */
export function getValidStockStatuses(): StockStatus[] {
  return ['good', 'low', 'critical', 'out'];
}

// ============================================================================
// Deep Readonly Type Utilities
// ============================================================================

/**
 * Makes all properties of a type recursively readonly
 */
export type ReadonlyDeep<T> = {
  readonly [K in keyof T]: T[K] extends object ? ReadonlyDeep<T[K]> : T[K];
};

/**
 * Convert a mutable object to deep readonly
 *
 * @param obj - Object to convert
 * @returns Deep readonly version of the object
 */
export function toDeepReadonly<T extends object>(obj: T): ReadonlyDeep<T> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        value instanceof Object && !(value instanceof Date) ? toDeepReadonly(value) : value,
      ])
    )
  ) as ReadonlyDeep<T>;
}

// ============================================================================
// Partial Type Utilities
// ============================================================================

/**
 * Makes all properties of a type optional recursively
 */
export type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

/**
 * Makes all properties of a type required recursively
 */
export type RequiredDeep<T> = {
  [K in keyof T]-?: T[K] extends object ? RequiredDeep<T[K]> : T[K];
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a string is a valid Firestore document ID
 *
 * @param id - String to validate
 * @returns true if valid Firestore document ID
 */
export function isValidFirestoreId(id: string): boolean {
  return typeof id === 'string' && id.length > 0 && id.length <= 1500;
}

/**
 * Check if a date is valid
 *
 * @param date - Value to check
 * @returns true if value is a valid Date
 */
export function isValidDate(date: unknown): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Safe type assertion with fallback
 *
 * @param value - Value to assert
 * @param guard - Type guard function
 * @param fallback - Fallback value if assertion fails
 * @returns Value if guard returns true, fallback otherwise
 */
export function safeAssert<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  fallback: T
): T {
  return guard(value) ? value : fallback;
}

/**
 * Get the human-readable name for an enum value
 *
 * @param value - Enum value
 * @param enumObj - Enum object
 * @returns Human-readable name
 */
export function getEnumLabel(value: string, enumObj: Record<string, string>): string {
  const key = Object.keys(enumObj).find((k) => enumObj[k] === value);
  return key
    ? key
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : value;
}

/**
 * Create a type-safe discriminated union helper
 *
 * @param type - The discriminant value
 * @param data - The data payload
 * @returns Discriminated union object
 */
export function createDiscriminatedUnion<T extends { type: string }>(
  type: T['type'],
  data: Omit<T, 'type'>
): T {
  return { type, ...data } as T;
}
