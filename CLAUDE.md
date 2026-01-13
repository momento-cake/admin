# CLAUDE.md - Momento Cake Admin Web

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Momento Cake Admin system is a web-based admin dashboard for managing the bakery's operations. This project contains:

- **Web Dashboard**: React + Next.js admin interface for recipe management, ingredients inventory, user management
- **Documentation**: Project setup, feature guides, and development workflows
- **Testing**: Playwright E2E tests and component tests for quality assurance

## Development Configuration

### Application Setup
- **Framework**: Next.js with React
- **Styling**: TailwindCSS + Shadcn UI components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Development port**: Always use port 4000
- **Port management**: If port 4000 is in use, kill the process then start on port 4000
- **Command**: `npm run dev` should always run on port 4000

## Application Structure

### Navigation & Menu
The admin dashboard uses **subpath-based navigation** instead of query parameters for better SEO and cleaner URLs.

#### Main Menu Structure

**Dashboard**
- `/dashboard` - Main dashboard overview

**Usuários (Users Management)**
- `/users/active` - Active users list and management
- `/users/invitations` - Pending, accepted, and expired invitations

**Ingredientes (Ingredients Management)**
- `/ingredients/inventory` - Ingredient inventory and stock management
- `/ingredients/suppliers` - Ingredient suppliers management
- `/ingredients/suppliers/new` - Create new ingredient supplier

#### Layout Requirements
- **Fixed left sidebar**: 64px width on mobile, 256px on desktop
- **Main content area**: Responsive with proper spacing
- **Consistent header**: Page title and description for each section
- **Breadcrumb navigation**: Clear indication of current location
- **Active state indicators**: Highlight current page in menu

### URL Pattern Convention
- Use subpaths: `/section/subsection` instead of `/section?tab=subsection`
- Clean, semantic URLs for better user experience
- RESTful approach for resource management

### Navigation State Management
- Automatic menu expansion when accessing subsections
- Persistent menu state across page navigation
- Proper active state indicators for current page

## Development Guidelines

### Code Structure

**Component Organization:**
- Store components in `src/components/` organized by feature
- Page components in `app/` following Next.js conventions
- Reusable components in `src/components/ui/` for shared UI elements
- Follow single responsibility principle

**State Management:**
- Use React Context for global state when needed
- Local state with useState for component-specific data
- Consider Zustand or Redux if state becomes complex
- Avoid prop drilling - use context or state management

**Firebase Integration:**
- Use Firebase Admin SDK for backend operations
- Firestore for document storage
- Firebase Auth for authentication and user management
- Implement proper error handling and loading states
- Add TypeScript types for Firebase data

### Testing

#### Playwright Testing Guidelines

**Working Login Selectors:**
```typescript
// Reliable selectors for Momento Cake Admin login form
const WORKING_SELECTORS = {
  email: 'input[type="email"]',        // Primary - most reliable
  emailAlt: 'input[name="email"]',     // Alternative selector
  password: 'input[type="password"]',   // Primary - most reliable
  passwordAlt: 'input[name="password"]', // Alternative selector
  submitButton: 'button[type="submit"]', // Primary submit button
  submitAlt: 'button:has-text("Entrar")', // Alternative by text
};

// Working wait strategy (IMPORTANT)
await page.waitForLoadState('load'); // ✅ Use this
// NOT: await page.waitForLoadState('networkidle'); // ❌ Times out
```

**Authentication Notes:**
- **Admin credentials**: admin@momentocake.com.br / G8j5k188
- **Known issue**: Authentication may fail - verify Firebase config
- **Redirect behavior**: Login failure keeps user on `/login/?redirect=%2Fdashboard%2F`
- **Success indicator**: Successful login redirects to `/dashboard`

**Test Environment Setup:**
- **Application URL**: http://localhost:4000
- **Login URL**: http://localhost:4000/login
- **Clean environment**: Kill existing dev servers before testing
- **Port management**: Always use port 4000, kill processes if port is occupied

#### Test Organization
- Place tests in `tests/` directory
- Group tests by feature/page
- Use descriptive test names
- Include setup and teardown in test files
- Mock Firebase in unit tests

#### Test Types
1. **Unit Tests**: Component logic, utilities
2. **Integration Tests**: Component interactions, Firebase operations
3. **E2E Tests**: User workflows, critical paths
4. **Accessibility Tests**: WCAG compliance, screen reader compatibility

### Code Quality Standards

**JavaScript/TypeScript:**
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Maintain consistent naming conventions
- Write self-documenting code

**React Patterns:**
- Functional components with hooks
- Proper prop typing with TypeScript
- Memoization for performance when needed
- Clear separation of concerns

