# Momento Cake Admin - Web Development Guide

## Overview

The Momento Cake Admin web dashboard is a React-based administrative interface for managing bakery operations. Built with Next.js, TailwindCSS, and Firebase integration, it provides:

- User management (admins and staff)
- Recipe management and inventory
- Ingredient tracking and supplier management
- Dashboard analytics and reporting

## Technology Stack

**Frontend Framework:**
- Next.js 14+ with App Router
- React 18+ with functional components and hooks
- TypeScript for type safety

**UI & Styling:**
- TailwindCSS for utility-first styling
- Shadcn UI components for consistent design
- Responsive design patterns (mobile-first)

**State Management:**
- React Context for global state (auth, user preferences)
- useState/useReducer for component-level state
- No external state management (Redux, Zustand) required unless complexity grows

**Data Fetching & Sync:**
- Firebase Firestore for document storage
- Firebase Auth for authentication
- Real-time listeners where appropriate
- Batch operations for multiple updates

**Testing & Quality:**
- Playwright for E2E testing
- Jest for unit testing
- React Testing Library for component testing

**Development Environment:**
- ESLint for code linting
- Prettier for code formatting
- Node.js 18+ runtime

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── users/            # User management pages
│   │   ├── active/
│   │   └── invitations/
│   ├── ingredients/      # Ingredient pages
│   │   ├── inventory/
│   │   └── suppliers/
│   └── login/           # Authentication page
├── components/          # Reusable React components
│   ├── ui/             # Shadcn UI and custom UI components
│   ├── layout/         # Layout components (sidebar, header, etc)
│   ├── dashboard/      # Dashboard-specific components
│   ├── users/         # User management components
│   └── ingredients/   # Ingredient management components
├── lib/               # Utility functions and helpers
│   ├── firebase.ts   # Firebase configuration and auth
│   ├── types.ts      # TypeScript type definitions
│   └── utils.ts      # Helper functions
├── hooks/            # Custom React hooks
│   ├── useAuth.ts   # Authentication context hook
│   └── useFirestore.ts  # Firestore operations hook
└── styles/          # Global styles
    └── globals.css  # TailwindCSS and global styles

tests/
├── screenshots/      # Test screenshots
├── fixtures/        # Test data and mocks
└── *.spec.ts       # Playwright test files
```

## Component Patterns

### Page Components
Pages in `src/app/` follow the Next.js App Router conventions:
- Use async components for server-side data fetching
- Return JSX directly or use Client Components for interactivity
- Utilize layouts for consistent structure across pages

### UI Components
Located in `src/components/ui/`, these are:
- Self-contained, reusable components
- Composed from Shadcn UI components
- Fully typed with TypeScript
- Documented with prop types and examples

### Feature Components
Feature-specific components in `src/components/{feature}/`:
- Handle specific feature logic
- Use custom hooks for data fetching
- Manage local state with useState/useReducer
- Emit events via callbacks or context

### Custom Hooks
Reusable logic in `src/hooks/`:
- Encapsulate Firebase operations
- Manage authentication state
- Handle data fetching and caching
- Provide a clean API for components

## Firebase Integration

### Authentication
- Firebase Auth for user management
- JWT token-based authentication
- Role-based access control (admin, viewer)
- Custom claims for permission management

### Firestore Collections

**Users Collection:**
```
users/
├── {uid}/
│   ├── email: string
│   ├── name: string
│   ├── role: 'admin' | 'viewer'
│   ├── status: 'active' | 'inactive'
│   ├── createdAt: timestamp
│   └── lastLogin: timestamp
```

**Recipes Collection:**
```
recipes/
├── {recipeId}/
│   ├── name: string
│   ├── description: string
│   ├── ingredients: array
│   ├── instructions: array
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp
```

**Ingredients Collection:**
```
ingredients/
├── {ingredientId}/
│   ├── name: string
│   ├── quantity: number
│   ├── unit: string
│   ├── supplier: string
│   ├── cost: number
│   ├── createdAt: timestamp
│   └── lastRestocked: timestamp
```

### Firestore Security Rules
- Authenticate all users
- Validate user roles
- Restrict data access based on permissions
- Validate data on write operations

## Development Workflow

### Setting Up Development Environment

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   # Runs on http://localhost:3001
   ```

### Code Quality

**Type Checking:**
```bash
npm run type-check
```

**Linting:**
```bash
npm run lint
```

**Code Formatting:**
```bash
npx prettier --write .
```

### Testing

**E2E Tests with Playwright:**
```bash
npx playwright test
npx playwright test --ui          # With UI mode
npx playwright show-report        # View test report
```

**Unit & Component Tests:**
```bash
npm run test
npm run test -- --watch           # Watch mode
```

## Styling Guidelines

### TailwindCSS Usage
- Use utility classes for styling
- Avoid custom CSS when Tailwind covers it
- Follow mobile-first responsive design
- Use CSS variables for theming if needed

