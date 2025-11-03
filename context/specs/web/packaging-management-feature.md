# Web Implementation Plan: Packaging Management Feature

**Document ID:** `packaging-management-feature-web`
**Platform:** Next.js + React + Firebase + Tailwind CSS
**Status:** Ready for Implementation
**Complexity:** Medium
**Estimated Effort:** 3-4 weeks

---

## Overview

This document details the web-specific implementation of the Packaging Management feature for the Momento Cake Admin dashboard. It follows established patterns from the Ingredients module and integrates with the existing Next.js/Firebase architecture.

**Reference Master Plan:** `context/specs/0_master/packaging-management-feature.md`

---

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with custom color scheme
- **Component Library**: Shadcn UI
- **Form Handling**: React Hook Form + Zod validation
- **Database**: Firebase Firestore
- **State Management**: React Context (local state via useState)
- **Data Fetching**: TanStack Query (if complex caching needed)

---

## File Structure

```
src/
├── types/
│   └── packaging.ts                          # TypeScript interfaces
├── lib/
│   ├── packaging.ts                          # Firebase CRUD operations
│   └── validators/
│       └── packaging.ts                      # Zod validation schemas
├── components/
│   └── packaging/
│       ├── PackagingList.tsx                 # Main data table
│       ├── PackagingForm.tsx                 # Create/Edit form
│       ├── PackagingCard.tsx                 # Card view (optional)
│       ├── StockManager.tsx                  # Stock adjustment modal
│       ├── StockLevelIndicator.tsx           # Status badge component
│       ├── PackagingDetailScreen.tsx         # Detail view (optional)
│       └── LoadMoreButton.tsx                # Pagination
└── app/
    └── (dashboard)/
        └── packaging/
            ├── layout.tsx
            ├── page.tsx                      # /packaging/inventory
            ├── [id]/
            │   └── page.tsx                  # /packaging/[id] (optional)
            └── new/
                └── page.tsx                  # /packaging/new (optional)
```

---

## Type Definitions (src/types/packaging.ts)

```typescript
// Main Packaging type
interface Packaging {
  id: string;
  name: string;
  description?: string;
  brand?: string;
  unit: PackagingUnit;
  measurementValue: number;
  currentPrice: number;
  supplierId?: string;
  currentStock: number;
  minStock: number;
  isActive: boolean;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Enum for units
enum PackagingUnit {
  UNIT = 'unit',           // Unidade individual
  BOX = 'box',             // Caixa
  SET = 'set',             // Conjunto
  DOZEN = 'dozen'          // Dúzia
}

// Optional category enum
enum PackagingCategory {
  BOX = 'box',             // Caixas para embalagem
  BASE = 'base',           // Bases/boards
  TOPPER = 'topper',       // Toppers
  CARRIER = 'carrier',     // Caixas de transporte
  WRAPPER = 'wrapper',     // Envolventes
  OTHER = 'other'
}

// Stock and price history types (similar to ingredients)
interface StockHistoryEntry {
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
  createdAt: Date;
  createdBy: string;
}

interface PriceHistoryEntry {
  id: string;
  packagingId: string;
  price: number;
  supplierId: string;
  quantity: number;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

// Form types
type CreatePackagingData = Omit<Packaging, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'isActive'>;
type UpdatePackagingData = Partial<CreatePackagingData> & { id: string };
```

---

## Validation Schemas (src/lib/validators/packaging.ts)

