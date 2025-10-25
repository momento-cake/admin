# Chore: Add 80% Test Coverage to Admin Project

**Status**: Plan Document
**Created**: 2025-10-25
**Platforms**: Web (Next.js/React)
**Complexity**: High
**Estimated Effort**: 102 hours (3 weeks)

---

## Executive Summary

This chore adds comprehensive unit and integration test coverage to the Momento Cake Admin project, bringing test coverage from 0% to 80%+. Currently, the project has excellent E2E test coverage (38 Playwright tests) but zero unit tests, leaving ~10,000 lines of critical business logic untested.

**Current State:**
- ✅ 38 E2E tests (Playwright) - User workflows
- ❌ 0 unit tests - Service layer, validators, hooks, components
- ❌ 0 integration tests - API routes, component interactions

**Target State:**
- ✅ 38 E2E tests (unchanged)
- ✅ 180+ unit tests - Service layer, validators, hooks, components
- ✅ 80+ integration tests - API routes, critical workflows
- **Result: 80%+ code coverage across all platforms**

---

## Motivation

1. **Risk Reduction**: Untested business logic (62 KB service layer) is a major liability
2. **Quality Assurance**: Catch bugs before they reach production
3. **Refactoring Safety**: Tests enable confident code improvements
4. **Maintainability**: Clear test cases document expected behavior
5. **CI/CD Integration**: Automated quality gates for releases

---

## Scope

### Included
- Unit tests for service layer (ingredients, recipes, suppliers, etc.)
- Unit tests for Zod validators (120+ schemas)
- Unit tests for custom hooks (useAuth, useRecipeCosts, useDebounce)
- Component tests for forms and feature components
- Integration tests for API routes
- Test infrastructure setup (Vitest, RTL, mocking utilities)
- Firebase mocking utilities for consistent testing

### Excluded
- Third-party library code (Radix UI, Shadcn, Firebase SDK)
- Generated files and configuration
- E2E tests (already comprehensive with Playwright)
- Backend/API server code (outside project scope)

---

## Architecture & Approach

### Testing Strategy: Phased, Bottom-Up

```
Week 1: Foundation & Service Layer
├── Setup test infrastructure (Vitest, RTL, mocks)
├── Create Firebase mocking utilities
├── Test service layer (ingredients, recipes, suppliers)
└── Test validators (Zod schemas)

Week 2: Hooks & Utilities
├── Test custom hooks (useAuth, useRecipeCosts, useDebounce)
├── Test utility functions
└── Test API route handlers

Week 3: Components & Integration
├── Test component rendering
├── Test form interactions
├── Test component integration
└── Validation & coverage reporting
```

### Test Coverage Target Breakdown

| Layer | Component | Target Tests | Coverage % |
|-------|-----------|--------------|-----------|
| Service | ingredients.ts | 50 | 90% |
| Service | recipes.ts | 70 | 90% |
| Service | suppliers.ts | 35 | 90% |
| Service | Other services | 20 | 85% |
| Validators | Ingredient schemas | 30 | 95% |
| Validators | Recipe schemas | 15 | 95% |
| Validators | Other schemas | 10 | 95% |
| Hooks | useAuth | 25 | 90% |
| Hooks | useRecipeCosts | 15 | 90% |
| Hooks | useDebounce | 10 | 90% |
| Components | Forms (4 major) | 80 | 85% |
| Components | Other components | 25 | 75% |
| API Routes | Ingredient endpoints | 25 | 90% |
| API Routes | Recipe endpoints | 20 | 90% |
| API Routes | Other endpoints | 15 | 85% |
| **TOTAL** | | **425 tests** | **80%+** |

---

## Implementation Plan

### Phase 1: Setup & Infrastructure (4 hours)

**1.1 Install & Configure Vitest**
- [ ] Add Vitest, @testing-library/react, @testing-library/jest-dom to devDependencies
- [ ] Create `vitest.config.ts` with Next.js support
- [ ] Update `tsconfig.json` for test type definitions
- [ ] Add test script to `package.json`

**1.2 Create Firebase Mocking Utilities**
- [ ] Create `src/__tests__/mocks/firebase.ts` - Mock Auth, Firestore
- [ ] Create `src/__tests__/mocks/data.ts` - Test fixtures and factories
- [ ] Create `src/__tests__/setup.ts` - Global test setup
- [ ] Create `src/__tests__/helpers.ts` - Common test utilities

