# Chore: Migrate All Models to TypeScript with Proper Attribute Types

**Created**: October 25, 2025
**Platforms**: Web (Next.js/React)
**Complexity**: Medium
**Estimated Effort**: 2-3 days
**Status**: Planning

---

## Executive Summary

This chore ensures all data models, API contracts, component types, and validation schemas across the Momento Cake Admin application are properly typed with TypeScript. The project has good foundational typing (85% coverage), but needs completion of missing definitions, standardization of component types, and comprehensive documentation.

**Key Outcomes:**
- Fix critical missing `UnitConversion` interface
- Standardize all component prop types in dedicated `.types.ts` files
- Add comprehensive JSDoc comments for IDE support
- Create validation schemas for recipes
- Organize types with clear directory structure and documentation
- Achieve 95%+ type coverage across the codebase

---

## Current State Analysis

### What's Already Done Well ✅
- Core Firestore models fully typed (`Ingredient`, `Recipe`, `Supplier`, `User`)
- Validation schemas with Zod (12+ schemas with derived types)
- API response types defined
- Clear naming conventions established
- Good use of enums for categories and statuses
- Conversion functions handle Firestore timestamp conversion

### Critical Issues ❌
1. **Missing `UnitConversion` interface** - Referenced in imports but not defined
2. **Missing recipe validation schemas** - Validation logic exists but no Zod schemas
3. **Component types scattered** - Prop types are inline instead of in dedicated files
4. **Incomplete JSDoc documentation** - Types lack IDE hover support

### Type Coverage Analysis
| Category | Current | Target |
|----------|---------|--------|
| Firestore Models | 100% | 100% |
| API Routes | 80% | 100% |
| Validators | 75% | 100% |
| Components | 60% | 100% |
| **Overall** | **85%** | **95%+** |

---

## Scope Definition

### What's Included ✅
1. Fix missing `UnitConversion` interface
2. Add missing recipe validation schemas
3. Standardize component prop types (`.types.ts` files)
4. Add comprehensive JSDoc comments to all type definitions
5. Improve API route type definitions
6. Create type utility functions for common conversions
7. Document type relationships and patterns
8. Add type guards for complex types

### What's Excluded ❌
- Runtime validation implementation changes (only schemas)
- Component implementation refactoring (only types)
- Database schema changes
- New feature development
- Database migration scripts

---

## Affected Files

### Core Type Definition Files (Primary)
```
/src/types/
├── index.ts (update)
├── ingredient.ts (update)
└── recipe.ts (update)
```

### Component Type Files (Create New)
```
/src/components/
├── dashboard/
│   ├── types.ts (new)
│   └── [components using types]
├── ingredients/
│   ├── types.ts (new)
│   └── [components using types]
├── recipes/
│   ├── types.ts (new)
│   └── [components using types]
├── users/
│   ├── types.ts (new)
│   └── [components using types]
└── ui/
    └── types.ts (new)
```

### Validation Schema Files (Update)
```
/src/lib/validators/
├── ingredient.ts (update - add missing types)
├── recipe.ts (new - create recipe validation)
├── user.ts (new - create user validation)
└── common.ts (new - shared validation utilities)
```

### Utility Files (Create New)
```
/src/types/
├── index.ts (exists)
├── ingredient.ts (exists)
├── recipe.ts (exists)
├── utils.ts (new - type utilities and guards)
└── constants.ts (new - shared type constants)
```

### API Route Type Files (Update)
```
/src/app/api/
├── ingredients/
│   ├── route.ts (update types)
│   └── [id]/route.ts (update types)
├── recipes/
│   ├── route.ts (update types)
│   └── [id]/route.ts (update types)
└── [other routes] (audit and update)
```

---

## Implementation Tasks

### Phase 1: Fix Critical Issues (Day 1)

#### Task 1.1: Add Missing `UnitConversion` Interface
- **File**: `/src/types/ingredient.ts`
- **Action**: Define the missing `UnitConversion` interface
- **Details**:
  ```typescript
  interface UnitConversion {
    fromUnit: IngredientUnit;
    toUnit: IngredientUnit;
    conversionFactor: number;
    notes?: string;
  }
  ```
- **Validation**: Ensure it's used correctly in validation schemas

#### Task 1.2: Create Recipe Validation Schemas
- **File**: `/src/lib/validators/recipe.ts` (new)
- **Actions**:
  - Create Zod schemas for Recipe operations
  - Create schemas for RecipeItem, RecipeStep
  - Create schema for price updates
  - Create schema for recipe filters
  - Derive TypeScript types from schemas