```typescript
import { z } from 'zod';
import { PackagingUnit, PackagingCategory } from '@/types/packaging';

export const packagingValidation = z.object({
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter menos de 100 caracteres')
    .trim(),
  description: z.string().optional(),
  brand: z.string()
    .max(100, 'Marca deve ter menos de 100 caracteres')
    .trim()
    .optional(),
  unit: z.nativeEnum(PackagingUnit),
  measurementValue: z.number()
    .min(0.001, 'Valor deve ser maior que zero')
    .max(999999.99, 'Valor muito alto'),
  currentPrice: z.number()
    .min(0, 'Preço deve ser positivo')
    .max(999999.99, 'Preço muito alto'),
  supplierId: z.string().min(1, 'Fornecedor é obrigatório'),
  minStock: z.number()
    .min(0, 'Estoque mínimo deve ser positivo'),
  currentStock: z.number()
    .min(0, 'Estoque atual deve ser positivo'),
  category: z.nativeEnum(PackagingCategory).optional()
});

export const updatePackagingValidation = packagingValidation.partial().extend({
  id: z.string().min(1, 'ID é obrigatório')
});

export const stockUpdateValidation = z.object({
  quantity: z.number()
    .min(0.01, 'Quantidade deve ser maior que zero')
    .max(999999.99, 'Quantidade muito alta'),
  type: z.enum(['adjustment', 'purchase', 'usage', 'waste', 'correction']),
  notes: z.string().max(500, 'Observações muito longas').optional(),
  reason: z.string().max(200, 'Motivo muito longo').optional(),
  supplierId: z.string().optional(),
  unitCost: z.number().min(0).optional()
}).refine((data) => {
  if (data.type === 'purchase' && (!data.unitCost || data.unitCost <= 0)) {
    return false;
  }
  return true;
}, {
  message: 'Custo unitário é obrigatório para compras',
  path: ['unitCost']
});

// Export inferred types
export type PackagingFormData = z.infer<typeof packagingValidation>;
export type UpdatePackagingFormData = z.infer<typeof updatePackagingValidation>;
export type StockUpdateData = z.infer<typeof stockUpdateValidation>;
```

---

## Firebase Integration (src/lib/packaging.ts)

Key functions to implement (follow ingredient.ts pattern):

```typescript
// CRUD Operations
export async function fetchPackaging(filters?: PackagingFilters): Promise<Packaging[]>
export async function fetchPackagingItem(id: string): Promise<Packaging>
export async function createPackaging(data: CreatePackagingData): Promise<Packaging>
export async function updatePackaging(data: UpdatePackagingData): Promise<Packaging>
export async function deletePackaging(id: string): Promise<void>

// Stock Management
export async function updatePackagingStock(packageId: string, data: StockUpdateData): Promise<any>
export async function fetchStockHistory(packageId: string, limit?: number): Promise<StockHistoryEntry[]>

// Price Tracking
export async function createPriceHistory(data: CreatePriceHistoryData): Promise<PriceHistoryEntry>
export async function fetchPriceHistory(packageId: string, limit?: number): Promise<PriceHistoryResponse>

// Utility Functions
export function getStockStatus(currentStock: number, minStock: number): StockStatus
export function getStockStatusColor(status: StockStatus): string
export function getStockStatusText(status: StockStatus): string
export function formatPrice(price: number): string
export function formatStock(quantity: number): string
export function getUnitDisplayName(unit: PackagingUnit): string
export function getCategoryDisplayName(category: PackagingCategory): string
```

---

## React Components

### 1. PackagingList Component

**File**: `src/components/packaging/PackagingList.tsx`

**Purpose**: Display all packaging items in a data table with sorting, filtering, and actions

**Key Features**:
- Data table (shadcn Table component)
- Search by name, brand, or category
- Sort by name, price, stock level
- Filter by stock status (good/low/critical/out)
- Pagination (50 items per page)
- Action buttons (view, edit, delete, manage stock)
- Stock indicator with visual badges
- Loading and error states
- Empty state with helpful message

**Props**:
```typescript
interface PackagingListProps {
  onPackagingCreate: () => void;
  onPackagingEdit: (packaging: Packaging) => void;
  onPackagingView: (packaging: Packaging) => void;
  onPackagingDelete: (packaging: Packaging) => void;
  onRefresh: () => void;
}
```

### 2. PackagingForm Component

**File**: `src/components/packaging/PackagingForm.tsx`

**Purpose**: Form for creating and editing packaging items

**Key Features**:
- React Hook Form integration
- Zod validation schema
- Field-level validation feedback
- Supplier dropdown (fetched from existing suppliers)
- Optional category selection
- Unit of measurement selector
- Price input with BRL formatting
- Stock level inputs (current and minimum)
- Rich error messages in Portuguese
- Cancel and Submit buttons
- Loading state during submission

