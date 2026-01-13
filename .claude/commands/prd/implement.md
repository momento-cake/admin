# Implement Plan

Execute the implementation of a feature, bug fix, or technical task following a plan created with `/plan` or provided directly.

## Purpose

This command implements a plan step-by-step, following best practices, Momento Cake's Next.js + Firebase architecture patterns, and the quality standards defined in CLAUDE.md.

## Variables

plan: $ARGUMENTS (optional: inline plan text or reference to plan file)

## Core Principles (ABSOLUTE PRIORITY)

Before starting ANY implementation, internalize these principles from CLAUDE.md:

### 1. Critical Thinking Enhancement
- Question assumptions and approaches
- Present alternatives and trade-offs
- Challenge requirements constructively
- Expose edge cases and potential issues

### 2. Transparent Reasoning
- Explain WHY before implementing
- Show alternatives considered
- Reveal trade-offs and decision points
- Document reasoning throughout

### 3. Upfront Information Gathering
- Ask ALL clarifying questions FIRST
- **CRITICAL**: If you ask questions, **STOP ALL WORK** and wait for answers
- Never proceed with assumptions or partial information
- Gather complete context before starting

### 4. Quality Over Speed
- Take time to think through solutions properly
- Prefer robust implementations over quick hacks
- If using workaround, flag it and suggest better long-term solution
- Better to solve correctly once than fix repeatedly

## Instructions

### Phase 1: Understanding & Preparation

#### 1.1 Read and Analyze Plan
- Read the entire plan carefully
- Understand objectives and acceptance criteria
- Review step-by-step tasks
- Identify affected layers (types/services/hooks/components/pages)
- Note testing requirements

#### 1.2 Search Existing Patterns FIRST
**MANDATORY**: Before writing ANY code:

1. **Search for existing implementations**:
   ```bash
   # Search for similar features/concepts
   rg "similar_concept_name" --type ts --type tsx

   # Find existing patterns
   rg "interface.*Props" src/components/
   rg "export const.*Service" src/services/
   ```

2. **Read relevant existing code**:
   - Find similar pages/components
   - Study existing patterns
   - Understand current architecture

3. **Ask if unsure**:
   - "I found [existing_function] that handles [concept]. Should I use this instead?"
   - "Should I follow the pattern in [existing_file] or create new approach?"

**NEVER** create new logic for concepts that likely exist already!

#### 1.3 Clarify Requirements
- List any ambiguities or missing information
- Ask ALL clarifying questions upfront
- **STOP and WAIT** for answers before proceeding
- Don't assume or guess requirements

#### 1.4 Verify Prerequisites
```bash
# Check Node.js version
node --version

# Ensure dependencies are current
npm install

# Verify build works
npm run build

# Check linting passes
npm run lint

# Check current branch
git status
git branch --show-current
```

### Phase 2: Implementation Best Practices

**RECOMMENDED WORKFLOW** - Write tests for new functionality:

#### 2.1 Understand Test Strategy
1. Determine appropriate test types:
   - **Unit tests**: For services, utilities, helpers
   - **Component tests**: For React components (if using Vitest/Jest)
   - **E2E tests**: For critical user flows (Playwright)
2. Review existing test patterns in codebase
3. Identify what should be tested for this feature

#### 2.2 Write Tests (When Appropriate)
- Create tests for new services and utilities
- Add component tests for new UI components
- Write E2E tests for critical user flows
- Structure: Arrange → Act → Assert

**Service Test Pattern**:
```typescript
// tests/unit/services/myService.test.ts
import { describe, it, expect } from 'vitest';
import { myService } from '@/services/myService';

describe('myService', () => {
  it('should handle successful operation', async () => {
    // Arrange
    const input = { data: 'test' };

    // Act
    const result = await myService.doSomething(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    // Arrange
    const invalidInput = null;

    // Act & Assert
    await expect(myService.doSomething(invalidInput))
      .rejects.toThrow('Invalid input');
  });
});
```

**Playwright E2E Test Pattern**:
```typescript
// tests/e2e/myFeature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Feature', () => {
  test('should complete user flow successfully', async ({ page }) => {
    // Navigate to page
    await page.goto('/my-feature');

    // Interact with UI
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Assert outcome
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

#### 2.3 Run Tests
```bash
# Run unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/services/myService.test.ts

# Run E2E tests
npx playwright test