- **Scope**: Match existing ingredient validation pattern

#### Task 1.3: Create User Validation Schemas
- **File**: `/src/lib/validators/user.ts` (new)
- **Actions**:
  - Create Zod schemas for User operations
  - Create schemas for User creation and updates
  - Create schema for invitation management
  - Derive TypeScript types from schemas

#### Task 1.4: Add JSDoc Comments to Core Types
- **Files**: `/src/types/index.ts`, `/src/types/ingredient.ts`, `/src/types/recipe.ts`
- **Actions**:
  - Add comprehensive JSDoc to all interfaces
  - Document all enum values
  - Add usage examples for complex types
  - Document field requirements and constraints

### Phase 2: Standardize Component Types (Day 2)

#### Task 2.1: Create Dashboard Component Types
- **File**: `/src/components/dashboard/types.ts` (new)
- **Actions**:
  - Extract/create types for Dashboard components
  - Type all dashboard widget components
  - Create dashboard state types
  - Create dashboard data fetch types

#### Task 2.2: Create Ingredients Component Types
- **File**: `/src/components/ingredients/types.ts` (new)
- **Actions**:
  - Create types for ingredient form components
  - Type ingredient list/table components
  - Create filter form component types
  - Type supplier management components
  - Create price history component types

#### Task 2.3: Create Recipes Component Types
- **File**: `/src/components/recipes/types.ts` (new)
- **Actions**:
  - Create types for recipe form components
  - Type recipe step management components
  - Create recipe item selector types
  - Type cost breakdown display components
  - Create recipe filter types

#### Task 2.4: Create Users Component Types
- **File**: `/src/components/users/types.ts` (new)
- **Actions**:
  - Create types for user management components
  - Type invitation list components
  - Create user form component types

#### Task 2.5: Create UI Component Types
- **File**: `/src/components/ui/types.ts` (new)
- **Actions**:
  - Document shared UI component prop types
  - Create form field types
  - Create modal/dialog types
  - Type table column definitions

#### Task 2.6: Update Components to Use Typed Props
- **Files**: All component files in `/src/components/`
- **Actions**:
  - Replace inline prop type definitions
  - Import types from `.types.ts` files
  - Update component function signatures
  - Verify all props are properly typed

### Phase 3: Create Utility Types & Guards (Day 2)

#### Task 3.1: Create Type Utility Functions
- **File**: `/src/types/utils.ts` (new)
- **Actions**:
  - Create `docToUser()` function for user conversion
  - Create type guards for discriminated unions
  - Create utility functions for common transformations
  - Export utility types (Readonly, Partial, etc.)
- **Examples**:
  ```typescript
  // Type guards
  function isIngredient(obj: unknown): obj is Ingredient { }
  function isRecipe(obj: unknown): obj is Recipe { }

  // Conversion utilities
  function convertFirestoreTimestamps(data: any): ProcessedData { }

  // Utility types
  type ReadonlyDeep<T> = { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
  ```

#### Task 3.2: Create Type Constants
- **File**: `/src/types/constants.ts` (new)
- **Actions**:
  - Define all enum values as constants
  - Create error type constants
  - Create status type constants
  - Export validation constraints (min/max lengths, etc.)

#### Task 3.3: Create Type Documentation
- **File**: `/src/types/README.md` (new)
- **Actions**:
  - Document all type definitions
  - Include type relationship diagrams
  - Provide usage examples
  - Document inheritance/extension patterns

### Phase 4: Audit & Improve API Routes (Day 2-3)

#### Task 4.1: Audit All API Routes
- **Files**: All files in `/src/app/api/`
- **Actions**:
  - Check all request/response types
  - Verify error response types
  - Check parameter types
  - Document API contracts with types

#### Task 4.2: Create API Response Types
- **File**: `/src/types/api.ts` (new)
- **Actions**:
  - Create standard response wrapper type
  - Create error response type
  - Create pagination types
  - Create query parameter types
  - Document API version if needed

#### Task 4.3: Update API Routes with Complete Types
- **Files**: All API routes
- **Actions**:
  - Add request body type definitions
  - Add response type definitions
  - Add query parameter types
  - Add error response types
  - Document expected status codes

### Phase 5: Testing & Validation (Day 3)

#### Task 5.1: Verify Type Compilation
- **Action**: Run TypeScript compiler in strict mode
- **Command**: `npm run type-check`
- **Expected**: Zero type errors

#### Task 5.2: Verify Type Coverage
- **Action**: Check no `any` types remain (except justified cases)
- **Tool**: Use TypeScript compiler with `--noImplicitAny`
- **Expected**: Report any remaining `any` types