**Props**:
```typescript
interface PackagingFormProps {
  packaging?: Packaging;  // If provided, editing mode; if not, creating mode
  onSubmit: (data: PackagingFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}
```

### 3. StockManager Component

**File**: `src/components/packaging/StockManager.tsx`

**Purpose**: Modal for adjusting stock levels with audit trail

**Key Features**:
- Stock adjustment types (adjustment, purchase, usage, waste, correction)
- Quantity input with validation
- Supplier selection (required for purchase type)
- Unit cost input (required for purchase)
- Notes/reason text area
- Visual confirmation of changes (before/after stock)
- Stock history display (last 10 movements)
- Loading and error states

**Props**:
```typescript
interface StockManagerProps {
  packaging: Packaging;
  onStockUpdated: (updatedPackaging: Packaging) => void;
  suppliers: Array<{ id: string; name: string }>;
}
```

### 4. StockLevelIndicator Component

**File**: `src/components/packaging/StockLevelIndicator.tsx`

**Purpose**: Visual indicator of stock status

**Key Features**:
- Color-coded badge (green/yellow/red/gray)
- Stock status label (Bom/Baixo/Crítico/Sem estoque)
- Optional percentage display (current vs minimum)
- Tooltip with detailed info on hover

**Props**:
```typescript
interface StockLevelIndicatorProps {
  currentStock: number;
  minStock: number;
  showPercentage?: boolean;
}
```

### 5. PackagingDetailScreen Component (Optional)

**File**: `src/components/packaging/PackagingDetailScreen.tsx`

**Purpose**: Detailed view of a single packaging item with history

**Key Features**:
- Full packaging information display
- Stock history table
- Price history table
- Edit and Delete buttons
- Back button
- Stock status badge
- Supplier information link

### 6. Supporting Components

- **LoadMoreButton**: For pagination
- **Empty State Templates**: When no packaging items exist
- **Error Boundary**: For error handling
- **Filter Bar**: Search and filter controls

---

## Page Routes

### /packaging/inventory (Main List Page)

**File**: `src/app/(dashboard)/packaging/page.tsx`

**Purpose**: Main packaging management interface

**Structure**:
```typescript
export default function PackagingPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showStockManager, setShowStockManager] = useState(false);
  const [selectedPackaging, setSelectedPackaging] = useState<Packaging | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Handler methods (similar to ingredient page):
  // - handleCreatePackaging()
  // - handleEditPackaging()
  // - handleDeletePackaging()
  // - handleSubmitCreate()
  // - handleSubmitEdit()
  // - handleManageStock()
  // - handleStockUpdated()
  // - loadSuppliers()

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold">Sistema de Embalagens</h1>
        <p className="text-muted-foreground">
          Gerencie seu catálogo completo de embalagens e controle de estoque
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Inventário de Embalagens</CardTitle>
          <CardDescription>
            Gerencie embalagens para pickup e delivery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PackagingList
            onPackagingCreate={handleCreatePackaging}
            onPackagingEdit={handleEditPackaging}
            onPackagingView={handleViewPackaging}
            onPackagingDelete={handleDeletePackaging}
            onRefresh={handleRefreshPackaging}
            key={refreshTrigger}
          />
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Nova Embalagem</DialogTitle>
          </DialogHeader>
          <PackagingForm
            onSubmit={handleSubmitCreate}
            onCancel={handleCancelForm}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Embalagem</DialogTitle>
          </DialogHeader>
          {selectedPackaging && (
            <PackagingForm
              packaging={selectedPackaging}
              onSubmit={handleSubmitEdit}
              onCancel={handleCancelForm}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Stock Manager Dialog */}
      <Dialog open={showStockManager} onOpenChange={setShowStockManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPackaging
                ? `Gerenciar Estoque - ${selectedPackaging.name}`
                : 'Gerenciar Estoque'
              }
            </DialogTitle>
          </DialogHeader>
          {selectedPackaging && (
            <StockManager
              packaging={selectedPackaging}
              onStockUpdated={handleStockUpdated}
              suppliers={suppliers}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

---

## Sidebar Navigation Update

**File**: `src/components/layout/Sidebar.tsx`

Update the `navigation` array to include packaging:

```typescript
{
  name: 'Produtos',
  icon: Package,
  roles: ['admin', 'viewer'],
  hasSubmenu: true,
  submenu: [
    {
      name: 'Receitas',
      href: '/recipes',
      icon: ChefHat
    },
    {
      name: 'Ingredientes',
      href: '/ingredients/inventory',
      icon: Package
    },
    {
      name: 'Fornecedores',
      href: '/ingredients/suppliers',
      icon: Truck
    },
    {
      name: 'Embalagens',           // NEW
      href: '/packaging/inventory',  // NEW
      icon: Box                      // NEW
    },
    {
      name: 'Análise de Custos',
      href: '/recipes/costs',
      icon: DollarSign
    }
  ]
}
```

Import the `Box` icon from lucide-react.

---

## Form Layout & UX

### Packaging Form Fields

```
Column 1:
- [ ] Name (required, text input)
- [ ] Description (optional, textarea)
- [ ] Brand (optional, text input)

