# Install Dependencies

Automate dependency installation across all Gango platforms (backend, web, mobile).

## Purpose

Install and update all required dependencies for multi-platform development. Run this after:
- Initial project setup
- Switching branches with dependency changes
- After `git pull` with package.json/pubspec.yaml/pom.xml changes
- When dependency errors occur

## Variables

platform_filter: $ARGUMENT (optional: all | backend | web | mobile - default: all)
install_mode: $ARGUMENT (optional: clean | update - default: clean)

## Modes

**clean**: Remove existing dependencies and reinstall from scratch
**update**: Update dependencies to latest compatible versions

## Installation Steps

### Backend Installation (Java/Spring Boot)

#### Clean Install
```bash
cd gango-backend
./mvnw clean install -DskipTests
```
**Effect**: Downloads all Maven dependencies, compiles code

#### Update Dependencies
```bash
cd gango-backend
./mvnw versions:display-dependency-updates
./mvnw versions:use-latest-versions
./mvnw clean install -DskipTests
```
**Effect**: Updates dependencies to latest versions

### Web Installation (React/Vite)

#### Clean Install
```bash
cd gango-web
rm -rf node_modules package-lock.json
npm install
```
**Effect**: Removes existing packages, reinstalls from package.json

#### Update Dependencies
```bash
cd gango-web
npm update
npm outdated  # Show outdated packages
```
**Effect**: Updates to latest compatible versions

#### Specific Package Update
```bash
cd gango-web
npm install <package>@latest
```

### Mobile Installation (Flutter)

#### Clean Install
```bash
cd gangoapp
fvm flutter clean
fvm flutter pub get
```
**Effect**: Clears build cache, downloads packages

#### Update Dependencies
```bash
cd gangoapp
fvm flutter pub upgrade
fvm flutter pub outdated  # Show outdated packages
```
**Effect**: Updates to latest compatible versions

#### iOS-Specific (macOS only)
```bash
cd gangoapp/ios
pod install
pod update  # If updating mode
```
**Effect**: Installs/updates CocoaPods dependencies

## Execution Plan

### All Platforms (Default)

Execute installations in parallel for speed:

**Terminal 1 - Backend:**
```bash
cd gango-backend && ./mvnw clean install -DskipTests
```

**Terminal 2 - Web:**
```bash
cd gango-web && rm -rf node_modules package-lock.json && npm install
```

**Terminal 3 - Mobile:**
```bash
cd gangoapp && fvm flutter clean && fvm flutter pub get
```

### Platform-Specific

**backend only:**
```bash
cd gango-backend && ./mvnw clean install -DskipTests
```

**web only:**
```bash
cd gango-web && rm -rf node_modules package-lock.json && npm install
```

**mobile only:**
```bash
cd gangoapp && fvm flutter clean && fvm flutter pub get
cd gangoapp/ios && pod install  # macOS only
```

## Post-Installation Validation

After installation, verify all platforms:

### Backend Validation
```bash
cd gango-backend
./mvnw clean compile -DskipTests  # Should compile successfully
./mvnw test -Dtest=ApplicationTests  # Should pass
```

### Web Validation
```bash
cd gango-web
npm run type-check  # Should have no type errors
npm run lint        # Should have no lint errors
npm run build       # Should build successfully
```

### Mobile Validation
```bash
cd gangoapp
fvm flutter analyze  # Should have no analysis issues
fvm flutter test test/unit/  # Should pass
```

## Troubleshooting

### Backend Issues

**Maven wrapper not executable:**
```bash
chmod +x gango-backend/mvnw
```

**Dependency download fails:**
```bash
cd gango-backend
./mvnw dependency:purge-local-repository
./mvnw clean install -DskipTests
```

**Java version mismatch:**
```bash
# Check Java version
java -version

# Use Java 17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)  # macOS
update-alternatives --config java  # Linux
```

### Web Issues

**npm install fails:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
cd gango-web
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

**Node version issues:**
```bash
# Use nvm to switch to required version
nvm install --lts
nvm use --lts
```

**Peer dependency conflicts:**
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps
```

### Mobile Issues

**Flutter pub get fails:**
```bash
# Clear Flutter cache
cd gangoapp
fvm flutter clean

