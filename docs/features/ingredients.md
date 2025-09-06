# Ingredients Management Feature

## Overview

The Ingredients Management system allows Momento Cake to manage their inventory of ingredients, track pricing from suppliers, and maintain accurate cost calculations for recipes. This is a core feature for recipe costing and pricing optimization.

## Business Requirements

### Core Features
1. **List all ingredients** - Complete inventory overview
2. **Add new ingredient** - Register new inventory items
3. **View ingredient details** - Detailed ingredient information
4. **Edit ingredients** - Update ingredient information
5. **Delete ingredients** - Remove unused ingredients (soft delete)
6. **Vendor management** - Link ingredients to suppliers
7. **Inventory tracking** - Current stock levels and updates
8. **Price history** - Track ingredient cost changes over time

### Advanced Features
9. **Inventory adjustments** - Add/remove stock with purchase tracking
10. **Price history analytics** - Inflation tracking and cost analysis
11. **Reorder alerts** - Low stock notifications (future enhancement)

## Data Models

### Ingredient Model
```typescript
interface Ingredient {
  id: string
  name: string
  description?: string
  unit: IngredientUnit
  currentPrice: number
  currentStock: number
  minStock: number
  vendorId?: string
  category: IngredientCategory
  allergens: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

enum IngredientUnit {
  KILOGRAM = 'kg',
  GRAM = 'g',
  LITER = 'l',
  MILLILITER = 'ml',
  UNIT = 'unit',
  PACKAGE = 'package'
}

enum IngredientCategory {
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
  OTHER = 'other'
}
```

### Purchase History Model
```typescript
interface PurchaseRecord {
  id: string
  ingredientId: string
  vendorId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  purchaseDate: Date
  notes?: string
}
```

## User Interface Requirements

### Ingredients List Screen
- **Header**: "Ingredientes" with add ingredient button
- **Search/Filter**: Search by name, filter by category/vendor
- **List Items**: Display name, current price, stock level, vendor
- **Actions**: View details, edit, delete (soft)
- **Stock Indicators**: Color-coded stock levels (green/yellow/red)

### Add/Edit Ingredient Screen
- **Basic Info**: Name, description, category
- **Units**: Unit type selection with validation
- **Pricing**: Current price input with currency (R$)
- **Stock**: Current stock and minimum stock levels
- **Vendor**: Vendor selection dropdown
- **Allergens**: Multi-select allergen tags

### Ingredient Detail Screen
- **Overview**: All ingredient information
- **Stock History**: Recent stock changes
- **Price History**: Price changes over time with chart
- **Actions**: Edit, delete, add stock

## Business Rules

### Stock Management
- **Low stock**: Alert when current stock ≤ minimum stock
- **Critical stock**: Alert when current stock ≤ minimum stock × 0.5
- **Out of stock**: When current stock = 0
- **Stock updates**: Track all changes with timestamp and reason

### Price Management
- **Price history**: Maintain complete price change log
- **Price alerts**: Notify when price changes > 20% from previous
- **Cost calculations**: Support recipe costing with current prices
- **Currency**: All prices in Brazilian Real (R$)

### Unit Handling
- **Weight/Volume**: Support fractional quantities (0.5kg, 1.2L)
- **Package units**: Support package quantities (1 pack of 12 eggs)
- **No conversions**: Use specific unit as registered
- **Validation**: Ensure quantity formats match unit types

### Vendor Integration
- **Vendor linking**: Each ingredient can have a preferred vendor
- **Purchase tracking**: Track purchases per vendor for price history
- **Vendor performance**: Track price trends by vendor (future)

## Technical Implementation

### API Endpoints
```typescript
// Ingredients CRUD
GET    /api/ingredients           // List all ingredients
POST   /api/ingredients           // Create new ingredient
GET    /api/ingredients/:id       // Get ingredient details
PUT    /api/ingredients/:id       // Update ingredient
DELETE /api/ingredients/:id       // Soft delete ingredient

// Stock management
POST   /api/ingredients/:id/stock // Update stock levels
GET    /api/ingredients/:id/history // Get price/stock history

// Bulk operations
POST   /api/ingredients/bulk      // Bulk update prices
```

### Database Schema (PostgreSQL)
```sql
-- Ingredients table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL,
  current_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  min_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
  vendor_id UUID REFERENCES vendors(id),
  category VARCHAR(50) NOT NULL,
  allergens TEXT[], -- Array of allergen strings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase history table
CREATE TABLE purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_ingredients_name ON ingredients(name);
CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_active ON ingredients(is_active);
CREATE INDEX idx_purchase_records_ingredient ON purchase_records(ingredient_id);
CREATE INDEX idx_purchase_records_date ON purchase_records(purchase_date);
```

