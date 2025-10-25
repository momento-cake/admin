# Feature Planning

Create a comprehensive plan to implement a new feature across Gango's multi-platform architecture (backend, web, mobile, infrastructure).

## Two-Phase Planning Process

This command uses a **two-phase planning process** that works both locally and in automated workflows:

### Phase 1: Requirements Analysis & Clarification
1. **Analyze** the feature description
2. **Research** related codebase for context and patterns
3. **Identify** ambiguities or missing requirements
4. **Generate** clarifying questions (if needed)
5. **Collect answers** (locally via prompts, or via GitHub comments in workflows)
6. **Proceed** to Phase 2 once all context is clear

### Phase 2: Plan Creation
1. **Design** implementation strategy based on clarified requirements
2. **Create** master plan in `context/specs/0_master/`
3. **Create** platform-specific plans in respective directories
4. **Return** plan file paths for review and implementation

### 🚨 MANDATORY ENFORCEMENT: Phase 1 MUST Complete Before Phase 2

**This process is REQUIRED and MUST NEVER be skipped.**

#### Phase 1 Completion Checklist
- [ ] Read and understand the complete feature description
- [ ] Identify what requirements are ambiguous or unclear
- [ ] Ask specific clarifying questions to the user until all requirements are clear, including:
  - Which platforms need this feature? (web)
  - Who are the target users and what problem does this solve?
  - What are the acceptance criteria or success metrics?
  - Are there any dependencies on other features or systems?
  - What is the timeline or priority for this feature?
  - Any other requirements needed to plan implementation
- [ ] **WAIT for user to provide answers** - DO NOT PROCEED without answers
- [ ] Document all clarifications received from user
- [ ] Research codebase patterns using the clarifications
- [ ] Mark Phase 1 as complete before starting Phase 2

#### Actions That Indicate Phase 1 is Being Skipped (DO NOT DO THESE)
- ❌ Reading codebase or investigating patterns before asking clarifying questions
- ❌ Creating detailed plans without confirming requirements with the user
- ❌ Assuming feature scope, priority, or approach without explicit user confirmation
- ❌ Writing plan files or performing deep analysis without documented answers to clarifications
- ❌ Treating "comprehensive research" as a substitute for asking the user
- ❌ Proceeding to plan creation without explicit Phase 1 completion

#### Correct Workflow Example
```
Phase 1 (IN THIS ORDER):
1. User provides: "Add dashboard widget for weekly progress"
2. Claude asks:
   - What data should the widget display (workouts, points, achievements)?
   - Should it be real-time or refresh on a schedule?
   - Which user roles can see this widget?
3. User answers the clarifying questions
4. Claude documents the answers
5. Claude researches code patterns with clarifications in mind

Phase 2 (ONLY AFTER Phase 1):
6. Claude creates detailed implementation plan based on clarifications
7. Claude references the clarifications in the plan documents
```

## Variables

feature_title: $ARGUMENT (required: feature title or brief description)
feature_description: $ARGUMENT (required: detailed feature description)
slug: $ARGUMENT (optional: URL-friendly slug for file naming, max 40 chars - auto-generated if not provided)

## Instructions

- **IMPORTANT**: You're creating a detailed implementation plan based on the feature description
- **IMPORTANT**: This is a planning phase, NOT the implementation phase
- Create the master plan in `context/specs/0_master` directory with filename: `{slug}.md`
  - Replace `{slug}` with URL-friendly slug from feature title (lowercase, hyphens, max 40 chars)
  - Auto-generate slug from title if not provided
  - Example: `dashboard-improvement.md`
- **Think deeply** about requirements, architecture, and cross-platform coordination
- Use the Sequential Thinking and Context7 MCPs to help with the thinking process
- Research the codebase to understand existing patterns before planning
- Follow existing patterns in each platform (backend/Java, web/React, mobile/Flutter, infrastructure/Terraform)
- Design for extensibility and maintainability

### Planning Workflow

**1. Understand the Feature:**
- Analyze the feature description
- Identify which platforms are affected (backend, web, mobile, infrastructure)
- Determine complexity and scope