**Performance:**
- Code splitting for routes
- Image optimization
- Lazy loading for heavy components
- Monitor bundle size
- Use React DevTools for profiling

### Git & Commits

**Branch Strategy:**
- `main` - Production code
- Feature branches: `feature/description`
- Bug fix branches: `fix/description`
- Chore branches: `chore/description`

**Commit Messages:**
- Clear, descriptive commit messages
- Use imperative mood ("Add feature" not "Added feature")
- Reference issue numbers when applicable
- Group related changes in single commits

## Firebase Configuration

### Authentication
- Use Firebase Auth for user management
- Implement role-based access control (admin, viewer)
- Secure API routes with token verification
- Handle session persistence

### Firestore Database
- Document structure for recipes, ingredients, users
- Proper indexing for queries
- Real-time listeners for live updates
- Batch operations for multiple updates

### Security Rules
- Implement proper Firestore security rules
- Restrict access based on user roles
- Validate data at client and server
- Never trust client-side authentication alone

### Firestore Indexes (CRITICAL)

**IMPORTANT**: When adding new queries with compound filters or ordering, you MUST create corresponding indexes.

**Index Configuration File**: `firestore.indexes.json`

**Deployment Commands**:
```bash
# Deploy indexes to Firestore
firebase deploy --only firestore:indexes

# Deploy security rules
firebase deploy --only firestore:rules

# Deploy both indexes and rules
firebase deploy --only firestore

# Verify deployed indexes
firebase firestore:indexes
```

**When to Create New Indexes**:
- Any query with `.where()` + `.orderBy()` on different fields
- Any query with multiple `.where()` clauses on different fields
- Any query that fails with "requires an index" error in console

**Index Structure Example**:
```json
{
  "collectionGroup": "collectionName",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "fieldA", "order": "ASCENDING" },
    { "fieldPath": "fieldB", "order": "DESCENDING" }
  ]
}
```

**Current Collections with Indexes**:
- `users`, `orders`, `invitations`, `ingredients`, `suppliers`
- `recipes`, `clients`, `stock_history`, `priceHistory`
- `packaging`, `packaging_stock_history`, `packaging_price_history`
- `products`, `productCategories`, `productSubcategories`

**Index Deployment Checklist**:
1. Add index to `firestore.indexes.json`
2. Run `firebase deploy --only firestore:indexes`
3. Wait 5-10 minutes for index to build (check Firebase Console)
4. Verify index shows "Enabled" status
5. Test the query works without errors

**Troubleshooting**:
- If query fails with index error, check Firebase Console for auto-generated index link
- Indexes take 5-10 minutes to build after deployment
- Verify project ID matches: `firebase use` to check current project

See `docs/PACKAGING-INDEXES-DEPLOYMENT.md` for detailed deployment example.

## Documentation

### Feature Documentation
Located in `docs/features/`:
- `CLIENTS_QUICK_START.md` - Client management architecture and API reference
- `PHASES_7_8_COMPLETION_SUMMARY.md` - Related Persons, Special Dates, Tags features
- `clients.md`, `dashboard.md`, `ingredients.md`, `recipes.md`, `vendors.md`

### Development Guides
Located in `docs/development/`:
- `IMPLEMENTATION_SUMMARY.md` - TypeScript migration and project deliverables
- `LAYOUT_IMPROVEMENTS_SUMMARY.md` - Modal and form layout patterns
- `LAYOUT_STRUCTURE.txt` - Flexbox layout patterns with ASCII diagrams
- `PACKAGING-PHASE4-*.md` - Testing patterns and performance metrics
- `data-models.md`, `guidelines.md`

### Testing Documentation
Located in `docs/testing/`:
- `TESTING_GUIDE.md` - Comprehensive testing patterns and best practices
- `recipe-nested-costs-testing.md` - Recipe cost calculation test cases

## MCP Server Configuration

**Active MCP Servers** (web project-specific):
- `playwright`: Browser automation and testing (stdio)

**Disabled MCP Servers** (to save tokens):
- Chrome DevTools, Postman, Sequential Thinking (enable if needed for specific tasks)

To enable additional MCP servers, see `.claude/commands/` templates.

## Context & Planning

### Documentation Structure