Column 2:
- [ ] Unit (required, dropdown: unit/box/set/dozen)
- [ ] Measurement Value (required, number)
- [ ] Category (optional, dropdown)

Column 3:
- [ ] Current Price (required, currency)
- [ ] Supplier (required, searchable dropdown)
- [ ] Current Stock (required, number)
- [ ] Minimum Stock (required, number)

Row Full:
- [ Cancel Button ] [ Submit Button ]
```

### Table Columns (PackagingList)

| Column | Content | Width | Sortable | Filterable |
|--------|---------|-------|----------|-----------|
| Name | Packaging name | 20% | Yes | Yes |
| Brand | Brand/manufacturer | 15% | Yes | No |
| Unit | Qty per package | 10% | No | No |
| Price | R$ per unit | 12% | Yes | No |
| Stock | Current stock | 12% | Yes | Yes (status) |
| Min Stock | Minimum threshold | 10% | No | No |
| Status | Stock indicator badge | 8% | No | Yes |
| Actions | Edit/Delete/Stock buttons | 13% | No | No |

---

## Integration with Existing Systems

### 1. Supplier Integration

- **Source**: Existing `fetchSuppliers()` function from `lib/suppliers.ts`
- **Usage**: Load suppliers in page component on mount
- **Display**: Dropdown in PackagingForm with supplier name and rating

### 2. Authentication & Authorization

- **Admin Role**: Full CRUD access
- **Viewer Role**: Read-only access (no edit/delete/stock adjustment)
- **Implementation**: Check `userModel.role.type` in page component
- **Firestore Rules**: Restrict writes to admin role only

### 3. User Audit Trail

- **Created By**: Captured from Firebase Auth user UID
- **Updated At**: Timestamp on every update
- **Stock History**: Links to supplier and unit cost
- **Price History**: Tracks supplier and date

---

## State Management Pattern

Following the ingredient module pattern:

```typescript
// Local component state (useState)
const [showCreateForm, setShowCreateForm] = useState(false);
const [showEditForm, setShowEditForm] = useState(false);
const [showStockManager, setShowStockManager] = useState(false);
const [selectedPackaging, setSelectedPackaging] = useState<Packaging | null>(null);
const [isSubmitting, setIsSubmitting] = useState(false);
const [suppliers, setSuppliers] = useState<Supplier[]>([]);
const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger re-fetch

// useEffect for initial data loading
useEffect(() => {
  loadSuppliers();
}, []);

