# Implement Plan

Execute the implementation of a feature, bug fix, or chore plan created with `/feature`, `/bug`, or `/chore` commands.

## Purpose

This command reads a plan file (from `specs/` directory) and implements it step-by-step, following the tasks and validation commands specified in the plan.

## Variables

plan_file: $ARGUMENT (required: path to plan file in specs/*.md)

## Instructions

### 1. Read the Plan
- Read the entire plan file carefully
- Understand the objectives and acceptance criteria
- Review the step-by-step tasks
- Note the validation commands
- Identify affected platforms

### 2. Verify Prerequisites
- Ensure environment is properly set up
- Check all required tools are installed
- Verify dependencies are up-to-date
- Confirm on correct git branch

### 3. Execute Step-by-Step Tasks
- Follow tasks in exact order from the plan
- Check off completed tasks as you go
- Don't skip steps
- If a step fails, address it before continuing
- Document any deviations from the plan

### 4. Testing Throughout
- Run tests after each logical group of changes
- Don't wait until the end to test
- Fix issues immediately when found
- Maintain zero regressions

### 5. Validation
- Execute all validation commands from the plan
- Ensure all acceptance criteria are met
- Perform manual testing if specified
- Verify no regressions introduced

### 6. Documentation
- Update documentation as specified in plan
- Add inline comments for complex logic
- Update API docs if endpoints changed
- Create/update tests

## Execution Workflow

### Phase 1: Preparation (5-10 min)
```bash
# Read the plan
cat specs/<plan-file>.md

# Verify environment
/health_check

# Ensure dependencies are current
/install <platform>

# Verify tests pass before starting
/test <platform>

# Create/checkout feature branch if needed
git checkout -b <branch-name>
```

### Phase 2: Implementation (varies)
- Follow step-by-step tasks from the plan
- Implement changes incrementally
- Test frequently
- Commit logical units of work

### Phase 3: Validation (10-20 min)
```bash
# Run platform-specific tests
/test <platform>

# Execute plan's validation commands
<commands from plan>

# Manual testing
<as specified in plan>
```

### Phase 4: Review & Finalize (5-10 min)
```bash
# Self-review changes
git diff origin/main

# Ensure all files are included
git status

# Final test run
/test quick

# Prepare for review
/review <plan-file> quick
```

## Platform-Specific Implementation

### Backend Implementation (Java/Spring Boot)

**Common Tasks:**
1. Update entity models (JPA annotations)
2. Create/update repository interfaces
3. Implement service layer business logic
4. Create/update REST controllers
5. Add request/response DTOs
6. Write unit tests for services
7. Write integration tests for endpoints
8. Update Flyway migrations (if database changes)

**Validation:**
```bash
cd this admin
./mvnw clean compile -DskipTests
./mvnw test
./mvnw verify -Pintegration
./mvnw checkstyle:check
```

### Web Implementation (React/Vite)

**Common Tasks:**
1. Create/update React components
2. Add TanStack Query hooks for data fetching
3. Implement forms with Zod validation
4. Add shadcn/ui components
5. Update routing (if new pages)
6. Write component tests
7. Ensure responsive design
8. Check accessibility

**Validation:**
```bash
cd this admin
npm install
npm run type-check
npm run lint
npm run test
npm run build
```

### Mobile Implementation (Flutter)

**Common Tasks:**
1. Create screen widgets
2. Implement ViewModels with Riverpod
3. Add providers for state management
4. Implement navigation (GoRouter)
5. Add offline support (Hive/Drift)
6. Write widget tests
7. Write unit tests for ViewModels
8. Test on iOS and Android

**Validation:**
```bash
cd [mobile]
fvm flutter pub get
fvm flutter analyze
fvm flutter test test/unit/
fvm flutter test test/widgets/
fvm flutter build apk --debug --flavor dev
```

### Infrastructure Implementation (Terraform/GCP)

**Common Tasks:**
1. Update Terraform modules
2. Add/modify GCP resources
3. Update environment variables
4. Modify CI/CD workflows
5. Test in dev environment
6. Document infrastructure changes

**IMPORTANT**: Infrastructure changes must be made in `[infrastructure]` repository

**Validation:**
```bash
cd [infrastructure]
terraform init
terraform validate
terraform plan
```

## Best Practices

### Incremental Implementation
- Make small, focused commits
- Test after each logical change
- Don't accumulate too many changes
- Easier to debug when issues arise

### Test-Driven Approach
- Write failing test first (for bugs)
- Implement minimal code to pass test
- Refactor while keeping tests green
- Add edge case tests

### Code Quality
- Follow existing code patterns
- Use consistent naming conventions
- Keep functions small and focused
- Add comments for complex logic only
- Remove debug code before committing

### Error Handling
- Handle errors gracefully
- Provide user-friendly error messages
- Log errors with context
- Don't swallow exceptions

### Performance Considerations
- Avoid N+1 queries (backend)
- Use pagination for large datasets
- Optimize bundle size (web)
- Profile performance (mobile)

## Troubleshooting

### Compilation Errors

**Backend:**
```bash
# Clear Maven cache
cd this admin
./mvnw clean
./mvnw compile -DskipTests
```

**Web:**
```bash
# Clear and reinstall
cd this admin
rm -rf node_modules package-lock.json
npm install
```

**Mobile:**
```bash
# Clean Flutter build
cd [mobile]
fvm flutter clean
fvm flutter pub get
```

### Test Failures

**Identify Root Cause:**
```bash
# Run specific failing test
<platform-specific test command> -t "test name"

# Check test output for error details
# Fix the issue
# Re-run tests
```

### Merge Conflicts

```bash
# Update from main
git fetch origin
git rebase origin/main

# Resolve conflicts
# git add <resolved-files>
# git rebase --continue

# Re-test after rebase
/test quick
```

## Validation Checklist

Before marking implementation complete:

- [ ] All step-by-step tasks from plan are completed
- [ ] All acceptance criteria are met
- [ ] All validation commands pass
- [ ] Code follows project patterns and conventions
- [ ] Tests are written and passing (>80% coverage)
- [ ] Documentation is updated
- [ ] No regressions introduced
- [ ] Manual testing completed
- [ ] Code is self-reviewed
- [ ] Breaking changes are documented
- [ ] Ready for code review

## Report Format

After implementation, provide:

### Summary
<2-3 sentence summary of what was implemented>

### Changes Made
- Platform: <backend/web/mobile>
- Files modified: <count>
- Files added: <count>
- Lines changed: <from git diff --stat>

### Test Results
```bash
git diff --stat
```

### Validation Results
- [ ] Backend tests: <passed/failed>
- [ ] Web tests: <passed/failed>
- [ ] Mobile tests: <passed/failed>
- [ ] Manual testing: <completed>

### Next Steps
- Create PR: `/pull_request`
- Request review: Assign reviewers
- Deploy to dev: <if applicable>

## Example Usage

```bash
# Implement a feature plan
/implement specs/feature-123-user-settings.md

# Implement a bug fix plan
/implement specs/bug-456-login-timeout.md

# Implement a chore plan
/implement specs/chore-789-update-dependencies.md
```

## Integration with Other Commands

### Before Implementation
```bash
# Create plan
/feature 123 "Add user profile settings"

# Review plan
cat specs/feature-123-user-settings.md

# Validate environment
/health_check
```

### During Implementation
```bash
# Implement the plan
/implement specs/feature-123-user-settings.md

# Test continuously
/test backend
/test web
/test mobile
```

### After Implementation
```bash
# Final validation
/test all

# Review implementation
/review specs/feature-123-user-settings.md thorough

# Create PR
/pull_request
```

## Notes

### Agent Delegation

For complex implementations, consider delegating to specialized agents:

```bash
# Instead of /implement, use agent delegation
"Implement the feature plan in specs/feature-123-user-settings.md
Use tech-leader agent for multi-platform coordination"
```

**Agents to consider:**
- `tech-leader` - Multi-platform features
- `java-backend-developer` - Backend implementation
- `react-web-developer` - Web implementation
- `flutter-mobile-developer` - Mobile implementation
- `backend-integration-tester` - Testing implementation

### When to Use /implement vs Agent Delegation

**Use /implement for:**
- Small, focused changes
- Single-platform implementations
- Simple chores
- Quick bug fixes

**Use agent delegation for:**
- Complex multi-platform features
- Large refactoring efforts
- Features requiring specialized expertise
- Work that spans multiple layers

### Documentation References

For platform-specific implementation guidance:
- Backend: Read `context/project/backend.md`
- Web: Read `context/project/web.md`
- Mobile: Read `context/project/mobile.md`
- Design: Read `context/project/mobile.md (mobile design) or context/project/web.md (web design)`
- Development: Read `context/project/*.md (platform-specific) or CLAUDE.md (git workflow)`

Use `/conditional_docs` to determine which docs to reference.
