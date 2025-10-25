# Bug Planning

Create a surgical plan to fix a bug with minimal changes and maximum reliability. Focus on root cause analysis and regression prevention.

## Two-Phase Planning Process

This command uses a **two-phase planning process** that works both locally and in automated workflows:

### Phase 1: Bug Analysis & Clarification
1. **Understand** the bug description and symptoms
2. **Investigate** related codebase for context and error patterns
3. **Identify** missing information or reproduction steps
4. **Generate** clarifying questions (if needed)
5. **Collect answers** (locally via prompts, or via GitHub comments in workflows)
6. **Perform** root cause analysis with all information gathered

### Phase 2: Fix Plan Creation
1. **Design** minimal fix approach targeting root cause only
2. **Create** bug fix plan in `context/specs/0_master/`
3. **Create** platform-specific bug plans in respective directories
4. **Include** regression prevention strategy
5. **Return** plan file paths for review and implementation

### 🚨 MANDATORY ENFORCEMENT: Phase 1 MUST Complete Before Phase 2

**This process is REQUIRED and MUST NEVER be skipped.**

#### Phase 1 Completion Checklist
- [ ] Read and understand the complete bug description
- [ ] Identify what information is missing or unclear
- [ ] Ask specific clarifying questions to the user until all critical information is gathered, including:
  - What are the reproduction steps or exact conditions to trigger the bug?
  - What is the actual vs expected behavior?
  - Are there any error messages, logs, or stack traces?
  - How many users are impacted and how frequently does it occur?
  - Which features/pages are affected?
  - Any other crucial details needed to understand the bug
- [ ] **WAIT for user to provide answers** - DO NOT PROCEED without answers
- [ ] Document all clarifications received from user
- [ ] Perform root cause analysis using the clarifications
- [ ] Mark Phase 1 as complete before starting Phase 2

#### Actions That Indicate Phase 1 is Being Skipped (DO NOT DO THESE)
- ❌ Reading codebase or investigating implementation details before asking clarifying questions
- ❌ Creating detailed plans without confirming requirements with the user
- ❌ Assuming bug scope, impact, or fix approach without explicit user confirmation
- ❌ Writing plan files or performing deep analysis without documented answers to clarifications
- ❌ Treating "comprehensive analysis" as a substitute for asking the user
- ❌ Proceeding to plan creation without explicit Phase 1 completion

#### Correct Workflow Example
```
Phase 1 (IN THIS ORDER):
1. User provides: "Duplicate subscriptions being created after payment failure"
2. Claude asks:
   - What is the exact symptom users see when this happens?
   - How many users are affected (all, some, specific segment)?
   - What should happen instead when resubscribing after expiration?
3. User answers the clarifying questions
4. Claude documents the answers
5. Claude analyzes the code with the clarifications in mind

Phase 2 (ONLY AFTER Phase 1):
6. Claude creates detailed plans based on clarifications
7. Claude references the clarifications in the plan documents
```

## Variables

file_name: $ARGUMENT (Non required URL-friendly slug for file naming)

## Instructions

- **IMPORTANT**: You're creating a plan to fix a bug, NOT implementing the fix yet
- **BE SURGICAL**: Fix only what's broken - avoid scope creep and unnecessary refactoring
- **MINIMAL CHANGES**: The smallest code change that fixes the root cause
- Create the master plan in `context/specs/0_master/` directory with filename: `{file_name}.md`
  - Replace `{file_name}` with URL-friendly $ARGUMENT or GENERATE one from the context limited to 40 characters
  - Example: `api-500-error.md`
- **Think deeply** about the root cause - don't just treat symptoms
- Use the Sequential Thinking and Context7 MCPs to help with the debugging process
- Research the codebase to understand and reproduce the bug
- Follow existing patterns in each platform (backend/Java, web/React, mobile/Flutter, infrastructure/Terraform)

### Bug Investigation Workflow

**1. Understand the Bug:**
- Analyze the bug description and symptoms
- Identify which platforms are affected (backend, web, mobile, infrastructure)
- Determine severity, priority, and impact
- Check if bug is reproducible

**2. Research Existing Code:**
- Review relevant platform documentation in `specs/project/*.md`
- Check `.claude/commands/0_plan/conditional_docs.md` for additional context requirements
- Review code patterns in affected platforms
- Check existing tests that might have caught this bug

**3. Read Platform-Specific Templates:**
Based on the bug description, read the corresponding template files from `.claude/commands/plan/templates/`:

- **ALWAYS read**: `base_bug.md` (contains common sections for all bugs)
- **If web bug**: Read `web_bug.md`

**4. Create Web-Specific Bug Fix Plans:**
When creating the bug fix plan:
- Start with the base template content
- Include sections from platform-specific templates based on the bug
- Create web-specific bug fix plan in the web directory:
  - **Web bugs**: `context/specs/web/{file_name}.md`
- Reference the web-specific plan in the master plan

**5. Structure Your Bug Fix Plan:**
- Use the base template structure as the foundation
- Integrate relevant sections from platform templates
- Ensure fix tasks are ordered logically (reproduce → verify → test → fix → verify)
- Include validation commands for all affected platforms

### Investigation Priorities

1. **Reproduce First**: Always reproduce the bug before planning the fix
2. **Find Root Cause**: Understand WHY it happens, not just WHAT happens
3. **Minimal Fix**: Change only what's necessary to fix the root cause
4. **Test First**: Write a failing test that proves the bug exists
5. **Prevent Regression**: Ensure tests prevent this bug from returning

### Web-Specific Debugging

