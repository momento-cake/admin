# Conditional Documentation

This file specifies when to include additional documentation files from `specs/project/*.md` for enhanced context.

## Purpose

When planning or implementing features, check these conditions to determine which additional documentation files should be referenced for platform-specific patterns and best practices.

## When to Include Backend Documentation

**File**: `specs/project/backend.md`

Include when your task involves:
- Creating or modifying REST API endpoints
- Implementing Spring Boot services or repositories
- Working with database entities or Flyway migrations
- Integrating AWS services (DynamoDB, S3, SNS)
- Implementing Redis caching strategies
- Adding Firebase Admin SDK authentication
- Modifying Spring Boot configuration
- Creating integration or unit tests for backend

**Examples**:
- "Add user activity tracking API"
- "Implement workout statistics calculation"
- "Create group challenge endpoints"
- "Add Redis caching for user profiles"

## When to Include Web Documentation

**File**: `specs/project/web.md`

Include when your task involves:
- Creating or modifying React pages and components
- Working with shadcn/ui components
- Implementing forms with validation (Zod)
- Using TanStack Query for data fetching
- Adding Tailwind CSS styling
- Implementing responsive design
- Creating React hooks or context providers
- Adding web tests (component or integration)

**Examples**:
- "Create user analytics dashboard"
- "Add workout sharing UI"
- "Implement admin panel for challenges"
- "Create login/registration forms"

## When to Include Mobile Documentation

**File**: `specs/project/mobile.md`

Include when your task involves:
- Creating or modifying Flutter screens
- Implementing MVVM architecture with ViewModels
- Using Riverpod for state management
- Implementing offline-first features (Hive/Drift)
- Adding navigation with GoRouter
- Creating platform-specific code (iOS/Android)
- Implementing Firebase integration (auth, analytics, push notifications)
- Adding widget tests or integration tests for mobile

**Examples**:
- "Create group challenge feed screen"
- "Implement workout timer with offline support"
- "Add social sharing for achievements"
- "Implement biometric authentication"

## When to Include Design Documentation

**Files**: `specs/project/web.md` (for web design system), `specs/project/mobile.md` (for mobile design system)

Design system documentation is now integrated into platform-specific guides:
- **Web Design System**: See `specs/project/web.md` for ShadCN UI components, colors, typography, and layout
- **Mobile Design System**: See `specs/project/mobile.md` for Flutter components, colors, typography, and localization

Include when your task involves:
- Creating new UI components or screens
- Implementing color schemes or themes
- Working with typography and spacing
- Adding icons or images
- Implementing localization (i18n)
- Creating accessible UI (WCAG 2.1 AA)
- Following brand guidelines
- Ensuring design consistency across platforms

**Examples**:
- "Design new onboarding flow" → Use mobile.md for mobile app, web.md for web dashboard
- "Create custom workout card component" → Use respective platform guide
- "Add dark mode support" → See color system in platform guides
- "Implement multi-language support" → See localization section in mobile.md

## When to Include Development Workflow Documentation

**Reference**: See [CLAUDE.md](../../CLAUDE.md) for git workflow and branch protection

Development workflow documentation is now integrated into platform-specific guides and the main CLAUDE.md file:
- **Git Workflow & Branch Protection**: See CLAUDE.md for branching strategy, commit conventions, and CI/CD
- **Platform-Specific Workflows**: Each platform guide (backend.md, web.md, mobile.md) includes development workflow for that platform

Include when your task involves:
- Setting up development environment → See respective platform guide
- Understanding Git workflow and branching strategy → See CLAUDE.md
- Learning about testing requirements → See respective platform guide
- Understanding CI/CD pipeline → See CLAUDE.md infrastructure section
- Deploying to dev/staging/production environments → See CLAUDE.md and platform guide
- Understanding quality gates and code review process → See platform guide

**Examples**:
- "Set up local development environment" → Use backend.md, web.md, or mobile.md
- "Create feature branch for new functionality" → See CLAUDE.md git workflow section
- "Prepare for production deployment" → See CLAUDE.md infrastructure section

