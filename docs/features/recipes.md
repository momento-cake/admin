# Recipes Management Feature

## Overview

The Recipes Management system enables Momento Cake to document all recipes, calculate precise costs including ingredients and labor, and manage the production process. This feature is central to pricing strategy and production planning.

## Business Requirements

### Core Features
1. **List all recipes** - Complete recipe catalog
2. **View recipe details** - Full recipe information with costs
3. **Create new recipe** - Recipe builder with ingredients and steps
4. **Edit existing recipe** - Update recipes and recalculate costs
5. **Delete recipes** - Remove unused recipes (soft delete)
6. **Cost calculation** - Automatic cost calculation with ingredient prices
7. **Labor cost tracking** - Include preparation time costs

### Recipe Components
- **Ingredients list** - Required ingredients with quantities
- **Preparation steps** - Step-by-step instructions with time estimates
- **Recipe scaling** - Calculate for different batch sizes
- **Cost breakdown** - Detailed cost analysis per ingredient
- **Final pricing** - Suggested selling price with margins

## Data Models

### Recipe Model
```typescript
interface Recipe {
  id: string
  name: string
  description?: string
  category: RecipeCategory
  servings: number
  preparationTime: number // minutes
  cookingTime: number // minutes
  totalTime: number // calculated field
  difficulty: RecipeDifficulty
  ingredients: RecipeIngredient[]
  instructions: RecipeStep[]
  notes?: string
  totalCost: number // calculated field
  costPerServing: number // calculated field
  laborCost: number // calculated field
  suggestedPrice: number // calculated field
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface RecipeIngredient {
  ingredientId: string
  ingredientName: string // denormalized for display
  quantity: number
  unit: string
  cost: number // calculated from current ingredient price
  notes?: string
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
- **Recipe Info**: Name, category, difficulty, servings, times
- **Cost Summary**: Total cost, cost per serving, suggested price
- **Ingredients Section**: List with quantities, units, and individual costs
- **Instructions Section**: Numbered steps with time estimates
- **Actions**: Edit, duplicate, delete, scale recipe

### Recipe Form Screen (Create/Edit)
- **Basic Info**: Name, description, category, difficulty
- **Servings & Time**: Servings count, prep time, cooking time
- **Ingredients Builder**: 
  - Add ingredients from inventory
  - Set quantities with unit validation
  - Real-time cost calculation
- **Instructions Builder**:
  - Add/reorder preparation steps
  - Set time estimates per step
  - Rich text formatting for instructions
- **Cost Preview**: Live cost calculation as ingredients are added

## Business Rules

### Cost Calculation Logic
```typescript
// Total ingredient cost
const ingredientCost = recipe.ingredients.reduce((total, ingredient) => {
  return total + (ingredient.quantity * ingredient.unitPrice)
}, 0)

// Labor cost calculation
const totalTimeHours = recipe.totalTime / 60
const laborCost = totalTimeHours * settings.laborHourRate

// Total recipe cost
const totalCost = ingredientCost + laborCost

// Cost per serving
const costPerServing = totalCost / recipe.servings

// Suggested price with margin
const margin = settings.marginsByCategory[recipe.category] || settings.defaultMargin
const suggestedPrice = costPerServing * (margin / 100)
```

### Recipe Scaling
- **Proportional scaling**: Scale all ingredients proportionally
- **Non-linear ingredients**: Special handling for yeast, salt, baking powder
- **Time adjustments**: Preparation time scales, cooking time may not
- **Equipment limitations**: Consider mixer/oven capacity limits

### Ingredient Integration
- **Real-time pricing**: Use current ingredient prices for calculations
- **Availability check**: Validate ingredient availability
- **Unit compatibility**: Ensure recipe units match ingredient units
- **Substitution notes**: Allow ingredient substitution notes

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
  servings INTEGER NOT NULL DEFAULT 1,
  preparation_time INTEGER NOT NULL DEFAULT 0, -- minutes
  cooking_time INTEGER NOT NULL DEFAULT 0, -- minutes
  total_time INTEGER GENERATED ALWAYS AS (preparation_time + cooking_time) STORED,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'medium',
  total_cost DECIMAL(10,2) DEFAULT 0, -- calculated field
  cost_per_serving DECIMAL(10,2) DEFAULT 0, -- calculated field
  labor_cost DECIMAL(10,2) DEFAULT 0, -- calculated field
  suggested_price DECIMAL(10,2) DEFAULT 0, -- calculated field
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe ingredients table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),
  ingredient_name VARCHAR(255) NOT NULL, -- denormalized
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  cost DECIMAL(10,2) NOT NULL, -- calculated from ingredient price
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
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
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_steps_recipe ON recipe_steps(recipe_id);
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