**Web (React/Next.js)**:
- Check browser console: JavaScript errors and warnings
- Use React DevTools: Component state and props
- Check Network tab: API call failures and Firebase interactions
- Test in different browsers: Browser compatibility issues
- Check localStorage/sessionStorage: Client-side data issues
- Verify responsive design: Mobile/tablet breakpoints
- Check Firebase console: Authentication and Firestore issues
- Use Next.js build errors: Compilation and build issues
- **IMPORTANT**: All web bugs must be fixed in this repository

## Relevant Files

Focus on files directly related to the bug:
- **Web**: Components, Hooks, Pages affected by the bug
- **Tests**: Existing tests that should have caught this bug
- **Documentation**: Check `.claude/commands/plan/conditional_docs.md` for context

## Bug Fix Plan Creation Steps

### Step 1: Identify Bug Scope
Analyze the bug and determine its scope:
- [ ] UI/Component bug?
- [ ] Page/Route bug?
- [ ] Firebase integration bug?
- [ ] State management bug?

### Step 2: Read Appropriate Templates
- [ ] Read `base_bug.md` (always required)
- [ ] Read `web_bug.md` (for web bugs)

### Step 3: Create Master Bug Fix Plan
- [ ] Create master plan file in `context/specs/0_master/`
- [ ] Include metadata (severity, priority, affected features)
- [ ] Write bug description (symptom, expected, actual, impact)
- [ ] Document problem and solution statements

### Step 4: Create Web-Specific Bug Fix Plan
For web bugs, create a detailed plan:
- [ ] Web: Create plan in `context/specs/web/` with web-specific sections

### Step 5: Document Steps to Reproduce
Include platform-specific reproduction steps:
- Environment setup required
- Exact steps to trigger the bug
- Expected vs actual results
- Error messages and logs
- Reproduction frequency

### Step 6: Root Cause Analysis
- [ ] Document investigation steps taken
- [ ] Identify root cause with technical details (file, function, line, code issue)
- [ ] Analyze impact (users affected, frequency, workarounds, risks)
- [ ] Confirm root cause with debugging/logging

### Step 7: Plan Minimal Fix
- [ ] Describe minimal change approach (smallest fix for root cause)
- [ ] List specific file changes with line numbers
- [ ] Document backward compatibility considerations
- [ ] Plan database migrations if needed
- [ ] Note configuration changes required

### Step 8: Create Step-by-Step Fix Tasks
Break down bug fix into specific, actionable tasks:
1. Reproduce bug locally
2. Verify root cause
3. Write failing test
4. Implement minimal fix (platform-specific)
5. Verify test passes
6. Run full test suite (regression check)
7. Manual verification
8. Update documentation
9. Final validation

### Step 9: Define Testing Strategy
- Include testing approaches from platform templates
- Define unit, integration, and edge case tests
- List regression tests to run
- Add manual testing checklist

### Step 10: Plan Rollback Strategy
- [ ] Define immediate rollback steps
- [ ] Document data restoration procedure (if applicable)
- [ ] Plan communication strategy
- [ ] List monitoring tasks after deployment

### Step 11: Add Validation Commands
- Include validation commands from all affected platform templates
- Ensure comprehensive test coverage
- Add manual testing checklist
- Document how to verify bug is fixed

## Notes

### Bug Severity Guidelines

**Critical (P0)**:
- Production is down or severely degraded
- Data loss or corruption
- Security vulnerability
- Affects all or majority of users
- Fix within hours

**High (P1)**:
- Major feature is broken
- Affects significant portion of users
- Workaround is complex or unavailable
- Performance severely degraded
- Fix within 1-2 days

**Medium (P2)**:
- Feature partially broken
- Affects some users
- Workaround available
- Non-critical functionality
- Fix within 1 week

**Low (P3)**:
- Minor issue or cosmetic bug
- Affects few users
- Easy workaround exists
- UI polish or edge case
- Fix when convenient

### Prevention Best Practices

**Code Quality**:
- Add validation at earlier stages
- Implement comprehensive error handling
- Add logging for debugging
- Follow defensive programming practices
- Use type safety (TypeScript, Dart, Java types)

**Testing Coverage**:
- Write tests for edge cases
- Add integration tests for critical flows
- Test error scenarios explicitly
- Use test-driven development (TDD) when appropriate
- Maintain high test coverage (>80%)

**Monitoring & Alerting**:
- Add monitoring for critical metrics
- Set up alerts for error rates
- Monitor API response times
- Track user-facing errors
- Use error tracking services (Sentry, etc.)

**Documentation**:
- Document complex business logic
- Update API documentation
- Add inline comments for tricky code
- Maintain changelog for user-facing bugs
- Document known issues and workarounds

### Infrastructure Reminders
- **CRITICAL**: All infrastructure bugs must be fixed in `gango-infrastructure` repository
- Coordinate infrastructure fixes with application deployments
- Test infrastructure changes in dev environment first
- Plan for zero-downtime deployments when possible
- Have rollback plan ready before production deployment

## Report

After creating the bug fix plans:
- Return the path to the master plan file in `context/specs/0_master/`
- Return paths to platform-specific bug fix plan files (if created)
- Confirm which platforms are affected by this bug
- Indicate severity and priority of the bug
- Note if database migrations or breaking changes are required
- List any additional context files that were referenced

## Example Usage

```bash
# Basic usage
/bug "Login button doesn't work on mobile"

# More detailed
/bug "Login button doesn't work on mobile" "Users report that clicking the login button on mobile devices causes the app to freeze"

# In response to this command, Claude will ask clarifying questions until all critical information is gathered:
# - Which platforms are affected? (backend/web/mobile/infrastructure)
# - What are the reproduction steps or exact conditions to trigger the bug?
# - What is the actual vs expected behavior?
# - Are there any error messages, logs, or stack traces?
# - How many users are impacted and how frequently does it occur?
# (Additional questions as needed to fully understand the bug)
```
