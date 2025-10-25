# Web Platform Architecture

## Pages and Routes
**Pages/Routes:**
- `/dashboard/<route>` - <description and purpose>

## Components
**Components:**
- `<ComponentName>` - <responsibility and props>
- shadcn/ui components to use: <list>

## State Management
**TanStack Query hooks:**
- `use<Resource>Query` - <query purpose>
- `use<Resource>Mutation` - <mutation purpose>

**Context/Store:**
- <if needed for global state>

## Forms
**Form Fields:**
- <list form fields>

**Validation:**
- Zod schemas for validation
- Error handling and user feedback

## Styling
**Tailwind CSS:**
- Custom classes and design system usage
- Responsive design considerations (mobile, tablet, desktop)

## Relevant Web Files
- `src/pages/<Page>.tsx` - <page purpose>
- `src/components/<Component>.tsx` - <component purpose>
- `src/hooks/use<Hook>.ts` - <hook functionality>
- `src/lib/api/<resource>.ts` - <API client functions>

## Web Implementation Tasks

### API Client
- [ ] Create API client functions in `src/lib/api/`
- [ ] Define TypeScript types for requests/responses
- [ ] Implement error handling
- [ ] Add request/response logging

### UI Components
- [ ] Create/customize shadcn/ui components
- [ ] Implement form components with validation (Zod)
- [ ] Add loading skeletons
- [ ] Implement error states
- [ ] Ensure responsive design (mobile, tablet, desktop)
- [ ] Write component tests

### Data Integration
- [ ] Create TanStack Query hooks (useQuery, useMutation)
- [ ] Implement optimistic updates
- [ ] Add error handling and retries
- [ ] Implement cache invalidation strategy
- [ ] Write integration tests

## Web Testing Strategy

### Component Tests
- UI component rendering
- User interactions (clicks, inputs)
- Form validation
- Error states
- Loading states

### Integration Tests
- Data fetching and mutations
- Routing and navigation
- Authentication flows
- API client functions

## Web Validation Commands

```bash
# Navigate to web directory
cd gango-web

# Install dependencies
npm install

# Type check TypeScript
npm run type-check

# Run linting
npm run lint

# Run unit tests
npm run test

# Build for production
npm run build

# Start web locally for manual testing
PORT=3001 npm run dev
```