### State Management (Zustand)
```typescript
interface IngredientStore {
  // State
  ingredients: Ingredient[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    category: IngredientCategory | null
    vendorId: string | null
  }
  
  // Actions
  fetchIngredients: () => Promise<void>
  createIngredient: (data: CreateIngredientData) => Promise<void>
  updateIngredient: (id: string, data: UpdateIngredientData) => Promise<void>
  deleteIngredient: (id: string) => Promise<void>
  updateStock: (id: string, quantity: number, notes?: string) => Promise<void>
  setFilters: (filters: Partial<IngredientStore['filters']>) => void
  clearError: () => void
}
```

## Component Structure

### React Components
```
src/features/ingredients/
├── components/
│   ├── IngredientsList.tsx         # Main list component
│   ├── IngredientCard.tsx          # Individual ingredient card
│   ├── IngredientForm.tsx          # Add/edit form
│   ├── IngredientDetail.tsx        # Detail view
│   ├── StockIndicator.tsx          # Stock level indicator
│   ├── PriceHistory.tsx            # Price history chart
│   └── InventoryModal.tsx          # Stock update modal
├── hooks/
│   ├── useIngredients.ts           # Ingredients data hook
│   ├── useIngredientForm.ts        # Form handling hook
│   └── useStockManagement.ts       # Stock operations hook
├── services/
│   └── ingredientsApi.ts           # API service layer
├── types/
│   └── ingredient.types.ts         # TypeScript types
└── utils/
    ├── ingredientValidation.ts     # Form validation
    └── stockCalculations.ts        # Stock calculations
```

## Validation Rules

### Form Validation
```typescript
const ingredientValidation = {
  name: {
    required: "Nome do ingrediente é obrigatório",
    minLength: { value: 2, message: "Nome deve ter pelo menos 2 caracteres" },
    maxLength: { value: 100, message: "Nome deve ter no máximo 100 caracteres" }
  },
  currentPrice: {
    required: "Preço é obrigatório",
    min: { value: 0, message: "Preço deve ser positivo" },
    pattern: { value: /^\d+(\.\d{1,2})?$/, message: "Formato de preço inválido" }
  },
  currentStock: {
    min: { value: 0, message: "Estoque deve ser positivo ou zero" }
  },
  minStock: {
    min: { value: 0, message: "Estoque mínimo deve ser positivo ou zero" }
  }
}
```

## User Experience Features

### Visual Indicators
- **Stock levels**: Green (sufficient), Yellow (low), Red (critical)
- **Price changes**: Up/down arrows with percentage change
- **Vendor status**: Active/inactive vendor indicators
- **Recent updates**: Highlight recently modified ingredients

### Interactive Elements
- **Quick stock update**: Modal for rapid stock adjustments
- **Bulk price updates**: Update multiple ingredient prices
- **Search and filtering**: Real-time search with category filters
- **Sort options**: Sort by name, price, stock level, last updated

### Mobile Optimization
- **Responsive cards**: Stack nicely on mobile devices
- **Touch-friendly**: Large touch targets for mobile users
- **Swipe actions**: Swipe for quick actions (edit, delete)
- **Bottom navigation**: Easy thumb access on mobile

## Integration Points

### Recipe System Integration
- **Cost calculations**: Provide current prices for recipe costing
- **Ingredient selection**: Available ingredients for recipe builder
- **Stock validation**: Check availability for production planning

### Vendor System Integration
- **Preferred vendors**: Link ingredients to preferred suppliers
- **Purchase tracking**: Record purchases and update prices
- **Vendor performance**: Track pricing trends by vendor

### Reporting Integration
- **Cost analysis**: Ingredient cost trends over time
- **Usage reports**: Most/least used ingredients
- **Purchase planning**: Reorder recommendations

## Performance Considerations

### Data Loading
- **Pagination**: Load ingredients in pages of 50
- **Virtual scrolling**: For large ingredient lists
- **Search optimization**: Debounced search queries
- **Caching**: Cache ingredient data for offline use

### Memory Management
- **Lazy loading**: Load details only when needed
- **Image optimization**: Compress ingredient images
- **Data cleanup**: Remove unused data from state

## Testing Strategy

### Unit Tests
- Ingredient validation functions
- Stock calculation utilities
- API service methods
- Custom hooks logic

### Integration Tests
- Full CRUD operations
- Stock update workflows
- Search and filtering
- Form submission flows

### E2E Tests
- Complete ingredient management workflow
- Mobile responsive behavior
- Error handling scenarios

## Implementation Timeline

### Phase 1 (Week 1-2)
- Basic CRUD operations
- Ingredient list and forms
- Database schema and API

### Phase 2 (Week 3-4)  
- Stock management features
- Price history tracking
- Search and filtering

### Phase 3 (Week 5-6)
- Advanced analytics
- Mobile optimization
- Performance optimization

This comprehensive documentation provides all necessary information for implementing a robust ingredient management system specifically tailored for Momento Cake's single-company operations.