# Plan Work Item

Create a comprehensive Product Requirements Document (PRD) for implementing features, fixing bugs, or completing chores in the Momento Cake Admin web application.

## Three-Phase Planning Process

This command uses a **three-phase planning process** to ensure complete understanding before creating detailed implementation plans:

### Phase 0: Exploratory Analysis (Codebase Context Discovery)
1. **Ask for scope name** if not provided (URL-friendly identifier for this work, e.g., "offline-photos", "user-auth-fix")
2. **Analyze** work item description to identify key concepts and keywords
3. **Search** codebase for related features, components, hooks, and patterns:
   - Related pages (app/*/page.tsx) matching concepts
   - Similar components (src/components/*) for UI patterns
   - Existing hooks (src/hooks/*) for state management
   - Relevant services (src/services/*) for business logic
   - Firebase patterns (src/lib/firebase/*) for data access
   - Test patterns (tests/*) for similar features
4. **Identify** similar implementations that can serve as references
5. **Understand** current architecture context relevant to this work item
6. **Prepare** context-aware clarifying questions based on codebase findings
7. **Proceed** to Phase 1 with specific project context

**DO NOT ask questions in Phase 0** - only gather context silently.

### Phase 1: Requirements Analysis & Clarification
1. **Ask** context-aware clarifying questions using interactive checkboxes
2. **Incorporate** findings from Phase 0 into questions:
   - Reference specific files found during exploration
   - Suggest existing patterns to follow or avoid
   - Ask about integration with discovered related features
   - Provide concrete options based on actual codebase
3. **Collect answers** from the user
4. **Validate** all requirements are clear
5. **Document** all clarifications received
6. **Proceed** to Phase 2 once all requirements are clear

### Phase 2: PRD Creation
1. **Design** implementation strategy based on clarified requirements
2. **Create** comprehensive PRD following web project template
3. **Reference** specific files and patterns discovered in Phase 0
4. **Structure** implementation into logical phases
5. **Generate** AI handoff prompts for each phase
6. **Save** PRD in `context/specs/{SCOPE}/PRD.md` (e.g., `context/specs/offline-photos/PRD.md`)
7. **Return** PRD file path for review and implementation

### 🚨 MANDATORY ENFORCEMENT: Phases MUST Complete Sequentially

**This process is REQUIRED and MUST NEVER be skipped.**

#### Phase 0 Completion Checklist
- [ ] **ASK for scope name** if not provided as argument
  - [ ] Must be URL-friendly: lowercase, hyphens, no spaces, max 40 chars
  - [ ] Examples: "user-authentication", "product-crud", "offline-sync"
  - [ ] If user cannot provide, suggest one based on work description
- [ ] Read and understand the complete work item description
- [ ] Extract key concepts and keywords from description (e.g., "products", "authentication", "offline")
- [ ] **SEARCH codebase** for related implementations:
  - [ ] Use Glob to find related pages, components, hooks
  - [ ] Use Grep to search for similar functionality keywords
  - [ ] Identify existing patterns that match this work item
  - [ ] Note specific files that could serve as references
- [ ] Document findings from exploration (for internal use)
- [ ] Prepare context-specific clarifying questions based on what was found
- [ ] Mark Phase 0 as complete before starting Phase 1

#### Phase 1 Completion Checklist
- [ ] Ask ALL clarifying questions (enhanced with Phase 0 context)
- [ ] Questions must reference specific files/patterns found in Phase 0
- [ ] Provide concrete options based on actual codebase discoveries
- [ ] **WAIT for user to provide answers** - DO NOT PROCEED without answers
- [ ] Document all clarifications received from user
- [ ] Mark Phase 1 as complete before starting Phase 2

#### Phase 2 Completion Checklist
- [ ] Create comprehensive PRD using template
- [ ] Include specific file references from Phase 0 exploration
- [ ] Reference existing patterns discovered during exploration
- [ ] Save to `context/specs/{SCOPE}/PRD.md`
- [ ] Mark Phase 2 as complete before starting Phase 3

#### Phase 3 Completion Checklist
- [ ] Create separate ai-handoff.json file in same scope directory
- [ ] Generate handoff prompts for each implementation phase
- [ ] Include concrete file paths from Phase 0 exploration
- [ ] Reference existing patterns to follow
- [ ] Ensure each prompt is self-contained and actionable
- [ ] Include dependency information for each phase
- [ ] Save to `context/specs/{SCOPE}/ai-handoff.json`
- [ ] Return file paths (PRD + AI Handoff) and summary

#### Critical Clarifying Questions (Use AskUserQuestion Tool)

**IMPORTANT**: Use the `AskUserQuestion` tool with checkbox options for ALL clarifying questions. This provides a better user experience than text-based questions.

**CRITICAL - Ask First If Not Provided:**
0. **Scope Name** (if not provided as argument):
   - Question: "What should be the scope name for this work item? (URL-friendly identifier)"
   - Header: "Scope Name"
   - Note: This is REQUIRED - lowercase, hyphens, max 40 chars (e.g., "user-auth-fix", "product-crud")
   - If user cannot provide or selects "Other" without valid format, suggest one based on description
   - Validation: Lowercase letters, numbers, hyphens only

**For All Work Items:**
1. **Work Item Type** (if not obvious):
   - Question: "What type of work item is this?"
   - Options: Feature, Bug, Chore, Task, Refactor
   - MultiSelect: false

2. **Complexity Level**:
   - Question: "What is the estimated complexity of this work?"
   - Options:
     - Low (1-2 files, simple changes)
     - Medium (3-5 files, moderate complexity)
     - High (6+ files, significant architectural changes)
   - MultiSelect: false

3. **Affected Areas** (Web/Next.js-specific):
   - Question: "Which architectural layers will this work affect?"
   - Options:
     - Pages/Routes (Next.js app router)
     - Components (UI components)
     - Hooks (Custom React hooks)
     - Services (Business logic)
     - Firebase/Firestore (Database operations)
     - Firebase Auth (Authentication)
     - API Routes (Next.js API endpoints)
     - State Management (Context/Zustand)
   - MultiSelect: true

4. **Firebase Integration Required**:
   - Question: "Does this work require Firebase integration?"
   - Options:
     - Firestore (database operations)
     - Firebase Auth (authentication)
     - Firebase Storage (file uploads)
     - Firebase Functions (cloud functions)
     - No Firebase changes needed
   - MultiSelect: true

**For Features:**
5. **User Story Clarity**:
   - Question: "Is the user story clear? (Who is the user, what do they want, why?)"
   - Options:
     - Yes, user story is clear
     - No, needs clarification (provide details)
   - MultiSelect: false

6. **Acceptance Criteria Defined**:
   - Question: "Are acceptance criteria defined for this feature?"
   - Options:
     - Yes, criteria are clear
     - Partially defined (needs more detail)
     - No, criteria need to be defined
   - MultiSelect: false

7. **Dependencies**:
   - Question: "Does this feature depend on other features or external systems?"
   - Options:
     - No dependencies
     - Depends on other features (specify which)
     - Depends on external APIs/services (specify which)
     - Depends on Firebase capabilities (specify which)
   - MultiSelect: true

**For Bugs:**
5. **Reproduction Steps**:
   - Question: "Can you reproduce this bug consistently?"
   - Options:
     - Yes, always reproducible
     - Sometimes reproducible
     - Cannot reproduce (need more info)
   - MultiSelect: false

6. **Severity**:
   - Question: "What is the severity of this bug?"
   - Options:
     - Critical (app crashes, data loss, security)
     - High (major feature broken, many users affected)
     - Medium (feature partially broken, workaround available)
     - Low (cosmetic, minor issue, few users affected)
   - MultiSelect: false

7. **Impact Scope**:
   - Question: "How many users are affected by this bug?"
   - Options:
     - All users
     - Most users
     - Some users (specific conditions)
     - Few users (edge case)
   - MultiSelect: false

8. **Root Cause Known**:
   - Question: "Is the root cause of the bug known?"
   - Options:
     - Yes, root cause identified (specify)
     - Suspected but not confirmed
     - Unknown, investigation needed
   - MultiSelect: false

**For Chores/Tasks:**
5. **Scope Definition**:
   - Question: "Is the scope of this work clearly defined?"
   - Options:
     - Yes, scope is clear
     - Partially defined (needs clarification)
     - No, scope needs definition
   - MultiSelect: false

6. **Breaking Changes Expected**:
   - Question: "Will this work introduce breaking changes?"
   - Options:
     - No breaking changes
     - Possible breaking changes (needs assessment)
     - Definite breaking changes (migration needed)
   - MultiSelect: false

7. **Motivation**:
   - Question: "What is the primary motivation for this work?"
   - Options:
     - Technical debt reduction
     - Performance improvement
     - Code quality/maintainability
     - Dependency update
     - Documentation improvement
     - Testing improvement
   - MultiSelect: true

#### Actions That Indicate Phases Are Being Skipped (DO NOT DO THESE)
- ❌ Proceeding without a valid scope name
- ❌ Creating PRD without a scope name
- ❌ **Skipping Phase 0**: Asking questions without first exploring the codebase
- ❌ **Asking vague questions**: Not using specific files/patterns discovered in Phase 0
- ❌ **Generic questions**: Questions that don't reference actual project context
- ❌ Creating detailed PRD without confirming requirements with the user
- ❌ Assuming work item scope, type, or approach without explicit user confirmation
- ❌ Writing PRD or performing deep analysis without documented answers to clarifications
- ❌ Treating "comprehensive research" as a substitute for asking the user
- ❌ Proceeding to Phase 2 without explicit Phase 1 completion

#### Correct Workflow Example
```
Phase 0 (Exploratory Analysis):
1. User provides: "Add offline sync for product photos"
2. Claude asks: "What should be the scope name?" → User provides: "offline-product-photos"
3. Claude extracts keywords: "offline", "sync", "product", "photos"
4. Claude searches codebase:
   - Glob: app/products/**/*.tsx → finds ProductList, ProductDetail pages
   - Glob: src/components/**/*product*.tsx → finds ProductCard, ProductForm
   - Grep: "Firebase" in src/services/ → finds productService.ts
   - Grep: "photo" in src/services/ → finds imageService.ts
5. Claude documents findings:
   - Existing: ProductService at src/services/productService.ts
   - Existing: ImageService at src/services/imageService.ts
   - Pattern: Similar offline pattern in orderService.ts
6. Claude prepares context-aware questions

Phase 1 (Requirements Analysis - IN THIS ORDER):
7. Claude uses AskUserQuestion with context from Phase 0:
   - "Should this follow the same pattern as orderService offline sync?" (Yes/No/Different)
   - "Which service to extend?" (ProductService / ImageService / New service)
   - "Storage approach?" (IndexedDB / LocalStorage / Firebase local cache)
   - Work item type? (Feature)
   - Complexity? (High - based on offline complexity)
   - Affected layers? (Pages, Components, Services, Firebase)
   - Firebase integration? (Firestore, Firebase Storage)
8. User selects answers via checkboxes
9. Claude documents the answers

Phase 2 (PRD Creation - ONLY AFTER Phase 0 & 1):
10. Claude creates detailed PRD based on clarifications AND Phase 0 findings
11. Claude references specific files discovered in Phase 0
12. Claude includes pattern references (orderService as example)
13. PRD saved to context/specs/offline-product-photos/PRD.md

Phase 3 (AI Handoff Generation - ONLY AFTER Phase 2):
14. Claude creates separate ai-handoff.json file
15. Claude generates handoff prompts for each implementation phase
16. Claude includes concrete file paths from Phase 0 exploration
17. Claude includes pattern references and dependencies for each phase
18. AI handoff saved to context/specs/offline-product-photos/ai-handoff.json
```

## Variables

scope: $ARGUMENT (required: URL-friendly scope name, e.g., "user-auth", "product-crud" - will be asked if not provided)
work_item_description: $ARGUMENT (required: description of the work item)

## Instructions

- **CRITICAL**: Scope name is REQUIRED - do not proceed without it
  - Must be URL-friendly: lowercase, hyphens, no spaces, max 40 chars
  - If not provided as argument, ask user for scope name
  - If user cannot provide scope name, suggest one based on work description
  - Validate format matches pattern: lowercase letters, numbers, hyphens only
- **IMPORTANT**: You're creating a comprehensive PRD, NOT implementing the work yet
- **USE AskUserQuestion**: Always use the AskUserQuestion tool with checkbox options for clarifying questions
- **THINK DEEPLY**: Consider architecture, patterns, edge cases, and Momento Cake-specific patterns
- Create the PRD in `context/specs/{SCOPE}/PRD.md` directory structure
  - Create scope directory: `context/specs/{SCOPE}/` (e.g., `context/specs/offline-product-photos/`)
  - Save PRD as: `context/specs/{SCOPE}/PRD.md`
  - This allows future files related to the same scope to be organized together
  - Example: `context/specs/offline-product-photos/PRD.md`
- Research the codebase to understand existing patterns before planning
- Follow Momento Cake's Next.js + Firebase architecture patterns
- Design for the web platform with responsive design considerations

### Planning Workflow

**Phase 0: Exploratory Analysis (DO FIRST - SILENTLY)**

**1. Validate/Ask for Scope & Extract Keywords:**
- Ask for scope name if not provided as argument
- Analyze work item description to extract key concepts
- Identify domain-specific keywords (e.g., "products", "customers", "ingredients", "authentication")

**2. Search Codebase for Context:**
- **Pages**: Use Glob to find related pages (app/**/page.tsx, app/**/*.tsx)
- **Components**: Search for related components (src/components/**/*.tsx)
- **Hooks**: Find custom hooks (src/hooks/*.ts)
- **Services**: Identify business logic (src/services/*.ts, src/lib/*.ts)
- **Firebase**: Find Firebase patterns (src/lib/firebase/*.ts)
- **Tests**: Review test patterns (tests/**/*.spec.ts)
- Use Grep to search for specific functionality keywords in relevant directories

**3. Document Findings (Internal):**
- List specific files that are related to this work item
- Identify patterns to follow (e.g., "Similar to customerService pattern")
- Note architectural approaches already in use
- Prepare concrete options for clarifying questions

**Phase 1: Requirements Analysis & Clarification (ASK USER)**

**4. Ask Context-Aware Clarifying Questions:**
- Use AskUserQuestion tool with checkbox options
- **CRITICAL**: Questions MUST reference findings from Phase 0
- Include specific files/patterns as options (not generic questions)
- Examples:
  - "Should this follow the pattern in [SpecificService]?" (Yes/No/Different)
  - "Which component to extend?" ([ExistingComponent] / New component / Modify [ExistingComponent])
  - "Integration approach?" (Extend [ExistingService] / Create new)
- Ask type-specific questions (feature/bug/chore)
- **WAIT for user responses** - DO NOT continue without answers
- Document all answers received

**Phase 2: PRD Creation (CREATE DOCUMENTATION)**

**5. Read PRD Template:**
- Read `.claude/commands/templates/PRD.md` (comprehensive template)
- Understand all sections and requirements
- Prepare to fill in all applicable sections

**6. Create PRD Document:**
- Follow the template structure from `PRD.md`
- Fill in metadata (scope name, type, complexity)
- Write clear problem and solution statements
- Document affected pages, components, hooks, services
- **Include specific file references from Phase 0**
- **Reference existing patterns discovered during exploration**
- Include Next.js + Firebase + TailwindCSS patterns
- Add testing workflow requirements
- Create detailed implementation tasks organized by phase

**Phase 3: AI Handoff Generation (CREATE HANDOFF FILE)**

**7. Create AI Handoff Document:**
- Create separate file: `context/specs/{SCOPE}/ai-handoff.json`
- This file contains ONLY phase data in structured JSON format
- Machine-readable structure for `/execute` command
- Easier to parse programmatically (no regex required)
- Keeps PRD focused on requirements and architecture

**8. Generate AI Handoff Prompts:**
- Create handoff prompts for EACH implementation phase
- Follow handoff prompt structure from template (see below)
- **Include specific file paths from Phase 0 exploration**
- Reference existing patterns to follow (discovered in Phase 0)
- Include success criteria and validation commands
- Make prompts actionable and self-contained
- Save to `context/specs/{SCOPE}/ai-handoff.json` (not in PRD)

**AI Handoff File Format (JSON):**
```json
{
  "scope": "{SCOPE}",
  "title": "{Feature/Bug/Chore Title}",
  "prd_path": "context/specs/{SCOPE}/PRD.md",
  "phases": [
    {
      "number": 1,
      "name": "{Phase Name}",
      "prompt": "{Handoff prompt text in single paragraph}",
      "dependencies": []
    },
    {
      "number": 2,
      "name": "{Phase Name}",
      "prompt": "{Handoff prompt text in single paragraph}",
      "dependencies": [1]
    }
  ]
}
```

**Key JSON Fields:**
- `scope`: Scope name (e.g., "offline-product-photos")
- `title`: Brief title of the work item
- `prd_path`: Relative path to PRD file for reference
- `phases`: Array of phase objects
  - `number`: Phase sequence number (1, 2, 3, etc.)
  - `name`: Descriptive phase name (e.g., "Data Layer", "UI Components")
  - `prompt`: Full handoff prompt as single paragraph
  - `dependencies`: Array of phase numbers this phase depends on (empty for independent phases)

**Handoff Prompt Structure (1 paragraph per phase):**
1. **Context**: State which phase this is and which phases are already completed (if applicable)
2. **PRD Reference**: Direct them to read the full PRD at `context/specs/{SCOPE}/PRD.md`
3. **Task Description**: Clearly describe what needs to be implemented for this phase
4. **File References**: Point to specific files from Phase 0 exploration
5. **Pattern References**: Point to existing code examples to follow
6. **Testing**: Remind to write tests for new functionality
7. **Commands**: Include relevant commands (`npm run build`, `npm run test`, `npm run lint`)
8. **Deliverables**: Explicitly list what should be delivered

**Example Handoff Prompts:**

**Example 1: First Phase (Data Layer)**
```
You are implementing Phase 1 (Data Layer) for {SCOPE}. Read the full PRD specification at context/specs/{SCOPE}/PRD.md to understand requirements, architecture, and acceptance criteria. Your task is to implement the data layer following Momento Cake's Firebase + Next.js pattern: create TypeScript types/interfaces, implement Firestore service functions with proper error handling, add Firebase security rules updates, and implement data validation using Zod schemas. Reference existing patterns in src/services/{discovered_service}.ts and src/lib/firebase/{discovered_firebase_pattern}.ts discovered during codebase analysis. Write comprehensive tests for all service functions including error scenarios. Run 'npm run build' to ensure TypeScript compilation passes and 'npm run test' to verify all tests pass before completing. Deliver: TypeScript types, Firestore service functions, security rules, Zod schemas, and comprehensive unit tests.
```

**Example 2: Later Phase with Dependencies (UI Layer)**
```
You are implementing Phase 3 (UI Components) for {SCOPE}, with Phase 1 (Data Layer) and Phase 2 (Business Logic) already completed. Read the full PRD specification at context/specs/{SCOPE}/PRD.md to understand UI requirements, user flows, and acceptance criteria. Your task is to build the UI layer: create Next.js page components, implement reusable React components using shadcn/ui design system, implement custom hooks for state management, add proper loading and error states, and ensure responsive design with TailwindCSS. Reference existing patterns in app/{discovered_page}/page.tsx and src/components/{discovered_component}.tsx found during codebase exploration. Write Playwright tests for critical user flows and component tests for UI components. Run 'npm run lint' to ensure code quality and 'npm run test' for unit tests. Deliver: page components, reusable UI components, custom hooks, comprehensive tests, and responsive styling.
```

**Example 3: Final Phase (Testing & Validation)**
```
You are implementing the final phase (Testing & Validation) for {SCOPE}, with all previous implementation phases already completed. Read the full PRD specification at context/specs/{SCOPE}/PRD.md to understand acceptance criteria and quality gates. Your task is to ensure comprehensive test coverage and quality: add any missing unit tests for services and utilities, write component tests for all UI components, create Playwright E2E tests for critical user flows, perform manual testing in development environment, test all edge cases (empty data, network failures, validation errors, loading states, etc.), run 'npm run lint' to ensure no linting errors, verify TypeScript compilation with 'npm run build', and validate the app works correctly with 'npm run dev'. Reference testing patterns in tests/{discovered_test}.spec.ts found during codebase exploration. Deliver: comprehensive test suite with all tests passing, manual testing report covering edge cases, confirmation that all acceptance criteria in the PRD are met, and any necessary documentation updates.
```

## Momento Cake Web Architecture Context

When creating plans, consider Momento Cake's architecture:

**Core Technologies:**
- **Framework**: Next.js 14+ with App Router
- **UI Library**: React 18+ with TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State Management**: React Context / Zustand (when needed)
- **Forms**: React Hook Form with Zod validation
- **Testing**: Playwright for E2E, Vitest/Jest for unit tests

**Architectural Layers:**
- **Pages** (`app/`) - Next.js App Router pages
- **Components** (`src/components/`) - Reusable React components
- **Hooks** (`src/hooks/`) - Custom React hooks
- **Services** (`src/services/`) - Business logic and Firebase operations
- **Firebase** (`src/lib/firebase/`) - Firebase configuration and utilities
- **Types** (`src/types/`) - TypeScript type definitions
- **Utils** (`src/utils/`) - Utility functions
- **Tests** (`tests/`) - Playwright E2E tests

**Key Patterns:**
- Multi-tenant architecture with tenant context
- Firebase Auth for user management
- Firestore for data persistence
- Server Components and Client Components separation
- Responsive design with mobile-first approach
- Form validation with Zod schemas
- Error boundaries and loading states

## PRD Creation Steps

### Step 1: Document Metadata and Type
- [ ] **REQUIRED**: Add scope name in URL-friendly format
- [ ] Set work item type (feature/bug/chore/task/refactor)
- [ ] Set complexity level (low/medium/high)
- [ ] Document all clarifications received from user

### Step 2: Write Problem & Solution Statements
- [ ] Clear problem statement (what needs to be done and why)
- [ ] Solution statement (how it will be solved)
- [ ] For bugs: Include symptom, expected behavior, actual behavior, impact
- [ ] For bugs: Document root cause analysis if known

### Step 3: Document Web Architecture
- [ ] List affected pages with routes and navigation
- [ ] Define components and their responsibilities
- [ ] Specify custom hooks needed
- [ ] Document services and business logic layer
- [ ] Include Firebase operations (Firestore, Auth, Storage)
- [ ] Note API routes if needed (app/api/*)
- [ ] State management approach (Context/Zustand)
- [ ] Responsive design considerations

### Step 4: Create Implementation Strategy
- [ ] Define approach (incremental, feature flags, etc.)
- [ ] For bugs: Minimal fix strategy targeting root cause only
- [ ] Testing workflow (unit tests, component tests, E2E tests)
- [ ] Test coverage goals

### Step 5: List File Changes
- [ ] Files to modify with specific purposes
- [ ] New files to create (if needed)
- [ ] Files to reference for patterns
- [ ] Note any build or configuration changes

### Step 6: Add Examples and References
- [ ] Reference existing pages/components with similar patterns
- [ ] Link to similar service implementations
- [ ] Point to data layer patterns to follow
- [ ] Include testing pattern references

### Step 7: Create Implementation Tasks
- [ ] Break work into logical phases (data → services → UI → testing)
- [ ] Create specific, actionable tasks for each phase
- [ ] Order tasks logically (foundation first, then build up)
- [ ] Include testing tasks for each layer
- [ ] Add validation tasks (linting, type checking, build verification)

### Step 8: Generate AI Handoff Prompts (CRITICAL)
**This step MUST be completed - do not skip.**

For each implementation phase, create structured handoff prompts:

**Handoff Prompt Structure:**
Each prompt must include:
1. **Phase identifier** - "Phase 1: Data Layer", "Phase 2: Services", etc.
2. **Clear objective** - What should be accomplished in this phase
3. **PRD reference** - Point to the specific PRD file path
4. **File context** - Which files will be modified or created
5. **Pattern references** - Existing code to use as examples
6. **Success criteria** - How to verify phase completion
7. **Validation commands** - Specific commands to run (npm run test, npm run lint, etc.)
8. **Testing reminder** - Emphasize test coverage

**Typical Phase Structure for Features:**
- Phase 1: Data Layer (Types, Zod schemas, Firebase services)
- Phase 2: Business Logic (Service functions, custom hooks)
- Phase 3: UI Components (Pages, components, forms)
- Phase 4: Testing & Validation (Comprehensive testing, quality gates)

**Typical Phase Structure for Bugs:**
- Phase 1: Reproduce & Verify (Reproduce bug, confirm root cause)
- Phase 2: Write Failing Test (TDD: prove the bug exists)
- Phase 3: Implement Minimal Fix (Fix only what's broken)
- Phase 4: Verify & Validate (All tests pass, no regressions)

**Typical Phase Structure for Chores:**
- Phase 1: Analysis & Preparation (Understand scope, assess impact)
- Phase 2: Implementation (Make the changes)
- Phase 3: Testing & Regression (Verify no breakage)
- Phase 4: Documentation & Validation (Update docs, final checks)

### Step 9: Define Testing Strategy
- [ ] Unit test requirements (services, utilities, hooks)
- [ ] Component test requirements (React components)
- [ ] E2E test requirements (Playwright for critical flows)
- [ ] Edge cases to test
- [ ] Testing patterns and tools

### Step 10: Add Acceptance Criteria
- [ ] Functional requirements (specific, measurable)
- [ ] Technical requirements (tests pass, no errors, patterns followed)
- [ ] Quality gates (code review, manual testing, performance)
- [ ] Responsive design requirements

### Step 11: Include Validation Commands
- [ ] npm run build (TypeScript compilation)
- [ ] npm run test (unit tests)
- [ ] npm run lint (ESLint)
- [ ] npm run dev (local testing)
- [ ] npx playwright test (E2E tests)
- [ ] Manual testing checklist

### Step 12: Add Notes & Learnings
- [ ] Related issues or dependencies
- [ ] Technical debt identified
- [ ] Future improvements
- [ ] For bugs: Prevention strategies
- [ ] Lessons learned

## Notes

### Momento Cake-Specific Best Practices

**Next.js Patterns:**
- Use Server Components by default, Client Components only when needed
- Implement proper loading.tsx and error.tsx files
- Use Next.js Image component for optimizations
- Leverage App Router for clean routing

**Firebase Integration:**
- Use Firebase Admin SDK for server-side operations
- Implement proper security rules in Firestore
- Use Firebase Auth for user management
- Handle Firebase errors gracefully

**React Patterns:**
- Functional components with TypeScript
- Custom hooks for reusable logic
- Proper prop typing with interfaces
- Implement error boundaries

**Testing:**
- Write unit tests for services and utilities
- Create component tests for UI components
- Use Playwright for critical user flows
- Test edge cases and error scenarios

**Performance:**
- Implement proper loading states
- Use React.memo for expensive components
- Optimize images and assets
- Monitor bundle size

### Work Item Type Guidelines

**Use Feature when:**
- Adding new functionality
- Building new pages or flows
- Implementing new requirements
- Adding value for users

**Use Bug when:**
- Fixing broken functionality
- Resolving defects
- Correcting incorrect behavior
- Addressing user-reported issues

**Use Chore when:**
- Updating dependencies
- Refactoring code (no new features)
- Improving documentation
- Improving tests (no bug fix)
- Developer tooling improvements

**Use Task when:**
- Completing specific deliverable
- Implementation work not clearly feature/bug/chore
- Breaking down larger work into smaller pieces

**Use Refactor when:**
- Restructuring code without changing behavior
- Improving code quality/architecture
- Extracting duplicated code
- Simplifying complex logic

## Report

After creating the PRD and AI Handoff:
- Return both file paths:
  - PRD: `context/specs/{SCOPE}/PRD.md`
  - AI Handoff: `context/specs/{SCOPE}/ai-handoff.json`
- Confirm scope name, work item type, complexity, and affected areas
- List key phases and implementation approach
- Note number of handoff prompts generated
- Note any critical dependencies or Firebase integration requirements
- Indicate if any configuration changes will be needed
- Highlight any breaking changes or migration needs
- Ready for execution with `/execute {SCOPE}` (just the scope name!)

## Example Usage

```bash
# Basic usage - scope name and description
/plan "offline-product-photos" "Add offline sync for product photos"
# Creates: context/specs/offline-product-photos/PRD.md

# Bug fix
/plan "login-button-fix" "Login button doesn't work on mobile devices"
# Creates: context/specs/login-button-fix/PRD.md

# Chore
/plan "dependency-update" "Update Next.js and React to latest versions"
# Creates: context/specs/dependency-update/PRD.md

# If scope name not provided, Claude will ask for it first
/plan "Add offline sync for product photos"
# Claude asks: "What should be the scope name?" → User provides: "offline-product-photos"
# Creates: context/specs/offline-product-photos/PRD.md

# In response to this command, Claude will:
# PHASE 0 (Exploratory Analysis - Silent):
# 1. Ask for scope name if not provided
# 2. Extract keywords from description ("offline", "sync", "product", "photos")
# 3. Search codebase for related files using Glob/Grep:
#    - Find existing product pages, components, services
#    - Locate similar sync patterns and services
#    - Identify Firebase patterns for offline support
#    - Review test patterns for similar features
# 4. Document findings and prepare context-aware questions

# PHASE 1 (Requirements Clarification - Ask User):
# 5. Ask context-aware questions referencing Phase 0 findings:
#    - "Should this follow ProductService pattern?" (Yes/No/Different)
#    - "Use IndexedDB or Firebase local cache?" (IndexedDB/Firebase/Both)
#    - Work item type, complexity, affected layers
# 6. Wait for user answers
# 7. Document clarifications

# PHASE 2 (PRD Creation - Generate Documentation):
# 8. Create scope directory: context/specs/{SCOPE}/
# 9. Generate comprehensive PRD with Phase 0 discoveries
# 10. Include specific file references from exploration
# 11. Save to context/specs/{SCOPE}/PRD.md

# PHASE 3 (AI Handoff Generation - Generate Handoff File):
# 12. Create ai-handoff.json in same scope directory
# 13. Generate handoff prompts with concrete paths from Phase 0
# 14. Include pattern references and dependencies for each phase
# 15. Save to context/specs/{SCOPE}/ai-handoff.json
# 16. Return both file paths (PRD + AI Handoff) for review
```

## Integration with Implementation

After the PRD is created and approved:

1. **Review the PRD**: Ensure all sections are complete and accurate
2. **Use handoff prompts**: Copy the handoff prompt for Phase 1
3. **Execute phase**: Implement according to the phase requirements
4. **Validate completion**: Run validation commands, verify success criteria
5. **Move to next phase**: Repeat for all phases until complete
6. **Final validation**: Ensure all acceptance criteria are met

The PRD serves as the single source of truth throughout implementation. Handoff prompts enable phase-by-phase execution while maintaining context and quality standards.
