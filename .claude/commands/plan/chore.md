# Chore Planning

Create a plan to complete maintenance work, updates, or refactoring tasks that don't add new features or fix bugs.

## Two-Phase Planning Process

This command uses a **two-phase planning process** that works both locally and in automated workflows:

### Phase 1: Scope Analysis & Clarification
1. **Understand** the chore description and goals
2. **Research** affected codebase and dependencies
3. **Identify** missing scope details or assumptions
4. **Generate** clarifying questions (if needed)
5. **Collect answers** (locally via prompts, or via GitHub comments in workflows)
6. **Determine** complete scope with all stakeholder input

### Phase 2: Implementation Plan Creation
1. **Design** approach for completing the chore
2. **Create** chore plan in `context/specs/0_master/`
3. **Create** platform-specific chore plans in respective directories
4. **Identify** all affected files and areas
5. **Return** plan file paths for review and implementation

### 🚨 MANDATORY ENFORCEMENT: Phase 1 MUST Complete Before Phase 2

**This process is REQUIRED and MUST NEVER be skipped.**

#### Phase 1 Completion Checklist
- [ ] Read and understand the complete chore description
- [ ] Identify what scope details are missing or unclear
- [ ] Ask specific clarifying questions to the user until scope is fully understood, including:
  - Which platforms are affected? (web)
  - What is the scope—what's included and what's excluded?
  - Are there any breaking changes or migration needs?
  - Are there dependencies on other work or external factors?
  - What is the motivation or business value for this chore?
  - Any other scope details needed to plan the work
- [ ] **WAIT for user to provide answers** - DO NOT PROCEED without answers
- [ ] Document all clarifications received from user
- [ ] Research affected codebase using the clarifications
- [ ] Mark Phase 1 as complete before starting Phase 2

#### Actions That Indicate Phase 1 is Being Skipped (DO NOT DO THESE)
- ❌ Reading codebase or investigating affected files before asking clarifying questions
- ❌ Creating detailed plans without confirming chore scope with the user
- ❌ Assuming which files/areas are affected without explicit user confirmation
- ❌ Writing plan files or performing deep analysis without documented answers to clarifications
- ❌ Treating "code research" as a substitute for asking the user
- ❌ Proceeding to plan creation without explicit Phase 1 completion

#### Correct Workflow Example
```
Phase 1 (IN THIS ORDER):
1. User provides: "Update dependencies to latest versions"
2. Claude asks:
   - Which dependencies need updating (all or specific ones)?
   - Are breaking changes acceptable or need to maintain compatibility?
   - Should we update test dependencies as well?
3. User answers the clarifying questions
4. Claude documents the answers
5. Claude researches affected code with clarifications in mind

Phase 2 (ONLY AFTER Phase 1):
6. Claude creates detailed chore plan based on clarifications
7. Claude references the clarifications in the plan documents
```

## Purpose

Chores are maintenance tasks like:
- Dependency updates
- Code refactoring
- Documentation updates
- Configuration changes
- Test maintenance
- Build system improvements
- Developer tooling updates

## Variables

chore_title: $ARGUMENT (required: chore title or brief description)
chore_description: $ARGUMENT (required: detailed chore description)
slug: $ARGUMENT (optional: URL-friendly slug for file naming, max 40 chars - auto-generated if not provided)

## Instructions

- **IMPORTANT**: You're creating a plan to complete a chore, NOT implementing it yet
- Keep chores focused and simple - don't combine multiple unrelated tasks
- Be thorough to avoid second rounds of changes
- Create the master plan in `context/specs/0_master/` directory with filename: `{slug}.md`
  - Replace `{slug}` with URL-friendly slug from chore title (lowercase, hyphens, max 40 chars)
  - Auto-generate slug from title if not provided
  - Example: `update-dependencies.md`
- Use the Sequential Thinking and Context7 MCPs to help with planning
- Research the codebase to understand the scope
- Follow existing patterns in each platform (backend/Java, web/React, mobile/Flutter, infrastructure/Terraform)

### Chore Planning Workflow

**1. Understand the Chore:**
- Analyze the chore description and scope
- Identify which platforms are affected (backend, web, mobile, infrastructure)
- Determine complexity and estimated effort
- Identify dependencies and related code

**2. Research Existing Code:**
- Review relevant platform documentation in `specs/project/*.md`
- Check `.claude/commands/plan/conditional_docs.md` for additional context requirements
- Review code patterns in affected platforms
- Check existing tests and build configurations

**3. Read Platform-Specific Templates:**
Based on which platforms are affected by this chore, read the corresponding template files from `.claude/commands/plan/templates/`:

