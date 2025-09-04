# Feature Documentation: Ingredient Management System

## Feature Overview

### Feature ID
`ingredient-management`

### Feature Name
Ingredient Management System

### Priority Level
**High Priority** - Core Feature

### Business Context
Manage ingredient inventory, track pricing from suppliers, and maintain accurate cost calculations for recipes. Critical for recipe costing functionality and pricing calculator.

## Data Models

### Ingredient Model (TypeScript)
```typescript
export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: IngredientUnit;
  currentPrice: number;
  supplierId?: string;
  lastUpdated: Date;
  minStock: number;
  currentStock: number;
  category: IngredientCategory;
  allergens: string[];
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
}

export enum IngredientUnit {
  KILOGRAM = 'kilogram',
  GRAM = 'gram',
  LITER = 'liter',
  MILLILITER = 'milliliter',
  UNIT = 'unit',
  POUND = 'pound',
  OUNCE = 'ounce',
  CUP = 'cup',
  TABLESPOON = 'tablespoon',
  TEASPOON = 'teaspoon'
}

export enum IngredientCategory {
  FLOUR = 'flour',
  SUGAR = 'sugar',
  DAIRY = 'dairy',
  EGGS = 'eggs',
  FATS = 'fats',
  LEAVENING = 'leavening',
  FLAVORING = 'flavoring',
  NUTS = 'nuts',
  FRUITS = 'fruits',
  CHOCOLATE = 'chocolate',
  SPICES = 'spices',
  PRESERVATIVES = 'preservatives',
  OTHER = 'other'
}
```

### Supplier Model (TypeScript)
```typescript
export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  rating: number;
  categories: string[];
  isActive: boolean;
  createdAt: Date;
}
```

## File Structure

```
src/
├── app/ingredients/
│   ├── page.tsx                    # Main ingredients list page
│   ├── [id]/
│   │   └── page.tsx               # Ingredient details page
│   └── new/
│       └── page.tsx               # New ingredient form
├── components/ingredients/
│   ├── IngredientCard.tsx         # Ingredient display card
│   ├── IngredientForm.tsx         # Create/edit ingredient form
│   ├── IngredientList.tsx         # Ingredients list component
│   ├── StockLevelIndicator.tsx    # Stock status indicator
│   └── UnitConverter.tsx          # Unit conversion utility
├── lib/
│   ├── ingredients.ts             # Ingredient API functions
│   ├── suppliers.ts               # Supplier API functions
│   └── validators/
│       └── ingredient.ts          # Validation schemas
└── types/
    └── ingredient.ts              # Type definitions
```

## Firestore Structure

```
ingredients/{ingredientId}
├── id: string
├── name: string
├── description: string
├── unit: string
├── currentPrice: number
├── supplierId: string
├── lastUpdated: timestamp
├── minStock: number
├── currentStock: number
├── category: string
├── allergens: array<string>
├── isActive: boolean
├── createdAt: timestamp
└── createdBy: string

suppliers/{supplierId}
├── id: string
├── name: string
├── contactPerson: string
├── phone: string
├── email: string
├── address: string
├── rating: number
├── categories: array<string>
├── isActive: boolean
└── createdAt: timestamp
```

## Core Features

### Phase 1: Basic CRUD Operations
- **Ingredient List**: Display all ingredients with search/filter
- **Add Ingredient**: Form to create new ingredients
- **Edit Ingredient**: Update existing ingredient details
- **Delete Ingredient**: Remove ingredients (soft delete)
- **Validation**: Client and server-side validation

### Phase 2: Advanced Features
- **Supplier Management**: CRUD operations for suppliers
- **Unit Conversion**: Convert between different measurement units
- **Stock Management**: Track current stock levels and minimum thresholds
- **Low Stock Alerts**: Visual indicators for low inventory
- **Search & Filter**: Filter by category, supplier, stock level

### Phase 3: Analytics & Integration
- **Cost History**: Track price changes over time
- **Usage Analytics**: Monitor ingredient consumption patterns
- **Supplier Performance**: Rate and track supplier reliability
- **Recipe Integration**: Link ingredients to recipes
- **Inventory Reports**: Generate cost and usage reports

## Validation Rules

```typescript
export const ingredientValidation = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  description: z.string().optional(),
  unit: z.nativeEnum(IngredientUnit),
  currentPrice: z.number().min(0, 'Price must be positive').max(999999.99, 'Price too high'),
  minStock: z.number().min(0, 'Minimum stock must be positive').optional(),
  currentStock: z.number().min(0, 'Current stock must be positive').optional(),
  category: z.nativeEnum(IngredientCategory),
  allergens: z.array(z.string()),
  supplierId: z.string().optional(),
});
```

## Business Rules

### Stock Management
- Low stock alert: `currentStock <= minStock`
- Critical stock: `currentStock <= minStock * 0.5`
- Out of stock: `currentStock = 0`

### Price Management
- Track price history for cost analysis
- Alert when price changes > 20% from previous
- Calculate average price over time periods

### Unit Conversion
- Convert between metric and imperial units
- Support recipe scaling calculations
- Maintain precision in conversions

## API Endpoints

```typescript
// GET /api/ingredients - List all ingredients
// POST /api/ingredients - Create new ingredient
// GET /api/ingredients/[id] - Get ingredient details
// PUT /api/ingredients/[id] - Update ingredient
// DELETE /api/ingredients/[id] - Delete ingredient

// GET /api/suppliers - List all suppliers
// POST /api/suppliers - Create new supplier
// GET /api/suppliers/[id] - Get supplier details
// PUT /api/suppliers/[id] - Update supplier
// DELETE /api/suppliers/[id] - Delete supplier
```

## UI Components

### IngredientCard
- Display ingredient name, current price, stock level
- Color-coded stock indicators (green/yellow/red)
- Quick actions: edit, delete, reorder

### IngredientForm
- Form fields for all ingredient properties
- Unit selector dropdown (shadcn/ui Select)
- Category selector
- Allergen multi-select
- Form validation with error messages

### StockLevelIndicator
- Visual indicator for stock levels
- Color coding: green (good), yellow (low), red (critical)
- Display actual numbers with thresholds

### UnitConverter
- Conversion between different units
- Real-time conversion display
- Support common baking measurements

## Security Rules

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /ingredients/{ingredientId} {
      allow read, write: if request.auth != null;
      allow create: if request.auth != null && validateIngredientData(request.resource.data);
      allow update: if request.auth != null && validateIngredientData(request.resource.data);
      allow delete: if request.auth != null;
    }
    
    match /suppliers/{supplierId} {
      allow read, write: if request.auth != null;
    }
  }
}

function validateIngredientData(data) {
  return data.keys().hasAll(['name', 'unit', 'currentPrice', 'createdAt']) &&
         data.name is string && data.name.size() > 0 &&
         data.currentPrice is number && data.currentPrice >= 0;
}
```

## Implementation Priority

1. **Core Models & Types** - Define TypeScript interfaces and enums
2. **Database Layer** - Implement Firestore operations and API routes
3. **Basic UI** - Create list, form, and detail components using shadcn/ui
4. **Validation** - Add client and server-side validation with Zod
5. **Advanced Features** - Implement supplier management, unit conversion
6. **Analytics** - Add cost tracking, usage reports, and performance metrics

## Testing Requirements

- Unit tests for validation functions and business logic
- Component tests for all UI components
- Integration tests for API endpoints
- E2E tests for complete user workflows

## Performance Considerations

- Implement pagination for large ingredient lists
- Use optimistic updates for better UX
- Cache frequently accessed data
- Optimize Firestore queries with proper indexing
- Implement search with proper debouncing