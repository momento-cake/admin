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

## Documentation

### Feature Documentation
- Located in `docs/features/`
- Include implementation details
- Document API contracts
- Add screenshots/examples

### Development Guides
- Located in `docs/development/`
- Setup instructions
- Architecture decisions
- Common patterns and best practices

### Testing Documentation
- Located in `docs/testing/`
- Test setup and running
- Test patterns and examples
- Troubleshooting guide

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

## Quality & Planning Guidelines

### Two-Phase Planning Process (MANDATORY)

When working on features, bugs, or chores, ALWAYS follow this two-phase process:

#### Phase 1: Analysis & Clarification (FIRST)
- [ ] Read the request thoroughly
- [ ] Identify incomplete or ambiguous information
- [ ] Ask clarifying questions to the user
- [ ] **WAIT for answers before proceeding**
- [ ] Perform analysis with complete information
- [ ] Document clarifications received

**DO NOT proceed to Phase 2 until Phase 1 is complete.**

#### Phase 2: Plan Creation (ONLY AFTER Phase 1)
- [ ] Only create plans after all clarifications are answered
- [ ] Use answers from Phase 1 to inform the plan
- [ ] Create master plan in `context/specs/0_master/`
- [ ] Create web-specific plans in `context/specs/web/` if needed
- [ ] Reference clarifications in plan documents

### Violation of Two-Phase Process

The following actions indicate Phase 1 is being skipped (DO NOT DO):
- ❌ Reading codebase before asking clarifying questions
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
