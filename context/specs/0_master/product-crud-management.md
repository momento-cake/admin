# Product CRUD Management System - Master Plan

## Feature Overview

Implement a comprehensive **Product Management System** (Produtos) for the Momento Cake Admin dashboard, enabling users to create and manage finished cake/bakery products with support for multiple recipes, dynamic categories/subcategories, packages, and intelligent SKU generation.

## Metadata

- **Platform**: Web (Next.js/React)
- **Complexity**: High
- **Effort Estimate**: 3-4 weeks
- **Priority**: Immediate Development
- **Timeline**: Next sprint

## Phase 1 Clarifications - Confirmed Requirements

### 1. Product Categories & Subcategories
- **Dynamic**: User-created hierarchical structure (category → subcategory)
- **Implementation**: Separate CRUD system for managing categories
- **Menu Entry**: New "Categorias de Produtos" submenu under Produtos
- **UI**: Single page for managing both categories and subcategories

### 2. Product-Recipe Relationship
- **Multiple Recipes**: Products can have multiple recipes
- **Quantity Type**: Portion-based (e.g., "2 portions of vanilla cake")
- **Flexibility**: Different recipes can be mixed (e.g., cake + filling + frosting)

### 3. Product-Package Relationship
- **Package Selection**: Optional - not all products require packages
- **Specification**: Track quantity amount for each package
- **Example**: "2x box model XYZ + 1x ribbon model ABC"

### 4. Pricing & Cost Analysis
- **Fixed Price**: Manual price setting by user
- **Cost Analysis**: Display:
  - Calculated cost from recipes + packages
  - Suggested price based on configured markup
  - Profit margin visualization
- **Pricing Strategy**: Cost breakdown from recipe library integration

### 5. Inventory & Stock
- **No Stock Tracking**: Products are catalog items only (like recipes)
- **Not Tracked**: No inventory management needed

### 6. Product Status
- **No Status Field**: All products are considered active
- **No Scheduling**: No availability scheduling needed
- **Soft Delete**: Use `isActive` flag for deletion (consistency with other entities)

### 7. Product Categories Management UI
- **Single Page**: Manage categories and subcategories together
- **CRUD Operations**: Full create, read, update, delete
- **No CSV Import**: Manual entry only
- **Navigation**: New "Categorias de Produtos" submenu entry

### 8. SKU Generation
- **Auto-Generated**: Format: `{CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT}`
- **Example**: `CAKE-VANILLA-001`, `CUPCAKE-CHOC-001`
- **Implementation**: Firestore counter pattern for auto-increment

### 9. Search & Filtering
- **Primary Filters**: Category, Subcategory, Search (name)
- **Optional**: Price range, recipe search
- **Consistency**: Reuse RecipeList layout pattern

### 10. Timeline
- **Priority**: Immediate development
- **Business Driver**: None specified (standard feature request)

## Problem Statement

The Momento Cake Admin system currently has **no product catalog management**. While it has recipe templates, ingredient inventory, and packaging management, there's no way to define **finished products** (cakes, cupcakes, specialty items) that can be sold to clients. This creates a gap between production recipes and client-facing offerings.

## Solution Overview

Create a comprehensive **Product Management Module** that:

1. **Defines Products**: Enable creation of finished goods with proper categorization
2. **Links Recipes**: Associate multiple recipes per product with specific portions
3. **Tracks Packaging**: Optionally assign packaging materials with quantities
4. **Intelligent SKUs**: Auto-generate unique product identifiers
5. **Cost Analysis**: Show product costs from recipes + packages with markup calculation
6. **Category Management**: Dynamic hierarchical categories for organization

## Affected Platforms

- **Web (Next.js)**: Primary implementation
- **Firestore**: Data storage with proper indexes and security rules
- **No Backend/Mobile/Infrastructure**: Changes limited to web frontend

## Feature Scope

### Core Features

1. **Product Management** (`/products/catalog`)
   - Full CRUD operations for products
   - Search and filtering (category, subcategory, name)
   - Bulk operations (future consideration)

2. **Product Categories** (`/products/categories`)
   - Manage product categories (main categories)
   - Manage product subcategories (nested under categories)
   - Single page with hierarchical view

3. **Product Details**
   - Basic Info: Name, Description, SKU (auto-generated)
   - Categorization: Category + Subcategory selection
   - Pricing: Fixed price + cost analysis with markup
   - Recipes: Multi-select with portion quantities
   - Packages: Optional multi-select with quantities
   - Metadata: Created by, created at, updated at

