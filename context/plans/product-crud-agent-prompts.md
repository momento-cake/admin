# Product CRUD Management - Agent Handoff Prompts

These prompts are designed for delegating implementation work to specialized agents. Each prompt includes context, scope, and references to specification documents.

---

## Prompt 1: Foundation & Data Models

**Agent Type**: web-firebase-specialist

**Scope**: Create all TypeScript types, Firestore validators, library functions, and update Firestore configuration.

You are implementing **Phase 1: Foundation & Data Models** for the Product CRUD Management system in Momento Cake Admin. Your task is to create the complete data layer foundation. Reference the master plan at `context/specs/0_master/product-crud-management.md` (sections: "Data Model Overview", "Firestore Collections & Structure", "Firestore Indexes Required", "Firestore Security Rules") and the web plan at `context/specs/web/product-crud-management.md` (section: "Validation Schemas", "Library Functions").

Create: (1) `src/types/product.ts` with all Product, ProductRecipeItem, ProductPackageItem, ProductCategory, ProductSubcategory interfaces and enums, (2) `src/lib/validators/product.ts` with all Zod validation schemas, (3) `src/lib/products.ts` with all CRUD and utility functions (fetchProducts, createProduct, updateProduct, deleteProduct, all category/subcategory operations, SKU generation, cost calculations), (4) update `firestore.indexes.json` with 5 new product-related indexes, (5) update `firestore.rules` with product collection security rules. Ensure soft deletes use isActive flag, timestamps are properly tracked, and SKU generation follows the pattern {CATEGORY_CODE}-{SUBCATEGORY_CODE}-{AUTO_INCREMENT}. All validation schemas must enforce the constraints specified in the plan (min/max lengths, required fields, etc.).

---

## Prompt 2: Category Management UI

**Agent Type**: web-firebase-specialist

**Scope**: Build category and subcategory management components, integrate with sidebar, create categories management page.

You are implementing **Phase 2: Category Management UI** for the Product CRUD system. Reference the master plan at `context/specs/0_master/product-crud-management.md` (section: "Step-by-Step Implementation Tasks - Phase 2") and the web plan at `context/specs/web/product-crud-management.md` (section: "Component Architecture - ProductCategoryForm, ProductSubcategoryForm, ProductCategoryList").

Create: (1) `src/components/products/ProductCategoryForm.tsx` - reusable form for creating/editing categories with fields: name, code, description, displayOrder, (2) `src/components/products/ProductSubcategoryForm.tsx` - form for subcategories with parent category selector, (3) `src/components/products/ProductCategoryList.tsx` - hierarchical tree view showing categories with nested subcategories, reusing design patterns from RecipeList component, (4) update `src/components/layout/Sidebar.tsx` to add "Produtos" menu with "Categorias de Produtos" submenu item pointing to `/products/categories`, (5) create `src/app/(dashboard)/products/categories/page.tsx` with modals for creating/editing categories and subcategories. Use Shadcn Dialog components, implement deletion confirmation dialogs, follow existing form patterns with React Hook Form + Zod validation.

---

## Prompt 3: Product CRUD - Core

**Agent Type**: web-firebase-specialist

**Scope**: Build ProductForm and ProductList components, create API routes, and create product management pages.

You are implementing **Phase 3: Product CRUD - Core** for the Product CRUD system. Reference the master plan at `context/specs/0_master/product-crud-management.md` (section: "Step-by-Step Implementation Tasks - Phase 3") and the web plan at `context/specs/web/product-crud-management.md` (sections: "ProductForm Component", "ProductList Component", "API Routes - Products CRUD Routes", "Page Components").

Create: (1) `src/components/products/ProductForm.tsx` - form component with sections for basic info (name, description, SKU read-only), categorization (category/subcategory dropdowns), and basic pricing, (2) `src/components/products/ProductList.tsx` - reuse exact layout from RecipeList.tsx with columns: Name, Category/Subcategory, SKU, Price, Cost, Margin %, Actions; implement search with debouncing and filters for Category and Subcategory, (3) API routes: `src/app/api/products/route.ts` (GET with filters, POST create), `src/app/api/products/[id]/route.ts` (GET, PUT, DELETE), with validation and proper error handling, (4) pages: `src/app/(dashboard)/products/page.tsx` (product list), `src/app/(dashboard)/products/new/page.tsx` (create), `src/app/(dashboard)/products/[id]/edit/page.tsx` (edit with breadcrumb). Ensure ProductList closely mirrors RecipeList design for consistency, validate all inputs server-side, and implement proper loading/error states.

---

## Prompt 4: Product CRUD - Advanced Features

**Agent Type**: web-firebase-specialist

**Scope**: Build advanced product features including recipe/package selectors, cost analysis, SKU generation integration, and enhanced ProductForm.

