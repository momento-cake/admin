# Master Plan: Packaging Management Feature (Embalagens)

**Document ID:** `packaging-management-feature`
**Status:** Planning
**Priority:** Medium
**Complexity:** Medium
**Effort:** 3-4 sprints (40-50 story points)

---

## Phase 1: Requirements Analysis & Clarification

### Clarifications Received

1. **Data Model & Fields**: Replicate ingredient pattern with packaging-specific fields
   - Name (Embalagem)
   - Brand (Marca)
   - Quantity per package (Qt Embalagem)
   - Unit of measurement (Un. Medida)
   - Price per package (Preço Embalagem)
   - Current stock level
   - Minimum stock threshold

2. **Stock Management**: Use same pattern as ingredients
   - Stock level tracking (current, minimum)
   - Stock alerts/warnings
   - Stock movement history
   - Purchase history via supplier tracking

3. **Menu Structure**: Follow existing project patterns
   - Subpath-based navigation: `/packaging/inventory`, `/packaging/[id]`, `/packaging/new`
   - Add "Embalagens" submenu item under "Produtos" menu
   - Automatic menu expansion and active state management

4. **Access Control**:
   - Admin-only: create, update, delete operations
   - Viewers: read-only access

5. **Integration**: No bulk operations, CSV import, or custom supplier list
   - Use existing suppliers system
   - CRUD operations only

---

## Feature Overview

### Problem Statement
The Momento Cake Admin system needs a dedicated packaging management module to track and manage all non-product packaging materials (boxes, cake boards, cake toppers, carriers, etc.). Currently, packaging items are not properly tracked, leading to inventory gaps and procurement inefficiencies.

### Solution
Implement a comprehensive Packaging Management feature that replicates the proven patterns from the Ingredients module, providing:
- Complete CRUD operations for packaging items
- Real-time stock level monitoring with alert thresholds
- Supplier integration for procurement tracking
- Stock history and price history for audit trails
- Role-based access control (admin edit, viewer read-only)

### Scope

**In Scope:**
- List all packaging items with search/filter capabilities
- Create new packaging item with form validation
- Edit existing packaging items
- Delete packaging items (soft delete, mark as inactive)
- Stock management with level indicators
- Stock history tracking
- Price history tracking via supplier purchases
- Supplier integration (existing system)
- Admin-only edit/delete, viewer read-only

**Out of Scope:**
- Bulk import/export operations
- Barcode/QR code generation
- Batch operations
- Custom supplier list (use existing suppliers)
- Advanced analytics or forecasting

---

## Architecture Overview

### Database Schema

**Firestore Collections**

#### `packaging` (Main collection)
```typescript
{
  id: string;                    // Firestore doc ID
  name: string;                  // Packaging name (e.g., "Caixa nº 5 alta")
  description?: string;          // Optional notes
  brand?: string;                // Brand/manufacturer (e.g., "Silver Plast")
  unit: PackagingUnit;          // Unit of measurement (unit, box, set, etc.)
  measurementValue: number;      // Quantity per package unit
  currentPrice: number;          // Current price in R$
  supplierId?: string;           // Reference to supplier
  currentStock: number;          // Current stock quantity
  minStock: number;              // Minimum stock threshold
  isActive: boolean;             // Soft delete flag
  category?: string;             // Optional: box, base, topper, carrier, etc.
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;             // User UID
}
```

#### `packaging_stock_history` (Stock movement tracking)
```typescript
{
  id: string;
  packagingId: string;
  type: 'adjustment' | 'purchase' | 'usage' | 'waste' | 'correction';
  quantity: number;
  previousStock: number;
  newStock: number;
  supplierId?: string;
  unitCost?: number;
  notes?: string;
  reason?: string;
  createdAt: Timestamp;
  createdBy: string;
}
```

#### `packaging_price_history` (Price tracking)
```typescript
{
  id: string;
  packagingId: string;
  price: number;
  supplierId: string;
  quantity: number;
  notes?: string;
  createdAt: Timestamp;
  createdBy: string;
}
```