#### Task 5.3: Test Component Type Safety
- **Action**: Update one component file per feature area
- **Verification**: Ensure component accepts properly typed props

#### Task 5.4: Validate Validation Schemas
- **Action**: Test all Zod validation schemas
- **Verification**: Ensure schemas match type definitions

---

## Technical Details

### Type Organization Structure

```typescript
// /src/types/index.ts - Core domain models
export interface User { }
export interface UserInvitation { }
export type UserRole = 'admin' | 'viewer';

// /src/types/ingredient.ts - Ingredient domain
export interface Ingredient { }
export interface Supplier { }
export enum IngredientUnit { }
export interface UnitConversion { } // MISSING - ADD

// /src/types/recipe.ts - Recipe domain
export interface Recipe { }
export interface RecipeItem { }
export enum RecipeCategory { }

// /src/types/api.ts - API contracts (NEW)
export interface ApiResponse<T> { }
export interface ApiError { }

// /src/types/utils.ts - Type utilities (NEW)
export type ReadonlyDeep<T> = { readonly [K in keyof T]: ReadonlyDeep<T[K]> }
export function isIngredient(obj: unknown): obj is Ingredient { }

// /src/components/[feature]/types.ts - Component types (NEW)
export interface [ComponentName]Props { }
```

### Naming Conventions (Established & Continue)

| Type | Convention | Example |
|------|-----------|---------|
| Domain Models | PascalCase | `Ingredient`, `Recipe`, `User` |
| Type Aliases | PascalCase | `UserRole`, `StockStatus` |
| Enums | PascalCase | `IngredientUnit`, `RecipeCategory` |
| Interfaces | PascalCase | `UnitConversion`, `PriceHistoryEntry` |
| Component Props | `[ComponentName]Props` | `IngredientFormProps`, `RecipeListProps` |
| Form Data | `[Model][Action]Data` | `IngredientCreateData`, `RecipeUpdateData` |
| API Response | `[Resource]Response` | `IngredientsResponse`, `RecipeResponse` |
| Request Body | `[Resource]Request` | `IngredientRequest`, `RecipeRequest` |

### JSDoc Pattern to Apply

```typescript
/**
 * Represents a single ingredient in the inventory system.
 *
 * @remarks
 * Ingredients are fundamental units tracked in Firestore with price history,
 * supplier information, and stock management.
 *
 * @example
 * ```typescript
 * const ingredient: Ingredient = {
 *   id: 'ing_001',
 *   name: 'Farinha de Trigo',
 *   category: 'flour',
 *   unit: 'kg',
 *   currentPrice: 5.50,
 *   stock: 100
 * };
 * ```
 */
export interface Ingredient {
  /** Unique Firestore document ID */
  id: string;

  /** Ingredient name (required, max 100 chars) */
  name: string;

  /** Category for organization and filtering */
  category: IngredientCategory;

  // ... more fields with documentation
}
```

### Type Guard Pattern to Implement

```typescript
/**
 * Type guard to check if an object is a valid Ingredient
 */
export function isIngredient(obj: unknown): obj is Ingredient {
  if (typeof obj !== 'object' || obj === null) return false;
  const candidate = obj as any;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    candidate.category in IngredientCategory &&
    candidate.unit in IngredientUnit
  );
}
```

---

## Testing Strategy

### Unit Tests
- Test type guard functions
- Test validation schema conformance
- Test type utility functions
- Test type conversions from Firestore

### Integration Tests
- Test API endpoints with typed requests/responses
- Test component rendering with typed props
- Test form validation with Zod schemas

### Type Safety Tests
- Verify TypeScript compilation succeeds
- Verify no implicit `any` types
- Verify exhaustive switch statements on enums
- Verify no type errors in strict mode

### Validation Tests
- Test Zod schemas with valid data
- Test Zod schemas with invalid data
- Test validation error messages
- Test type coercion and transformation

---

## Validation & Verification

### Commands to Verify Completion
```bash
# Type checking - should pass with zero errors
npm run type-check

# Build verification - should succeed
npm run build

# Linting - should pass all checks
npm run lint

# Test validation schemas - if tests exist
npm test -- --testPathPattern=validator
```

### Verification Checklist
- [ ] `npm run type-check` passes with zero errors
- [ ] No implicit `any` types remain (except justified)
- [ ] All new `.types.ts` files created in component directories
- [ ] All validation schemas created for recipe and user models
- [ ] JSDoc comments added to all type definitions
- [ ] Type guards implemented for complex types
- [ ] API route types updated and documented
- [ ] Type utilities created and tested
- [ ] Project builds successfully
- [ ] All existing tests still pass