// Pass refreshTrigger as key to PackagingList to force re-fetch
<PackagingList key={refreshTrigger} ... />
```

---

## Error Handling

### Try-Catch Pattern

```typescript
try {
  await someAsyncFunction();
  // Show success toast (TODO: implement toast system)
  setRefreshTrigger(prev => prev + 1);
} catch (error) {
  console.error('Error:', error);
  alert(error instanceof Error ? error.message : 'Erro inesperado');
  // Show error toast (TODO)
}
```

### Error Messages (Portuguese)

- "Nome deve ter pelo menos 2 caracteres"
- "Fornecedor é obrigatório"
- "Estoque mínimo deve ser positivo"
- "Erro ao criar embalagem"
- "Erro ao atualizar embalagem"
- "Erro ao remover embalagem"
- "Erro ao buscar embalagens"

---

## Performance Optimization

1. **Pagination**: 50 items per page in table
2. **Lazy Loading**: Load supplier list only on demand
3. **Memoization**: Memoize PackagingList if needed
4. **Debouncing**: Debounce search input
5. **Firestore Indexes**: Create indexes on frequently queried fields
6. **Caching**: Consider TanStack Query for complex data fetching

---

## Responsive Design

- **Mobile (< 768px)**: Single column form, condensed table
- **Tablet (768px - 1024px)**: Two column form, full table
- **Desktop (> 1024px)**: Multi-column layout, optimized spacing

Using Tailwind CSS responsive utilities (sm:, md:, lg:, xl:)

---

## Testing Strategy

### Component Tests

```typescript
// PackagingForm.test.tsx
- Render with create mode
- Render with edit mode
- Validate required fields
- Submit form with valid data
- Show validation errors
- Call onCancel when cancelled
- Call onSubmit with correct data

// PackagingList.test.tsx
- Render list with items
- Display correct columns
- Handle empty state
- Call action handlers correctly
- Implement search/filter
- Handle pagination
- Show loading state

// StockManager.test.tsx
- Render with packaging item
- Validate quantity input
- Show type-specific fields
- Calculate new stock correctly
- Call onStockUpdated with result
```

### E2E Tests

```typescript
// Packaging CRUD flows
- Create new packaging item
- Edit packaging item
- Delete packaging item
- Adjust stock level
- View stock history
- User permissions (admin can edit, viewer cannot)
```

---

## Accessibility (WCAG 2.1 AA)

- Form labels properly associated with inputs
- Color not sole indicator of status (use text labels + colors)
- Sufficient color contrast (WCAG AA minimum)
- Keyboard navigation support
- Screen reader compatible
- Semantic HTML structure
- ARIA labels where needed

---

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Styling & Theme

### Color Palette (Using existing Momento Cake theme)

- **Primary**: `#purple-600` (from existing theme)
- **Success**: `#green-600` (good stock)
- **Warning**: `#yellow-600` (low stock)
- **Danger**: `#red-600` (critical stock)
- **Neutral**: `#gray-600` (out of stock)
- **Background**: `#gray-50`
- **Border**: `#gray-200`

### Typography

- **Headings**: Existing font family from theme
- **Body**: Existing font family from theme
- **Monospace**: For prices/numbers (using existing style)

---

## Dependencies

### Required Packages (Already in project)

- `react` 18+
- `next` 14+
- `react-hook-form`
- `zod`
- `firebase`
- `tailwindcss`
- `shadcn/ui`
- `lucide-react`

### Optional Packages (For future enhancement)

- `@tanstack/react-query` (for complex caching)
- `react-toastify` (for toast notifications)
- `zustand` (for global state if needed)

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `src/types/packaging.ts`
- [ ] Create `src/lib/validators/packaging.ts`
- [ ] Create `src/lib/packaging.ts` (CRUD functions)
- [ ] Update Sidebar navigation
- [ ] Set up page routing structure
- [ ] Create page layout component

### Phase 2: Core Components
- [ ] Create `PackagingList` component
- [ ] Create `PackagingForm` component
- [ ] Create `StockManager` component
- [ ] Create `StockLevelIndicator` component
- [ ] Create `LoadMoreButton` component
- [ ] Create empty state template

### Phase 3: Page Integration
- [ ] Build `/packaging/inventory` page
- [ ] Integrate all components
- [ ] Implement CRUD workflows
- [ ] Add error handling
- [ ] Add loading states
- [ ] Implement supplier loading

### Phase 4: Testing & Polish
- [ ] Write unit tests
- [ ] Write component tests
- [ ] Write E2E tests
- [ ] Performance optimization
- [ ] Browser testing
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit
- [ ] Code cleanup and documentation

