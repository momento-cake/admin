# Recipes Management Feature

## Overview

The Recipes Management system enables Momento Cake to document all recipes, calculate precise costs including ingredients and labor, and manage the production process. This feature is central to pricing strategy and production planning.

## Business Requirements

### Core Features
1. **List all recipes** - Complete recipe catalog
2. **View recipe details** - Full recipe information with costs
3. **Create new recipe** - Recipe builder with ingredients, sub-recipes and steps
4. **Edit existing recipe** - Update recipes and recalculate costs
5. **Delete recipes** - Remove unused recipes (soft delete)
6. **Cost calculation** - Live cost calculation with ingredient and sub-recipe prices
7. **Labor cost tracking** - Include preparation time costs
8. **Recipe dependencies** - Support for recipes using other recipes as ingredients

### Recipe Components
- **Basic Information** - Name, category, description, generated amounts, servings, total preparation time (auto-calculated), base cost (auto-calculated)
- **Ingredients and Sub-Recipes** - Required ingredients with quantities AND other recipes with proportions
- **Preparation Steps** - Step-by-step instructions with individual time estimates that sum to total preparation time
- **Recipe scaling** - Calculate for different batch sizes
- **Cost breakdown** - Detailed cost analysis per ingredient and sub-recipe
- **Final pricing** - Suggested selling price with margins

## Data Models

### Recipe Model
```typescript
interface Recipe {
  id: string
  name: string
  description?: string
  category: RecipeCategory
  // Generated amounts and servings
  generatedAmount: number // e.g., 600 for 600g
  generatedUnit: IngredientUnit // e.g., 'g', 'ml', 'kg', 'l'
  servings: number // how many portions this recipe makes
  portionSize: number // calculated: generatedAmount / servings
  // Time (calculated from steps)
  preparationTime: number // minutes - sum of all step times
  difficulty: RecipeDifficulty
  // Components
  recipeItems: RecipeItem[] // both ingredients and sub-recipes
  instructions: RecipeStep[]
  notes?: string
  // Costs (calculated fields)
  totalCost: number // calculated field
  costPerServing: number // calculated field
  laborCost: number // calculated field
  suggestedPrice: number // calculated field
  // Meta
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

// Unified interface for both ingredients and sub-recipes
interface RecipeItem {
  id: string
  type: 'ingredient' | 'recipe'
  // For ingredients
  ingredientId?: string
  ingredientName?: string // denormalized for display
  // For sub-recipes
  subRecipeId?: string
  subRecipeName?: string // denormalized for display
  // Common fields
  quantity: number
  unit: IngredientUnit
  cost: number // calculated from current price
  notes?: string
  sortOrder: number
}

interface RecipeStep {
  id: string
  stepNumber: number
  instruction: string
  timeMinutes: number
  notes?: string
}

enum RecipeCategory {
  CAKES = 'cakes',
  CUPCAKES = 'cupcakes', 
  COOKIES = 'cookies',
  BREADS = 'breads',
  PASTRIES = 'pastries',
  ICINGS = 'icings',
  FILLINGS = 'fillings',
  OTHER = 'other'
}

enum RecipeDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}
```

### Recipe Settings Model
```typescript
interface RecipeSettings {
  id: string
  laborHourRate: number // R$ per hour
  defaultMargin: number // percentage (e.g., 150 = 150%)
  marginsByCategory: {
    [key in RecipeCategory]?: number
  }
  updatedAt: Date
}
```

## User Interface Requirements

### Recipes List Screen
- **Header**: "Receitas" with create recipe button
- **Search/Filter**: Search by name, filter by category/difficulty
- **Recipe Cards**: Display name, category, total cost, cost per serving
- **Quick Actions**: View, edit, duplicate, delete
- **Sorting**: Sort by name, cost, preparation time, last updated