4. **Cost Analysis View**
   - Recipe costs breakdown (with portions)
   - Package costs breakdown
   - Total product cost
   - Suggested price (cost × markup)
   - Profit margin percentage

### Data Model Overview

```typescript
// Product entity
interface Product {
  id: string;
  name: string;
  description?: string;

  // Categorization
  categoryId: string;           // Reference to ProductCategory
  categoryName: string;         // Denormalized for display
  subcategoryId: string;        // Reference to ProductSubcategory
  subcategoryName: string;      // Denormalized for display

  // SKU (auto-generated)
  sku: string;                  // Format: CATEGORY_CODE-SUBCAT_CODE-AUTO_INCREMENT

  // Pricing
  price: number;                // Fixed selling price
  costPrice: number;            // Calculated from recipes + packages
  suggestedPrice: number;       // Calculated: costPrice × (1 + markup%)
  markup: number;               // % markup from config
  profitMargin: number;         // Calculated: (price - costPrice) / price

  // Recipes association
  productRecipes: ProductRecipeItem[];  // Can have multiple

  // Packaging association (optional)
  productPackages?: ProductPackageItem[];  // Optional

  // Metadata
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

interface ProductRecipeItem {
  id: string;
  recipeId: string;
  recipeName: string;           // Denormalized
  portions: number;             // How many portions of the recipe
  recipeCost: number;           // Calculated: recipe.costPerServing × portions
}

interface ProductPackageItem {
  id: string;
  packagingId: string;
  packagingName: string;        // Denormalized
  quantity: number;             // How many units needed
  packageCost: number;          // Calculated: packaging.currentPrice × quantity
}

interface ProductCategory {
  id: string;
  name: string;
  code: string;                 // For SKU generation (e.g., "CAKE")
  description?: string;
  displayOrder: number;         // For sorting
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

interface ProductSubcategory {
  id: string;
  categoryId: string;           // Parent category
  name: string;
  code: string;                 // For SKU generation (e.g., "VANILLA")
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;
}
```

### Firestore Collections & Structure

```
/products/
├── {productId}
│   ├── name: string
│   ├── description: string
│   ├── categoryId: string
│   ├── categoryName: string
│   ├── subcategoryId: string
│   ├── subcategoryName: string
│   ├── sku: string
│   ├── price: number
│   ├── costPrice: number
│   ├── suggestedPrice: number
│   ├── markup: number
│   ├── profitMargin: number
│   ├── productRecipes: array
│   │   └── {}: {recipeId, recipeName, portions, recipeCost}
│   ├── productPackages: array (optional)
│   │   └── {}: {packagingId, packagingName, quantity, packageCost}
│   ├── isActive: boolean
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   └── createdBy: string

/productCategories/
├── {categoryId}
│   ├── name: string
│   ├── code: string
│   ├── description: string
│   ├── displayOrder: number
│   ├── isActive: boolean
│   ├── createdAt: timestamp
│   └── createdBy: string

/productSubcategories/
├── {subcategoryId}
│   ├── categoryId: string
│   ├── name: string
│   ├── code: string
│   ├── description: string
│   ├── displayOrder: number
│   ├── isActive: boolean
│   ├── createdAt: timestamp
│   └── createdBy: string
```

### Firestore Indexes Required

```json
// New indexes to add to firestore.indexes.json

{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "name", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "categoryId", "order": "ASCENDING"},
    {"fieldPath": "name", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "products",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "categoryId", "order": "ASCENDING"},
    {"fieldPath": "subcategoryId", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "productCategories",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "displayOrder", "order": "ASCENDING"}
  ]
},
{
  "collectionGroup": "productSubcategories",
  "queryScope": "COLLECTION",
  "fields": [
    {"fieldPath": "categoryId", "order": "ASCENDING"},
    {"fieldPath": "isActive", "order": "ASCENDING"},
    {"fieldPath": "displayOrder", "order": "ASCENDING"}
  ]
}
```

### Firestore Security Rules

```javascript
// Add to firestore.rules

// Products collection
match /products/{document=**} {
  allow read: if request.auth != null && request.auth.token.isAdmin == true;
  allow create, update, delete: if request.auth != null && request.auth.token.isAdmin == true;
}

// Product Categories collection
match /productCategories/{document=**} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null && request.auth.token.isAdmin == true;
}

// Product Subcategories collection
match /productSubcategories/{document=**} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null && request.auth.token.isAdmin == true;
}
```

## Implementation Phases