## When to Include Infrastructure Documentation

**File**: See CLAUDE.md infrastructure section (infrastructure documentation is in CLAUDE.md)

Include when your task involves:
- Making Terraform infrastructure changes
- Modifying GCP resources (Cloud SQL, Cloud Run, VPC)
- Updating environment variables or secrets
- Configuring CI/CD pipelines
- Managing database migrations
- Updating VPC networking or connectivity

**IMPORTANT**: Infrastructure changes must be made in the `gango-infrastructure` repository, NOT in the development repository.

**Examples**:
- "Add new Cloud Run service"
- "Update Cloud SQL configuration"
- "Add environment variables for new feature"
- "Configure VPC peering for new service"

## Multiple Documentation Files

Include multiple documentation files when your task spans multiple platforms:

### Multi-Platform Features
- Include `backend.md` + `web.md` + `mobile.md` for full-stack features
- Example: "Implement user profile with settings across all platforms"

### Backend + Web Admin
- Include `backend.md` + `web.md` (design system included in web.md)
- Example: "Create admin dashboard for managing user reports"

### Backend + Mobile
- Include `backend.md` + `mobile.md` (design system included in mobile.md)
- Example: "Implement activity tracking with offline support"

### Mobile UI Features
- Include `mobile.md` (includes mobile design system)
- Example: "Redesign workout timer screen"

### Web UI Features
- Include `web.md` (includes web design system)
- Example: "Redesign user dashboard"

## How to Use This File

### In Feature Planning (`/feature` command)

When creating a feature plan, check these conditions and add relevant documentation files to the **Relevant Files** section:

```markdown
## Relevant Files

### Documentation (Reference for Patterns)
- `specs/project/backend.md` - Java/Spring Boot patterns and best practices
- `specs/project/mobile.md` - Flutter MVVM architecture, Riverpod patterns, and mobile design system
- `specs/project/web.md` - React patterns, ShadCN UI components, and web design system
```

### In Bug Planning (`/bug` command)

When planning a bug fix, include documentation for the affected platform(s):

```markdown
## Context Files
- `specs/project/web.md` - React component patterns (bug is in web dashboard)
```

### In Code Review (`/review` command)

When reviewing code, reference relevant documentation to ensure patterns are followed:

```markdown
## Review Checklist
- Verify follows patterns in `specs/project/backend.md` (REST API conventions)
- Confirm adheres to design system in `specs/project/web.md` or `specs/project/mobile.md` (color scheme, typography)
```

### During Implementation

Before implementing, explicitly read the relevant documentation:

```bash
# Example: Before implementing backend API
Read specs/project/backend.md to understand Controller → Service → Repository pattern

# Example: Before implementing mobile screen
Read specs/project/mobile.md to understand MVVM architecture with Riverpod
# Design system (colors, typography, components) is included in mobile.md

# Example: Before implementing web feature
Read specs/project/web.md to understand React patterns and ShadCN UI components
# Design system is included in web.md
```

## Benefits

Including the right documentation ensures:
- ✅ Consistency with existing patterns
- ✅ Faster implementation (no need to discover patterns)
- ✅ Better code quality (following best practices)
- ✅ Reduced review comments (patterns followed from start)
- ✅ Less technical debt (doing it right the first time)

## When in Doubt

If you're unsure which documentation files to include:
1. Start with the primary platform's documentation in `specs/project/` (backend.md, web.md, or mobile.md)
2. Design systems are integrated into platform files (web.md for web, mobile.md for mobile)
3. Check `CLAUDE.md` for git workflow, infrastructure, and deployment questions
4. Read `CLAUDE.md` for project overview and architecture

## Future Documentation Files

As the project grows, consider creating additional documentation in `specs/project/`:
- `testing.md` - Comprehensive testing strategies across platforms
- `infrastructure.md` - Infrastructure patterns and deployment (or keep in CLAUDE.md)
- `performance.md` - Performance optimization guidelines
- `security.md` - Security best practices and patterns
