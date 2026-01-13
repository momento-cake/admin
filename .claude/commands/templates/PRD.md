# PRD: <Work Item Title>

> **File Location**: `context/specs/{SCOPE}/PRD.md`
> **Scope**: {SCOPE} (e.g., "offline-product-photos")

## Metadata
**Scope Name**: `{URL-friendly scope name, e.g., "offline-product-photos"}` *(REQUIRED)*
**Type**: `<feature | bug | chore | task | refactor>`
**Complexity**: `<low | medium | high>`

---

## Work Item Description

### Overview
_Describe what needs to be done and why. For features, explain the value. For bugs, describe the symptom. For chores, explain the technical need._

**For Features:**
- What problem does this solve?
- What value does it provide to users?

**For Bugs:**
- **Symptom**: What the user sees/experiences
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Impact**: Who is affected and how severely?

**For Chores/Tasks:**
- What technical improvement or maintenance is needed?
- Why is this important now?

---

## Problem & Solution

### Problem Statement
_Clearly define the specific problem, pain point, or opportunity this work addresses._

### Solution Statement
_Describe the proposed approach and how it solves the problem. Include high-level technical approach and key design decisions._

**For Bugs - Root Cause Analysis:**
- **Investigation Steps**:
  1. What was examined
  2. What was discovered
  3. How root cause was identified
- **Root Cause**: Technical explanation of WHY the bug occurs
  - **File**: `<path>`
  - **Function/Component**: `<name>`
  - **Line**: `<number>`
  - **Issue**: Null pointer, incorrect logic, missing validation, etc.
  - **Why It Fails**: Logical/technical reason

---

## User Story _(if applicable)_
As a **<type of user>**
I want to **<action/goal>**
So that **<benefit/value>**

---

## Web Architecture

### Pages & Routing
**Affected Pages**:
- `<PageName>` - _Purpose and user flow_
  - **Route**: `/<route_path>`
  - **File**: `app/<route_path>/page.tsx`
  - **Layout**: _If using specific layout_
  - **Auth Required**: _Yes/No_

**Navigation Changes**:
- _Describe any new routes or navigation flow changes_
- _Next.js App Router conventions followed_

### Components

**UI Components**:
- `<ComponentName>` - _Component purpose and reusability_
  - **Location**: `src/components/<path>/<ComponentName>.tsx`
  - **Props**: _Key props and their types_
  - **shadcn/ui**: _Which shadcn components used_

**Example Component Structure**:
```typescript
interface ComponentNameProps {
  data: DataType;
  onAction?: (id: string) => void;
}

export function ComponentName({ data, onAction }: ComponentNameProps) {
  // Implementation
}
```

### Hooks

**Custom Hooks**:
- `use<FeatureName>` - _Hook purpose and state management_
  - **Location**: `src/hooks/use<FeatureName>.ts`
  - **Returns**: _Return type and values_
  - **Side Effects**: _API calls, subscriptions, etc._

**Example Hook Pattern**:
```typescript
export function useFeature() {
  const [data, setData] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Implementation

  return { data, loading, error };
}
```

### Services Layer

**Business Logic Services**:
- `<featureName>Service` - _Service responsibilities_
  - **Location**: `src/services/<featureName>Service.ts`
  - **Methods**: _Key functions and their purposes_
  - **Dependencies**: _Other services, Firebase, etc._

**Example Service Pattern**:
```typescript
export const featureService = {
  async create(data: InputType): Promise<ReturnType> {
    // Implementation with error handling
  },

  async getById(id: string): Promise<ReturnType | null> {
    // Implementation
  },

  async update(id: string, data: Partial<InputType>): Promise<ReturnType> {
    // Implementation
  },

  async delete(id: string): Promise<void> {
    // Implementation
  },
};
```

### Firebase Integration

**Firestore Collections**:
- `<collectionName>` - _Collection purpose and document structure_
  - **Document Structure**: `{ field1: type, field2: type, ... }`
  - **Indexes**: _Required indexes_
  - **Security Rules**: _Access control requirements_

**Firebase Operations**:
- _List key Firestore operations (reads, writes, queries, subscriptions)_
- _Authentication requirements_
- _Firebase Storage requirements (if applicable)_

**Example Firestore Pattern**:
```typescript
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';

const COLLECTION_NAME = 'features';

export const featureFirestore = {
  async create(data: FeatureInput): Promise<Feature> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const feature: Feature = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, feature);
    return feature;
  },
  // More methods...
};
```

### Types & Schemas

**TypeScript Types**:
- `<TypeName>` - _Type purpose and usage_
  - **Location**: `src/types/<typeName>.ts`
  - **Fields**: _Interface/type definition_