### Type Definitions

Create `src/types/packaging.ts` following ingredient patterns:
- `Packaging` interface (main type)
- `PackagingUnit` enum (unit, box, set, etc.)
- `PackagingCategory` enum (optional categorization)
- `CreatePackagingData` (form input type)
- `UpdatePackagingData` (form input type)
- Stock and price history types
- Filter types

### Validation Schema

Create `src/lib/validators/packaging.ts` with Zod schemas:
- `packagingValidation` - Main CRUD validation
- `updatePackagingValidation` - Update with optional fields
- `stockUpdateValidation` - Stock movement validation
- `createPriceHistoryValidation` - Price tracking validation
- Helper validation functions

### Firebase Integration

Create `src/lib/packaging.ts` with functions:
- `fetchPackaging()` - Get all active packaging
- `fetchPackagingItem(id)` - Get single item
- `createPackaging(data)` - Create new item
- `updatePackaging(data)` - Update existing item
- `deletePackaging(id)` - Soft delete item
- `updatePackagingStock(id, data)` - Stock management
- `fetchStockHistory(id)` - Get stock movements
- `fetchPriceHistory(id)` - Get price history
- Utility functions for formatting and status display

### UI Components

#### Core Components
- `PackagingList` - Data table with all items
- `PackagingForm` - Create/edit form in dialog
- `StockManager` - Stock adjustment modal
- `StockLevelIndicator` - Visual stock status badge
- `PackagingCard` - Card view alternative (optional)

#### Supporting Components
- `PackagingDetailScreen` - Detail view with stock/price history
- `LoadMoreButton` - Pagination support
- Filters/Search bar
- Empty state templates

---

## Navigation & Menu Updates

### Sidebar Navigation

Update `src/components/layout/Sidebar.tsx`:
- Add "Embalagens" submenu item under "Produtos" section
- Icon: `Package` or similar
- href: `/packaging/inventory`
- Automatic expansion when on `/packaging/*` routes

```
Produtos
  ├── Receitas → /recipes
  ├── Ingredientes → /ingredients/inventory
  ├── Fornecedores → /ingredients/suppliers
  ├── Embalagens → /packaging/inventory          [NEW]
  └── Análise de Custos → /recipes/costs
```

---

## URL Structure