### Recipe Detail Screen
- **Recipe Info**: Name, category, difficulty, generated amount & unit, servings, portion size
- **Time Info**: Total preparation time (calculated from steps)
- **Cost Summary**: Total cost, cost per serving, suggested price
- **Recipe Items Section**: 
  - Ingredients with quantities, units, and individual costs
  - Sub-recipes with quantities, units, costs, and **hyperlinks to recipe details**
  - Cost breakdown showing ingredient costs vs. sub-recipe costs
- **Instructions Section**: Numbered steps with time estimates (sum = prep time)
- **Actions**: Edit, duplicate, delete, scale recipe

### Recipe Form Screen (Create/Edit)
- **Basic Info**: Name, description, category, difficulty
- **Generated Output**: Generated amount, generated unit, servings count (portion size auto-calculated)
- **Recipe Items Builder**: 
  - **Single unified section** for both ingredients and sub-recipes
  - Add ingredients from inventory OR add existing recipes as sub-recipes
  - **Circular dependency prevention**: Block selection of recipes that would create loops
  - Set quantities with unit validation (must be compatible with item's base unit)
  - Real-time cost calculation for both ingredients and sub-recipes
- **Instructions Builder**:
  - Add/reorder preparation steps
  - Set time estimates per step
  - **Auto-calculate total preparation time** as sum of step times
  - Rich text formatting for instructions
- **Cost Preview**: Live cost calculation as items are added (ingredients + sub-recipes + labor)

## Business Rules

### Cost Calculation Logic
```typescript
// Calculate cost for each recipe item (ingredients + sub-recipes)
const calculateItemCost = async (item: RecipeItem) => {
  if (item.type === 'ingredient') {
    const ingredient = await getIngredient(item.ingredientId!)
    return item.quantity * ingredient.pricePerUnit
  } else {
    // For sub-recipes, get current recipe cost and calculate proportion
    const subRecipe = await getRecipe(item.subRecipeId!)
    const costPerUnit = subRecipe.totalCost / subRecipe.generatedAmount
    return item.quantity * costPerUnit
  }
}

// Total items cost (ingredients + sub-recipes)
const itemsCosts = await Promise.all(recipe.recipeItems.map(calculateItemCost))
const totalItemsCost = itemsCosts.reduce((sum, cost) => sum + cost, 0)

// Labor cost calculation
const totalTimeHours = recipe.preparationTime / 60
const laborCost = totalTimeHours * settings.laborHourRate

// Total recipe cost
const totalCost = totalItemsCost + laborCost

// Cost per serving
const costPerServing = totalCost / recipe.servings

// Portion size calculation
const portionSize = recipe.generatedAmount / recipe.servings

// Suggested price with margin
const margin = settings.marginsByCategory[recipe.category] || settings.defaultMargin
const suggestedPrice = costPerServing * (margin / 100)
```

### Time Calculation Rules
```typescript
// Preparation time is automatically calculated from steps
const preparationTime = recipe.instructions.reduce((total, step) => {
  return total + step.timeMinutes
}, 0)

// Update recipe preparation time when steps change
const updateRecipeTime = (recipe: Recipe) => {
  recipe.preparationTime = recipe.instructions.reduce((total, step) => 
    total + step.timeMinutes, 0
  )
}
```

### Circular Dependency Prevention
```typescript
// Check for circular dependencies when adding sub-recipes
const checkCircularDependency = async (recipeId: string, subRecipeId: string): Promise<boolean> => {
  const visited = new Set<string>()
  
  const hasCircularDep = async (currentId: string, targetId: string): Promise<boolean> => {
    if (currentId === targetId) return true
    if (visited.has(currentId)) return false
    
    visited.add(currentId)
    const recipe = await getRecipe(currentId)
    
    for (const item of recipe.recipeItems) {
      if (item.type === 'recipe' && await hasCircularDep(item.subRecipeId!, targetId)) {
        return true
      }
    }
    
    return false
  }
  
  return await hasCircularDep(subRecipeId, recipeId)
}
```

### Recipe Scaling
```typescript
const scaleRecipe = (recipe: Recipe, scaleFactor: number): Recipe => {
  return {
    ...recipe,
    // Scale generated amounts and servings
    generatedAmount: recipe.generatedAmount * scaleFactor,
    servings: Math.round(recipe.servings * scaleFactor),
    portionSize: recipe.portionSize, // remains the same per portion
    
    // Scale recipe items (ingredients + sub-recipes)
    recipeItems: recipe.recipeItems.map(item => ({
      ...item,
      quantity: item.quantity * scaleFactor
    })),
    
    // Time usually doesn't scale linearly - keep original preparation time
    // preparationTime: recipe.preparationTime, // no scaling for time
    
    // Costs will be recalculated based on new quantities
  }
}
```

### Recipe Integration Rules
- **Real-time pricing**: Use current ingredient and sub-recipe prices for calculations
- **Availability check**: Validate ingredient and sub-recipe availability
- **Unit compatibility**: Ensure recipe units match ingredient/sub-recipe units
- **Circular dependency prevention**: Block recipes that would create circular references
- **Sub-recipe linking**: Hyperlinks to navigate between related recipes
- **Cost propagation**: Live calculation when displaying details (not in lists)

## Technical Implementation

### API Endpoints
```typescript
// Recipes CRUD
GET    /api/recipes              // List all recipes
POST   /api/recipes              // Create new recipe
GET    /api/recipes/:id          // Get recipe details
PUT    /api/recipes/:id          // Update recipe
DELETE /api/recipes/:id          // Soft delete recipe
POST   /api/recipes/:id/duplicate // Duplicate recipe

// Recipe calculations
POST   /api/recipes/:id/scale    // Scale recipe to different batch size
GET    /api/recipes/:id/cost     // Get detailed cost breakdown
PUT    /api/recipes/settings     // Update recipe settings (labor rate, margins)

// Recipe analysis
GET    /api/recipes/analytics    // Recipe cost analytics
GET    /api/recipes/popular      // Most used recipes
```

### Database Schema
```sql
-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  -- Generated amounts and servings
  generated_amount DECIMAL(10,3) NOT NULL DEFAULT 1, -- e.g., 600 for 600g
  generated_unit VARCHAR(20) NOT NULL DEFAULT 'g', -- g, kg, ml, l, etc.
  servings INTEGER NOT NULL DEFAULT 1, -- how many portions
  portion_size DECIMAL(10,3) GENERATED ALWAYS AS (generated_amount / servings) STORED,
  -- Time (calculated from steps)
  preparation_time INTEGER NOT NULL DEFAULT 0, -- minutes, sum of step times
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
  -- Calculated costs
  total_cost DECIMAL(10,2) DEFAULT 0, -- calculated field
  cost_per_serving DECIMAL(10,2) DEFAULT 0, -- calculated field
  labor_cost DECIMAL(10,2) DEFAULT 0, -- calculated field
  suggested_price DECIMAL(10,2) DEFAULT 0, -- calculated field
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255) NOT NULL DEFAULT 'admin'
);

-- Recipe items table (unified ingredients and sub-recipes)
CREATE TABLE recipe_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('ingredient', 'recipe')),
  -- For ingredients
  ingredient_id UUID REFERENCES ingredients(id),
  ingredient_name VARCHAR(255), -- denormalized
  -- For sub-recipes
  sub_recipe_id UUID REFERENCES recipes(id),
  sub_recipe_name VARCHAR(255), -- denormalized
  -- Common fields
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0, -- calculated from current price
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Ensure proper foreign key constraints
  CONSTRAINT valid_ingredient CHECK (
    (item_type = 'ingredient' AND ingredient_id IS NOT NULL AND sub_recipe_id IS NULL) OR
    (item_type = 'recipe' AND sub_recipe_id IS NOT NULL AND ingredient_id IS NULL)
  )
);

-- Recipe steps table
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  instruction TEXT NOT NULL,
  time_minutes INTEGER DEFAULT 0,
  notes TEXT
);

-- Recipe settings table
CREATE TABLE recipe_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_hour_rate DECIMAL(10,2) NOT NULL DEFAULT 25.00, -- R$/hour
  default_margin DECIMAL(5,2) NOT NULL DEFAULT 150.00, -- percentage
  margins_by_category JSONB, -- category-specific margins
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_active ON recipes(is_active);
CREATE INDEX idx_recipe_items_recipe ON recipe_items(recipe_id);
CREATE INDEX idx_recipe_items_ingredient ON recipe_items(ingredient_id);
CREATE INDEX idx_recipe_items_sub_recipe ON recipe_items(sub_recipe_id);
CREATE INDEX idx_recipe_items_type ON recipe_items(item_type);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);

-- Add circular dependency prevention function
CREATE OR REPLACE FUNCTION prevent_circular_recipe_dependency()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-reference
  IF NEW.recipe_id = NEW.sub_recipe_id THEN
    RAISE EXCEPTION 'Recipe cannot reference itself';
  END IF;
  
  -- Additional circular dependency check would be implemented in application logic
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_circular_dependency
  BEFORE INSERT OR UPDATE ON recipe_items
  FOR EACH ROW
  WHEN (NEW.item_type = 'recipe')
  EXECUTE FUNCTION prevent_circular_recipe_dependency();
```

### State Management (Zustand)
```typescript
interface RecipeStore {
  // State
  recipes: Recipe[]
  currentRecipe: Recipe | null
  settings: RecipeSettings
  loading: boolean
  error: string | null
  filters: {
    search: string
    category: RecipeCategory | null
    difficulty: RecipeDifficulty | null
  }

  // Actions
  fetchRecipes: () => Promise<void>
  fetchRecipe: (id: string) => Promise<void>
  createRecipe: (data: CreateRecipeData) => Promise<void>
  updateRecipe: (id: string, data: UpdateRecipeData) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  duplicateRecipe: (id: string) => Promise<void>
  scaleRecipe: (id: string, factor: number) => Promise<Recipe>
  updateSettings: (settings: Partial<RecipeSettings>) => Promise<void>
  calculateCosts: (recipe: Recipe) => Recipe
  setFilters: (filters: Partial<RecipeStore['filters']>) => void
  clearError: () => void
}
```

## Component Structure

```
src/features/recipes/
├── components/
│   ├── RecipesList.tsx             # Main recipes list
│   ├── RecipeCard.tsx              # Recipe card component
│   ├── RecipeDetail.tsx            # Recipe detail view
│   ├── RecipeForm.tsx              # Create/edit recipe form
│   ├── IngredientsBuilder.tsx      # Ingredients section builder
│   ├── InstructionsBuilder.tsx     # Instructions section builder
│   ├── CostCalculator.tsx          # Cost breakdown component
│   ├── RecipeScaler.tsx            # Recipe scaling modal
│   └── RecipeSettings.tsx          # Settings configuration
├── hooks/
│   ├── useRecipes.ts               # Recipes data management
│   ├── useRecipeForm.ts            # Form state management
│   ├── useCostCalculation.ts       # Cost calculation logic
│   └── useRecipeScaling.ts         # Recipe scaling logic
├── services/
│   └── recipesApi.ts               # API service layer
├── types/
│   └── recipe.types.ts             # TypeScript definitions
└── utils/
    ├── recipeValidation.ts         # Form validation
    ├── costCalculations.ts         # Cost calculation utilities
    └── recipeScaling.ts            # Recipe scaling utilities
```

## Cost Calculation Features

### Real-time Cost Updates
```typescript
const useCostCalculation = (recipe: Recipe) => {
  const [costs, setCosts] = useState<CostBreakdown>()
  
  useEffect(() => {
    const calculateCosts = async () => {
      // Get current ingredient prices
      const ingredientPrices = await getIngredientPrices(
        recipe.ingredients.map(i => i.ingredientId)
      )
      
      // Calculate ingredient costs
      const ingredientCost = recipe.ingredients.reduce((total, ingredient) => {
        const price = ingredientPrices[ingredient.ingredientId] || 0
        return total + (ingredient.quantity * price)
      }, 0)
      
      // Calculate labor cost
      const laborCost = (recipe.totalTime / 60) * settings.laborHourRate
      
      // Calculate totals
      const totalCost = ingredientCost + laborCost
      const costPerServing = totalCost / recipe.servings
      
      setCosts({
        ingredientCost,
        laborCost,
        totalCost,
        costPerServing,
        suggestedPrice: costPerServing * (settings.defaultMargin / 100)
      })
    }
    
    calculateCosts()
  }, [recipe, settings])
  
  return costs
}
```

### Margin Management
- **Category-specific margins**: Different margins per recipe type
- **Dynamic margin adjustment**: Easy margin updates
- **Profit analysis**: Show profit amount and percentage
- **Competitive pricing**: Compare with market prices

## User Experience Features

### Recipe Builder
- **Drag-and-drop ingredients**: Easy ingredient ordering
- **Auto-complete ingredient search**: Quick ingredient selection
- **Unit conversion helpers**: Convert between compatible units
- **Step reordering**: Drag-and-drop instruction steps
- **Rich text editor**: Formatting for instructions

### Cost Visualization
- **Cost breakdown charts**: Visual cost distribution
- **Price comparison**: Compare recipe costs
- **Margin indicators**: Visual margin representation
- **Cost trends**: Historical cost changes

### Mobile Optimization
- **Responsive forms**: Touch-friendly recipe building
- **Swipe navigation**: Navigate between recipe sections
- **Voice input**: Voice-to-text for instructions
- **Camera integration**: Photo capture for recipe steps

## Integration Points

### Ingredients System
- **Automatic cost updates**: Recalculate when ingredient prices change
- **Availability validation**: Check ingredient stock levels
- **Substitution suggestions**: Suggest ingredient alternatives

### Products System
- **Product linking**: Link recipes to finished products
- **Batch calculations**: Scale recipes for production batches
- **Cost propagation**: Update product costs when recipe costs change

### Inventory System
- **Stock consumption**: Calculate ingredient usage
- **Production planning**: Plan ingredient purchases
- **Waste tracking**: Track recipe yield vs. expected

## Reporting and Analytics

### Cost Reports
- **Recipe profitability**: Most/least profitable recipes
- **Cost trends**: Recipe cost changes over time
- **Ingredient impact**: Most expensive ingredients by recipe
- **Labor analysis**: Labor cost distribution

### Production Reports
- **Popular recipes**: Most frequently made recipes
- **Seasonal analysis**: Recipe popularity by season
- **Efficiency metrics**: Actual vs. estimated preparation times

## Performance Optimization

### Data Loading
- **Lazy loading**: Load recipe details on demand
- **Pagination**: Paginate recipe lists
- **Caching**: Cache recipe data and calculations
- **Background sync**: Update costs in background

### Calculation Optimization
- **Memoization**: Cache calculation results
- **Debounced updates**: Avoid excessive recalculation
- **Batch processing**: Process multiple recipe updates together

## Testing Strategy

### Unit Tests
- Cost calculation functions
- Recipe scaling algorithms
- Validation logic
- Utility functions

### Integration Tests
- Complete recipe CRUD operations
- Cost calculation workflows
- Ingredient integration
- Settings management

### E2E Tests
- Full recipe creation workflow
- Recipe scaling and duplication
- Cost calculation accuracy
- Mobile responsive behavior

## Implementation Timeline

### Phase 1 (Week 1-2)
- Basic recipe CRUD operations
- Simple cost calculation
- Recipe list and detail views

### Phase 2 (Week 3-4)
- Advanced recipe builder
- Ingredient integration
- Cost breakdown features

### Phase 3 (Week 5-6)
- Recipe scaling functionality
- Analytics and reporting
- Mobile optimization

This comprehensive documentation provides complete guidance for implementing a professional recipe management system tailored for Momento Cake's bakery operations.