**Zod Validation Schemas**:
- `<schemaName>Schema` - _Validation schema_
  - **Location**: `src/schemas/<schemaName>.ts`
  - **Validations**: _Key validation rules_

**Example Type & Schema**:
```typescript
// src/types/feature.ts
export interface Feature {
  id: string;
  title: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export type FeatureInput = Omit<Feature, 'id' | 'createdAt' | 'updatedAt'>;

// src/schemas/feature.ts
import { z } from 'zod';

export const featureSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  status: z.enum(['draft', 'active', 'archived']),
});

export type FeatureFormData = z.infer<typeof featureSchema>;
```

### State Management

**Approach**: _Context API / Zustand / React Query / None_

**If using Context**:
- `<Feature>Context` - _Context purpose_
  - **Location**: `src/contexts/<Feature>Context.tsx`
  - **State**: _What state is managed_
  - **Actions**: _Available actions/methods_

**If using Zustand**:
- `<feature>Store` - _Store purpose_
  - **Location**: `src/stores/<feature>Store.ts`
  - **State**: _Store state shape_
  - **Actions**: _Store actions_

### API Routes _(if applicable)_

**API Endpoints**:
- `POST /api/<resource>` - _Endpoint purpose_
  - **Location**: `app/api/<resource>/route.ts`
  - **Request**: _Request body shape_
  - **Response**: _Response shape_
  - **Auth**: _Authentication requirements_

---

## Implementation Strategy

### Approach
_Describe the overall implementation approach. Examples: incremental rollout, feature flags, phased development, etc._

**For Bugs:**
- **Minimal Fix Strategy**: Target root cause only, avoid scope creep
- **Regression Prevention**: Add tests to prevent recurrence

**For Features:**
- **Phased Approach**: Break into logical phases (data → services → UI → testing)
- **Incremental Testing**: Test each layer as implemented

### File Changes

**Files to Modify**:
- `<file_path>` - _Purpose of modification_
- `<file_path>` - _Purpose of modification_

**New Files to Create**:
- `<file_path>` - _Purpose of new file_
- `<file_path>` - _Purpose of new file_

**Files to Reference** _(for patterns)_:
- `<file_path>` - _Existing pattern to follow_
- `<file_path>` - _Similar implementation to reference_

---

## Examples and References

### Similar Implementations
_Reference existing pages/components/services with similar patterns_

**Pages**:
- `<ExistingPage>` at `app/<path>/page.tsx` - _What to learn from this example_

**Components**:
- `<ExistingComponent>` at `src/components/<path>` - _Pattern to follow_

**Services**:
- `<ExistingService>` at `src/services/<name>Service.ts` - _Data layer pattern_

**Firebase Patterns**:
- `<ExistingFirebaseCode>` at `src/lib/firebase/<name>.ts` - _Firebase integration pattern_

### Testing Patterns
_Point to existing test files that demonstrate testing patterns_

**Unit Tests**:
- `tests/unit/services/<name>.test.ts` - _Service testing pattern_

**E2E Tests**:
- `tests/e2e/<feature>.spec.ts` - _Playwright test pattern_

---

## Implementation Tasks

### Phase 1: Data Layer
**Objective**: Define types, schemas, and Firebase operations

- [ ] Create TypeScript interfaces/types in `src/types/`
- [ ] Create Zod validation schemas in `src/schemas/`
- [ ] Implement Firebase service in `src/services/` or `src/lib/firebase/`
- [ ] Add Firebase security rules (if needed)
- [ ] Write unit tests for service functions
- [ ] Run: `npm run test` to verify tests pass
- [ ] Run: `npm run build` to verify TypeScript compilation

**Validation**:
```bash
npm run test -- tests/unit/services/<service>.test.ts
npm run build
```

### Phase 2: Business Logic & Hooks
**Objective**: Implement business logic and custom React hooks

- [ ] Create custom hooks in `src/hooks/`
- [ ] Implement state management (if needed)
- [ ] Add error handling and loading states
- [ ] Write tests for hooks (if applicable)
- [ ] Run: `npm run test` to verify tests pass

**Validation**:
```bash
npm run test
npm run lint
```

### Phase 3: UI Components
**Objective**: Build reusable UI components

- [ ] Create component files in `src/components/`
- [ ] Use shadcn/ui components for UI consistency
- [ ] Implement responsive design with Tailwind CSS
- [ ] Add proper TypeScript prop types
- [ ] Add loading and error states
- [ ] Write component tests (if applicable)

**Validation**:
```bash
npm run test
npm run lint
npm run build
```

### Phase 4: Pages & Routing
**Objective**: Create Next.js pages and routing