### Phase 1: Foundation & Data Models (Week 1)
- Create TypeScript types and Firestore schema
- Implement category/subcategory data models
- Set up validators using Zod
- Create Firestore indexes and security rules
- Implement basic CRUD functions (lib layer)

### Phase 2: Category Management UI (Week 1)
- Build ProductCategoryForm component
- Build ProductSubcategoryForm component
- Build ProductCategoryList component (hierarchical view)
- Integrate with Sidebar navigation
- Create `/products/categories` page

### Phase 3: Product CRUD - Core (Week 2)
- Build ProductForm component (basic fields)
- Build ProductList component (reuse RecipeList pattern)
- Create API routes for CRUD operations
- Create `/products` and `/products/[id]/edit` pages
- Implement search and filtering

### Phase 4: Product CRUD - Advanced Features (Week 2)
- Implement recipe selection modal with portion inputs
- Implement package selection modal with quantity inputs
- Build cost analysis display component
- Implement SKU generation logic
- Auto-calculate costs and suggested prices

### Phase 5: Integration & Polish (Week 3)
- Integrate cost analysis with recipe library
- Test all relationships (products → recipes → ingredients)
- Implement proper error handling
- Add loading states and validation feedback
- Optimize performance (lazy loading, caching)

### Phase 6: Testing & QA (Week 3-4)
- Unit tests for utility functions
- Component integration tests
- E2E tests for complete workflows
- Performance testing
- Cross-browser testing

## Step-by-Step Implementation Tasks

### Phase 1: Foundation & Data Models

1. **Create Product Types** (`src/types/product.ts`)
   - Define Product interface
   - Define ProductRecipeItem interface
   - Define ProductPackageItem interface
   - Define ProductCategory interface
   - Define ProductSubcategory interface
   - Define filter types

2. **Create Product Validators** (`src/lib/validators/product.ts`)
   - productValidation (Zod schema)
   - productCategoryValidation
   - productSubcategoryValidation
   - recipeItemValidation
   - packageItemValidation

3. **Create Product Library** (`src/lib/products.ts`)
   - fetchProducts(filters: ProductFilters)
   - fetchProduct(id: string)
   - createProduct(data: CreateProductData)
   - updateProduct(data: UpdateProductData)
   - deleteProduct(id: string)
   - fetchProductCategories()
   - createProductCategory(data: CreateCategoryData)
   - updateProductCategory(data: UpdateCategoryData)
   - deleteProductCategory(id: string)
   - fetchProductSubcategories(categoryId: string)
   - createProductSubcategory(data: CreateSubcategoryData)
   - updateProductSubcategory(data: UpdateSubcategoryData)
   - deleteProductSubcategory(id: string)
   - generateSKU(categoryCode: string, subcategoryCode: string)
   - calculateProductCost(product: Product)
   - calculateSuggestedPrice(costPrice: number, markup: number)

4. **Update Firestore Config**
   - Add product-related indexes to `firestore.indexes.json`
   - Update `firestore.rules` with product collection rules

### Phase 2: Category Management UI

1. **Create ProductCategoryForm** (`src/components/products/ProductCategoryForm.tsx`)
   - Form fields: name, code, description, displayOrder
   - Submit handler with validation
   - Edit/create modes
   - Error handling and success feedback

2. **Create ProductSubcategoryForm** (`src/components/products/ProductSubcategoryForm.tsx`)
   - Form fields: categoryId, name, code, description, displayOrder
   - Parent category selector
   - Submit handler with validation
   - Error handling

3. **Create ProductCategoryList** (`src/components/products/ProductCategoryList.tsx`)
   - Hierarchical display (categories with subcategories)
   - Action buttons (edit, delete, add subcategory)
   - Confirmation dialogs for deletion
   - Empty state
   - Reuse design patterns from RecipeList

4. **Update Sidebar Navigation** (`src/components/layout/Sidebar.tsx`)
   - Add "Produtos" menu section (if not exists)
   - Add "Categorias de Produtos" submenu item → `/products/categories`
   - Add "Produtos" submenu item → `/products`
   - Maintain active state indicators

5. **Create Categories Page** (`src/app/(dashboard)/products/categories/page.tsx`)
   - Page layout with header
   - ProductCategoryList component
   - Modal for creating categories
   - Modal for creating/editing subcategories
   - Loading and error states

### Phase 3: Product CRUD - Core