**2. Research Existing Patterns:**
- Review relevant platform documentation in `specs/project/*.md`
- Check `.claude/commands/plan/conditional_docs.md` for additional context requirements
- Review existing code patterns in affected platforms

**3. Read Platform-Specific Templates:**
Based on which platforms are affected by this feature, read the corresponding template files from `.claude/commands/plan/templates/`:

- **ALWAYS read**: `base_feature.md` (contains common sections for all features)
- **If backend changes needed**: Read `backend_feature.md`
- **If web changes needed**: Read `web_feature.md`
- **If mobile changes needed**: Read `mobile_feature.md`
- **If infrastructure changes needed**: Read `infrastructure_feature.md`

**4. Create Platform-Specific Plans:**
When creating the feature plan:
- Start with the base template content
- Include sections from platform-specific templates based on affected platforms
- Create separate platform-specific plan files in their respective directories:
  - **Backend plans**: `context/specs/web/{slug}.md`
  - **Web plans**: `context/specs/web/{slug}.md`
  - **Mobile plans**: `[mobile]/{slug}.md`
  - **Infrastructure plans**: `[infrastructure]/{slug}.md`
- Reference the platform-specific plans in the master plan
- **IMPORTANT**: Use the SAME slug across all platform plans for consistency

**5. Structure Your Plan:**
- Use the base template structure as the foundation
- Integrate relevant sections from platform templates
- Ensure implementation tasks are ordered logically (foundation → implementation → integration → testing)
- Include validation commands for all affected platforms

### Platform-Specific Considerations

**Backend (Java/Spring Boot)**:
- Follow Controller → Service → Repository pattern
- Use Flyway for database migrations
- Implement Redis caching for frequently accessed data
- Use Firebase Admin SDK for authentication
- Integrate AWS services (DynamoDB, S3, SNS) as needed
- **IMPORTANT**: Backend changes must be made in `this admin` repository

**Web (React/Vite)**:
- Use shadcn/ui components for UI consistency
- Implement TanStack Query for data fetching
- Use Zod for validation
- Follow existing page/component patterns
- Ensure responsive design with Tailwind CSS
- **IMPORTANT**: Web changes must be made in `this admin` repository

**Mobile (Flutter)**:
- Follow MVVM architecture with Riverpod
- Implement offline-first approach with local storage
- Use GoRouter for navigation
- Create widget tests for UI components
- Handle iOS and Android platform differences
- **IMPORTANT**: Mobile changes must be made in `[mobile]` repository

**Infrastructure (Terraform/GCP)**:
- Plan Cloud SQL migrations carefully
- Consider VPC connectivity requirements
- Update Cloud Run configurations if needed
- Manage secrets in GCP Secret Manager
- **IMPORTANT**: Infrastructure changes must be made in `[infrastructure]` repository

## Relevant Files

Focus on these areas based on affected platforms:
- **Backend**: `this admin/src/main/java/com/br/**`
- **Web**: `this admin/src/**`
- **Mobile**: `[mobile]/lib/**`
- **Infrastructure**: Reference only (changes go in separate repo)
- **Documentation**: `context/project/backend.md`, `context/project/web.md`, `context/project/mobile.md`
- **Conditional docs**: Read `.claude/commands/plan/conditional_docs.md` for additional context requirements

## Plan Creation Steps

### Step 1: Identify Affected Platforms
Analyze the feature and determine which platforms need changes:
- [ ] Backend API changes needed?
- [ ] Web dashboard changes needed?
- [ ] Mobile app changes needed?
- [ ] Infrastructure changes needed?

### Step 2: Read Appropriate Templates
- [ ] Read `base_feature.md` (always required)
- [ ] Read `backend_feature.md` (if backend changes)
- [ ] Read `web_feature.md` (if web changes)
- [ ] Read `mobile_feature.md` (if mobile changes)
- [ ] Read `infrastructure_feature.md` (if infrastructure changes)

### Step 3: Create Master Plan
- [ ] Create master plan file in `context/specs/0_master/`
- [ ] Include metadata (platforms, complexity, effort)
- [ ] Write feature description, user story, problem/solution statements
- [ ] List all affected platforms