**context/project/**: Platform-specific documentation
- `web.md` - Web-specific architecture, patterns, components

**context/plans/**: Planning and ideas in development
- Ad-hoc ideas, spike results, planning documents

**context/specs/**: Formal specifications and plans
- `0_master/` - Master plans for features, bugs, chores
- `web/` - Web-specific implementation specs

### Temporary Documentation

**.temp/**: AI helper files and temporary artifacts
- Planning documents in progress
- Code examples and snippets
- Research and spike results
- **Important**: This folder is gitignored and will NOT be pushed

## Agent-Developer Integration

### When to Use Specialized Agents

**Delegate for:**
- Complex feature development
- Performance optimization
- Bug investigation and root cause analysis
- Large refactoring efforts
- Multi-component implementations

**Use directly for:**
- Small, focused changes
- Quick bug fixes
- Simple chores
- Documentation updates

### Available Agents

**web-firebase-specialist**: Web development with Next.js and Firebase
- Component creation and UI implementation
- Firebase integration and authentication
- Form validation and data management
- Multi-tenant architecture patterns

**web-tester**: E2E testing and quality assurance
- Playwright test creation and maintenance
- User workflow validation
- Cross-browser testing
- Performance monitoring

## Project Account

**Main Admin Account**:
- Email: admin@momentocake.com.br
- Password: G8j5k188

## PRD Workflow Commands

Momento Cake Admin uses a structured PRD (Product Requirements Document) workflow for planning and executing features, bugs, and chores. This workflow is adapted from enterprise development practices and uses AI handoff prompts for phase-by-phase execution.

### Available Commands

**Planning**:
- `/plan` - Create comprehensive PRD with AI handoff prompts

**Implementation**:
- `/implement` - Execute single phase implementation
- `/execute` - Orchestrate multi-phase execution with fresh Claude sessions

### Command: `/plan` - Create PRD

Creates a comprehensive Product Requirements Document using a three-phase planning process.

**Usage**:
```bash
/plan "scope-name" "Work item description"
/plan "offline-product-photos" "Add offline sync for product photos using IndexedDB"
```

**Three-Phase Planning Process**:

1. **Phase 0: Exploratory Analysis** (Silent)
   - Ask for scope name if not provided (URL-friendly: lowercase, hyphens, max 40 chars)
   - Search codebase for related patterns and implementations
   - Identify existing components, services, hooks to reference
   - Prepare context-aware clarifying questions

2. **Phase 1: Requirements Analysis & Clarification**
   - Ask context-aware questions using AskUserQuestion tool
   - Reference specific files found during Phase 0
   - Wait for user answers (DO NOT proceed without answers)
   - Document all clarifications

3. **Phase 2: PRD Creation**
   - Create comprehensive PRD in `context/specs/{SCOPE}/PRD.md`
   - Reference specific files and patterns from Phase 0
   - Structure implementation into logical phases

4. **Phase 3: AI Handoff Generation**
   - Create `context/specs/{SCOPE}/ai-handoff.json`
   - Generate handoff prompts for each implementation phase
   - Include dependencies and validation commands

**Output**:
- `context/specs/{SCOPE}/PRD.md` - Complete requirements document
- `context/specs/{SCOPE}/ai-handoff.json` - Machine-readable handoff prompts

**Example**:
```bash
/plan "user-profile-edit" "Allow users to edit their profile information"
# Creates:
# - context/specs/user-profile-edit/PRD.md
# - context/specs/user-profile-edit/ai-handoff.json
```

### Command: `/implement` - Execute Phase

Implements a plan step-by-step following best practices and Momento Cake's architecture patterns.

**Usage**:
```bash
/implement context/specs/{SCOPE}/PRD.md
/implement "Inline plan description"
```

**Implementation Workflow**:
1. Read and analyze plan
2. Search for existing patterns FIRST (never duplicate code)
3. Clarify requirements (ask questions, wait for answers)
4. Write tests (unit, component, E2E as appropriate)
5. Implement by architecture layer (types → services → hooks → components → pages)
6. Run tests and validation continuously
7. Self-review and finalize

**Best Practices**:
- **Critical Thinking**: Question assumptions, present alternatives
- **Transparent Reasoning**: Explain WHY before implementing
- **Upfront Information**: Ask ALL questions first, then WAIT
- **Quality Over Speed**: Think through solutions properly

**Architecture Layers** (in order):
1. Types (`src/types/`) - TypeScript interfaces, Zod schemas
2. Services (`src/services/`, `src/lib/firebase/`) - Firebase operations, business logic
3. Hooks (`src/hooks/`) - Custom React hooks
4. Components (`src/components/`) - React components with shadcn/ui
5. Pages (`app/`) - Next.js pages and routing
6. Tests (`tests/`) - Unit tests, E2E tests (Playwright)

**Validation Commands**:
```bash
npm run test          # Unit tests
npx playwright test   # E2E tests
npm run lint          # ESLint
npm run build         # TypeScript compilation
npm run dev           # Local testing
```

### Command: `/execute` - Orchestrate Multi-Phase Execution

Orchestrates sequential and parallel execution of AI handoff phases by spawning fresh Claude sessions.

**Usage**:
```bash
/execute scope-name
/execute offline-product-photos
# OR
/execute context/specs/offline-product-photos/ai-handoff.json
```

**Git Strategy Options** (user is asked to choose):
1. **Use worktree** (recommended): Creates new worktree in `.worktrees/` - keeps main codebase untouched
2. **Create new branch**: Creates and switches to new branch from current location
3. **Use current branch**: Works on current branch (ensure clean working tree first)

**Execution Strategy**:
- Loads phases from `ai-handoff.json`
- Analyzes dependencies and creates execution plan
- Spawns fresh Claude session for each phase
- Executes phases sequentially or in parallel based on dependencies
- Monitors with 60-second heartbeat (prevents timeout)
- Runs final tests and validation
- Commits changes and creates PR (if using worktree/new branch)

**Expected Duration**: 30-90 minutes depending on number of phases

**Prerequisites**:
- PRD and ai-handoff.json must exist (run `/plan` first)
- Clean git working tree (or choose current branch option)
- Claude CLI installed and authenticated
- Bash timeout configured (90+ minutes in ~/.claude/settings.json)

**Key Features**:
- **Fresh Context**: Each phase gets new Claude session (no context exhaustion)
- **Optimized Execution**: Parallel execution for independent phases
- **Flexible Git Strategy**: User chooses worktree, new branch, or current branch
- **Heartbeat Monitoring**: 60-second progress updates prevent timeout
- **Fully Automated**: Minimal user interaction required

**Example Workflow**:
```bash
# 1. Create PRD
/plan "product-csv-export" "Add CSV export for product list"

# 2. Review PRD and ai-handoff.json
# Files created:
# - context/specs/product-csv-export/PRD.md
# - context/specs/product-csv-export/ai-handoff.json

# 3. Execute all phases
/execute product-csv-export
# Claude asks:
# - Git strategy? (worktree/new branch/current branch)
# - Branch name? (e.g., "product-csv-export-feature")
# Then executes all phases automatically

# 4. PR created automatically (if worktree/new branch)
```

### PRD Structure

Each PRD follows a standardized template adapted for Next.js + Firebase web architecture:

**Key Sections**:
- **Metadata**: Scope name, type (feature/bug/chore), complexity
- **Problem & Solution**: Clear problem statement and proposed solution
- **Web Architecture**: Pages, components, hooks, services, Firebase integration
- **Types & Schemas**: TypeScript interfaces and Zod validation
- **Implementation Tasks**: Organized by phases with validation commands
- **Testing Strategy**: Unit tests, E2E tests, edge cases
- **Acceptance Criteria**: Functional and technical requirements

**AI Handoff Phases** (typical structure for features):
1. **Phase 1: Data Layer** - Types, schemas, Firebase services
2. **Phase 2: Business Logic** - Custom hooks, state management
3. **Phase 3: UI Components** - React components, shadcn/ui integration
4. **Phase 4: Pages & Routing** - Next.js pages, navigation
5. **Phase 5: Testing & Validation** - Comprehensive testing, quality checks

**For Bugs** (typical structure):
1. **Phase 1: Reproduce & Verify** - Confirm root cause
2. **Phase 2: Write Failing Test** - TDD: prove the bug exists
3. **Phase 3: Implement Minimal Fix** - Fix only what's broken
4. **Phase 4: Verify & Validate** - All tests pass, no regressions

### Helper Scripts

**Location**: `.claude/scripts/`

**analyze_dependencies.py**:
- Analyzes phase dependencies from ai-handoff.json
- Generates execution plan with parallel/sequential grouping

**orchestrate_execution.py**:
- Python orchestrator for phase execution
- Spawns Claude sessions with proper process management
- Real-time output streaming
- Heartbeat monitoring
- Signal handling for graceful cleanup

**validate_prerequisites.sh**:
- Validates environment and prerequisites
- Resolves scope paths
- Checks for PRD and ai-handoff.json files

**cleanup_execution.sh**:
- Removes worktrees and temporary files
- Cleans up failed/aborted executions

### Scope-Based Naming Convention

Unlike ticket-based systems, this project uses **scope names** for organizing work:

**Format**: URL-friendly, lowercase, hyphens, max 40 chars
- ✅ Good: `offline-product-photos`, `user-auth-fix`, `dependency-update`
- ❌ Bad: `Offline_Product_Photos`, `UserAuthFix`, `update dependencies`

**Directory Structure**:
```
context/specs/
├── offline-product-photos/
│   ├── PRD.md
│   └── ai-handoff.json
├── user-auth-fix/
│   ├── PRD.md
│   └── ai-handoff.json
└── product-csv-export/
    ├── PRD.md
    └── ai-handoff.json
```

### Configuration Requirements

**Bash Timeout** (required for `/execute`):

Edit `~/.claude/settings.json`:
```json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "5400000",
    "BASH_MAX_TIMEOUT_MS": "7200000"
  }
}
```

Then restart Claude Code completely.

**Explanation**:
- `BASH_DEFAULT_TIMEOUT_MS`: 5,400,000ms = 90 minutes (matches max phase duration)
- `BASH_MAX_TIMEOUT_MS`: 7,200,000ms = 120 minutes (buffer for multiple phases)

---

## Quality & Planning Guidelines

### Three-Phase Planning Process (MANDATORY)

When using `/plan` command, ALWAYS follow this three-phase process:

#### Phase 0: Exploratory Analysis (FIRST - SILENT)
- [ ] Ask for scope name if not provided
- [ ] Extract key concepts from work description
- [ ] Search codebase for related implementations
- [ ] Identify existing patterns to reference
- [ ] Prepare context-aware clarifying questions
- [ ] **DO NOT ask questions yet** - only gather context

**DO NOT proceed to Phase 1 until Phase 0 is complete.**

#### Phase 1: Requirements Analysis & Clarification
- [ ] Ask context-aware clarifying questions
- [ ] Reference specific files found in Phase 0
- [ ] Use AskUserQuestion tool with checkbox options
- [ ] **WAIT for user to provide answers**
- [ ] Document all clarifications received
- [ ] **DO NOT proceed without answers**

**DO NOT proceed to Phase 2 until Phase 1 is complete.**

#### Phase 2: PRD Creation (ONLY AFTER Phase 0 & 1)
- [ ] Create comprehensive PRD in `context/specs/{SCOPE}/PRD.md`
- [ ] Include specific file references from Phase 0
- [ ] Reference existing patterns discovered
- [ ] Create detailed implementation tasks by phase

**DO NOT proceed to Phase 3 until Phase 2 is complete.**

#### Phase 3: AI Handoff Generation (ONLY AFTER Phase 2)
- [ ] Create `context/specs/{SCOPE}/ai-handoff.json`
- [ ] Generate handoff prompts for each phase
- [ ] Include concrete file paths from Phase 0
- [ ] Include pattern references and dependencies
- [ ] Return both file paths (PRD + AI Handoff)

### Violation of Three-Phase Process

The following actions indicate phases are being skipped (DO NOT DO):
- ❌ Proceeding without a valid scope name
- ❌ Skipping Phase 0: Asking questions without exploring codebase first
- ❌ Asking vague questions without referencing specific files from Phase 0
- ❌ Creating detailed plans without confirming requirements
- ❌ Assuming problem scope without explicit user confirmation
- ❌ Writing plan documents without documented answers
- ❌ Using "comprehensive analysis" to skip asking the user

### Pre-Implementation Planning

Before starting feature development:

1. **Requirements Validation**:
   - Gather complete requirements and edge cases
   - Validate business assumptions
   - Create clear acceptance criteria
   - Identify affected components

2. **Architecture Review**:
   - Review existing patterns
   - Identify reusable components
   - Plan data model changes
   - Consider performance implications

3. **Task Breakdown** (Use TodoWrite):
   - Break feature into discrete, testable tasks
   - Organize by component and layer
   - Identify dependencies
   - Estimate complexity

### Code Quality Standards

**Best Practices:**
- Follow SOLID principles
- Write self-documenting code
- Use existing patterns as templates
- Implement proper error handling
- Add comprehensive logging

**Testing Requirements:**
- Unit tests for business logic
- Component tests for UI
- E2E tests for critical flows
- Mock external dependencies
- Aim for >80% coverage

**Documentation Standards:**
- Update API documentation for changes
- Document environment setup
- Add inline comments for complex logic
- Update architecture diagrams
- Document breaking changes

## Troubleshooting

### Port 4000 Already in Use
```bash
# Find and kill process using port 4000
lsof -i :4000
kill -9 <PID>

# Then start dev server
npm run dev
```

### Firebase Configuration Issues
- Verify `.env.local` has correct Firebase credentials
- Check Firebase console for correct project
- Ensure service account has proper permissions
- Check Firestore security rules

### Test Failures
- Check test output for specific errors
- Verify test environment setup
- Ensure mocks are configured correctly
- Run tests in isolation to debug

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Playwright Documentation](https://playwright.dev)
