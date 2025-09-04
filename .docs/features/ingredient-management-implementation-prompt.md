# Implementation Prompt: Ingredient Management System

## Project Context

You are implementing the **Ingredient Management System** for a Next.js bakery admin application. This is a single-company system (no multi-tenant architecture needed).

**Project Location**: `/Users/gabrielaraujo/projects/momentocake/admin`

**Reference Documentation**: `.docs/features/ingredient-management.md`

**Tech Stack**: Next.js 14 (App Router), TypeScript, Firebase/Firestore, shadcn/ui, Tailwind CSS

## Implementation Objective

Build a complete ingredient management system that allows users to:
- Manage ingredient inventory (CRUD operations)
- Track supplier information
- Monitor stock levels with visual indicators
- Convert between measurement units
- Generate cost analytics and reports

## Implementation Instructions

### Phase 1: Foundation (Priority: High)

**1. Create Type Definitions**
```bash
# Create the TypeScript interfaces from the documentation
# File: src/types/ingredient.ts
```

**2. Implement Database Layer**
```bash
# Create API routes for ingredients and suppliers
# Files: 
# - src/app/api/ingredients/route.ts
# - src/app/api/ingredients/[id]/route.ts
# - src/app/api/suppliers/route.ts
# - src/app/api/suppliers/[id]/route.ts
```

**3. Build Core UI Components**
```bash
# Create reusable components using shadcn/ui
# Files:
# - src/components/ingredients/IngredientCard.tsx
# - src/components/ingredients/IngredientForm.tsx
# - src/components/ingredients/IngredientList.tsx
# - src/components/ingredients/StockLevelIndicator.tsx
```

**4. Create Main Pages**
```bash
# Implement the main user interfaces
# Files:
# - src/app/ingredients/page.tsx (main list)
# - src/app/ingredients/[id]/page.tsx (details)
# - src/app/ingredients/new/page.tsx (create form)
```

**5. Add Validation & Utils**
```bash
# Implement validation schemas and utility functions
# Files:
# - src/lib/validators/ingredient.ts
# - src/lib/ingredients.ts
# - src/lib/suppliers.ts
```

### Phase 2: Advanced Features (Priority: Medium)

**1. Supplier Management**
- Complete supplier CRUD operations
- Supplier selection in ingredient forms
- Supplier performance tracking

**2. Unit Conversion System**
- Build unit converter component
- Implement conversion logic
- Add to ingredient forms and displays

**3. Stock Management**
- Visual stock level indicators
- Low stock alerts
- Stock update functionality

**4. Search & Filtering**
- Search ingredients by name
- Filter by category, supplier, stock level
- Sort by price, stock, last updated

### Phase 3: Analytics & Reports (Priority: Low)

**1. Cost Tracking**
- Price history tracking
- Cost trend analysis
- Price change alerts

**2. Usage Analytics**
- Ingredient consumption patterns
- Most used ingredients
- Cost per recipe calculations

**3. Reporting**
- Inventory reports
- Supplier performance reports
- Cost analysis dashboards

## Technical Requirements

### Database Schema
```typescript
// Firestore collections (no business nesting):
// - ingredients/{ingredientId}
// - suppliers/{supplierId}
```

### Authentication
- Assume existing auth system is in place
- Use Firebase Auth context for user identification
- Secure all API routes with authentication middleware

### UI/UX Requirements
- **Responsive Design**: Mobile-first approach
- **Component Library**: Use shadcn/ui components exclusively
- **Color Scheme**: Professional bakery theme
- **Accessibility**: WCAG 2.1 AA compliance
- **Loading States**: Skeleton screens and loading indicators
- **Error Handling**: User-friendly error messages

### Validation
- **Client-side**: Zod schemas with form validation
- **Server-side**: API route validation
- **Database**: Firestore security rules

### Performance
- **Pagination**: For ingredient lists (50 items per page)
- **Caching**: Cache frequently accessed data
- **Optimistic Updates**: Immediate UI feedback
- **Search**: Debounced search with 300ms delay

## Implementation Guidelines

### 1. Follow Existing Patterns
- Study the current codebase structure in `src/`
- Use the same authentication patterns from existing pages
- Follow the same component composition patterns
- Maintain consistent styling with current pages

### 2. Code Quality Standards
- **TypeScript**: Strict typing, no `any` types
- **ESLint**: Fix all linting warnings
- **Components**: Small, single-responsibility components
- **Error Boundaries**: Implement proper error handling
- **Loading States**: Always show loading indicators

### 3. Testing Strategy
- **Unit Tests**: Test validation functions and utilities
- **Component Tests**: Test UI components with React Testing Library
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete user workflows with Playwright

### 4. Security Considerations
- **Input Sanitization**: Validate and sanitize all inputs
- **Authorization**: Verify user permissions on all operations
- **Data Protection**: Never expose sensitive data to client
- **CORS**: Proper CORS configuration for API routes

## File Structure Checklist

```
src/
├── app/
│   ├── ingredients/
│   │   ├── page.tsx ✅
│   │   ├── [id]/page.tsx ✅
│   │   └── new/page.tsx ✅
│   └── api/
│       ├── ingredients/
│       │   ├── route.ts ✅
│       │   └── [id]/route.ts ✅
│       └── suppliers/
│           ├── route.ts ✅
│           └── [id]/route.ts ✅
├── components/ingredients/
│   ├── IngredientCard.tsx ✅
│   ├── IngredientForm.tsx ✅
│   ├── IngredientList.tsx ✅
│   ├── StockLevelIndicator.tsx ✅
│   └── UnitConverter.tsx ✅
├── lib/
│   ├── ingredients.ts ✅
│   ├── suppliers.ts ✅
│   └── validators/
│       └── ingredient.ts ✅
└── types/
    └── ingredient.ts ✅
```

## Success Criteria

### Phase 1 Complete When:
- [ ] Users can view list of ingredients
- [ ] Users can add new ingredients via form
- [ ] Users can edit existing ingredients
- [ ] Users can delete ingredients (soft delete)
- [ ] All forms have proper validation
- [ ] Data persists correctly in Firestore
- [ ] UI is responsive and accessible

### Phase 2 Complete When:
- [ ] Supplier management is fully functional
- [ ] Unit conversion works correctly
- [ ] Stock levels display with color coding
- [ ] Search and filtering work smoothly
- [ ] Low stock alerts are visible

### Phase 3 Complete When:
- [ ] Cost history is tracked and displayed
- [ ] Usage analytics provide insights
- [ ] Reports can be generated and viewed
- [ ] Performance meets requirements

## Common Pitfalls to Avoid

1. **Don't** create multi-tenant architecture (single company only)
2. **Don't** bypass authentication checks in API routes
3. **Don't** use direct Firestore calls from components (use API routes)
4. **Don't** forget loading states and error handling
5. **Don't** ignore form validation on both client and server
6. **Don't** hardcode values - use enums and constants
7. **Don't** skip responsive design testing

## Getting Started

1. **Read the feature documentation** in `.docs/features/ingredient-management.md`
2. **Examine existing code patterns** in the current project
3. **Start with Phase 1** - create types and basic CRUD operations
4. **Test each component** as you build it
5. **Follow the checklist** to ensure completeness

## Questions to Ask Before Starting

- Is the Firebase project configured and ready?
- Are the existing authentication patterns clear?
- Should ingredient images be supported (file upload)?
- Are there any specific business rules or constraints?
- What's the expected data volume (hundreds vs thousands of ingredients)?

---

**Remember**: Build incrementally, test frequently, and maintain code quality throughout the implementation process.