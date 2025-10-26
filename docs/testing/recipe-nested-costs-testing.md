# Recipe Nested Cost Calculation Testing Guide

## Overview

This document describes the comprehensive test suite for recipe cost calculations with nested sub-recipes. The test file `src/__tests__/lib/recipe-nested-costs.test.ts` provides extensive coverage for calculating costs of recipes that have sub-recipes within sub-recipes.

## Test File Location

`src/__tests__/lib/recipe-nested-costs.test.ts`

## Test Categories

### 1. Single Level Sub-Recipes (2 tests)

Tests for recipes with direct ingredients and sub-recipes at one level deep.

#### Test: "should calculate cost for recipe with direct ingredient and sub-recipe"
- **Purpose**: Verify cost calculation for a recipe mixing direct ingredients with sub-recipes
- **Scenario**: Decorated Cake (main recipe) using Flour (ingredient) + Basic Frosting (sub-recipe)
- **Assertions**:
  - Ingredient cost is calculated correctly: Flour 200g × (price/measurement)
  - Sub-recipe cost includes all its ingredients + labor + proportional usage
  - Labor cost is calculated from preparation time
  - Total cost = ingredient + sub-recipe + labor costs
  - Cost per serving = total cost / number of servings

#### Test: "should calculate proportional cost when using partial sub-recipe amount"
- **Purpose**: Verify that using 50% of a sub-recipe's output results in 50% of the cost
- **Scenario**: Using 100g of a 200g sub-recipe (50% usage)
- **Assertions**:
  - Cost per unit = sub-recipe total cost / generated amount
  - Proportional cost = quantity used × cost per unit

### 2. Nested Sub-Recipes (Multiple Levels) (4 tests)

Tests for recipes with 2, 3, or more levels of nesting.

#### Test: "should calculate costs for recipe with 2-level nesting (A → B → ingredients)"
- **Purpose**: Verify recursive cost calculation for 2-level nested recipes
- **Scenario**: Fancy Cake → Chocolate Layer → (Chocolate + Butter)
- **Assertions**:
  - Level 2 costs are calculated with its own labor cost
  - Cost per gram of Level 2 = (ingredient cost + labor) / generated amount
  - Main recipe correctly applies Level 2 costs proportionally

#### Test: "should calculate costs for recipe with 3-level nesting (A → B → C → ingredients)"
- **Purpose**: Verify deep nesting (3 levels) works correctly
- **Scenario**: Ultimate Cake → Inner Layer → Cream → (Heavy Cream + Sugar)
- **Assertions**:
  - Each level accumulates costs from previous levels
  - Final cost accurately reflects all nested costs
  - Demonstrates compound cost calculation through multiple levels

#### Test: "should handle multiple sub-recipes at same level with different nesting"
- **Purpose**: Verify that multiple sub-recipes with different nesting depths can coexist
- **Scenario**:
  - Main recipe uses Simple Sub (1 level) + Complex Sub (2 levels with Nested Chocolate)
- **Assertions**:
  - Both sub-recipes' costs are correctly calculated
  - Total cost includes both branches of the nesting tree
  - Simple and complex nesting can be mixed

### 3. Edge Cases and Error Handling (3 tests)

Tests for error conditions and graceful degradation.

#### Test: "should handle circular dependencies gracefully"
- **Purpose**: Verify that circular references don't cause infinite loops
- **Scenario**: Recipe A → Recipe B → Recipe A (circular)
- **Implementation**:
  - Uses `visitedRecipes` Set to track visited recipes
  - Detects when a recipe is encountered twice
  - Returns zero cost for circular items instead of crashing
- **Assertions**:
  - System doesn't throw an error
  - Cost breakdown is still valid
  - Circular item cost = 0 (logged as warning)

#### Test: "should handle missing sub-recipe with graceful degradation"
- **Purpose**: Verify that references to non-existent recipes don't crash the system
- **Scenario**: Recipe with ingredient + reference to missing sub-recipe
- **Assertions**:
  - Direct ingredients are still calculated correctly
  - Missing sub-recipe is skipped (zero cost)
  - Total cost includes only available items
  - System continues without crashing

#### Test: "should handle empty sub-recipe items gracefully"
- **Purpose**: Verify that recipes with no items still calculate correctly
- **Scenario**: Recipe using a sub-recipe that has no ingredient items (only labor)
- **Assertions**:
  - Empty sub-recipe contributes only labor cost
  - Proportional calculation still works (quantity × cost per unit)
  - Main recipe's cost correctly includes partial labor from empty sub-recipe

### 4. Cost Breakdown Structure and Details (1 test)

Tests for detailed cost information in response structures.

#### Test: "should provide detailed item costs breakdown for nested recipes"
- **Purpose**: Verify that the response structure includes detailed cost information
- **Scenario**: Recipe with ingredient + sub-recipe
- **Assertions**:
  - `itemCosts` array contains all items
  - Ingredient items have `type: 'ingredient'`
  - Recipe items have `type: 'recipe'`
  - Recipe items include `subRecipeBreakdown` with nested cost details
  - Recipe items include `proportionUsed` (quantity / generated amount)

