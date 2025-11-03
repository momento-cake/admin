# Product CRUD Management - Web Implementation Plan

## Overview

This document provides web-specific implementation details for the Product CRUD Management system. It is a companion to the master plan at `context/specs/0_master/product-crud-management.md`.

## Web Stack

- **Framework**: Next.js 14+ with App Router
- **UI Library**: Shadcn/ui components + TailwindCSS
- **Form Library**: React Hook Form + Zod validation
- **Data Fetching**: Fetch API with async/await
- **State Management**: React Context + local component state
- **Database**: Firebase Firestore

## Component Architecture

### Product Management Components

#### ProductForm Component
**Path**: `src/components/products/ProductForm.tsx`

**Purpose**: Reusable form for creating and editing products

**Props**:
```typescript
interface ProductFormProps {
  product?: Product;              // undefined = create mode
  onSubmit: (data: Product) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Create/edit modes based on `product` prop
- Separate form sections: Basic Info, Categorization, Recipes, Packages, Cost Analysis, Pricing
- Real-time cost calculation and update
- Recipe and package modals integrated
- Form validation using React Hook Form + Zod
- Loading state with disabled inputs
- Error display with validation feedback

**Form Sections**:
1. **Basic Information**
   - Name (required, min 2 chars)
   - Description (optional)
   - SKU (read-only, auto-generated display)

2. **Categorization**
   - Category dropdown (required, with fetched categories)
   - Subcategory dropdown (required, filtered by selected category)

3. **Recipes Selection**
   - Button: "Manage Recipes"
   - Display selected recipes as list items with portions
   - Each item shows: recipe name, portions, cost breakdown
   - Remove button for each recipe

4. **Packages Selection** (Optional)
   - Button: "Manage Packages"
   - Display selected packages as list items with quantities
   - Each item shows: package name, quantity, cost breakdown
   - Remove button for each package

5. **Cost Analysis Section**
   - CostAnalysis component (read-only)
   - Shows breakdown of all costs

6. **Pricing Section**
   - Markup % selector (with configuration defaults)
   - Fixed Price input (required, currency format)
   - Suggested Price display (calculated)
   - Profit Margin % display (calculated)

7. **Metadata Section**
   - Created by, Created at, Updated at (read-only)

8. **Action Buttons**
   - Save button (submits form)
   - Cancel button (calls onCancel)
   - Loading state with spinner

#### ProductList Component
**Path**: `src/components/products/ProductList.tsx`

**Purpose**: Reusable list component for displaying products with search, filtering, and CRUD actions

**Props**:
```typescript
interface ProductListProps {
  onProductEdit?: (product: Product) => void;
  onProductDelete?: (product: Product) => void;
  onProductView?: (product: Product) => void;
  onProductCreate?: () => void;
  onProductsLoaded?: (products: Product[]) => void;
  onRefresh?: () => void;
  className?: string;
}
```

**Features**:
- Reuses layout pattern from RecipeList (same design)
- Table with columns: Name, Category/Subcategory, SKU, Price, Cost, Margin, Actions
- Search by name with debouncing
- Filter by Category and Subcategory
- Active filters display with clear button
- Empty state with helpful message
- Add Product button
- Action buttons: View, Edit, Delete
- Delete confirmation dialog
- Loading and error states
- Result count display
- Refresh button

**Table Columns**:
- Name (with description in smaller text)
- Category/Subcategory (badge style)
- SKU (monospace font)
- Price (currency format)
- Cost (currency format, lighter color)
- Margin % (color-coded: red <10%, yellow 10-20%, green >20%)
- Actions (View, Edit, Delete icons)

#### RecipeSelector Modal
**Path**: `src/components/products/RecipeSelector.tsx`

**Purpose**: Modal dialog for selecting recipes and specifying portions

**Props**:
```typescript
interface RecipeSelectorProps {
  isOpen: boolean;
  selectedRecipes?: ProductRecipeItem[];
  onSelect: (recipes: ProductRecipeItem[]) => void;
  onCancel: () => void;
}
```

**Features**:
- Search recipes by name
- Fetch recipes on mount (with loading state)
- Multi-select (checkbox) recipes
- For each selected recipe: input for portions (number)
- Display recipe info: name, category, cost per serving
- Calculated total cost per recipe: `portions × cost per serving`
- Total cost summary at bottom
- Validation: at least one recipe required
- Save and Cancel buttons
- Clean/elegant modal design

**Form Fields**:
- Search input (debounced)
- Recipe list with checkboxes
- Portions input (number, min 0.1, step 0.1)
- Cost per serving display
- Calculated cost display

#### PackageSelector Modal
**Path**: `src/components/products/PackageSelector.tsx`

**Purpose**: Modal dialog for selecting packages and specifying quantities (optional)

**Props**:
```typescript
interface PackageSelectorProps {
  isOpen: boolean;
  selectedPackages?: ProductPackageItem[];
  onSelect: (packages: ProductPackageItem[]) => void;
  onCancel: () => void;
}
```

**Features**:
- Search packages by name
- Fetch packages on mount
- Multi-select packages
- For each package: input for quantity (number)
- Display package info: name, category, unit, price
- Calculated total cost per package: `quantity × price`
- Total package cost summary
- Optional: can skip packages (validation allows empty)
- Save and Cancel buttons

**Form Fields**:
- Search input (debounced)
- Package list with checkboxes
- Quantity input (number, min 1, step 1)
- Unit and price display
- Calculated cost display

#### CostAnalysis Component
**Path**: `src/components/products/CostAnalysis.tsx`

**Purpose**: Display read-only cost breakdown and pricing analysis

**Props**:
```typescript
interface CostAnalysisProps {
  product: Product;
  className?: string;
}
```

**Features**:
- Breakdown section showing:
  - Each recipe: name, portions, portion cost, total = portions × cost
  - Each package: name, quantity, unit price, total = quantity × price
  - Subtotal for recipes
  - Subtotal for packages
  - Grand total cost
- Pricing section showing:
  - Current product price
  - Suggested price (cost × markup%)
  - Profit in currency
  - Profit margin %
- Visual representation (consider table or cards layout)
- Color coding for profit margin viability

#### ProductCategoryForm Component
**Path**: `src/components/products/ProductCategoryForm.tsx`

**Purpose**: Form for creating and editing product categories

**Props**:
```typescript
interface ProductCategoryFormProps {
  category?: ProductCategory;
  onSubmit: (data: ProductCategory) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Create/edit modes
- Form fields: name, code, description, displayOrder
- Validation using Zod
- Code field help text: "Used in SKU generation, e.g., CAKE, CUPCAKE"
- Display order numeric field for sorting
- Error handling and feedback
- Loading state

#### ProductSubcategoryForm Component
**Path**: `src/components/products/ProductSubcategoryForm.tsx`

**Purpose**: Form for creating and editing product subcategories

**Props**:
```typescript
interface ProductSubcategoryFormProps {
  category?: ProductSubcategory;
  parentCategoryId: string;
  onSubmit: (data: ProductSubcategory) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}
```

**Features**:
- Similar to category form
- Parent category selector (read-only in modal)
- Code field for SKU generation
- Display order field
- Validation

#### ProductCategoryList Component
**Path**: `src/components/products/ProductCategoryList.tsx`

**Purpose**: Hierarchical list of categories and subcategories with management actions

**Props**:
```typescript
interface ProductCategoryListProps {
  onCategoryEdit?: (category: ProductCategory) => void;
  onCategoryDelete?: (category: ProductCategory) => void;
  onSubcategoryEdit?: (subcategory: ProductSubcategory) => void;
  onSubcategoryDelete?: (subcategory: ProductSubcategory) => void;
  onCategoryCreate?: () => void;
  className?: string;
}
```

**Features**:
- Hierarchical tree view (categories with nested subcategories)
- Search/filter by name
- Action buttons for each category: Edit, Delete, Add Subcategory
- Action buttons for each subcategory: Edit, Delete
- Expand/collapse subcategories
- Loading and error states
- Empty state
- Delete confirmation dialogs

## Page Components

### Products List Page
**Path**: `src/app/(dashboard)/products/page.tsx`

**Structure**:
```tsx
export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1>Produtos</h1>
        <p>Gerencie o catálogo de produtos</p>
      </div>
      <ProductList
        onProductCreate={() => router.push('/products/new')}
        onProductEdit={(product) => router.push(`/products/${product.id}/edit`)}
        onProductDelete={handleDelete}
        onProductView={handleView}
      />
    </div>
  )
}
```

### Create Product Page
**Path**: `src/app/(dashboard)/products/new/page.tsx`

**Structure**:
```tsx
export default function CreateProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CreateProductData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create product');
      router.push('/products');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1>Novo Produto</h1>
      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
      />
    </div>
  )
}
```

### Edit Product Page
**Path**: `src/app/(dashboard)/products/[id]/edit/page.tsx`

**Structure**:
```tsx
export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct(params.id).then(setProduct).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner />;
  if (!product) return <NotFoundError />;

  return (
    <div className="max-w-3xl">
      <Breadcrumb items={[
        { label: 'Produtos', href: '/products' },
        { label: product.name }
      ]} />
      <h1>Editar Produto</h1>
      <ProductForm
        product={product}
        onSubmit={handleUpdate}
        onCancel={() => router.back()}
      />
    </div>
  )
}
```

### Product Categories Page
**Path**: `src/app/(dashboard)/products/categories/page.tsx`

**Structure**:
```tsx
export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ProductSubcategory | null>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string>('');

  return (
    <div className="space-y-6">
      <div>
        <h1>Categorias de Produtos</h1>
        <p>Gerencie categorias e subcategorias de produtos</p>
      </div>

      <Button onClick={() => setShowCategoryForm(true)}>
        <Plus /> Nova Categoria
      </Button>

      <ProductCategoryList
        onCategoryCreate={() => setShowCategoryForm(true)}
        onCategoryEdit={(cat) => {
          setEditingCategory(cat);
          setShowCategoryForm(true);
        }}
        onCategoryDelete={handleCategoryDelete}
        onSubcategoryEdit={(subcat) => {
          setEditingSubcategory(subcat);
          setShowSubcategoryForm(true);
        }}
        onSubcategoryDelete={handleSubcategoryDelete}
      />

      {/* Category Form Modal */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent>
          <ProductCategoryForm
            category={editingCategory}
            onSubmit={handleCategorySubmit}
            onCancel={() => {
              setShowCategoryForm(false);
              setEditingCategory(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Subcategory Form Modal */}
      <Dialog open={showSubcategoryForm} onOpenChange={setShowSubcategoryForm}>
        <DialogContent>
          <ProductSubcategoryForm
            category={editingSubcategory}
            parentCategoryId={parentCategoryId}
            onSubmit={handleSubcategorySubmit}
            onCancel={() => {
              setShowSubcategoryForm(false);
              setEditingSubcategory(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## API Routes

### Products CRUD Routes

#### GET /api/products
**Purpose**: Fetch products with filtering

**Query Parameters**:
```typescript
interface ProductFilters {
  searchQuery?: string;
  categoryId?: string;
  subcategoryId?: string;
  limit?: number;
  offset?: number;
}
```

**Response**:
```typescript
interface ProductListResponse {
  success: boolean;
  data: Product[];
  count: number;
  total: number;
}
```

**Implementation**:
```typescript
export async function GET(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth.user) return unauthorized();