---

## Known Limitations & Future Work

1. **No Toast Notifications**: Currently using `alert()`, should implement toast system
2. **No Bulk Operations**: Single item operations only
3. **No Export/Import**: Can't bulk import from CSV
4. **Simple Pagination**: Manual pagination, not infinite scroll
5. **No Advanced Filtering**: Basic search only, not advanced filters
6. **Manual Refreshing**: No real-time updates, manual refresh needed

---

## Firestore Indexes Implementation

### Quick Reference: Required Indexes

The packaging feature requires 9 composite indexes to support efficient queries. See Master Plan for detailed specifications.

### Deployment Instructions

#### Step 1: Create Index File

Create `firestore.indexes.json` in project root with all index definitions (see master plan for complete JSON structure).

#### Step 2: Deploy Indexes

```bash
# Option 1: Deploy via Firebase CLI
firebase deploy --only firestore:indexes

# Option 2: Manual creation via Firebase Console
# Go to: Firebase Console → Firestore → Indexes tab
# Create each index according to master plan specifications
```

#### Step 3: Verify Indexes

After deployment (may take 5-10 minutes):
1. Check Firebase Console → Firestore Database → Indexes
2. Ensure all 9 indexes show status "Enabled"
3. Monitor performance in Firestore Dashboard

### Index Impact on Queries

Without these indexes, the following queries will be slow or fail:
- `fetchPackaging()` - List all active items
- `fetchPackagingBySupplier()` - Filter by supplier
- `fetchStockHistory()` - Get stock movements
- `fetchPriceHistory()` - Get price trends

With indexes, all queries should complete in < 100ms for 1000+ items.

---

## Deployment Checklist

Before deploying to production:

### Pre-Deployment
- [ ] All tests passing (unit, component, E2E)
- [ ] No console errors or warnings
- [ ] Mobile testing completed (iOS Safari, Android Chrome)
- [ ] Lighthouse performance score > 90
- [ ] All dependencies updated and audited

### Firebase Configuration
- [ ] Firestore indexes created and enabled (all 9 indexes)
- [ ] Firestore security rules deployed
- [ ] Environment variables configured (.env.local)
- [ ] Service account credentials secured

### Code Quality
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatting applied
- [ ] Code coverage > 80%

### Feature Verification
- [ ] Create packaging item works
- [ ] Edit packaging item works
- [ ] Delete packaging item works
- [ ] Stock adjustment works
- [ ] Viewer can view but not edit
- [ ] Admin can edit and delete
- [ ] Stock status indicators display correctly
- [ ] Price displays in correct currency (R$)

### Monitoring & Documentation
- [ ] Error monitoring set up (Sentry/similar)
- [ ] Performance monitoring enabled
- [ ] Documentation updated
- [ ] Deployment notes prepared
- [ ] User training/guide completed
- [ ] Rollback plan documented

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Check Firestore query performance
- [ ] Verify user adoption
- [ ] Collect feedback from early users

---

## Performance Monitoring

### Key Metrics to Track

1. **Query Performance**
   - `fetchPackaging()` latency (target: < 500ms)
   - Stock history queries (target: < 200ms)
   - Price history queries (target: < 200ms)

2. **User Interactions**
   - Page load time (target: < 2s)
   - Form submission time (target: < 1s)
   - Stock update time (target: < 500ms)

3. **Firestore Usage**
   - Monthly read operations count
   - Index build times
   - Slow query alerts

### Monitoring Tools

- **Firebase Console**: Real-time database metrics
- **Chrome DevTools**: Network and performance profiling
- **Lighthouse**: Build performance scores
- **Sentry**: Error tracking and monitoring

---

## Related Documentation

- **Master Plan**: `context/specs/0_master/packaging-management-feature.md`
- **Firestore Indexes**: See Master Plan → Firestore Indexes section
- **Ingredients Module**: Reference implementation (similar patterns)
- **Firestore Rules**: Security configuration
- **Type System**: TypeScript best practices
- **Firebase Documentation**: https://firebase.google.com/docs/firestore
