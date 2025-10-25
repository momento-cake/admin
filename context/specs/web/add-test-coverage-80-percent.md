# Web Platform: Add 80% Test Coverage Implementation Guide

**Platform**: Web (Next.js 15.5 + React 19 + TypeScript)
**Project**: Moment Cake Admin
**Focus**: Unit & Integration testing for service layer, validators, hooks, components, and API routes

---

## Overview

This document provides web-specific implementation details for achieving 80% test coverage in the admin dashboard. It complements the master plan with React/Next.js-specific patterns, tools, and approaches.

---

## Technology Stack

### Core Testing Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 2.x | Test runner (recommended for Next.js) |
| **React Testing Library** | 16.x | Component testing |
| **@testing-library/user-event** | 14.x | User interaction simulation |
| **jsdom** | 24.x | DOM environment |
| **vitest-mock-extended** | 1.x | Advanced mocking |

### Firebase Mocking
| Tool | Purpose |
|------|---------|
| `vi.mock()` | Mock Firebase modules |
| Custom mock factories | Create test data |
| Test utilities | Setup/teardown helpers |

---

## Project Structure

### Current Source Structure
```
src/
├── app/
│   ├── dashboard/
│   ├── login/
│   ├── users/
│   ├── ingredients/
│   ├── recipes/
│   └── api/
│       ├── ingredients/
│       ├── recipes/
│       └── ...
├── components/
│   ├── auth/
│   ├── ingredients/
│   ├── recipes/
│   ├── suppliers/
│   ├── ui/
│   └── layouts/
├── hooks/
│   ├── useAuth.ts
│   ├── useRecipeCosts.ts
│   └── useDebounce.ts
├── lib/
│   ├── ingredients.ts
│   ├── recipes.ts
│   ├── suppliers.ts
│   ├── firebase-errors.ts
│   ├── validators/
│   │   ├── ingredient.ts
│   │   ├── recipe.ts
│   │   └── user.ts
│   └── firebase.ts
└── ...
```

### New Test Structure
```
src/__tests__/
├── setup.ts                          # Global test setup
├── mocks/
│   ├── firebase.ts                   # Firebase mocks
│   ├── data.ts                       # Test fixtures
│   └── nextRouter.ts                 # Next router mocks
├── helpers.ts                        # Test utilities
├── lib/
│   ├── ingredients.test.ts
│   ├── recipes.test.ts
│   ├── suppliers.test.ts
│   ├── firebase-errors.test.ts
│   └── validators/
│       ├── ingredient.test.ts
│       ├── recipe.test.ts
│       └── user.test.ts
├── hooks/
│   ├── useAuth.test.ts
│   ├── useRecipeCosts.test.ts
│   └── useDebounce.test.ts
├── components/
│   ├── auth/
│   │   └── LoginForm.test.tsx
│   ├── ingredients/
│   │   └── IngredientForm.test.tsx
│   ├── recipes/
│   │   └── RecipeForm.test.tsx
│   └── suppliers/
│       └── SupplierForm.test.tsx
└── app/api/
    ├── ingredients/
    │   ├── route.test.ts
    │   └── [id]/route.test.ts
    └── recipes/
        ├── route.test.ts
        └── [id]/route.test.ts
```

---

## Setup & Configuration