1. **Create ProductForm** (`src/components/products/ProductForm.tsx`)
   - Basic fields section:
     - Name (required, text)
     - Description (optional, textarea)
     - SKU (read-only, auto-generated)
     - Price (required, currency)
   - Categorization section:
     - Category dropdown (required)
     - Subcategory dropdown (required, filtered by category)
   - Metadata display:
     - Created by, Created at, Updated at
   - Submit/Cancel buttons
   - Loading and error states

2. **Create ProductList** (`src/components/products/ProductList.tsx`)
   - Reuse RecipeList layout pattern
   - Columns: Name, Category/Subcategory, SKU, Price, Cost, Margin, Actions
   - Search input (by name)
   - Filter dropdowns: Category, Subcategory
   - "Add Product" button
   - Edit/View/Delete actions
   - Empty state
   - Pagination (if needed)

3. **Create API Routes**
   - `src/app/api/products/route.ts` (GET list, POST create)
   - `src/app/api/products/[id]/route.ts` (GET, PUT, DELETE)
   - `src/app/api/products/categories/route.ts` (GET list, POST)
   - `src/app/api/products/categories/[id]/route.ts` (GET, PUT, DELETE)
   - `src/app/api/products/subcategories/route.ts` (GET by categoryId, POST)
   - Proper error handling and validation
   - Authentication checks (admin only for write)

4. **Create Products Page** (`src/app/(dashboard)/products/page.tsx`)
   - Page layout with header and description
   - ProductList component
   - Loading and error states
   - Add Product button → create modal

5. **Create Product Edit Page** (`src/app/(dashboard)/products/[id]/edit/page.tsx`)
   - Page layout with breadcrumb
   - ProductForm component (edit mode)
   - Load existing product data
   - Show cost analysis
   - Loading and error states

6. **Create Product Create Page** (`src/app/(dashboard)/products/new/page.tsx`)
   - Page layout with breadcrumb
   - ProductForm component (create mode)
   - Initialize with empty data
   - Pre-fill category if coming from categories page

### Phase 4: Product CRUD - Advanced Features

1. **Create RecipeSelector Modal** (`src/components/products/RecipeSelector.tsx`)
   - Modal that allows multi-select recipes
   - List recipes with search/filter
   - For each selected recipe: input field for portions
   - Display recipe details: name, category, cost per serving
   - Calculate total cost for recipe selection
   - Save/Cancel buttons
   - Validation: at least one recipe required

2. **Create PackageSelector Modal** (`src/components/products/PackageSelector.tsx`)
   - Modal for optional package selection
   - List available packages with search
   - For each selected package: input field for quantity
   - Display package details: name, category, price
   - Calculate total cost for packages
   - Save/Cancel buttons (optional selection)

3. **Create CostAnalysis Component** (`src/components/products/CostAnalysis.tsx`)
   - Breakdown section:
     - Recipe costs (list each with portions × cost)
     - Package costs (list each with quantity × cost)
     - Total cost
   - Pricing section:
     - Fixed selling price
     - Suggested price (from markup)
     - Profit margin percentage
     - Markup configuration display
   - Visual breakdown (pie chart or table)

4. **Enhance ProductForm**
   - Add recipes selection (button → RecipeSelector modal)
   - Add packages selection (button → PackageSelector modal)
   - Integrate CostAnalysis component
   - Add markup percentage selector (from config)
   - Auto-update costs when recipes/packages change
   - Validation: ensure recipes selected

5. **Implement SKU Generation**
   - Auto-generate on category/subcategory selection
   - Format: `{CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT}`
   - Counter pattern in Firestore
   - Re-generate on save if category changed
   - Display as read-only field

6. **Enhance ProductList**
   - Show cost and profit margin columns
   - Color-code profit margins (red/yellow/green)
   - Add cost analysis view action
   - Show recipe/package count in tooltip
   - Quick filters for margin ranges

### Phase 5: Integration & Polish

1. **Cost Calculation Integration**
   - Hook into recipe library for real-time costs
   - Hook into packaging library for real-time costs
   - Update suggested price when recipes/packages change
   - Cache cost calculations for performance

2. **Error Handling**
   - Handle missing recipes/packages gracefully
   - Handle deleted categories (soft delete cascade)
   - Handle Firestore permission errors
   - User-friendly error messages

3. **Loading & Performance**
   - Lazy load recipe list in selector
   - Lazy load package list in selector
   - Debounce search inputs
   - Pagination for large product lists
   - Optimize Firestore queries

4. **User Feedback**
   - Loading spinners for async operations
   - Success toasts for CRUD operations
   - Validation error messages
   - Empty states with helpful messages
   - Confirmation dialogs for destructive actions

