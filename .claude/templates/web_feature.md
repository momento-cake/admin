# Web Platform Architecture (Momento Cake Admin)

## Pages and Routes
**Pages/Routes (Next.js App Router):**
- `app/<route>/page.tsx` - <description and purpose>
- `/dashboard` - Main dashboard overview
- `/users/active` - Active users management
- `/users/invitations` - User invitations
- `/ingredients/inventory` - Ingredient inventory
- `/ingredients/suppliers` - Suppliers management
- `/products/catalog` - Product catalog
- `/clients` - Client management

## Components
**Components:**
- `<ComponentName>` - <responsibility and props>
- shadcn/ui components to use: <list>

**Component Locations:**
- `src/components/ui/` - Shadcn UI base components
- `src/components/<feature>/` - Feature-specific components
- `src/components/common/` - Shared/reusable components

## State Management
**React Hooks:**
- `use<Resource>` - Custom hooks in `src/hooks/`
- Firebase real-time listeners for live data

**Context/Store:**
- Auth context for user authentication
- Firebase context for Firestore access

## Forms
**Form Fields:**
- <list form fields>

**Validation:**
- Zod schemas for validation in `src/lib/validations/`
- React Hook Form for form management
- Error handling and user feedback with toast notifications

## Styling
**Tailwind CSS:**
- Custom classes and design system usage
- Responsive design considerations (mobile, tablet, desktop)
- Fixed sidebar layout (64px mobile, 256px desktop)

## Firebase Integration
**Firestore Collections:**
- `users`, `invitations`, `ingredients`, `suppliers`
- `recipes`, `clients`, `products`, `orders`

**Firebase Services:**
- `src/lib/firebase/` - Firebase configuration and services
- `src/services/` - Business logic services

## Relevant Web Files
- `app/<route>/page.tsx` - Next.js page components
- `src/components/<Component>.tsx` - React components
- `src/hooks/use<Hook>.ts` - Custom hooks
- `src/services/<resource>.ts` - Firebase service functions
- `src/types/<resource>.ts` - TypeScript type definitions

## Web Implementation Tasks

### Firebase Services
- [ ] Create Firebase service functions in `src/services/`
- [ ] Define TypeScript types in `src/types/`
- [ ] Implement Firestore CRUD operations
- [ ] Add error handling and logging

### UI Components
- [ ] Create/customize shadcn/ui components
- [ ] Implement form components with validation (Zod + React Hook Form)
- [ ] Add loading skeletons with Skeleton component
- [ ] Implement error states
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Write component tests

### Data Integration
- [ ] Create custom hooks in `src/hooks/`
- [ ] Implement Firebase real-time listeners
- [ ] Add error handling and retries
- [ ] Implement optimistic updates where applicable

### Page Implementation
- [ ] Create Next.js page in `app/`
- [ ] Implement proper layout with sidebar
- [ ] Add breadcrumb navigation
- [ ] Ensure mobile responsiveness

## Web Testing Strategy

### Component Tests
- UI component rendering
- User interactions (clicks, inputs)
- Form validation
- Error states
- Loading states

### E2E Tests (Playwright)
- User workflows
- Authentication flows
- CRUD operations
- Navigation and routing

## Web Validation Commands

```bash
# Install dependencies
npm install

# Type check TypeScript
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Start locally for manual testing (ALWAYS use port 4000)
npm run dev

# Run E2E tests
npx playwright test

# Deploy Firebase indexes (if new queries added)
firebase deploy --only firestore:indexes
```
