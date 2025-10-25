# Health Check

Verify development environment is properly configured for all Gango platforms (backend, web, mobile, infrastructure).

## Purpose

Validate that your development machine has all required tools, dependencies, and configurations for multi-platform Gango development.

## Execution

Execute health checks in order. If any check fails, address the issue before continuing.

## Backend Health Checks

### Java Version
```bash
java -version
```
**Expected**: Java 17 or higher

### Maven Wrapper
```bash
cd gango-backend && ./mvnw --version
```
**Expected**: Maven 3.8 or higher

### Backend Compilation
```bash
cd gango-backend && ./mvnw clean compile -DskipTests
```
**Expected**: Build SUCCESS, no errors

### Redis (Local Development)
```bash
redis-cli ping
```
**Expected**: PONG
**If Failed**: Start Redis: `brew services start redis` (macOS) or `sudo systemctl start redis` (Linux)

### PostgreSQL Dev Database
```bash
./scripts/connect-dev-db.sh
```
**Expected**: Connection successful, query returns "SUCCESS"
**If Failed**:
- Check Cloud SQL Proxy is running
- Verify credentials in Secret Manager
- Check VPC connectivity

### Backend Environment Variables
```bash
cd gango-backend && ./mvnw validate
```
**Expected**: Validation successful
**If Failed**: Check `application-dev.properties` for missing variables

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
cd gango-web && npm install --dry-run
```
**Expected**: No errors, all dependencies resolvable

### TypeScript Compilation
```bash
cd gango-web && npm run type-check
```
**Expected**: No type errors

### Web Build
```bash
cd gango-web && npm run build
```
**Expected**: Build successful, dist/ directory created

## Mobile Health Checks

### FVM (Flutter Version Manager)
```bash
fvm --version
```
**Expected**: FVM installed
**If Failed**: Install FVM: `brew tap leoafarias/fvm && brew install fvm` (macOS)

### Flutter Version
```bash
fvm flutter --version
```
**Expected**: Flutter stable channel
**If Failed**: Run `fvm install stable && fvm use stable`

### Flutter Doctor
```bash
cd gangoapp && fvm flutter doctor
```
**Expected**: No critical issues (✓ marks)
**Acceptable Warnings**: Android licenses, optional tools

### Mobile Dependencies
```bash
cd gangoapp && fvm flutter pub get
```
**Expected**: All packages downloaded successfully

### Flutter Analyze
```bash
cd gangoapp && fvm flutter analyze
```
**Expected**: No issues found

### iOS Simulators (macOS only)
```bash
xcrun simctl list devices available | grep "iPhone"
```
**Expected**: At least one iPhone simulator listed
**If Failed**: Install Xcode and run `xcode-select --install`

### Android Emulators
```bash
fvm flutter emulators
```
**Expected**: At least one Android emulator available
**If Failed**: Install Android Studio and create AVD

## Infrastructure Health Checks

### gcloud CLI
```bash
gcloud --version
```
**Expected**: gcloud CLI installed
**If Failed**: Install: `brew install google-cloud-sdk` (macOS)

### gcloud Project
```bash
gcloud config get-value project
```
**Expected**: `gango-app-dev` or `gango-app`
**If Failed**: Set project: `gcloud config set project gango-app-dev`

### gcloud Authentication
```bash
gcloud auth list
```
**Expected**: Active account shown
**If Failed**: Authenticate: `gcloud auth login`

### Terraform (if working on infrastructure)
```bash
terraform --version
```
**Expected**: Terraform 1.5 or higher
**Note**: Infrastructure changes go in `gango-infrastructure` repository

### AWS CLI (for DynamoDB/S3/SNS)
```bash
aws --version
```
**Expected**: AWS CLI 2.x
**If Failed**: Install: `brew install awscli` (macOS)

### AWS Configuration
```bash
aws configure list
```
**Expected**: Profile configured with credentials

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

### Submodules
```bash
git submodule status
```
**Expected**: All submodules initialized and up-to-date
**If Failed**: Run `git submodule update --init --recursive`

## Optional Tools

### Docker (for containerized services)
```bash
docker --version
docker-compose --version
```
**Expected**: Docker installed and running
**Note**: Optional, but useful for local service testing

### Postman or curl (for API testing)
```bash
curl --version
```
**Expected**: curl available for API testing

## Output Format

Return results as JSON:

```json
{
  "backend": {
    "java": "passed|failed",
    "maven": "passed|failed",
    "compilation": "passed|failed",
    "redis": "passed|failed",
    "postgres": "passed|failed",
    "env_vars": "passed|failed"
  },
  "web": {
    "node": "passed|failed",
    "npm": "passed|failed",
    "dependencies": "passed|failed",
    "typescript": "passed|failed",
    "build": "passed|failed"
  },
  "mobile": {
    "fvm": "passed|failed",
    "flutter": "passed|failed",
    "flutter_doctor": "passed|failed",
    "dependencies": "passed|failed",
    "analyze": "passed|failed",
    "ios_simulator": "passed|failed|skipped",
    "android_emulator": "passed|failed"
  },
  "infrastructure": {
    "gcloud": "passed|failed",
    "gcloud_project": "passed|failed",
    "gcloud_auth": "passed|failed",
    "terraform": "passed|failed|skipped",
    "aws": "passed|failed"
  },
  "git": {
    "version": "passed|failed",
    "user_config": "passed|failed",
    "submodules": "passed|failed"
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
- Backend: ✓ READY (6/6 checks passed)
- Web: ✓ READY (5/5 checks passed)
- Mobile: ⚠ MOSTLY READY (6/7 checks passed, 1 warning)
- Infrastructure: ✓ READY (4/4 checks passed)
- Git: ✓ READY (3/3 checks passed)

Warnings:
- Android emulator not found (optional for development)

Total: 24/25 checks passed

You can start development on backend and web immediately.
For mobile development, create an Android emulator or use a physical device.
```

## Troubleshooting

### Redis Not Running
```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis
sudo systemctl enable redis
```

### PostgreSQL Connection Failed
```bash
# Check Cloud SQL Proxy is running
ps aux | grep cloud-sql-proxy

# Start dev database connection
./scripts/connect-dev-db.sh
```

### Flutter Doctor Issues
```bash
# Accept Android licenses
fvm flutter doctor --android-licenses

# Install missing iOS tools (macOS)
sudo gem install cocoapods
```

### Node/npm Issues
```bash
# Update to latest LTS
nvm install --lts
nvm use --lts

# Clear npm cache
npm cache clean --force
```

### gcloud Issues
```bash
# Re-authenticate
gcloud auth login

# Set correct project
gcloud config set project gango-app-dev

# Update components
gcloud components update
```

## Quick Fix Commands

Run this to attempt auto-fixing common issues:

```bash
# Update all package managers
brew update && brew upgrade  # macOS
sudo apt update && sudo apt upgrade  # Linux

# Install/update Flutter packages
cd gangoapp && fvm flutter pub get && fvm flutter pub upgrade

# Install/update Web packages
cd gango-web && npm install

# Clear caches
cd gango-web && npm cache clean --force
cd gangoapp && fvm flutter clean
cd gango-backend && ./mvnw clean
```

## Usage

```bash
# In Claude Code
/health_check

# Or run manually
claude --dangerously-skip-permissions
Read and execute .claude/commands/health_check.md
```