5. **Accessibility**
   - Proper ARIA labels
   - Keyboard navigation
   - Tab order management
   - Error announcements

### Phase 6: Testing & QA

1. **Unit Tests** (`src/__tests__/lib/products.test.ts`)
   - Test SKU generation
   - Test cost calculations
   - Test suggested price calculations
   - Test filter logic

2. **Component Tests** (`src/__tests__/components/products.test.tsx`)
   - Test ProductForm validation
   - Test ProductList rendering
   - Test modal interactions
   - Test cost analysis display

3. **E2E Tests** (`tests/products.spec.ts`)
   - Test complete product creation flow
   - Test product editing flow
   - Test product deletion flow
   - Test category management flow
   - Test search and filtering
   - Test cost analysis calculation

4. **Manual Testing**
   - Test all form validations
   - Test SKU uniqueness
   - Test cost calculations with real data
   - Test Firestore permission enforcement
   - Test cross-browser compatibility

## File Structure

```
src/
├── types/
│   └── product.ts                                    # Product types
├── lib/
│   ├── products.ts                                   # CRUD functions
│   └── validators/
│       └── product.ts                                # Zod schemas
├── components/
│   └── products/
│       ├── ProductForm.tsx                           # Create/edit form
│       ├── ProductList.tsx                           # List view
│       ├── ProductCategoryForm.tsx                   # Category form
│       ├── ProductSubcategoryForm.tsx                # Subcategory form
│       ├── ProductCategoryList.tsx                   # Category list
│       ├── RecipeSelector.tsx                        # Recipe modal
│       ├── PackageSelector.tsx                       # Package modal
│       └── CostAnalysis.tsx                          # Cost breakdown
├── app/
│   ├── (dashboard)/
│   │   └── products/
│   │       ├── page.tsx                              # Product list page
│   │       ├── new/
│   │       │   └── page.tsx                          # Create product
│   │       ├── [id]/
│   │       │   └── edit/
│   │       │       └── page.tsx                      # Edit product
│   │       └── categories/
│   │           └── page.tsx                          # Manage categories
│   └── api/
│       └── products/
│           ├── route.ts                              # Products CRUD
│           ├── [id]/
│           │   └── route.ts                          # Single product
│           ├── categories/
│           │   ├── route.ts                          # Categories CRUD
│           │   └── [id]/
│           │       └── route.ts                      # Single category
│           └── subcategories/
│               ├── route.ts                          # Subcategories CRUD
│               └── [id]/
│                   └── route.ts                      # Single subcategory
└── __tests__/
    ├── lib/
    │   └── products.test.ts                          # Unit tests
    └── components/
        └── products.test.tsx                         # Component tests

tests/
└── products.spec.ts                                  # E2E tests
```

## Testing Strategy

### Unit Tests
- SKU generation with various category/subcategory combinations
- Cost calculations from recipes and packages
- Suggested price calculations with different markups
- Product filter logic
- Validation schemas

### Component Tests
- ProductForm submission and validation
- ProductList rendering and interactions
- Modal open/close behavior
- Cost analysis calculations
- Category hierarchy display

### E2E Tests
- Create product with recipes and packages
- Edit product and verify updates
- Delete product (soft delete)
- Search and filter products
- Create/update/delete categories
- Verify cost calculations end-to-end
- Test permission enforcement

### Edge Cases
- Products with no packages (optional)
- Products with duplicate recipes
- Invalid SKU scenarios
- Circular recipe dependencies (already handled in recipes)
- Soft-deleted category handling

## Acceptance Criteria

1. **Product Management**
   - ✅ Users can create products with name, category, subcategory, price
   - ✅ Users can view list of products with search and filtering
   - ✅ Users can edit existing products
   - ✅ Users can delete products (soft delete)
   - ✅ SKU auto-generated in format: `{CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT}`

2. **Recipe Integration**
   - ✅ Users can associate multiple recipes per product
   - ✅ Users can specify portion quantity for each recipe
   - ✅ Product cost calculated from recipes (portions × cost per serving)
   - ✅ Cost updates when recipe costs change

3. **Package Integration**
   - ✅ Users can optionally associate packages per product
   - ✅ Users can specify quantity for each package
   - ✅ Product cost includes package costs
   - ✅ All products work without packages (optional)

4. **Cost Analysis**
   - ✅ Cost breakdown visible: recipes + packages = total cost
   - ✅ Suggested price calculated: cost × (1 + markup%)
   - ✅ Profit margin percentage displayed
   - ✅ Costs update in real-time as recipes/packages change