## Cost Calculation Algorithm

The system uses a recursive algorithm for calculating costs:

```
calculateRecipeCosts(recipe):
  1. For each item in recipe.recipeItems:
     - If ingredient: cost = quantity × (price / measurementValue)
     - If sub-recipe:
       a. Recursively calculate sub-recipe costs
       b. Cost per unit = subRecipeTotalCost / subRecipeGeneratedAmount
       c. Item cost = quantity × cost per unit

  2. Sum ingredient costs
  3. Sum sub-recipe costs
  4. Calculate labor cost = (preparationTime / 60) × laborHourRate

  5. totalCost = ingredientCost + subRecipeCost + laborCost
  6. costPerServing = totalCost / servings
  7. suggestedPrice = costPerServing × (margin / 100)
```

## Key Features

### Circular Dependency Prevention
- Maintains `visitedRecipes` Set throughout recursion
- Checks if recipe is in Set before processing
- Returns zero cost if circular dependency detected
- Prevents infinite loops

### Proportional Costing
- Sub-recipes are costed based on quantity used
- If a sub-recipe generates 500g and 250g is used, cost is 50%
- Allows flexible recipe composition

### Labor Cost Allocation
- Each level of recipe has its own labor cost
- Sub-recipe labor is included in sub-recipe cost
- Main recipe adds its own labor on top

### Error Resilience
- Missing ingredients: logged as warning, cost = 0
- Missing sub-recipes: logged as warning, cost = 0
- Empty recipes: still process (only labor cost)

## Running the Tests

### Run only nested cost tests:
```bash
npm run test -- src/__tests__/lib/recipe-nested-costs.test.ts
```

### Run with coverage:
```bash
npm run test:coverage -- src/__tests__/lib/recipe-nested-costs.test.ts
```

### Run specific test:
```bash
npm run test -- src/__tests__/lib/recipe-nested-costs.test.ts -t "2-level nesting"
```

## Test Data Examples

### Flour Recipe (Basic Ingredient)
```
Name: Flour
Price: 5.0 (per 500g)
Unit Price: 5.0/500 = 0.01 per gram
```

### Butter Recipe (Ingredient)
```
Name: Butter
Price: 12.0 (per 250g)
Unit Price: 12.0/250 = 0.048 per gram
```

### Frosting (Sub-Recipe)
```
Ingredients:
  - Butter: 100g × 0.048 = 4.8
  - Sugar: 200g × 0.004 = 0.8
Labor: 30min ÷ 60 × 30/hr = 15
Total: 20.6
Cost per gram: 20.6 / 400 = 0.0515
```

### Main Cake (Using Frosting)
```
Ingredients:
  - Flour: 200g × 0.01 = 2.0
Items:
  - Frosting: 300g × 0.0515 = 15.45
Labor: 120min ÷ 60 × 30/hr = 60
Total: 77.45 (for 10 servings)
Per serving: 7.745
```

## Mocking Strategy

The tests use Firestore mocks for isolation:

```typescript
// Mock Firestore functions
vi.mock('firebase/firestore');
vi.mock('@/lib/firebase', () => ({ db: {} }));

// Mock dependencies
vi.mock('@/lib/ingredients');
vi.mock('@/lib/recipeSettings');

// Mock Firestore data retrieval
vi.mocked(FirebaseFirestore.getDoc).mockResolvedValue({
  exists: () => true,
  id: 'recipe-id',
  data: () => ({ /* recipe data */ })
});
```

This allows testing the calculation logic without requiring a real Firebase instance.

## Coverage Impact

- **File**: src/__tests__/lib/recipe-nested-costs.test.ts
- **Tests**: 9
- **Test Categories**: 4
- **Nesting Levels Covered**: 1, 2, 3
- **Edge Cases**: Circular dependencies, missing items, empty recipes
- **Coverage**: Service layer recipe costing logic

## Dependencies Tested

1. **calculateRecipeCosts** - Main function
2. **calculateRecipeItemCost** - Item-level calculations
3. **calculateRecipeSubCosts** - Sub-recipe recursion
4. **fetchRecipe** - Recipe data retrieval
5. **fetchIngredient** - Ingredient pricing
6. **fetchRecipeSettings** - Labor rates and margins
7. **getMarginForCategory** - Category-specific margins

## Notes for Developers

1. **Always calculate labor costs** - Even if recipe has no ingredients, labor cost applies
2. **Proportional usage matters** - Using 50% of a recipe should cost ~50% (plus your own labor)
3. **Circular detection is automatic** - No need to manually handle it
4. **Missing items gracefully degrade** - System logs warning but continues
5. **Test edge cases** - When adding new cost logic, test empty, missing, and circular scenarios