You are implementing **Phase 4: Product CRUD - Advanced Features** for the Product CRUD system. Reference the master plan at `context/specs/0_master/product-crud-management.md` (section: "Step-by-Step Implementation Tasks - Phase 4") and the web plan at `context/specs/web/product-crud-management.md` (sections: "RecipeSelector Modal", "PackageSelector Modal", "CostAnalysis Component").

Create: (1) `src/components/products/RecipeSelector.tsx` - modal for multi-selecting recipes with portions input, showing recipe costs and calculating totals (at least one recipe required), (2) `src/components/products/PackageSelector.tsx` - similar modal for optional package selection with quantity inputs and cost breakdown, (3) `src/components/products/CostAnalysis.tsx` - read-only display component showing: each recipe with portions×cost, each package with quantity×price, subtotals, grand total cost, selling price, suggested price (cost × markup%), profit amount, profit margin %. Enhance ProductForm to integrate these components: add buttons to open selectors, display selected recipes/packages as lists, integrate CostAnalysis component, add markup percentage selector, auto-calculate costs when recipes/packages change. Implement SKU generation on category/subcategory selection change using the generateSKU function from Phase 1. Add real-time cost updates using useMemo to cache calculations.

---

## Prompt 5: Integration & Polish

**Agent Type**: web-firebase-specialist

**Scope**: Integrate cost calculations with recipe library, implement error handling, optimize performance, add loading states and user feedback.

You are implementing **Phase 5: Integration & Polish** for the Product CRUD system. Reference the master plan at `context/specs/0_master/product-crud-management.md` (section: "Step-by-Step Implementation Tasks - Phase 5") and the web plan at `context/specs/web/product-crud-management.md` (sections: "Performance Optimizations", "Error Handling").

Enhance cost calculations to fetch real-time recipe costs from the recipe library (ensuring costs update when recipe costs change), implement package cost fetching from packaging library, update ProductList to show profit margin with color-coding (red <10%, yellow 10-20%, green >20%), add quick filters for margin ranges. Implement comprehensive error handling with user-friendly Portuguese messages (map Firestore errors to readable strings), add success/error toasts for all CRUD operations. Optimize performance: lazy load recipe/package lists in selectors, debounce search inputs in modals, implement pagination for large product lists, add skeleton loaders for async operations. Add proper loading spinners during form submission, validation error messages, and confirmation dialogs for destructive actions. Ensure all async operations properly handle state updates and edge cases (deleted categories, missing recipes/packages). Test all workflows end-to-end.

---

## Prompt 6: Testing & QA

**Agent Type**: web-tester

**Scope**: Create unit tests, component tests, E2E tests, and perform comprehensive manual QA.

You are implementing **Phase 6: Testing & QA** for the Product CRUD system. Reference the master plan at `context/specs/0_master/product-crud-management.md` (sections: "Testing Strategy", "Acceptance Criteria", "Validation Commands") and the web plan at `context/specs/web/product-crud-management.md` (section: "Testing").

Create comprehensive test suite: (1) Unit tests (`src/__tests__/lib/products.test.ts`) - test SKU generation with various codes, cost calculations from recipes and packages, suggested price calculations with different markups, filter logic, (2) Component tests (`src/__tests__/components/products.test.tsx`) - test ProductForm validation and submission, ProductList rendering and interactions, modal open/close behavior, cost analysis calculations, category hierarchy display, (3) E2E tests (`tests/products.spec.ts`) - test complete product creation flow with multiple recipes, test editing and deletion, test category CRUD, test search and filtering, verify cost calculations accuracy end-to-end. Run validation commands: `npm run build`, `npm run lint`, `npm run type-check`, `npm run test`, `npm run test:e2e`. Perform manual testing: create product with recipes/packages, verify SKU generation, test cost calculations with real data, verify Firestore permissions, test cross-browser compatibility, check all validation messages and error handling.

---

## Handoff Best Practices

### Before delegating to an agent:
1. Ensure the agent has read the relevant specification documents
2. Provide clear scope boundaries (what is included, what is not)
3. Reference specific sections in spec documents for context
4. Mention any constraints or patterns to follow (e.g., "reuse RecipeList layout")

### For agent communication:
- Keep prompts to 1-2 paragraphs maximum
- Lead with the phase number and clear objective
- Include specific file paths and component names
- Reference spec document sections for detailed requirements
- Mention key constraints (validation rules, design patterns, performance requirements)

### After agent completion:
1. Review code against specification requirements
2. Run validation commands to ensure quality
3. Test functionality against acceptance criteria
4. Merge code and deploy following project standards

---

## Specification File References

**Master Plan**: `context/specs/0_master/product-crud-management.md`
- Complete feature overview
- Data models and Firestore schema
- Implementation phases and task breakdown
- Acceptance criteria and testing strategy

**Web Plan**: `context/specs/web/product-crud-management.md`
- Component architecture and specifications
- API route contracts and schemas
- Validation schemas and library functions
- Page layouts and styling guidelines

Use these references when the agent needs clarification on requirements, constraints, or implementation details.