5. **Category Management**
   - ✅ Users can create product categories
   - ✅ Users can create subcategories under categories
   - ✅ Categories used for SKU generation (category code)
   - ✅ Hierarchical view showing categories and subcategories
   - ✅ Can edit and delete categories

6. **UI/UX Consistency**
   - ✅ Product list uses same layout as RecipeList component
   - ✅ Forms follow same pattern as existing CRUD forms
   - ✅ Colors and typography consistent with design system
   - ✅ Loading states and empty states properly implemented
   - ✅ Error messages user-friendly and actionable

7. **Data Integrity & Security**
   - ✅ Firestore security rules enforce admin-only writes
   - ✅ Proper indexes created for all queries
   - ✅ Soft delete implemented (isActive flag)
   - ✅ Timestamps tracked (createdAt, updatedAt)
   - ✅ User audit trail (createdBy)

8. **Performance**
   - ✅ List view loads within 2 seconds
   - ✅ Search results update smoothly with debouncing
   - ✅ Modal interactions snappy and responsive
   - ✅ No unnecessary Firestore queries
   - ✅ Proper pagination for large product lists

## Validation Commands

### Build & Lint
```bash
npm run build
npm run lint
npm run type-check
```

### Test Execution
```bash
# Unit and component tests
npm run test

# E2E tests
npm run test:e2e -- tests/products.spec.ts

# Specific test file
npx jest src/__tests__/lib/products.test.ts
npx jest src/__tests__/components/products.test.tsx
```

### Firestore Deployment
```bash
# Deploy firestore.indexes.json
firebase deploy --only firestore:indexes

# Deploy firestore.rules
firebase deploy --only firestore:rules
```

### Manual Verification Checklist
- [ ] Navigate to `/products` and create a new product
- [ ] Verify SKU auto-generates correctly
- [ ] Add multiple recipes with different portions
- [ ] Add packages and verify costs calculate
- [ ] Edit the product and verify all fields persist
- [ ] Delete the product and verify it shows in deleted state
- [ ] Navigate to `/products/categories` and create categories
- [ ] Create subcategories under parent category
- [ ] Edit and delete categories
- [ ] Verify non-admin users cannot access product management
- [ ] Test search and filters on product list
- [ ] Test cost analysis display for accuracy

## Dependencies & Resources

### Existing Libraries Used
- Next.js 14+ (app router)
- React 18+ (hooks)
- Firestore (database)
- Firebase Auth (authentication)
- TailwindCSS (styling)
- Shadcn/ui (components)
- React Hook Form (forms)
- Zod (validation)

### Related Documentation
- Recipe Management: `src/lib/recipes.ts`, `src/types/recipe.ts`
- Packaging Management: `src/lib/packaging.ts`, `src/types/packaging.ts`
- Form Patterns: `src/components/recipes/RecipeForm.tsx`
- List Patterns: `src/components/recipes/RecipeList.tsx`
- Firestore Config: `firestore.indexes.json`, `firestore.rules`

## Future Enhancements

1. **Bulk Operations**
   - Import products from CSV
   - Export products to CSV/PDF
   - Bulk price updates

2. **Advanced Features**
   - Recipe substitutions
   - Seasonal availability
   - Client-specific pricing
   - Product variants (size, customization options)

3. **Integration Features**
   - Link products to orders
   - Product sales tracking
   - Popular products analytics
   - Stock reservation for orders

4. **Optimization**
   - Real-time cost syncing
   - Cost forecasting
   - Supplier price impact analysis
   - Margin optimization suggestions

## Notes & Considerations

### Design Decisions
1. **Flat Category Structure**: Initially using simple category/subcategory, can extend to deeper hierarchy later
2. **Denormalized Data**: Storing category names in product for faster reads, handling updates with batch operations
3. **Soft Deletes**: Using `isActive` flag for deletion to maintain history and prevent data loss
4. **SKU Auto-Generation**: Using Firestore counter pattern for thread-safe increments

### Performance Optimizations
1. Lazy load recipe/package selectors to avoid loading all items upfront
2. Debounce search inputs to reduce Firestore queries
3. Cache cost calculations where possible
4. Use proper indexes for all frequently queried fields

### Security Considerations
1. All write operations restricted to admin users only
2. Viewers can only read products
3. Firestore rules enforce this at database level
4. User audit trail maintained (createdBy field)

### Backward Compatibility
1. No breaking changes to existing recipe system
2. No changes to ingredient system
3. Packaging integration is additive
4. Can be deployed independently