- [ ] Create page files in `app/` directory
- [ ] Add `loading.tsx` for loading states
- [ ] Add `error.tsx` for error boundaries
- [ ] Implement proper SEO metadata
- [ ] Add authentication checks (if needed)
- [ ] Test page navigation and flows

**Validation**:
```bash
npm run dev
# Manual testing in browser
```

### Phase 5: Testing & Validation
**Objective**: Comprehensive testing and quality assurance

- [ ] Add missing unit tests
- [ ] Create E2E tests with Playwright
- [ ] Test edge cases (empty data, errors, loading states)
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Run full test suite: `npm run test`
- [ ] Run E2E tests: `npx playwright test`
- [ ] Run linter: `npm run lint`
- [ ] Run build: `npm run build`
- [ ] Manual testing in dev environment
- [ ] Verify all acceptance criteria met

**Validation**:
```bash
npm run test
npx playwright test
npm run lint
npm run build
npm run dev
# Manual testing
```

---

## Testing Strategy

### Unit Tests
**Scope**: Services, utilities, helper functions, hooks

**Tools**: Vitest / Jest

**Coverage Goals**: >80% for new code

**Test Files**:
- `tests/unit/services/<service>.test.ts`
- `tests/unit/utils/<utility>.test.ts`

**Example Test Structure**:
```typescript
import { describe, it, expect } from 'vitest';
import { myService } from '@/services/myService';

describe('myService', () => {
  it('should handle successful operation', async () => {
    const result = await myService.doSomething(validInput);
    expect(result).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    await expect(myService.doSomething(invalidInput))
      .rejects.toThrow('Expected error');
  });
});
```

### Component Tests _(if applicable)_
**Scope**: React components, rendering, interactions

**Tools**: Vitest + Testing Library / Jest

**Test Files**:
- `tests/unit/components/<component>.test.tsx`

### E2E Tests
**Scope**: Critical user flows, integration testing

**Tools**: Playwright

**Test Files**:
- `tests/e2e/<feature>.spec.ts`

**Example E2E Test**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Flow', () => {
  test('should complete user journey', async ({ page }) => {
    await page.goto('http://localhost:4000/feature');

    // Interact with UI
    await page.fill('input[name="title"]', 'Test');
    await page.click('button[type="submit"]');

    // Assert outcome
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

### Edge Cases to Test
- [ ] Empty data states
- [ ] Network failures
- [ ] Invalid input/validation errors
- [ ] Loading states
- [ ] Error states
- [ ] Permission errors (unauthorized)
- [ ] Concurrent operations
- [ ] Large datasets

---

## Acceptance Criteria

### Functional Requirements
- [ ] _Specific, measurable criterion 1_
- [ ] _Specific, measurable criterion 2_
- [ ] _Specific, measurable criterion 3_

**For Features:**
- [ ] Feature works as described in user story
- [ ] All user flows complete successfully
- [ ] Data persists correctly in Firebase
- [ ] Responsive design works on mobile, tablet, desktop

**For Bugs:**
- [ ] Bug no longer reproduces
- [ ] Root cause addressed
- [ ] Test added to prevent regression

### Technical Requirements
- [ ] All tests passing (unit + E2E)
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Build succeeds without warnings
- [ ] Follows existing code patterns
- [ ] Proper error handling implemented
- [ ] Loading states implemented
- [ ] Responsive design implemented

### Quality Gates
- [ ] Code self-reviewed
- [ ] No debug code or console.logs
- [ ] Documentation updated (if needed)
- [ ] Manual testing completed
- [ ] No performance regressions
- [ ] Accessibility considerations addressed

---

## Validation Commands

```bash
# Type checking
npm run build

# Unit tests
npm run test

# E2E tests
npx playwright test

# Linting
npm run lint

# Development testing
npm run dev
# Then open http://localhost:4000

# Production build test
npm run build
npm run start
```

---

## Notes & Learnings

### Related Issues
_List related scopes, issues, or dependencies_

### Technical Debt
_Document any technical debt introduced or identified_

### Future Improvements
_Ideas for future enhancements_

**For Bugs:**
### Prevention Strategies
_How to prevent similar bugs in the future_

### Lessons Learned
_What was learned during this work_

---

## AI Handoff Phases

_This section is automatically generated and saved to `ai-handoff.json` during planning._

**Location**: `context/specs/{SCOPE}/ai-handoff.json`

**Phase Structure**:
1. **Data Layer**: Types, schemas, Firebase services
2. **Business Logic**: Custom hooks, state management
3. **UI Components**: React components, shadcn/ui integration
4. **Pages & Routing**: Next.js pages, navigation
5. **Testing & Validation**: Comprehensive testing, quality checks

Each phase includes:
- Phase number and name
- Detailed implementation prompt
- Dependencies on previous phases
- Success criteria and validation commands