# Remove pubspec.lock
rm pubspec.lock

# Get packages again
fvm flutter pub get
```

**iOS CocoaPods issues:**
```bash
cd gangoapp/ios
rm -rf Pods Podfile.lock
pod repo update
pod install
```

**Android Gradle issues:**
```bash
cd gangoapp/android
./gradlew clean
./gradlew --stop
```

## Output Format

Return installation results as JSON:

```json
{
  "backend": {
    "status": "success|failed",
    "duration_seconds": number,
    "dependencies_installed": number,
    "errors": ["error messages if failed"]
  },
  "web": {
    "status": "success|failed",
    "duration_seconds": number,
    "dependencies_installed": number,
    "errors": ["error messages if failed"]
  },
  "mobile": {
    "status": "success|failed",
    "duration_seconds": number,
    "dependencies_installed": number,
    "errors": ["error messages if failed"]
  },
  "summary": {
    "total_platforms": number,
    "successful": number,
    "failed": number,
    "ready_for_development": boolean,
    "next_steps": ["list of next actions"]
  }
}
```

## Report

After installation, provide:

1. **Summary**: Overall installation status
2. **Installed Counts**: Number of dependencies per platform
3. **Errors**: Any failures encountered
4. **Next Steps**: What to do next (e.g., run tests, start servers)

### Example Report

```
INSTALLATION SUMMARY
====================

Installation Mode: clean
Platforms: all

Results:
✓ Backend: 142 dependencies installed (45.2s)
✓ Web: 1,247 packages installed (28.7s)
✓ Mobile: 89 packages installed (12.3s)

Status: ALL PLATFORMS READY ✓

Next Steps:
1. Run /health_check to validate environment
2. Run /test quick to verify installations
3. Start development servers:
   - Backend: cd gango-backend && ./mvnw spring-boot:run
   - Web: cd gango-web && PORT=3001 npm run dev
   - Mobile: cd gangoapp && fvm flutter run --flavor dev
```

## Environment Setup

Before installation, ensure environment variables are set:

### Backend Environment
- Check `gango-backend/src/main/resources/application-dev.properties`
- Verify database connection settings
- Ensure Redis configuration is correct

### Web Environment
- Check `gango-web/.env` exists (copy from `.env.sample` if needed)
- Verify API endpoint URLs
- Ensure Firebase configuration is present

### Mobile Environment
- Check `gangoapp/assets/config_dev.json` exists
- Verify API base URLs
- Ensure Firebase configuration files exist:
  - `gangoapp/android/app/google-services.json`
  - `gangoapp/ios/Runner/GoogleService-Info.plist`

## Git Submodules

Update submodules before installation:

```bash
git submodule update --init --recursive
```

This ensures all submodules (gango-backend, gango-web, gangoapp, gango-infrastructure) are at correct commits.

## Usage

```bash
# Install all platforms
/install

# Install specific platform
/install backend
/install web
/install mobile

# Clean install (remove and reinstall)
/install all clean

# Update dependencies
/install all update

# Platform-specific update
/install web update
```

## Best Practices

1. **Regular Updates**: Run `/install update` weekly to stay current
2. **After Switching Branches**: Run `/install` if package files changed
3. **After Git Pull**: Check if dependencies changed, run `/install clean` if unsure
4. **Before Committing**: Ensure package files are correctly updated
5. **Clean Install for Errors**: If dependency errors occur, try `/install clean`

## Performance Tips

**Parallel Installation**: Install all platforms simultaneously in separate terminals for fastest setup

**Use Package Manager Caches**: Don't clear caches unless necessary

**Offline Mode** (if packages already downloaded):
```bash
# Maven offline
cd gango-backend && ./mvnw clean install -DskipTests -o

# npm offline
cd gango-web && npm install --offline

# Flutter offline
cd gangoapp && fvm flutter pub get --offline
```

## Security Notes

- Never commit node_modules, vendor, or build directories
- Review dependency updates for security vulnerabilities
- Use `npm audit` and `./mvnw dependency:check` regularly
- Keep lock files (package-lock.json, pubspec.lock) in version control