# Run specific E2E test
npx playwright test tests/e2e/myFeature.spec.ts
```

**Expected**: Tests should fail initially (no implementation yet) or pass if testing existing functionality

#### 2.4 Write Implementation
- Write code to satisfy requirements
- Follow Momento Cake patterns (see Architecture section)
- Keep it clean and maintainable
- Add proper TypeScript types

#### 2.5 Run Tests Again
```bash
npm run test
npx playwright test
```

**Required**: Tests should pass before proceeding

#### 2.6 Refactor
- Improve code while keeping tests passing
- Follow clean code principles
- Maintain consistency with existing patterns
- Run tests after each refactor

### Phase 3: Implementation by Architecture Layer

Follow Momento Cake's Next.js + Firebase architecture:

#### 3.1 Types Layer (`src/types/`)

**For new data models:**

1. **Define TypeScript Interfaces/Types**:
```typescript
// src/types/inspection.ts
export interface Inspection {
  id: string;
  title: string;
  status: 'draft' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Add fields
}

export type InspectionInput = Omit<Inspection, 'id' | 'createdAt' | 'updatedAt'>;
```

2. **Define Zod Schemas for Validation**:
```typescript
// src/schemas/inspection.ts
import { z } from 'zod';

export const inspectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['draft', 'in-progress', 'completed']),
  // Add validations
});

export type InspectionFormData = z.infer<typeof inspectionSchema>;
```

#### 3.2 Services Layer (`src/services/`, `src/lib/firebase/`)

**For Firebase operations:**

1. **Firestore Service**:
```typescript
// src/services/inspectionService.ts
import { db } from '@/lib/firebase/config';
import { collection, doc, getDoc, setDoc, query, where, getDocs } from 'firebase/firestore';
import type { Inspection, InspectionInput } from '@/types/inspection';

export const inspectionService = {
  async create(data: InspectionInput): Promise<Inspection> {
    const docRef = doc(collection(db, 'inspections'));
    const inspection: Inspection = {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await setDoc(docRef, inspection);
    return inspection;
  },

  async getById(id: string): Promise<Inspection | null> {
    const docRef = doc(db, 'inspections', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Inspection : null;
  },

  // Add more methods
};
```

2. **Write Service Tests**:
```typescript
// tests/unit/services/inspectionService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { inspectionService } from '@/services/inspectionService';

describe('inspectionService', () => {
  it('should create inspection successfully', async () => {
    const input = { title: 'Test', status: 'draft' as const };
    const result = await inspectionService.create(input);

    expect(result.id).toBeDefined();
    expect(result.title).toBe('Test');
  });

  // Add more tests
});
```

#### 3.3 Hooks Layer (`src/hooks/`)

**For custom React hooks:**

1. **Create Custom Hook**:
```typescript
// src/hooks/useInspections.ts
import { useState, useEffect } from 'react';
import { inspectionService } from '@/services/inspectionService';
import type { Inspection } from '@/types/inspection';

export function useInspections() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadInspections = async () => {
      try {
        setLoading(true);
        const data = await inspectionService.getAll();
        setInspections(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadInspections();
  }, []);

  return { inspections, loading, error };
}
```

#### 3.4 Components Layer (`src/components/`)

**For React components:**

1. **Create Component**:
```typescript
// src/components/InspectionCard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Inspection } from '@/types/inspection';

interface InspectionCardProps {
  inspection: Inspection;
  onEdit?: (id: string) => void;
}

export function InspectionCard({ inspection, onEdit }: InspectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{inspection.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Status: {inspection.status}
        </p>
        {onEdit && (
          <button
            onClick={() => onEdit(inspection.id)}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Edit
          </button>
        )}
      </CardContent>
    </Card>
  );
}
```

2. **Use shadcn/ui Components**:
- Leverage existing components from `src/components/ui/`
- Follow shadcn/ui patterns for consistency
- Use Tailwind CSS for styling

#### 3.5 Pages Layer (`app/`)

**For Next.js pages:**

1. **Create Page**:
```typescript
// app/inspections/page.tsx
import { InspectionList } from '@/components/InspectionList';

export default function InspectionsPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Inspections</h1>
      <InspectionList />
    </div>
  );
}
```

2. **Add Loading and Error States**:
```typescript
// app/inspections/loading.tsx
export default function Loading() {
  return <div className="container mx-auto py-6">Loading...</div>;
}

// app/inspections/error.tsx
'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div className="container mx-auto py-6">
      <h2 className="text-xl font-bold text-red-600">Error</h2>
      <p>{error.message}</p>
    </div>
  );
}
```

#### 3.6 API Routes (if needed) (`app/api/`)

**For API endpoints:**

1. **Create API Route**:
```typescript
// app/api/inspections/route.ts
import { NextResponse } from 'next/server';
import { inspectionService } from '@/services/inspectionService';