---

## Migration Path & Breaking Changes

### No Breaking Changes Expected
- All changes are **additive** (adding types, not removing)
- Existing code continues to work
- Optional JSDoc comments don't break anything
- New validation schemas are additional, not replacements

### Migration Notes
- Component type changes should be backward compatible
- No changes to runtime behavior
- No API contract changes
- Validation schemas match existing validation logic

---

## Success Criteria

### Must Complete
1. Fix critical missing `UnitConversion` interface ✅
2. Create recipe validation schemas ✅
3. Create user validation schemas ✅
4. Type all major component props ✅
5. Add JSDoc to all core types ✅
6. `npm run type-check` passes ✅
7. No implicit `any` types (except justified) ✅

### Should Complete
8. Create type utility functions ✅
9. Create type guards for complex types ✅
10. Create API types documentation ✅
11. Create comprehensive types README ✅

### Nice to Have
12. Performance optimization type annotations
13. Advanced type patterns (conditional types, generics)
14. Type-safe API client generation

---

## Dependencies & Prerequisites

### No External Dependencies Needed
- TypeScript already in project
- Zod already in project
- React/Next.js already in project

### Prerequisites
- Read existing types in `/src/types/`
- Understand Zod validation pattern in `/src/lib/validators/ingredient.ts`
- Understand Firestore document conversion pattern

### Skills Required
- TypeScript intermediate+ (interfaces, generics, type guards)
- Zod schema creation
- Component prop typing
- JSDoc documentation

---

## Related Issues & Follow-up Work

### After This Chore
1. **Consistency Review** - Audit remaining inline types in other directories
2. **Component Testing** - Add component prop type tests
3. **Documentation** - Update contributing guide with type patterns
4. **Performance** - Consider type-level optimizations if needed

### Related Chores
- Refactor component validation (separate concern)
- Improve error handling types
- Add React Query/SWR types (if applicable)

---

## Resources & References

### Type Definition Files
- `/src/types/index.ts` - Current user/client types
- `/src/types/ingredient.ts` - Current ingredient types
- `/src/types/recipe.ts` - Current recipe types
- `/src/lib/validators/ingredient.ts` - Zod pattern to follow

### Documentation Files
- `/docs/development/` - Development guides
- `/context/specs/` - Architecture documentation
- `tsconfig.json` - TypeScript configuration

### External References
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zod Documentation](https://zod.dev)
- [JSDoc Best Practices](https://jsdoc.app/)

---

## Notes & Best Practices

### Type Definition Best Practices
1. **Be explicit** - Use specific types, avoid generic `object`
2. **Document constraints** - Include min/max/pattern in JSDoc
3. **Use enums** - For fixed sets of values
4. **Create unions** - For flexible type combinations
5. **Validate at boundaries** - API routes and form submissions

### Component Typing Best Practices
1. **Separate concerns** - Props, State, and Context types separate
2. **Extend appropriately** - Extend HTMLAttributes for native components
3. **Use discriminated unions** - For variant components
4. **Type children properly** - Use `React.ReactNode` or specific types

### Zod Schema Best Practices
1. **Match backend validation** - Ensure schema matches API expectations
2. **Provide clear messages** - Use `.describe()` for validation errors
3. **Reuse schemas** - Build larger schemas from smaller pieces
4. **Test thoroughly** - Test valid, invalid, and edge case data

### Documentation Best Practices
1. **Include examples** - Show how to use each type
2. **Document relationships** - Show how types relate to each other
3. **Note constraints** - Document required fields and limits
4. **Update when changed** - Keep documentation in sync with code

---

## Implementation Plan Summary

| Phase | Duration | Focus | Key Outcomes |
|-------|----------|-------|--------------|
| Phase 1 | 1 day | Fix critical issues | Missing interfaces, validation schemas, JSDoc |
| Phase 2 | 1 day | Standardize components | All component types in `.types.ts` files |
| Phase 3 | 1 day | Utilities & documentation | Type utilities, guards, comprehensive README |
| Phase 4 | 0.5 day | API routes | Complete API type documentation |
| Phase 5 | 0.5 day | Testing & validation | Verify everything works, zero type errors |
| **Total** | **2-3 days** | **Complete typing** | **95%+ type coverage** |

---

**Document Status**: Ready for Implementation
**Last Updated**: October 25, 2025
**Created By**: Claude Code Analysis