### 1. Install Dependencies

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest-mock-extended jsdom
```

### 2. Create vitest.config.ts

```typescript
import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/__tests__/**',
        'src/app/api/**', // Covered by integration tests
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.next'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 3. Create Test Setup File (src/__tests__/setup.ts)

```typescript
import '@testing-library/jest-dom'
import {vi} from 'vitest'
import {mockFirebase, mockFirebaseAuth, mockFirestore} from './mocks/firebase'

// Setup global mocks
global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

// Mock Next router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/dashboard',
    query: {},
    asPath: '/dashboard',
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}))

// Setup Firebase mocks
vi.mock('firebase/app', () => ({
  getApp: mockFirebase.getApp,
  initializeApp: mockFirebase.initializeApp,
}))

vi.mock('firebase/auth', () => mockFirebaseAuth)

vi.mock('firebase/firestore', () => mockFirestore)

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = vi.fn()
})

afterAll(() => {
  console.error = originalError
})
```

### 4. Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

---

## Firebase Mocking Strategy

### Create src/__tests__/mocks/firebase.ts

```typescript
import {vi, Mock} from 'vitest'
import type {User, Auth} from 'firebase/auth'
import type {Firestore, Query, DocumentSnapshot} from 'firebase/firestore'

// Mock Firestore
export const mockFirestore = {
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: () => ({toDate: () => new Date()}),
    fromDate: (date: Date) => ({toDate: () => date}),
  },
}

// Mock Firebase Auth
export const mockUser: User = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  isAnonymous: false,
  metadata: {} as any,
  providerData: [],
  phoneNumber: null,
  tenantId: null,
  getIdToken: vi.fn().mockResolvedValue('token'),
  getIdTokenResult: vi.fn(),
  reload: vi.fn(),
  toJSON: vi.fn(),
  delete: vi.fn(),
  getDisplayName: vi.fn(),
} as any

export const mockAuth: Auth = {
  currentUser: mockUser,
  app: {} as any,
  languageCode: 'en',
  settings: {} as any,
  useDeviceLanguage: vi.fn(),
  signOut: vi.fn(),
  setPersistence: vi.fn(),
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
  updateCurrentUser: vi.fn(),
  beforeAuthStateChanged: vi.fn(),
  emulatorConfig: null,
  tenantId: null,
} as any

export const mockFirebaseAuth = {
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  confirmPasswordReset: vi.fn(),
  updateProfile: vi.fn(),
  Auth: vi.fn(),
}

// Mock Firebase App
export const mockFirebaseApp = {
  name: '[DEFAULT]',
  automaticDataCollectionEnabled: true,
}

export const mockFirebase = {
  getApp: vi.fn(() => mockFirebaseApp),
  initializeApp: vi.fn(() => mockFirebaseApp),
}

// Helper function to reset mocks
export const resetFirebaseMocks = () => {
  vi.clearAllMocks()
  mockAuth.currentUser = mockUser
}
```

### Create src/__tests__/mocks/data.ts

```typescript
import type {Ingredient, Recipe, Supplier} from '@/types' // Adjust import path

// Test Ingredient Factory
export const createMockIngredient = (overrides?: Partial<Ingredient>): Ingredient => ({
  id: 'ing-1',
  name: 'Flour',
  unit: 'kg',
  price: 5.50,
  quantity: 10,
  supplier: 'Supplier A',
  category: 'Dry Goods',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Test Recipe Factory
export const createMockRecipe = (overrides?: Partial<Recipe>): Recipe => ({
  id: 'rec-1',
  name: 'Pão de Queijo',
  description: 'Brazilian cheese bread',
  ingredients: [
    {ingredientId: 'ing-1', quantity: 2, unit: 'cups'},
  ],
  servings: 24,
  prepTime: 20,
  bakeTime: 25,
  totalCost: 12.50,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Test Supplier Factory
export const createMockSupplier = (overrides?: Partial<Supplier>): Supplier => ({
  id: 'sup-1',
  name: 'Local Supplier',
  email: 'supplier@example.com',
  phone: '+55 11 99999-9999',
  address: 'Street 123',
  city: 'São Paulo',
  state: 'SP',
  zipCode: '01234-567',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// Array of test data
export const mockIngredients = [
  createMockIngredient(),
  createMockIngredient({id: 'ing-2', name: 'Sugar'}),
  createMockIngredient({id: 'ing-3', name: 'Eggs'}),
]

export const mockRecipes = [
  createMockRecipe(),
  createMockRecipe({id: 'rec-2', name: 'Bolo de Chocolate'}),
]

export const mockSuppliers = [
  createMockSupplier(),
  createMockSupplier({id: 'sup-2', name: 'Premium Supplier'}),
]
```

### Create src/__tests__/helpers.ts

```typescript
import {render as rtlRender, RenderOptions} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {ReactElement} from 'react'
import {resetFirebaseMocks} from './mocks/firebase'

// Wrapper for context providers
const AllTheProviders = ({children}: {children: React.ReactNode}) => {
  return <>{children}</>
}

// Custom render function with providers
const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  rtlRender(ui, {wrapper: AllTheProviders, ...options})

// Re-export everything from RTL
export * from '@testing-library/react'
export {render, userEvent}

// Test utilities
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

export const setupTest = () => {
  resetFirebaseMocks()
  return {userEvent: userEvent.setup()}
}
```

---

## Testing Patterns by Layer

### 1. Service Layer Testing Pattern

```typescript
// src/__tests__/lib/ingredients.test.ts
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from '@/lib/ingredients'
import {mockIngredients, createMockIngredient} from '../mocks/data'
import {mockFirestore} from '../mocks/firebase'

describe('ingredients service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getIngredients', () => {
    it('should fetch all ingredients', async () => {
      mockFirestore.collection = vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{data: () => mockIngredients[0]}],
        }),
      })

      const result = await getIngredients()
      expect(result).toEqual(expect.any(Array))
      expect(mockFirestore.collection).toHaveBeenCalledWith('ingredients')
    })

    it('should handle Firestore errors', async () => {
      mockFirestore.collection = vi.fn().mockReturnValue({
        get: vi.fn().mockRejectedValue(new Error('Network error')),
      })

      await expect(getIngredients()).rejects.toThrow('Network error')
    })
  })

  describe('createIngredient', () => {
    it('should create ingredient with valid data', async () => {
      const mockData = createMockIngredient()
      mockFirestore.collection = vi.fn().mockReturnValue({
        add: vi.fn().mockResolvedValue({id: 'new-id'}),
      })

      const result = await createIngredient(mockData)
      expect(result).toBeDefined()
      expect(mockFirestore.collection).toHaveBeenCalledWith('ingredients')
    })

    it('should validate required fields', async () => {
      const invalidData = {name: '', price: -5}
      await expect(createIngredient(invalidData as any)).rejects.toThrow()
    })
  })
})
```

### 2. Validator Testing Pattern

```typescript
// src/__tests__/lib/validators/ingredient.test.ts
import {describe, it, expect} from 'vitest'
import {ingredientSchema} from '@/lib/validators/ingredient'

describe('ingredient validators', () => {
  it('should validate correct ingredient data', () => {
    const validData = {
      name: 'Flour',
      unit: 'kg',
      price: 5.50,
      quantity: 10,
    }

    const result = ingredientSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject negative price', () => {
    const invalidData = {
      name: 'Flour',
      unit: 'kg',
      price: -5.50,
      quantity: 10,
    }

    const result = ingredientSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({path: ['price']})
    )
  })

  it('should reject missing required fields', () => {
    const result = ingredientSchema.safeParse({name: 'Flour'})
    expect(result.success).toBe(false)
  })
})
```

### 3. Hook Testing Pattern

```typescript
// src/__tests__/hooks/useAuth.test.ts
import {describe, it, expect, beforeEach} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {useAuth} from '@/hooks/useAuth'
import {mockUser, resetFirebaseMocks} from '../mocks/firebase'

describe('useAuth', () => {
  beforeEach(() => {
    resetFirebaseMocks()
  })

  it('should return user when authenticated', async () => {
    const {result} = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
    })
  })

  it('should return null when user not authenticated', async () => {
    resetFirebaseMocks()
    // Set current user to null
    const {result} = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.user).toBeNull()
    })
  })

  it('should provide login function', () => {
    const {result} = renderHook(() => useAuth())
    expect(result.current.login).toBeDefined()
    expect(typeof result.current.login).toBe('function')
  })
})
```

### 4. Component Testing Pattern

```typescript
// src/__tests__/components/auth/LoginForm.test.tsx
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {render, userEvent, screen, waitFor} from '../helpers'
import {LoginForm} from '@/components/auth/LoginForm'

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form', () => {
    render(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', {name: /login|entrar/i})).toBeInTheDocument()
  })

  it('should submit form with valid credentials', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', {name: /login|entrar/i}))

    await waitFor(() => {
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', {name: /login|entrar/i}))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')

    const submitButton = screen.getByRole('button', {name: /login|entrar/i})
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })
})
```

### 5. API Route Testing Pattern

```typescript
// src/__tests__/app/api/ingredients/route.test.ts
import {describe, it, expect, beforeEach, vi} from 'vitest'
import {GET, POST} from '@/app/api/ingredients/route'
import {createMockIngredient} from '../../mocks/data'

describe('GET /api/ingredients', () => {
  it('should return all ingredients', async () => {
    const req = new Request('http://localhost:3001/api/ingredients')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(firestore.collection).mockImplementation(() => {
      throw new Error('Database error')
    })

    const req = new Request('http://localhost:3001/api/ingredients')
    const response = await GET(req)

    expect(response.status).toBe(500)
  })
})

describe('POST /api/ingredients', () => {
  it('should create new ingredient', async () => {
    const body = createMockIngredient()
    const req = new Request('http://localhost:3001/api/ingredients', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const response = await POST(req)
    expect(response.status).toBe(201)
  })

  it('should reject invalid data', async () => {
    const req = new Request('http://localhost:3001/api/ingredients', {
      method: 'POST',
      body: JSON.stringify({name: ''}),
    })

    const response = await POST(req)
    expect(response.status).toBe(400)
  })
})
```

---

## Coverage Analysis & Reporting

### Generate Coverage Report

```bash
npm run test:coverage
```

### Coverage Thresholds (vitest.config.ts)
```typescript
coverage: {
  thresholds: {
    lines: 80,           // 80% of all lines executed
    functions: 80,       // 80% of all functions called
    branches: 75,        // 75% of branches covered
    statements: 80,      // 80% of statements executed
  },
}
```

### Files Requiring Special Coverage

**Critical Business Logic (90%+ target):**
- `src/lib/ingredients.ts`
- `src/lib/recipes.ts`
- `src/lib/suppliers.ts`

**Form Components (85%+ target):**
- `src/components/*/Form.tsx`

**Validators (95%+ target):**
- `src/lib/validators/*.ts`

---

## Best Practices for Web Testing

### 1. Isolated Test Cases
- Each test should test one thing
- No shared state between tests
- Use beforeEach/afterEach for cleanup

### 2. Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => {})

// ✅ Good
it('should create ingredient with valid data and return new ID', () => {})
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should update ingredient price', async () => {
  // Arrange
  const ingredient = createMockIngredient()

  // Act
  const result = await updateIngredient(ingredient.id, {price: 10.50})

  // Assert
  expect(result.price).toBe(10.50)
})
```

### 4. Mock External Dependencies
- Mock Firebase calls
- Mock API requests
- Mock router navigation
- Keep mocks close to test file

### 5. Test User Interactions
```typescript
// Use @testing-library/user-event for realistic interactions
const user = userEvent.setup()
await user.type(input, 'text')
await user.click(button)
```

### 6. Avoid Implementation Details
```typescript
// ❌ Bad - Testing implementation
expect(component.state.isLoading).toBe(false)

// ✅ Good - Testing user experience
expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
```

---

## Running Tests

### Watch Mode (Development)
```bash
npm run test:watch
```

### Run Once (CI/CD)
```bash
npm run test:run
```

### With Coverage
```bash
npm run test:coverage
```

### UI Dashboard
```bash
npm run test:ui
```

### Specific File
```bash
npm test -- src/lib/ingredients.test.ts
```

---

## Integration with CI/CD

### GitHub Actions Configuration

```yaml
name: Tests & Coverage

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Performance Considerations

### Test Execution Time Goals
- **Total suite**: < 30 seconds
- **Average test**: < 100ms
- **Slow tests**: > 500ms (investigate and optimize)

### Optimization Tips
1. Use `vi.mock()` instead of `vi.spy()` for external modules
2. Avoid async operations in `describe` blocks
3. Use `beforeEach()` instead of `beforeAll()` for isolation
4. Batch related tests in describe blocks
5. Use `vi.stubGlobal()` for global mocks

---

## Troubleshooting Common Issues

### Issue: Firebase Mocks Not Working

**Problem**: Tests fail with "Firebase is not initialized"

**Solution**:
```typescript
// Ensure mocks are set up in setup.ts BEFORE tests run
beforeEach(() => {
  resetFirebaseMocks()
})
```

### Issue: React Hooks Errors in Tests

**Problem**: "Error: Hooks can only be called inside the body of a function component"

**Solution**:
```typescript
// Use renderHook for testing hooks
const {result} = renderHook(() => useAuth())
```

### Issue: Async Tests Timing Out

**Problem**: Test times out waiting for async operations

**Solution**:
```typescript
// Use waitFor with appropriate timeout
await waitFor(() => {
  expect(result).toBeDefined()
}, {timeout: 3000})
```

---

## Documentation & Examples

- See master plan: `context/specs/0_master/add-test-coverage-80-percent.md`
- See testing examples: `.temp/test-examples/` (temporary)
- See Firebase mocking: `src/__tests__/mocks/firebase.ts`

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-10-25