export async function GET() {
  try {
    const inspections = await inspectionService.getAll();
    return NextResponse.json(inspections);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inspection = await inspectionService.create(body);
    return NextResponse.json(inspection, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create inspection' },
      { status: 500 }
    );
  }
}
```

### Phase 4: Testing Throughout

**Run tests continuously, not just at the end!**

#### 4.1 Test After Each Logical Change
```bash
# Run unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/services/myService.test.ts

# Run E2E tests
npx playwright test

# Run specific E2E test
npx playwright test tests/e2e/myFeature.spec.ts
```

#### 4.2 Fix Issues Immediately
- Don't accumulate failing tests
- Address issues as they arise
- Keep everything green

#### 4.3 Manual Testing
```bash
# Start dev server
npm run dev

# Test in browser at http://localhost:4000
# Verify all user flows work correctly
```

### Phase 5: Code Quality & Validation

#### 5.1 Run Linter
```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

**Required**: Zero errors before completing

#### 5.2 Type Check
```bash
# Run TypeScript compiler check
npm run type-check

# Or build (includes type checking)
npm run build
```

**Required**: No TypeScript errors

#### 5.3 Build Verification
```bash
# Ensure app builds successfully
npm run build

# Test production build
npm run start
```

#### 5.4 Manual Testing
- Test in development environment (npm run dev)
- Verify all acceptance criteria
- Test edge cases
- Check responsive design (mobile, tablet, desktop)
- Verify loading and error states
- Test with different user roles/permissions

### Phase 6: Review & Finalize

#### 6.1 Self-Review
```bash
# Review all changes
git diff

# Check status
git status

# Review stats
git diff --stat
```

**Questions to ask yourself:**
- Does this follow existing patterns?
- Is error handling robust?
- Are edge cases covered?
- Is the code maintainable?
- Would this pass code review?
- Are all TypeScript types correct?

#### 6.2 Final Checklist

- [ ] All implementation completed
- [ ] Tests written and passing (npm run test)
- [ ] E2E tests passing (npx playwright test)
- [ ] Code linted with zero errors (npm run lint)
- [ ] TypeScript compilation successful (npm run build)
- [ ] Manual testing completed
- [ ] Acceptance criteria met
- [ ] No regressions introduced
- [ ] Documentation updated (if needed)
- [ ] No debug code or console.logs left
- [ ] Follows existing patterns and conventions

## Error Prevention Protocols

### Loop Breaking
If encountering repeated failures:

**After 2 identical errors**:
- STOP and analyze: "What concept am I missing?"
- Search for existing implementations
- Ask: "Is there existing code that handles this?"

**After 3 failed attempts**:
- Switch strategies entirely
- Ask for guidance
- Don't repeat the same approach

### Common Mistakes to Avoid

1. **Creating duplicate logic**:
   - ❌ Writing new function without searching
   - ✅ Search → Found → Ask → Use existing

2. **Skipping tests**:
   - ❌ Implementing without tests
   - ✅ Write tests → Implementation → Pass

3. **Proceeding with assumptions**:
   - ❌ Guessing requirements
   - ✅ Ask questions → Wait → Implement with clarity

4. **Ignoring existing patterns**:
   - ❌ Creating new architecture pattern
   - ✅ Study existing → Follow established pattern

5. **Poor error handling**:
   - ❌ Silent failures or generic errors
   - ✅ Proper try-catch, meaningful error messages

## Platform-Specific Implementation

### Next.js Patterns

**Server vs Client Components**:
- Use Server Components by default
- Add `'use client'` only when necessary (hooks, event handlers, browser APIs)
- Server Components can fetch data directly
- Client Components need hooks for data fetching

**Data Fetching**:
```typescript
// Server Component (default)
export default async function Page() {
  const data = await fetchData(); // Direct async
  return <div>{data}</div>;
}

// Client Component
'use client';
export default function Page() {
  const { data } = useData(); // Custom hook
  return <div>{data}</div>;
}
```

**Routing**:
- Use App Router conventions (app/ directory)
- Create `page.tsx` for routes
- Use `loading.tsx` for loading states
- Use `error.tsx` for error boundaries
- Use `layout.tsx` for shared layouts

### Firebase Integration

**Firestore Operations**:
- Use modular SDK (v9+)
- Handle errors gracefully
- Implement proper loading states
- Use TypeScript types for documents

**Authentication**:
- Use Firebase Auth hooks
- Protect routes with auth checks
- Handle auth state changes
- Implement proper sign out

**Security**:
- Never expose Firebase credentials in client code
- Use environment variables
- Implement proper Firestore security rules
- Validate data on both client and server

### React Patterns

**Component Design**:
- Functional components with TypeScript
- Proper prop typing with interfaces
- Use React hooks appropriately
- Implement error boundaries