### Step 4: Create Platform-Specific Plans
For each affected platform, create a detailed plan:
- [ ] Backend: Create plan in `context/specs/web/` with backend-specific sections
- [ ] Web: Create plan in `context/specs/web/` with web-specific sections
- [ ] Mobile: Create plan in `[mobile]/` with mobile-specific sections
- [ ] Infrastructure: Create plan in `[infrastructure]/` with infrastructure-specific sections

### Step 5: Define Implementation Phases
Structure the implementation into logical phases:
- **Phase 1**: Foundation & API Design (backend database, API contracts)
- **Phase 2**: Backend Service Layer (business logic, integrations)
- **Phase 3**: Backend API Endpoints (REST controllers, authentication)
- **Phase 4**: Web Implementation (UI components, data integration)
- **Phase 5**: Mobile Implementation (MVVM, offline support, platform-specific)
- **Phase 6**: Cross-Platform Integration & E2E Testing

### Step 6: Create Step-by-Step Tasks
Break down implementation into specific, actionable tasks:
- Order tasks logically (foundation → implementation → testing)
- Include tasks from platform-specific templates
- Add validation and testing tasks
- Final step should always be running validation commands

### Step 7: Define Testing Strategy
- Include testing approaches from platform templates
- Define unit, integration, and E2E test requirements
- List edge cases to consider

### Step 8: Define Acceptance Criteria
- List specific, measurable completion criteria
- Include criteria from all affected platforms
- Ensure all quality gates are defined

### Step 9: Add Validation Commands
- Include validation commands from all affected platform templates
- Ensure comprehensive test coverage
- Add manual testing checklist

## Notes

### Development Best Practices
- Follow SOLID principles and clean architecture
- Use existing patterns as templates for new code
- Prioritize code reusability across platforms
- Write self-documenting code with clear naming
- Add comments only for complex business logic
- Implement comprehensive error handling with user-friendly messages
- Add logging for debugging (use appropriate log levels)
- Consider internationalization (i18n) requirements early
- Use feature flags for gradual rollout if appropriate

### Performance Considerations
- Implement database indexes for frequently queried fields
- Use Redis caching for expensive operations
- Optimize API payload sizes (pagination, field selection)
- Lazy load data on web and mobile
- Optimize images and assets
- Profile mobile app performance (Flutter DevTools)
- Monitor backend API response times

### Security Considerations
- Validate all user inputs (backend and frontend)
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Store secrets in GCP Secret Manager (never in code)
- Use HTTPS for all API communications
- Implement rate limiting for public endpoints
- Sanitize data before rendering (prevent XSS)
- Follow principle of least privilege for service accounts

### Deployment Coordination
- Coordinate database migrations across environments
- Plan deployment order (usually: infrastructure → backend → web/mobile)
- Plan rollback strategy
- Test thoroughly in dev environment before production
- Monitor application after deployment
- Have incident response plan ready

### Infrastructure Reminders
- **CRITICAL**: All infrastructure changes must be made in `[infrastructure]` repository
- Coordinate infrastructure changes with backend deployments
- Update environment variables in Cloud Run via Terraform
- Manage database credentials in Secret Manager
- Ensure VPC connectivity for Cloud SQL access
- Test infrastructure changes in dev environment first

## Report

After creating the plans:
- Return the path to the master plan file in `context/specs/0_master/`
- Return paths to platform-specific plan files (if created)
- Confirm which platforms are affected by this feature
- List any additional context files that were referenced

## Example Usage

```bash
# Basic usage - let Claude generate the slug
/feature "Add user achievement badges" "Users want to earn badges..."

# With custom slug
/feature "Add user achievement badges" "Users want to earn badges..." "achievement-badges"

# In response to this command, Claude will ask clarifying questions until all requirements are clear:
# - Which platforms need this feature? (web)
# - Who are the target users and what problem does this solve?
# - What are the acceptance criteria or success metrics?
# - Are there any dependencies on other features or systems?
# - What is the timeline or priority for this feature?
# (Additional questions as needed to fully understand the feature)
```
