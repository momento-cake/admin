# Generate Git Commit

Based on the `Instructions` below, take the `Variables` follow the `Run` section to create a git commit with a properly formatted conventional commit message. Then follow the `Report` section to report the results of your work.

## Variables

platform: $ARGUMENT (required: backend, web, mobile, infrastructure)
change_type: $ARGUMENT (required: feat, fix, chore, refactor, test, docs, style, perf, ci)
scope: $ARGUMENT (optional: specific module/feature within platform)
message: $ARGUMENT (required: commit message)

## Instructions

### Commit Message Format

Generate a commit message following conventional commits with Gango's multi-platform structure:

**With scope:** `<change_type>(<platform>/<scope>): <message>`
**Without scope:** `<change_type>(<platform>): <message>`

### Change Types

- `feat`: New feature
- `fix`: Bug fix
- `chore`: Maintenance tasks (deps, config, etc.)
- `refactor`: Code restructuring without behavior change
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `style`: Code style/formatting changes
- `perf`: Performance improvements
- `ci`: CI/CD pipeline changes

### Platform Values

- `backend`: Java/Spring Boot API (gango-backend)
- `web`: React web dashboard (gango-web)
- `mobile`: Flutter mobile app (gangoapp)
- `infrastructure`: Terraform/GCP infrastructure (gango-infrastructure)

### Message Guidelines

- Present tense (e.g., "add", "fix", "update", not "added", "fixed", "updated")
- 50 characters or less for subject line
- Descriptive of the actual changes made
- No period at the end
- Lowercase except for proper nouns

### Examples

**Backend:**
```
feat(backend/auth): add JWT refresh token rotation
fix(backend/activity): resolve calorie calculation overflow
chore(backend): upgrade Spring Boot to 3.2.0
refactor(backend/cache): extract Redis logic to service layer
test(backend/workout): add challenge validation tests
```

**Web:**
```
feat(web/dashboard): add user analytics chart
fix(web/auth): resolve login redirect loop
chore(web): update React to 18.3.0
style(web/ui): update shadcn button variants
test(web/components): add form validation tests
```

**Mobile:**
```
feat(mobile/social): implement group challenge feed
fix(mobile/sync): resolve activity upload timeout
chore(mobile): update Riverpod to 2.5.0
refactor(mobile/state): migrate to MVVM pattern
perf(mobile/images): implement lazy loading
```

**Infrastructure:**
```
feat(infrastructure/database): add prod backup automation
fix(infrastructure/networking): resolve VPC connector config
chore(infrastructure): upgrade Terraform provider versions
docs(infrastructure/deployment): update Cloud Run setup
```

## Run

1. Run `git status` to verify which files have been changed
2. Run `git diff HEAD` to review the actual changes
3. Run `git add -A` to stage all changes
4. Construct the commit message based on the variables:
   - If scope is provided: `<change_type>(<platform>/<scope>): <message>`
   - If scope is not provided: `<change_type>(<platform>): <message>`
5. Run `git commit -m "<generated_commit_message>"` to create the commit
6. Run `git log -1 --oneline` to verify the commit was created

## Validation

Before committing, ensure:
- Platform is one of: backend, web, mobile, infrastructure
- Change type is one of: feat, fix, chore, refactor, test, docs, style, perf, ci
- Message is present tense and descriptive
- Total commit message length is reasonable (ideally < 72 characters)
- Message accurately reflects the changes in git diff

## Report

Return ONLY the commit message that was used (no other text)