  const { searchQuery, categoryId, subcategoryId, limit = 20, offset = 0 } =
    Object.fromEntries(request.nextUrl.searchParams);

  const filters: ProductFilters = {
    searchQuery,
    categoryId,
    subcategoryId
  };

  const { products, total } = await fetchProducts(filters, limit, offset);
  return NextResponse.json({
    success: true,
    data: products,
    count: products.length,
    total
  });
}
```

#### POST /api/products
**Purpose**: Create new product

**Request Body**:
```typescript
interface CreateProductRequest {
  name: string;
  description?: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  markup: number;
  productRecipes: ProductRecipeItem[];
  productPackages?: ProductPackageItem[];
}
```

**Response**: Created Product

**Implementation**:
```typescript
export async function POST(request: NextRequest) {
  const auth = await getAuth(request);
  if (!auth.user || !auth.user.isAdmin) return forbidden();

  const body = await request.json();
  const validation = createProductValidation.safeParse(body);
  if (!validation.success) return badRequest(validation.error);

  const sku = await generateSKU(validation.data.categoryId, validation.data.subcategoryId);
  const costPrice = await calculateProductCost(validation.data);
  const suggestedPrice = calculateSuggestedPrice(costPrice, validation.data.markup);

  const product: Product = {
    id: generateId(),
    ...validation.data,
    sku,
    costPrice,
    suggestedPrice,
    profitMargin: (validation.data.price - costPrice) / validation.data.price,
    isActive: true,
    createdAt: now(),
    updatedAt: now(),
    createdBy: auth.user.uid
  };

  await saveProduct(product);
  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
```

#### GET /api/products/[id]
**Purpose**: Fetch single product

**Response**: Product or 404

#### PUT /api/products/[id]
**Purpose**: Update product

**Request Body**: Partial Product

**Response**: Updated Product

**Implementation**:
```typescript
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await getAuth(request);
  if (!auth.user || !auth.user.isAdmin) return forbidden();

  const product = await getProduct(params.id);
  if (!product) return notFound();

  const body = await request.json();
  const validation = updateProductValidation.safeParse(body);
  if (!validation.success) return badRequest(validation.error);

  // Recalculate costs if recipes/packages changed
  const costPrice = await calculateProductCost({ ...product, ...validation.data });
  const suggestedPrice = calculateSuggestedPrice(costPrice, validation.data.markup ?? product.markup);

  const updated: Product = {
    ...product,
    ...validation.data,
    costPrice,
    suggestedPrice,
    profitMargin: (validation.data.price ?? product.price - costPrice) / (validation.data.price ?? product.price),
    updatedAt: now()
  };

  await updateProduct(updated);
  return NextResponse.json({ success: true, data: updated });
}
```

#### DELETE /api/products/[id]
**Purpose**: Delete product (soft delete)

**Response**: Success message

#### GET /api/products/categories
**Purpose**: Fetch all product categories

#### POST /api/products/categories
**Purpose**: Create product category

#### GET /api/products/categories/[id]
**Purpose**: Fetch single category

#### PUT /api/products/categories/[id]
**Purpose**: Update category

#### DELETE /api/products/categories/[id]
**Purpose**: Delete category (soft delete)

#### GET /api/products/subcategories
**Purpose**: Fetch subcategories (filtered by categoryId)

**Query Parameters**: `categoryId` (required)

#### POST /api/products/subcategories
**Purpose**: Create subcategory

#### PUT /api/products/subcategories/[id]
**Purpose**: Update subcategory

#### DELETE /api/products/subcategories/[id]
**Purpose**: Delete subcategory (soft delete)

## Validation Schemas

### Product Validation
**Path**: `src/lib/validators/product.ts`

```typescript
import { z } from 'zod';

