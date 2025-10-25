# Generate Git Branch Name

Based on the `Instructions` below, take the `Variables` follow the `Run` section to generate a concise Git branch name following Gango's multi-platform naming conventions. Then follow the `Report` section to report the results of your work.

## Variables

change_type: $ARGUMENT (required: feat, fix, chore, refactor, test, docs, hotfix)
platform: $ARGUMENT (required: backend, web, mobile, infrastructure, multi-platform)
description: $ARGUMENT (required: brief description of the change)
issue_number: $ARGUMENT (optional: GitHub issue number)

## Instructions

### Branch Name Format

Generate a branch name following one of these formats:

**With issue number:** `<change_type>/<platform>-<issue_number>-<description>`
**Without issue number:** `<change_type>/<platform>-<description>`

### Change Types

- `feat`: New feature development
- `fix`: Bug fix
- `chore`: Maintenance, deps, config
- `refactor`: Code restructuring
- `test`: Test additions/updates
- `docs`: Documentation changes
- `hotfix`: Urgent production fixes

### Platform Values

- `backend`: Java/Spring Boot API changes
- `web`: React web dashboard changes
- `mobile`: Flutter mobile app changes
- `infrastructure`: Terraform/GCP infrastructure changes
- `multi-platform`: Changes affecting multiple platforms

### Description Guidelines

- 3-6 words maximum
- All lowercase
- Words separated by hyphens
- Descriptive of the main task/feature
- No special characters except hyphens
- Use common abbreviations where appropriate (auth, ui, db, api, etc.)

### Examples

**Backend:**
```
feat/backend-123-jwt-token-rotation
fix/backend-456-activity-calc-overflow
chore/backend-spring-boot-upgrade
refactor/backend-redis-service-layer
test/backend-workout-validation
```

**Web:**
```
feat/web-789-user-analytics-dashboard
fix/web-234-login-redirect-loop
chore/web-shadcn-component-updates
refactor/web-form-validation-logic
test/web-dashboard-components
```

**Mobile:**
```
feat/mobile-567-group-challenge-feed
fix/mobile-890-sync-timeout-issue
chore/mobile-riverpod-upgrade
refactor/mobile-mvvm-migration
test/mobile-workout-screen
```

**Infrastructure:**
```
feat/infrastructure-321-prod-backup-automation
fix/infrastructure-654-vpc-connector-config
chore/infrastructure-terraform-providers
docs/infrastructure-cloud-run-setup
```

**Multi-platform:**
```
feat/multi-platform-987-user-settings-sync
fix/multi-platform-timezone-handling
refactor/multi-platform-error-responses
```

## Run

### Step 1: Validate Inputs
- Ensure change_type is valid (feat, fix, chore, refactor, test, docs, hotfix)
- Ensure platform is valid (backend, web, mobile, infrastructure, multi-platform)
- Ensure description is provided and reasonable length

### Step 2: Process Description
- Convert to lowercase
- Replace spaces with hyphens
- Remove special characters (keep only letters, numbers, hyphens)
- Trim to reasonable length if too long (max 6 words)
- Remove common words like "the", "a", "an" if present

### Step 3: Construct Branch Name
- If issue_number provided:
  - Format: `<change_type>/<platform>-<issue_number>-<processed_description>`
- If issue_number NOT provided:
  - Format: `<change_type>/<platform>-<processed_description>`

### Step 4: Validate Result
- Total length should be reasonable (< 60 characters if possible)
- No double hyphens or trailing hyphens
- Matches Git branch naming conventions (no spaces, special chars, etc.)

## Examples by Use Case

### New Feature Development
```bash
# With issue
change_type: feat
platform: backend
issue_number: 123
description: "Add JWT refresh token rotation"
Result: feat/backend-123-jwt-refresh-token

# Without issue
change_type: feat
platform: mobile
description: "Group challenge feed"
Result: feat/mobile-group-challenge-feed
```

### Bug Fixes
```bash
# With issue
change_type: fix
platform: web
issue_number: 456
description: "Login redirect loop on timeout"
Result: fix/web-456-login-redirect-loop

# Critical production fix
change_type: hotfix
platform: backend
issue_number: 789
description: "Database connection leak"
Result: hotfix/backend-789-db-connection-leak
```

### Maintenance Work
```bash
# Dependency updates
change_type: chore
platform: mobile
description: "Update Riverpod to 2.5.0"
Result: chore/mobile-riverpod-upgrade

# Configuration changes
change_type: chore
platform: infrastructure
description: "Update Terraform providers"
Result: chore/infrastructure-terraform-providers
```

### Refactoring
```bash
change_type: refactor
platform: backend
description: "Extract Redis logic to service layer"
Result: refactor/backend-redis-service-layer
```

### Multi-platform Changes
```bash
# Feature spanning multiple platforms
change_type: feat
platform: multi-platform
issue_number: 999
description: "User settings synchronization"
Result: feat/multi-platform-999-user-settings-sync

# Cross-platform bug fix
change_type: fix
platform: multi-platform
description: "Timezone handling consistency"
Result: fix/multi-platform-timezone-handling
```

## Validation

Before returning the branch name, ensure:
- Follows Git branch naming conventions
- Platform value is correct for the intended changes
- Description is concise but descriptive
- No spaces or invalid characters
- Length is reasonable for terminal/Git UI display

## Report

Return ONLY the generated branch name (no other text)

## Additional Notes

### When to Use multi-platform
Use `multi-platform` prefix when:
- Changes affect 2+ platforms simultaneously
- Shared API contract changes (backend + clients)
- Coordinated feature rollout across platforms
- Infrastructure changes affecting all services

### Branch Naming Best Practices
- Keep names short but descriptive
- Use consistent terminology across platforms
- Include issue numbers for traceability
- Use common abbreviations to save space
- Avoid redundant words in description
