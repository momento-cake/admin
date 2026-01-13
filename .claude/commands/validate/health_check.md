# Health Check - Momento Cake Admin

Verify development environment is properly configured for Momento Cake Admin (Next.js + Firebase).

## Purpose

Validate that your development machine has all required tools, dependencies, and configurations for Momento Cake development.

## Execution

Execute health checks in order. If any check fails, address the issue before continuing.

## Web Health Checks

### Node.js Version
```bash
node --version
```
**Expected**: Node.js 18 or higher

### npm Version
```bash
npm --version
```
**Expected**: npm 9 or higher

### Web Dependencies
```bash
npm install --dry-run
```
**Expected**: No errors, all dependencies resolvable

### TypeScript Compilation
```bash
npm run type-check
```
**Expected**: No type errors

### Web Build (Dev)
```bash
NEXT_PUBLIC_ENVIRONMENT=dev npm run build
```
**Expected**: Build successful, .next/ directory created

### Web Build (Prod)
```bash
NEXT_PUBLIC_ENVIRONMENT=prod npm run build
```
**Expected**: Build successful, .next/ directory created

### Dev Server Port
```bash
lsof -i :4000 | head -5
```
**Expected**: Port 4000 available or only dev server running
**If Failed**: Kill process: `kill -9 $(lsof -t -i:4000)`

## Firebase Health Checks

### Firebase CLI
```bash
firebase --version
```
**Expected**: Firebase CLI 12 or higher
**If Failed**: Install: `npm install -g firebase-tools`

### Firebase Authentication
```bash
firebase login:list
```
**Expected**: Authenticated account shown
**If Failed**: Run `firebase login`

### Firebase Project
```bash
firebase use
```
**Expected**: Project selected (momentocake-dev or similar)
**If Failed**: Run `firebase use --add`

## Testing Health Checks

### Playwright
```bash
npx playwright --version
```
**Expected**: Playwright installed
**If Failed**: Run `npx playwright install`

### Playwright Browsers
```bash
npx playwright install --dry-run
```
**Expected**: Browsers available or can be installed

## Git Configuration

### Git Version
```bash
git --version
```
**Expected**: Git 2.30 or higher

### Git User Configuration
```bash
git config user.name
git config user.email
```
**Expected**: Name and email configured
**If Failed**: Configure:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### Current Branch
```bash
git branch --show-current
```
**Expected**: On a valid branch (usually `develop` or `main`)

## Optional Tools

### Docker (for local Firebase emulators)
```bash
docker --version
```
**Expected**: Docker installed and running
**Note**: Optional, useful for Firebase emulators

### curl (for API testing)
```bash
curl --version
```
**Expected**: curl available for API testing

## Output Format

Return results as JSON:

```json
{
  "web": {
    "node": "passed|failed",
    "npm": "passed|failed",
    "dependencies": "passed|failed",
    "typescript": "passed|failed",
    "build_dev": "passed|failed",
    "build_prod": "passed|failed",
    "port_4000": "passed|failed"
  },
  "firebase": {
    "cli": "passed|failed",
    "auth": "passed|failed",
    "project": "passed|failed"
  },
  "testing": {
    "playwright": "passed|failed",
    "browsers": "passed|failed"
  },
  "git": {
    "version": "passed|failed",
    "user_config": "passed|failed",
    "branch": "passed|failed"
  },
  "summary": {
    "total_checks": number,
    "passed": number,
    "failed": number,
    "skipped": number,
    "critical_failures": ["list of critical failures"],
    "ready_for_development": boolean
  }
}
```

## Report

After running all checks, provide:

1. **Summary**: Overall health status (Ready / Not Ready)
2. **Critical Failures**: List any blocking issues
3. **Warnings**: List any non-critical issues
4. **Next Steps**: What to fix first

### Example Report

```
HEALTH CHECK SUMMARY
====================

Overall Status: READY FOR DEVELOPMENT ✓

Platform Status:
- Web: ✓ READY (7/7 checks passed)
- Firebase: ✓ READY (3/3 checks passed)
- Testing: ✓ READY (2/2 checks passed)
- Git: ✓ READY (3/3 checks passed)

Total: 15/15 checks passed

You can start development immediately.
Run `npm run dev` to start the dev server on port 4000.
```

## Troubleshooting

### Port 4000 Already in Use
```bash
# Find and kill process
lsof -i :4000
kill -9 $(lsof -t -i:4000)
```

### Node/npm Issues
```bash
# Update to latest LTS
nvm install --lts
nvm use --lts

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Firebase Issues
```bash
# Re-authenticate
firebase logout
firebase login

# Select project
firebase use --add
```

### Playwright Issues
```bash
# Install browsers
npx playwright install

# Install system dependencies (Linux)
npx playwright install-deps
```

## Quick Fix Commands

Run this to attempt auto-fixing common issues:

```bash
# Kill dev server if running
kill -9 $(lsof -t -i:4000) 2>/dev/null || true

# Clear caches and reinstall
rm -rf node_modules .next
npm install

# Install Playwright browsers
npx playwright install

# Verify Firebase
firebase login:list
firebase use
```

## Usage

```bash
# In Claude Code
/validate:health_check
```