**1.3 Setup Test Directory Structure**
- [ ] Create `src/__tests__/` directory structure
- [ ] Mirror source structure: `src/__tests__/lib/`, `src/__tests__/hooks/`, etc.
- [ ] Create `tests/unit/` for unit tests
- [ ] Create `tests/integration/` for integration tests

**1.4 Configure CI/CD Integration**
- [ ] Add coverage reporting to GitHub Actions
- [ ] Set coverage thresholds in `vitest.config.ts`
- [ ] Create `.nycrc.json` for coverage configuration

---

### Phase 2: Service Layer Tests (20 hours)

**2.1 Test ingredients.ts (8 hours)**
- [ ] Test ingredient CRUD operations
- [ ] Test ingredient search and filtering
- [ ] Test price calculations
- [ ] Test supplier associations
- [ ] Test error handling (50 test cases)

**2.2 Test recipes.ts (10 hours)**
- [ ] Test recipe CRUD operations
- [ ] Test recipe cost calculations
- [ ] Test ingredient associations
- [ ] Test recipe validation
- [ ] Test price history tracking (70 test cases)

**2.3 Test suppliers.ts (2 hours)**
- [ ] Test supplier CRUD operations
- [ ] Test supplier data validation
- [ ] Test error scenarios (35 test cases)

**2.4 Test Other Services (1 hour)**
- [ ] Test firebase-errors.ts error mapping
- [ ] Test invitations.ts logic
- [ ] Test price-history.ts calculations
- [ ] Test recipeSettings.ts (20 test cases)

---

### Phase 3: Validator Tests (8 hours)

**3.1 Test Ingredient Validators (2 hours)**
- [ ] Test ingredient schema validation
- [ ] Test required fields
- [ ] Test optional fields
- [ ] Test error messages (30 test cases)

**3.2 Test Recipe Validators (1 hour)**
- [ ] Test recipe schema validation
- [ ] Test ingredient associations
- [ ] Test cost calculations (15 test cases)

**3.3 Test User & Other Validators (1 hour)**
- [ ] Test user schema validation
- [ ] Test invitation schemas
- [ ] Test supplier schemas (10 test cases)

---

### Phase 4: Hook Tests (10 hours)

**4.1 Test useAuth Hook (5 hours)**
- [ ] Test authentication state management
- [ ] Test login/logout flows
- [ ] Test token refresh
- [ ] Test error handling
- [ ] Test permission checks (25 test cases)

**4.2 Test useRecipeCosts Hook (3 hours)**
- [ ] Test cost calculations
- [ ] Test ingredient price changes
- [ ] Test memoization
- [ ] Test error cases (15 test cases)

**4.3 Test useDebounce Hook (2 hours)**
- [ ] Test debounce timing
- [ ] Test cancellation
- [ ] Test cleanup (10 test cases)

---

### Phase 5: Component Tests (25 hours)

**5.1 Test Form Components (15 hours)**
- [ ] IngredientForm.tsx - 25 test cases (5 hours)
  - Render, input handling, validation, submission, error display
- [ ] RecipeForm.tsx - 40 test cases (8 hours)
  - Render, ingredient selection, cost calculations, form validation
- [ ] SupplierForm.tsx - 20 test cases (3 hours)
  - Render, field handling, validation, submission
- [ ] LoginForm.tsx - 20 test cases (4 hours)
  - Render, authentication flow, error handling

**5.2 Test Layout Components (5 hours)**
- [ ] Sidebar navigation - 15 test cases
- [ ] Header component - 10 test cases

**5.3 Test Feature Components (5 hours)**
- [ ] Ingredient list component - 10 test cases
- [ ] Recipe card component - 10 test cases
- [ ] Other feature components - 5 test cases

---

### Phase 6: API Route Tests (15 hours)

**6.1 Test Ingredient API Routes (5 hours)**
- [ ] GET /api/ingredients - List all
- [ ] GET /api/ingredients/[id] - Get single
- [ ] POST /api/ingredients - Create
- [ ] PUT /api/ingredients/[id] - Update
- [ ] DELETE /api/ingredients/[id] - Delete
- [ ] 25 test cases covering success, error, edge cases

**6.2 Test Recipe API Routes (5 hours)**
- [ ] GET /api/recipes - List all
- [ ] GET /api/recipes/[id] - Get single
- [ ] POST /api/recipes - Create
- [ ] PUT /api/recipes/[id] - Update
- [ ] DELETE /api/recipes/[id] - Delete
- [ ] 20 test cases covering success, error, edge cases

