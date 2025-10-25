# Create Pull Request

Based on the `Instructions` below, take the `Variables` follow the `Run` section to create a pull request with comprehensive information. Then follow the `Report` section to report the results of your work.

## Variables

base_branch: $ARGUMENT (default: main or master depending on repository)
title: $ARGUMENT (optional: auto-generate from commits if not provided)

## Instructions

### PR Title Format

Generate a PR title that summarizes the changes:
- Format: `<change_type>(<platform>): <concise description>`
- Examples:
  - `feat(backend): add JWT refresh token rotation`
  - `fix(mobile): resolve challenge timer state bug`
  - `chore(web): update shadcn/ui components`
  - `feat(multi-platform): implement user settings sync`

### PR Body Template

The PR body should follow this comprehensive structure:

```markdown
## Summary
<Brief 2-3 sentence description of what this PR does and why>

## Platform(s) Affected
- [ ] Backend (gango-backend)
- [ ] Web (gango-web)
- [ ] Mobile (gangoapp)
- [ ] Infrastructure (gango-infrastructure)

## Changes
<Detailed bullet list of changes made>
- Change 1
- Change 2
- Change 3

## Environment Tested
- [ ] Development
- [ ] Staging (if applicable)
- [ ] Production (if applicable)

## Database Changes
- [ ] No database changes
- [ ] Migration included (Flyway/Alembic)
- [ ] Migration verified in dev environment
- [ ] Migration rollback tested

**Migration details (if applicable):**
<Describe migration changes>

## Service Dependencies
- [ ] No service changes
- [ ] Firebase changes: <describe>
- [ ] AWS changes: <describe DynamoDB, S3, SNS, etc.>
- [ ] GCP changes: <describe Cloud Run, Cloud SQL, etc.>
- [ ] Redis changes: <describe>

## Breaking Changes
- [ ] No breaking changes
- [ ] API breaking changes (describe below)
- [ ] Database schema breaking changes (describe below)
- [ ] Configuration breaking changes (describe below)

**Breaking change details (if applicable):**
<Describe what breaks and migration path>

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Widget/Component tests added/updated
- [ ] End-to-end tests added/updated
- [ ] Manual testing completed

**Test coverage:**
<Describe test scenarios covered>

## Screenshots (for UI changes)
**Before:**
<Add screenshots>

**After:**
<Add screenshots>

## Performance Impact
- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance regression (explain mitigation)

**Details:**
<Describe performance considerations>

## Security Considerations
- [ ] No security implications
- [ ] Security review required
- [ ] Secrets management changes
- [ ] Authentication/Authorization changes

**Details:**
<Describe security considerations>

## Deployment Notes
- [ ] Standard deployment
- [ ] Requires environment variable changes
- [ ] Requires infrastructure changes
- [ ] Requires coordinated multi-platform deployment

**Deployment steps:**
1. <Step 1>
2. <Step 2>

## Related PRs/Issues
Closes #<issue_number>
Related PRs:
- Backend: <link if applicable>
- Web: <link if applicable>
- Mobile: <link if applicable>
- Infrastructure: <link if applicable>

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] No new warnings introduced
- [ ] Tests pass locally
- [ ] Dependent changes merged and published
```

## Run

### Step 1: Analyze Changes
1. Run `git status` to see current branch and status
2. Run `git diff origin/<base_branch>...HEAD --stat` to see changed files summary
3. Run `git log origin/<base_branch>..HEAD --oneline` to see commits
4. Run `git diff origin/<base_branch>...HEAD --name-only` to list all changed files

### Step 2: Auto-detect Platform(s)
Analyze changed files to determine affected platforms:
- Files in `gango-backend/` → Backend
- Files in `gango-web/` → Web
- Files in `gangoapp/` → Mobile
- Files in `gango-infrastructure/` → Infrastructure
- Files matching `*.tf` → Infrastructure
- Files matching `**/migrations/**` → Database changes

### Step 3: Check for Specific Change Types
- Search for Flyway migrations (`V*.sql` files) → Database changes
- Search for environment variable changes (`.env`, `application*.properties`) → Configuration changes
- Search for UI component changes (`*.tsx`, `*.dart` in UI folders) → UI changes (screenshots needed)
- Search for test files (`*test*`, `*spec*`) → Test coverage

### Step 4: Generate PR Title
If title not provided:
- Extract change type from most recent commit
- Determine primary platform from changed files
- Create concise description from commit messages

### Step 5: Generate PR Body
- Fill in Summary from commit messages
- Auto-check Platform(s) Affected based on file analysis
- List Changes from commit messages and git diff analysis
- Auto-detect Database Changes from migration files
- Auto-detect Service Dependencies from config changes
- Mark Testing sections based on test file changes
- Note if screenshots needed for UI changes

### Step 6: Push and Create PR
1. Run `git push -u origin HEAD` to push the current branch
2. Run `gh pr create --title "<pr_title>" --body "<pr_body>" --base <base_branch>` to create the PR
3. Capture the PR URL from the output

### Error Handling
- If push fails: Check if remote branch exists and suggest force push if needed
- If PR creation fails: Provide manual instructions with pre-filled title and body
- If gh CLI not available: Provide manual PR creation URL with query parameters

## Validation

Before creating PR, ensure:
- Current branch is not the base branch
- All changes are committed
- Remote branch is up to date or can be pushed
- PR title is descriptive and follows format
- PR body has all required sections filled
- Platform checkboxes accurately reflect changed files
- Breaking changes are clearly documented if present

## Report

Return the PR URL that was created, followed by a summary of:
- Platforms affected
- Whether database migrations are included
- Whether breaking changes exist
- Whether screenshots are needed

Format:
```
PR created: <URL>

Summary:
- Platforms: <list>
- Database migrations: <yes/no>
- Breaking changes: <yes/no>
- Screenshots needed: <yes/no>
```