export const recipeItemValidation = z.object({
  id: z.string().optional(),
  recipeId: z.string().min(1),
  recipeName: z.string().min(1),
  portions: z.number().min(0.1).max(999.99),
  recipeCost: z.number().min(0)
});

export const packageItemValidation = z.object({
  id: z.string().optional(),
  packagingId: z.string().min(1),
  packagingName: z.string().min(1),
  quantity: z.number().min(1).max(999),
  packageCost: z.number().min(0)
});

export const productValidation = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  subcategoryId: z.string().min(1, 'Subcategory is required'),
  price: z.number().min(0.01).max(999999.99),
  markup: z.number().min(0).max(500),
  productRecipes: z.array(recipeItemValidation).min(1, 'At least one recipe is required'),
  productPackages: z.array(packageItemValidation).optional()
});

export const productCategoryValidation = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  displayOrder: z.number().min(0)
});

export const productSubcategoryValidation = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(2).max(100),
  code: z.string().min(1).max(10).toUpperCase(),
  description: z.string().max(500).optional(),
  displayOrder: z.number().min(0)
});

export type Product = z.infer<typeof productValidation> & {
  id: string;
  sku: string;
  costPrice: number;
  suggestedPrice: number;
  profitMargin: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type ProductCategory = z.infer<typeof productCategoryValidation> & {
  id: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
};

export type ProductSubcategory = z.infer<typeof productSubcategoryValidation> & {
  id: string;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
};
```

## Library Functions

### Products Library
**Path**: `src/lib/products.ts`

```typescript
// Fetch operations
export async function fetchProducts(filters: ProductFilters, limit?: number, offset?: number): Promise<{ products: Product[], total: number }> {
  // Build Firestore query with filters
  // Apply isActive = true filter
  // Apply search, category, subcategory filters
  // Execute query and return results
}

export async function fetchProduct(id: string): Promise<Product | null> {
  // Fetch single product from Firestore
  // Handle not found
}

// Create/Update/Delete operations
export async function createProduct(data: CreateProductData): Promise<Product> {
  // Validate data
  // Generate SKU
  // Calculate costs
  // Save to Firestore
  // Return created product
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<Product> {
  // Validate data
  // Get existing product
  // Merge data
  // Recalculate costs if needed
  // Update in Firestore
  // Return updated product
}

export async function deleteProduct(id: string): Promise<void> {
  // Soft delete: set isActive = false
  // Update updatedAt timestamp
}

// Category operations
export async function fetchProductCategories(): Promise<ProductCategory[]> {
  // Fetch all active categories
  // Order by displayOrder
}

export async function createProductCategory(data: CreateCategoryData): Promise<ProductCategory> {
  // Validate and save
}

export async function updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
  // Update and return
}

export async function deleteProductCategory(id: string): Promise<void> {
  // Soft delete
  // TODO: Handle products that reference this category
}

// Subcategory operations
export async function fetchProductSubcategories(categoryId: string): Promise<ProductSubcategory[]> {
  // Fetch subcategories for category
  // Order by displayOrder
}

export async function createProductSubcategory(data: CreateSubcategoryData): Promise<ProductSubcategory> {
  // Validate and save
}

export async function updateProductSubcategory(id: string, data: Partial<ProductSubcategory>): Promise<ProductSubcategory> {
  // Update and return
}

export async function deleteProductSubcategory(id: string): Promise<void> {
  // Soft delete
}

// Cost calculations
export async function calculateProductCost(product: Partial<Product>): Promise<number> {
  // Sum recipe costs (portions × cost per serving for each recipe)
  // Sum package costs (quantity × price for each package)
  // Return total
}

export function calculateSuggestedPrice(costPrice: number, markup: number): number {
  // Calculate: costPrice × (1 + markup / 100)
}

// SKU generation
export async function generateSKU(categoryId: string, subcategoryId: string): Promise<string> {
  // Get category and subcategory codes
  // Get next counter for this category/subcategory combination
  // Format: {CATEGORY_CODE}-{SUBCAT_CODE}-{COUNTER}
  // Increment counter in Firestore
  // Return formatted SKU
}

// Helper functions
export function getCategoryDisplayName(category: ProductCategory): string {
  return category.name;
}

export function getSubcategoryDisplayName(subcategory: ProductSubcategory): string {
  return subcategory.name;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(price);
}

export function calculateProfitMargin(price: number, cost: number): number {
  return ((price - cost) / price) * 100;
}

export function isMarginViable(margin: number): 'good' | 'warning' | 'poor' {
  if (margin > 20) return 'good';
  if (margin > 10) return 'warning';
  return 'poor';
}
```

## Sidebar Navigation Update

**File**: `src/components/layout/Sidebar.tsx`

**Add to menu**:
```typescript
{
  label: "Produtos",
  icon: Package,
  items: [
    { label: "Catálogo", href: "/products", icon: PackageOpen },
    { label: "Categorias", href: "/products/categories", icon: FolderOpen }
  ]
}
```

## Styling & Design

### Use Existing Patterns
- Component styling: Shadcn/ui components with TailwindCSS
- Color scheme: Consistent with existing design
- Typography: Use existing text utilities
- Spacing: Use TailwindCSS spacing scale

### Key Classes
- Tables: Use Table component from shadcn/ui
- Forms: Use form components (Input, Select, Textarea)
- Modals: Use Dialog component
- Buttons: Use Button component with variants
- Badges: Use Badge component for status/category display
- Loading: Use spinner/skeleton components

## Performance Optimizations

### Search & Filtering
```typescript
// Debounce search input to avoid excessive queries
const debouncedSearch = useDebounce(searchInput, 300);

// Update filters when debounced value changes
useEffect(() => {
  setFilters(prev => ({ ...prev, searchQuery: debouncedSearch }));
}, [debouncedSearch]);
```

### Cost Calculations
```typescript
// Cache calculated costs to avoid recalculating
const memoizedCost = useMemo(() => {
  return calculateProductCost(product);
}, [product.productRecipes, product.productPackages]);
```

### List Pagination
```typescript
// Fetch in chunks to avoid loading all products at once
const [products, setProducts] = useState([]);
const [offset, setOffset] = useState(0);
const [hasMore, setHasMore] = useState(true);

// Load more handler for pagination
const loadMore = async () => {
  const response = await fetchProducts(filters, 20, offset);
  setProducts([...products, ...response.products]);
  setOffset(offset + 20);
  setHasMore(response.products.length === 20);
};
```

## Error Handling

### User-Friendly Messages
```typescript
const errorMessages: Record<string, string> = {
  'auth/permission-denied': 'Você não tem permissão para realizar esta ação',
  'firestore/not-found': 'Produto não encontrado',
  'firestore/already-exists': 'Este SKU já existe',
  'validation/invalid-input': 'Dados inválidos. Por favor, verifique o formulário',
  'network/error': 'Erro de conexão. Por favor, tente novamente'
};

// Show in toast or error boundary
showError(errorMessages[errorCode] || 'Erro desconhecido');
```

### Loading States
```typescript
// Show spinner during async operations
{isLoading && <Spinner />}

// Disable form inputs during submission
<Input disabled={isLoading} />

// Show skeleton loader during data fetch
{loading ? <ProductListSkeleton /> : <ProductList />}
```

## Testing

### Component Tests
- Test ProductForm validation and submission
- Test ProductList search and filtering
- Test modal open/close behavior
- Test cost calculations
- Test category hierarchy display

### E2E Tests
- Test create product flow (select category, add recipes, set price)
- Test edit product flow
- Test delete product flow
- Test create/edit categories
- Test search and filtering
- Test cost breakdown accuracy

## Security Considerations

### Authentication
- All routes check user authentication
- Admin-only routes check user role

### Authorization
- Firestore rules enforce admin-only writes
- Client-side checks for UX consistency
- Trust Firestore rules as source of truth

### Input Validation
- Validate all form inputs on client (Zod)
- Validate all API inputs on server (Zod)
- Prevent injection attacks
- Sanitize user inputs

### Data Privacy
- No sensitive data in component state (if possible)
- Clear sensitive data on logout
- Use HTTPS for all API calls