```
/packaging                          (root, redirect to inventory)
/packaging/inventory                (list all packaging items)
/packaging/[id]                     (detail view, optional)
/packaging/new                      (create new, optional)
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
1. Create type definitions (`src/types/packaging.ts`)
2. Create validation schemas (`src/lib/validators/packaging.ts`)
3. Create Firebase integration library (`src/lib/packaging.ts`)
4. Update sidebar navigation with Embalagens menu item
5. Set up project file structure
6. Create Firestore security rules for packaging collection

**Deliverable:** Database schema ready, types defined, basic CRUD functions

### Phase 2: UI Components (Weeks 2-3)
1. Create basic UI components structure
2. Build `PackagingList` component with data table
3. Build `PackagingForm` component (create/edit)
4. Build `StockManager` modal component
5. Build supporting UI utilities
6. Implement form validation and error handling

**Deliverable:** Reusable components ready for page integration

### Phase 3: Page Implementation (Weeks 3-4)
1. Create `/packaging/inventory` page
2. Integrate list, form, and stock manager components
3. Implement CRUD operations
4. Add stock history display (optional)
5. Add price history display (optional)
6. Implement role-based access control

**Deliverable:** Fully functional packaging management page

### Phase 4: Testing & Refinement (Week 4-5)
1. Write unit tests for Firebase functions
2. Write component tests for UI components
3. Write E2E tests for user workflows
4. Performance optimization
5. Bug fixes and refinements
6. Documentation updates

**Deliverable:** Comprehensive test coverage, production-ready code

---

## Acceptance Criteria

### Feature Complete When:
- [ ] Users can view all packaging items in a sortable, searchable table
- [ ] Admins can create new packaging items via modal form
- [ ] Admins can edit existing packaging items
- [ ] Admins can delete (soft-delete) packaging items
- [ ] Stock levels display with color-coded status indicators (good/low/critical/out)
- [ ] Admins can adjust stock levels with audit trail
- [ ] Stock movement history is tracked and visible
- [ ] Price history is tracked via supplier purchases
- [ ] Sidebar shows "Embalagens" menu item under Produtos
- [ ] Menu auto-expands when on `/packaging/*` routes
- [ ] Active state highlights correctly on current page
- [ ] Viewers can view all data but cannot edit
- [ ] Admins can edit and delete with appropriate permissions
- [ ] Form validation works correctly
- [ ] All data persists to Firestore correctly
- [ ] Stock status calculations accurate (good/low/critical/out)
- [ ] E2E tests cover critical user flows
- [ ] Loading states and error messages implemented
- [ ] Responsive design works on mobile/tablet/desktop

---

## Testing Strategy

### Unit Tests
- Packaging CRUD functions
- Stock status calculation utilities
- Price/stock formatting utilities
- Validation schemas

### Component Tests
- PackagingList rendering and interactions
- PackagingForm validation and submission
- StockManager form submission
- Stock indicator display logic

### E2E Tests
- Create new packaging item flow
- Edit packaging item flow
- Delete packaging item flow
- Stock adjustment flow
- View stock history
- User permissions (admin vs viewer)

### Test Coverage Target: 80%+

---

## Performance Considerations

- Paginate packaging list (50 items per page initially)
- Index Firestore queries on `isActive`, `name`
- Cache supplier list in context/state
- Lazy load detailed views
- Optimize image assets if any
- Monitor query performance in Firestore

---

## Security Considerations

- Firestore security rules restrict non-admin writes
- Viewer role limited to read operations
- Validate all inputs on client and server
- Audit trail via `createdBy`, timestamps
- Soft delete preserves data history
- No sensitive supplier data exposure

---

## Firestore Indexes

### Required Indexes for Performance

To ensure optimal query performance, the following composite indexes must be created in Firebase Console or via deployment configuration.

#### 1. Packaging Collection Indexes

**Index 1: List active packaging by name**
- Collection: `packaging`
- Fields:
  - `isActive` (Ascending)
  - `name` (Ascending)
- Purpose: Primary listing query for all active packaging items

**Index 2: Search active packaging by stock status**
- Collection: `packaging`
- Fields:
  - `isActive` (Ascending)
  - `currentStock` (Descending) - for stock filtering
  - `minStock` (Ascending)
- Purpose: Filter packages by stock status (good/low/critical/out)

**Index 3: Filter by supplier**
- Collection: `packaging`
- Fields:
  - `isActive` (Ascending)
  - `supplierId` (Ascending)
  - `name` (Ascending)
- Purpose: Find all packaging from specific supplier

**Index 4: Price range queries**
- Collection: `packaging`
- Fields:
  - `isActive` (Ascending)
  - `currentPrice` (Ascending)
  - `name` (Ascending)
- Purpose: Support price-based filtering in future

#### 2. Stock History Indexes

**Index 5: Stock history by package**
- Collection: `packaging_stock_history`
- Fields:
  - `packagingId` (Ascending)
  - `createdAt` (Descending)
- Purpose: Retrieve recent stock movements for a packaging item

**Index 6: Stock movements by type**
- Collection: `packaging_stock_history`
- Fields:
  - `packagingId` (Ascending)
  - `type` (Ascending)
  - `createdAt` (Descending)
- Purpose: Filter stock history by movement type (purchase/usage/waste)

**Index 7: Supplier purchases**
- Collection: `packaging_stock_history`
- Fields:
  - `supplierId` (Ascending)
  - `type` (Ascending) - filter for 'purchase' type
  - `createdAt` (Descending)
- Purpose: Track supplier purchase history

#### 3. Price History Indexes

**Index 8: Price history by package**
- Collection: `packaging_price_history`
- Fields:
  - `packagingId` (Ascending)
  - `createdAt` (Descending)
- Purpose: Retrieve pricing trends for a packaging item

**Index 9: Supplier pricing**
- Collection: `packaging_price_history`
- Fields:
  - `supplierId` (Ascending)
  - `packagingId` (Ascending)
  - `createdAt` (Descending)
- Purpose: Compare prices from different suppliers

### Firestore Index Deployment

#### Option 1: Firebase Console (Manual)
1. Go to Firebase Console → Firestore Database → Indexes
2. Create composite index for each index above
3. Wait for index to build (usually 5-10 minutes)

#### Option 2: Firestore Indexes File (Infrastructure as Code)

Create `firestore.indexes.json` in project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "currentStock",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "minStock",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "isActive",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "currentPrice",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "name",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "type",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_stock_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "type",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_price_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "packaging_price_history",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "supplierId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "packagingId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Deploy with: `firebase deploy --only firestore:indexes`

---

## Firestore Security Rules

```javascript
// Packaging collection rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /packaging/{document=**} {
      // Admins can read/write everything
      allow read, write: if request.auth.token.role == 'admin';
      // Viewers can only read
      allow read: if request.auth.token.role == 'viewer';
    }

    match /packaging_stock_history/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }

    match /packaging_price_history/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
  }
}
```

---

## Platform-Specific Implementation Plans

### Web Implementation
See: `context/specs/web/packaging-management-feature.md`

---

## Key Differences from Ingredients Module

1. **Categories**: Packaging has optional category (box, base, topper, etc.) vs ingredients required category
2. **Units**: Packaging uses simpler units (unit, box, set) vs complex metric units
3. **Price Tracking**: Simpler - just purchase price via supplier, no complex cost analysis
4. **Stock Management**: Similar pattern but simpler tracking (no recipe integration)
5. **Allergen Info**: Not applicable to packaging (removed field)

---

## Success Metrics

1. **User Adoption**: 100% of admin users using feature within 2 weeks
2. **Data Quality**: All packaging items have minimum required fields
3. **Stock Accuracy**: Stock levels maintained with <5% error margin
4. **Performance**: Page loads in <2 seconds with 1000 items
5. **Uptime**: 99.9% availability
6. **User Satisfaction**: >4/5 rating in feedback

---

## Risk Assessment

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| High volume of packaging items | Low | Medium | Pagination, lazy loading, indexing |
| Concurrent stock updates | Low | High | Transaction-based updates, audit trail |
| User data entry errors | High | Low | Form validation, constraints, help text |
| Performance degradation | Low | High | Monitoring, optimization, testing |

---

## Future Enhancements (Out of Scope)

1. Bulk CSV import of packaging items
2. Barcode/QR code generation and scanning
3. Batch price updates across multiple items
4. Reorder suggestions based on usage patterns
5. Integration with delivery/pickup system
6. Packaging cost analysis per product
7. Supplier performance metrics
8. Stock forecasting based on historical data

---

## Glossary

- **Embalagens**: Packaging materials (Portuguese)
- **Estoque**: Stock/Inventory
- **Fornecedor**: Supplier
- **Soft Delete**: Mark as inactive instead of deleting from database
- **Stock Status**: Condition indicator (good/low/critical/out)
- **Audit Trail**: Historical record of changes

---

## Documents

- **Master Plan**: This document
- **Web Implementation Plan**: `context/specs/web/packaging-management-feature.md`
- **Type Definitions**: `src/types/packaging.ts` (to be created)
- **Validation**: `src/lib/validators/packaging.ts` (to be created)
- **Firebase Integration**: `src/lib/packaging.ts` (to be created)
- **Components**: `src/components/packaging/*` (to be created)
- **Pages**: `src/app/(dashboard)/packaging/*` (to be created)