- **ALWAYS read**: `base_chore.md` (contains common sections for all chores)
- **If backend chore**: Read `backend_chore.md`
- **If web chore**: Read `web_chore.md`
- **If mobile chore**: Read `mobile_chore.md`
- **If infrastructure chore**: Read `infrastructure_chore.md`

**4. Create Platform-Specific Chore Plans:**
When creating the chore plan:
- Start with the base template content
- Include sections from platform-specific templates based on affected platforms
- Create separate platform-specific chore plans in their respective directories:
  - **Backend chores**: `context/specs/web/{slug}.md`
  - **Web chores**: `context/specs/web/{slug}.md`
  - **Mobile chores**: `[mobile]/{slug}.md`
  - **Infrastructure chores**: `[infrastructure]/{slug}.md`
- Reference the platform-specific plans in the master plan
- **IMPORTANT**: Use the SAME slug across all platform plans for consistency

**5. Structure Your Chore Plan:**
- Use the base template structure as the foundation
- Integrate relevant sections from platform templates
- Ensure tasks are ordered logically (research → prepare → make changes → test → validate)
- Include validation commands for all affected platforms

### Common Chore Types

**Dependency Updates:**
- Backend: Maven dependencies in pom.xml
- Web: npm packages in package.json
- Mobile: Flutter packages in pubspec.yaml

**Refactoring:**
- Extract duplicated code to shared utilities
- Improve code organization
- Simplify complex logic
- Update naming conventions

**Documentation:**
- Update README files
- Improve code comments
- Update API documentation
- Add architecture diagrams

**Configuration:**
- Update environment configurations
- Improve build settings
- Update CI/CD pipelines
- Configure new tools

**Testing:**
- Add missing test coverage
- Update test frameworks
- Improve test data
- Fix flaky tests

## Relevant Files

Focus on files directly related to the chore:
- **Backend**: `pom.xml`, source files, test files
- **Web**: `package.json`, source files, test files
- **Mobile**: `pubspec.yaml`, source files, test files
- **Infrastructure**: Terraform files, GitHub Actions workflows
- **Documentation**: README files, docs directories, `specs/project/*.md` files

## Chore Plan Creation Steps

### Step 1: Identify Affected Platforms
Analyze the chore and determine which platforms are affected:
- [ ] Backend chore (dependencies, refactoring, configuration)?
- [ ] Web chore (dependencies, UI refactoring, configuration)?
- [ ] Mobile chore (dependencies, screen refactoring, configuration)?
- [ ] Infrastructure chore (Terraform, CI/CD, GCP resources)?
- [ ] Documentation chore (README, API docs, architecture docs)?

### Step 2: Read Appropriate Templates
- [ ] Read `base_chore.md` (always required)
- [ ] Read `backend_chore.md` (if backend chore)
- [ ] Read `web_chore.md` (if web chore)
- [ ] Read `mobile_chore.md` (if mobile chore)
- [ ] Read `infrastructure_chore.md` (if infrastructure chore)

### Step 3: Create Master Chore Plan
- [ ] Create master plan file in `context/specs/0_master/`
- [ ] Include metadata (platforms, complexity, estimated effort)
- [ ] Write chore description and motivation
- [ ] Define scope (included/excluded items)
- [ ] List all affected platforms

### Step 4: Create Platform-Specific Chore Plans
For each affected platform, create a detailed plan:
- [ ] Backend: Create plan in `context/specs/web/` with backend-specific sections
- [ ] Web: Create plan in `context/specs/web/` with web-specific sections
- [ ] Mobile: Create plan in `[mobile]/` with mobile-specific sections
- [ ] Infrastructure: Create plan in `[infrastructure]/` with infrastructure-specific sections

### Step 5: Document Files and Changes
Include platform-specific file lists:
- Files to modify with reasons
- New files to create (if any)
- Configuration files affected
- Test files to update
- Documentation files to update

### Step 6: Plan Step-by-Step Tasks
- [ ] Research and planning tasks
- [ ] Backup and preparation tasks
- [ ] Platform-specific implementation tasks (from templates)
- [ ] Documentation update tasks
- [ ] Testing tasks
- [ ] Code review preparation tasks
- [ ] Final validation tasks

### Step 7: Define Testing Strategy
- Include testing approaches from platform templates
- Define regression tests to ensure no breakage
- List specific tests for this chore
- Add manual testing checklist

### Step 8: Add Validation Commands
- Include validation commands from all affected platform templates
- Ensure comprehensive test coverage
- Add manual testing checklist
- Document how to verify chore is complete