**6.3 Test Other API Routes (5 hours)**
- [ ] Invitations endpoints - 15 test cases
- [ ] Debug endpoint - 10 test cases
- [ ] Auth endpoints - 10 test cases

---

### Phase 7: Integration Tests (20 hours)

**7.1 Cross-Layer Integration Tests (10 hours)**
- [ ] Service → Validator integration - 15 test cases
- [ ] Component → Hook → Service flow - 20 test cases
- [ ] Form submission end-to-end - 15 test cases

**7.2 Firebase Integration Tests (5 hours)**
- [ ] Real Firestore operations (against emulator) - 20 test cases
- [ ] Auth flows with Firebase - 15 test cases

**7.3 Critical Business Workflows (5 hours)**
- [ ] Complete ingredient lifecycle - 10 test cases
- [ ] Complete recipe creation - 15 test cases
- [ ] Price update workflows - 10 test cases

---

### Phase 8: Validation & Coverage Reporting (5 hours)

**8.1 Coverage Verification**
- [ ] Run coverage reports for all layers
- [ ] Identify any areas below target
- [ ] Add missing edge case tests
- [ ] Document coverage per file

**8.2 Performance Testing**
- [ ] Verify test run time < 30 seconds
- [ ] Check for slow tests
- [ ] Optimize heavy tests if needed

**8.3 Documentation**
- [ ] Update README with testing guide
- [ ] Document test patterns used
- [ ] Create contributing guide for test writing
- [ ] Document Firebase mocking strategy

---

## Files to Modify/Create

### New Test Files (Primary)
```
src/__tests__/
├── setup.ts - Test environment setup
├── mocks/
│   ├── firebase.ts - Firebase Auth/Firestore mocks
│   └── data.ts - Test fixtures and factories
├── helpers.ts - Common test utilities
├── lib/
│   ├── ingredients.test.ts (50 tests)
│   ├── recipes.test.ts (70 tests)
│   ├── suppliers.test.ts (35 tests)
│   └── [other services].test.ts
├── lib/validators/
│   ├── ingredient.test.ts (30 tests)
│   ├── recipe.test.ts (15 tests)
│   └── [other validators].test.ts
├── hooks/
│   ├── useAuth.test.ts (25 tests)
│   ├── useRecipeCosts.test.ts (15 tests)
│   └── useDebounce.test.ts (10 tests)
├── components/
│   ├── auth/
│   │   └── LoginForm.test.tsx (20 tests)
│   ├── ingredients/
│   │   └── IngredientForm.test.tsx (25 tests)
│   ├── recipes/
│   │   └── RecipeForm.test.tsx (40 tests)
│   ├── suppliers/
│   │   └── SupplierForm.test.tsx (20 tests)
│   └── [other components].test.tsx
└── app/api/
    ├── ingredients/
    │   ├── route.test.ts (GET/POST tests)
    │   └── [id]/route.test.ts (GET/PUT/DELETE tests)
    ├── recipes/
    │   ├── route.test.ts (GET/POST tests)
    │   └── [id]/route.test.ts (GET/PUT/DELETE tests)
    └── [other routes].test.ts
```

### Configuration Files to Create/Update
```
vitest.config.ts - Vitest configuration
tsconfig.json - Update test type definitions
package.json - Add test scripts
.nycrc.json - Coverage configuration
```

---

## Testing Best Practices & Patterns

### 1. Service Layer Tests
```typescript
// Test pattern: Pure function testing with mocked Firebase
describe('ingredients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create ingredient with valid data', async () => {
    const result = await createIngredient(testData)
    expect(result).toBeDefined()
    expect(mockFirestore.add).toHaveBeenCalled()
  })

  it('should handle Firebase errors gracefully', async () => {
    mockFirestore.add.mockRejectedValueOnce(firebaseError)
    await expect(createIngredient(data)).rejects.toThrow()
  })
})
```

### 2. Validator Tests
```typescript
// Test pattern: Zod schema validation
describe('ingredient validators', () => {
  it('should validate correct ingredient data', () => {
    const result = ingredientSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('should reject invalid price', () => {
    const result = ingredientSchema.safeParse({...validData, price: -10})
    expect(result.success).toBe(false)
    expect(result.error.issues).toContainEqual(
      expect.objectContaining({message: expect.stringMatching(/positive/)})
    )
  })
})
```