### Component Styling Patterns

**Functional Component:**
```tsx
export function Button({ variant = 'default', ...props }) {
  const baseClasses = 'px-4 py-2 rounded font-medium';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
  };

  return (
    <button className={`${baseClasses} ${variants[variant]}`} {...props} />
  );
}
```

**Using Shadcn Components:**
```tsx
import { Button } from '@/components/ui/button';

export function MyComponent() {
  return (
    <Button variant="outline" size="lg">
      Click me
    </Button>
  );
}
```

## Performance Considerations

### Code Splitting
- Use Next.js dynamic imports for large components
- Lazy load routes when appropriate
- Split large bundles strategically

### Image Optimization
- Use Next.js Image component
- Optimize images before committing
- Use responsive image sizes

### Data Fetching
- Use Firestore real-time listeners selectively
- Implement pagination for large lists
- Cache data appropriately
- Minimize Firestore reads

### Rendering Performance
- Memoize expensive computations with useMemo
- Memoize components with React.memo when needed
- Avoid unnecessary re-renders
- Use React DevTools for profiling

## Responsive Design

### Breakpoints
Follow TailwindCSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Approach
```tsx
// Start with mobile styles, add breakpoints for larger screens
<div className="px-4 md:px-8 lg:px-12">
  <h1 className="text-lg md:text-xl lg:text-2xl">Title</h1>
</div>
```

### Sidebar Navigation
- **Mobile (< 768px)**: Collapsible sidebar, hamburger menu
- **Desktop (≥ 768px)**: Fixed sidebar, expanded menu

## Authentication & Authorization

### User Roles
- **Admin**: Full access to all features
- **Viewer**: Read-only access to specific features

### Role-Based Access
```tsx
// Check user role in components
if (user?.role !== 'admin') {
  return <AccessDenied />;
}
```

### Protected Routes
- Implement route guards in middleware
- Check authentication on page load
- Redirect unauthenticated users to login

## Error Handling

### Firebase Errors
```tsx
try {
  await updateDoc(doc(db, 'users', userId), data);
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle auth error
  } else if (error.code === 'not-found') {
    // Handle not found
  } else {
    // Handle other errors
  }
}
```

### User Feedback
- Show toast notifications for success/error messages
- Implement error boundaries for graceful fallback
- Log errors for debugging

## Common Development Tasks

### Adding a New Page
1. Create page component in `src/app/{feature}/{page}/page.tsx`
2. Add navigation menu item in layout
3. Create feature components in `src/components/{feature}/`
4. Add types to `src/lib/types.ts`
5. Write E2E tests in `tests/{feature}.spec.ts`

### Adding a New Component
1. Create component in appropriate subdirectory
2. Add TypeScript types for props
3. Export from barrel file if in `ui/` directory
4. Use Shadcn components where applicable
5. Write component tests if complex

### Fetching Data from Firestore
1. Create custom hook in `src/hooks/`
2. Use Firestore query/listener
3. Handle loading/error states
4. Return typed data
5. Use hook in component

## Testing Strategy

### E2E Testing (Playwright)
- Test critical user workflows
- Login/authentication flows
- Navigation and page interactions
- Form submissions
- Data persistence

### Unit Testing
- Component rendering and props
- Custom hook behavior
- Utility function logic
- Firebase integration mocks

### Test Coverage Goals
- Aim for >80% code coverage
- Focus on business-critical logic
- Test edge cases
- Include accessibility checks

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set Firebase config for production project
- Update API endpoints
- Enable appropriate security rules

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Type checking passes
- [ ] No lint errors
- [ ] Firebase security rules updated
- [ ] Environment variables configured
- [ ] Manual testing completed

## Debugging

### Browser DevTools
- React DevTools extension for component inspection
- Network tab for Firebase API calls
- Console for JavaScript errors
- Application tab for localStorage/sessionStorage

### Firebase Console
- Monitor Firestore operations
- Check authentication logs
- View security rule violations
- Monitor usage and quotas

### Logging
```tsx
// Use console methods appropriately
console.log('User data:', userData);     // General info
console.warn('Performance issue', time); // Warnings
console.error('Failed to fetch', error); // Errors
```

## Best Practices

### Code Organization
- Keep components focused and single-responsibility
- Use meaningful naming conventions
- Group related functionality together
- Keep file sizes manageable

### TypeScript
- Use strict mode
- Define types for all props and return values
- Avoid `any` type - use `unknown` with type guards
- Use interfaces for object shapes

### Component Design
- Props should be minimal and focused
- Use composition over inheritance
- Lift state up only when needed
- Extract complex logic into custom hooks

### Performance
- Monitor bundle size
- Use React.lazy for code splitting
- Optimize images and assets
- Profile with React DevTools

### Security
- Validate all user inputs
- Never store sensitive data in localStorage
- Use Firebase security rules
- Implement CORS properly
- Sanitize user-generated content

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Playwright Documentation](https://playwright.dev)