### Step 9: Document Breaking Changes and Rollback
- [ ] Identify potential breaking changes
- [ ] Define rollback strategy
- [ ] Plan communication if breaking changes exist
- [ ] Document migration path if needed

### Step 10: Add Notes and Best Practices
- [ ] List best practices for this specific chore
- [ ] Document future improvements
- [ ] Link related chores or follow-up work
- [ ] Note dependencies on other work

## Report

After creating the chore plans:
- Return the path to the master plan file in `context/specs/0_master/`
- Return paths to platform-specific chore plan files (if created)
- Confirm which platforms are affected by this chore
- Indicate complexity and estimated effort
- Note if breaking changes are expected
- List any additional context files that were referenced

## Example Usage

```bash
# Basic usage - let Claude generate the slug
/chore "Update Spring Boot dependencies" "Update to latest stable versions..."

# With custom slug
/chore "Update Spring Boot dependencies" "Update to latest stable versions..." "update-spring-boot"

# In response to this command, Claude will ask clarifying questions until scope is fully understood:
# - Which platforms are affected? (web)
# - What is the scope—what's included and what's excluded?
# - Are there any breaking changes or migration needs?
# - Are there dependencies on other work or external factors?
# - What is the motivation or business value for this chore?
# (Additional questions as needed to fully understand the chore)
```

## Chore vs Feature vs Bug

**Use /chore when:**
- Updating dependencies
- Refactoring code (no new features)
- Improving documentation
- Updating configuration
- Improving tests (no bug fix)
- Developer tooling improvements

**Use /feature when:**
- Adding new functionality
- Building new features
- Implementing new requirements

**Use /bug when:**
- Fixing broken functionality
- Resolving defects
- Correcting incorrect behavior

## Common Chore Patterns

### Dependency Update Chore
```bash
/chore "Update npm dependencies to latest stable versions"
```
**Focus**: Update package.json, test compatibility, update lock file

### Refactoring Chore
```bash
/chore "Refactor authentication service to improve testability"
```
**Focus**: Improve code structure, maintain functionality, update tests

### Documentation Chore
```bash
/chore "Update README with new environment setup instructions"
```
**Focus**: Improve documentation clarity, add examples, update references

### Configuration Chore
```bash
/chore "Add production environment configuration for new region"
```
**Focus**: Add config files, update deployment scripts, test new config

### Test Improvement Chore
```bash
/chore "Add widget tests for workout screens"
```
**Focus**: Increase test coverage, improve test quality, add edge cases

### Infrastructure Maintenance Chore
```bash
/chore "Update Terraform modules to latest versions"
```
**Focus**: Update infrastructure code, test in dev environment, validate resources

## Notes

### Chore Complexity Guidelines

**Low Complexity:**
- Single file or small set of related files
- Well-understood changes
- Minimal testing required
- Low risk of breakage
- Examples: Documentation updates, simple configuration changes

**Medium Complexity:**
- Multiple files across one platform
- Some refactoring required
- Moderate testing needed
- Medium risk of regressions
- Examples: Dependency updates, code refactoring within one module

**High Complexity:**
- Multiple files across multiple platforms
- Significant refactoring or updates
- Extensive testing required
- High risk of regressions or breaking changes
- Examples: Major dependency updates, large-scale refactoring, infrastructure overhauls

### Best Practices for Chores

**Dependency Updates:**
- Update one major dependency at a time
- Test thoroughly after each update
- Check for breaking changes in changelogs
- Verify compatibility across all platforms
- Update lock files (package-lock.json, pubspec.lock)

**Refactoring:**
- Keep changes focused and minimal
- Maintain existing functionality exactly
- Update tests alongside code changes
- Follow existing architectural patterns
- Document why refactoring was needed

**Documentation:**
- Keep documentation up-to-date with code
- Add examples where helpful
- Update architecture diagrams when structure changes
- Document breaking changes and migration paths
- Use clear, concise language

**Configuration:**
- Test configuration changes in dev environment first
- Keep dev/staging/prod configurations consistent
- Use environment variables for secrets
- Document configuration options
- Version control all configuration files (except secrets)

**Testing:**
- Aim for high test coverage (>80%)
- Write tests that are maintainable and clear
- Test edge cases and error scenarios
- Keep tests fast and focused
- Update tests when code changes

### Infrastructure Reminders
- **CRITICAL**: All infrastructure chores must be planned in `[infrastructure]` repository
- Test infrastructure changes in dev environment before production
- Review Terraform plan output carefully before applying
- Have rollback plan ready before deploying
- Coordinate infrastructure chores with application deployments
- Monitor resources for 24-48 hours after infrastructure changes