**State Management**:
- Use useState for local state
- Use Context for shared state (when needed)
- Consider Zustand for complex global state
- Avoid prop drilling

**Performance**:
- Use React.memo() sparingly (only for expensive renders)
- Implement proper loading states
- Optimize images with Next.js Image component
- Code split large components

## Troubleshooting

### Build Errors
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### TypeScript Errors
```bash
# Check types
npm run type-check

# Verify tsconfig.json is correct
cat tsconfig.json
```

### Test Failures
```bash
# Run with verbose output
npm run test -- --reporter=verbose

# Run specific test
npm run test -- tests/unit/services/myService.test.ts

# Debug Playwright tests
npx playwright test --debug
```

### Firebase Errors
```bash
# Verify Firebase config
# Check .env.local has all required variables

# Test Firebase connection
# Try a simple Firestore read operation
```

### Linting Errors
```bash
# Auto-fix what can be fixed
npm run lint -- --fix

# Check ESLint config
cat .eslintrc.json
```

## Validation Checklist

Before marking implementation complete:

### Code Quality
- [ ] Follows Momento Cake Next.js + Firebase patterns
- [ ] TypeScript types properly defined
- [ ] Zod schemas for validation (where applicable)
- [ ] Firebase operations implemented correctly
- [ ] Error handling implemented throughout
- [ ] No hardcoded values (use env variables/constants)
- [ ] No debug code or console.logs left
- [ ] Code is self-documenting with clear names

### Testing
- [ ] Unit tests for services and utilities
- [ ] Component tests (if applicable)
- [ ] E2E tests for critical flows (Playwright)
- [ ] All tests passing (npm run test)
- [ ] E2E tests passing (npx playwright test)
- [ ] Edge cases tested
- [ ] Error scenarios tested

### Build & Lint
- [ ] Code linted (npm run lint)
- [ ] Zero linting errors
- [ ] TypeScript compilation successful (npm run build)
- [ ] No TypeScript errors
- [ ] No breaking changes to existing code

### Manual Testing
- [ ] Tested in dev environment (npm run dev)
- [ ] All acceptance criteria met
- [ ] User flows work end-to-end
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Error states display properly
- [ ] Loading states show correctly
- [ ] Firebase operations work correctly

### Documentation
- [ ] Inline comments for complex logic only
- [ ] Public APIs documented (if applicable)
- [ ] Breaking changes documented
- [ ] README updated (if needed)

### Review
- [ ] Self-reviewed all changes
- [ ] No regressions introduced
- [ ] Follows existing conventions
- [ ] Ready for peer review

## Report Format

After implementation, provide:

### Summary
<2-3 sentence overview of what was implemented and why>

### Implementation Approach
<Brief explanation of architectural decisions and patterns used>

### Changes Made
```bash
git diff --stat
```

**Key Files**:
- Types: `<list modified types>`
- Services: `<list modified services>`
- Hooks: `<list modified hooks>`
- Components: `<list modified components>`
- Pages: `<list modified pages>`
- Tests: `<list test files>`

### Test Results
```bash
# All tests passing
npm run test

# E2E tests passing
npx playwright test

# Type check passing
npm run build
```

### Validation Results
- [x] Tests passing
- [x] Linter clean (zero errors)
- [x] Build successful
- [x] Manual testing completed
- [x] Acceptance criteria met

### Known Issues / Trade-offs
<List any compromises, workarounds, or technical debt introduced>
<Suggest long-term improvements if workarounds used>

### Next Steps
- Create PR: `gh pr create` (if ready for review)
- Additional testing needed: <if applicable>
- Follow-up tasks: <if any>

## Example Usage

```bash
# Implement with inline plan
/implement "Add product photo upload with Firebase Storage following existing imageService patterns"

# Implement from plan file
/implement context/specs/product-photo-upload/PRD.md

# Implement bug fix
/implement "Fix null pointer in customer list when offline"
```

## Integration with Workflow

### Before Implementation
1. Plan the feature: `/plan <description>`
2. Review plan and clarify questions
3. Validate environment: `npm run build`
4. Run: `/implement <plan>`

### During Implementation
- Write tests for new functionality
- Test continuously (npm run test)
- Commit logical units frequently
- Keep tests green at all times

### After Implementation
1. Final validation checklist completed
2. Self-review with `git diff`
3. Create PR: `gh pr create`
4. Request review from team

## Notes

### Quality Standards

Remember from CLAUDE.md:
- **Depth over speed** - Think through solutions properly
- **Critical thinking** - Question assumptions, present alternatives
- **Transparent reasoning** - Explain WHY before implementing
- **Complete information** - Ask all questions upfront, then WAIT

**Success = Quality implementation that's maintainable, testable, and follows Momento Cake patterns**