### 3. Hook Tests
```typescript
// Test pattern: useAuth hook with mocked Firebase
describe('useAuth', () => {
  it('should return user when authenticated', () => {
    mockFirebaseAuth.currentUser = testUser
    const {result} = renderHook(() => useAuth())
    expect(result.current.user).toEqual(testUser)
  })
})
```

### 4. Component Tests
```typescript
// Test pattern: User interaction testing with RTL
describe('IngredientForm', () => {
  it('should submit form with valid data', async () => {
    const {getByLabelText, getByText} = render(<IngredientForm />)
    await user.type(getByLabelText(/name/i), 'Flour')
    await user.type(getByLabelText(/price/i), '10.50')
    await user.click(getByText(/submit/i))
    expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({name: 'Flour'}))
  })
})
```

### 5. API Route Tests
```typescript
// Test pattern: API endpoint testing
describe('GET /api/ingredients', () => {
  it('should return all ingredients', async () => {
    const response = await fetch('http://localhost:3001/api/ingredients')
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
```

---

## Testing Infrastructure Setup

### Dependencies to Add
```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/user-event": "^14.x",
    "vitest-mock-extended": "^1.x",
    "@vitest/ui": "^2.x",
    "jsdom": "^24.x"
  }
}
```

### Configuration Template (vitest.config.ts)
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
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

---

## Success Criteria

### Coverage Metrics
- [ ] **Line Coverage**: ≥80%
- [ ] **Branch Coverage**: ≥75%
- [ ] **Function Coverage**: ≥80%
- [ ] **Statement Coverage**: ≥80%

### Test Quality
- [ ] All tests passing locally
- [ ] All tests passing in CI/CD
- [ ] Average test execution time < 30 seconds
- [ ] No flaky tests (100% pass rate on 3 consecutive runs)

### Code Quality
- [ ] Zero TypeScript errors in test files
- [ ] Zero ESLint violations in tests
- [ ] All new tests follow established patterns
- [ ] Proper error handling in all tests

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Firebase mocking complexity | High | High | Create comprehensive mock utilities early, document patterns |
| Test maintenance burden | High | Medium | Follow established patterns, write maintainable tests |
| Performance degradation | Medium | Medium | Monitor test run time, optimize slow tests |
| Breaking test changes | Medium | Medium | Use feature branches, run tests in CI before merge |
| Incomplete coverage gaps | Medium | Low | Final validation phase catches remaining gaps |

---

## Timeline & Milestones

```
Week 1 (40 hours):
├── Day 1-2: Setup & infrastructure (8 hours)
├── Day 2-4: Service layer tests (16 hours)
├── Day 4-5: Validator tests (8 hours)
└── Milestone: Service layer complete, 30% coverage

Week 2 (40 hours):
├── Day 1-2: Hook tests (10 hours)
├── Day 2-4: API route tests (15 hours)
├── Day 4-5: Component tests (15 hours)
└── Milestone: All infrastructure & business logic tested, 60% coverage

Week 3 (22 hours):
├── Day 1-2: Integration tests (10 hours)
├── Day 3-4: Validation & coverage (8 hours)
├── Day 5: Buffer & final validation (4 hours)
└── Milestone: 80%+ coverage achieved
```

---

## Related Documentation

- **Testing Patterns**: See `context/specs/web/test-patterns.md` (to be created)
- **Firebase Mocking**: See `context/specs/web/firebase-testing.md` (to be created)
- **Component Testing Guide**: See `docs/testing/component-testing.md` (to be updated)

---

## Future Improvements

1. **Visual Regression Testing**: Add Percy or similar for UI testing
2. **E2E Performance Testing**: Add Lighthouse metrics to Playwright tests
3. **Mutation Testing**: Add Stryker to catch missed test cases
4. **Coverage Trends**: Track coverage metrics over time in CI/CD
5. **Test Data Management**: Migrate to dedicated test database fixtures

---

## Notes

- This plan prioritizes business logic (services → validators) before UI (components)
- Firebase mocking strategy is critical to test success - invest time in setup
- Phased approach allows early validation and course correction
- Coverage target is 80% - additional effort yields diminishing returns
- Test run time should remain < 30 seconds for developer velocity

---

**Plan Created**: 2025-10-25
**Last Updated**: 2025-10-25
**Status**: Ready for Phase 2 Implementation
