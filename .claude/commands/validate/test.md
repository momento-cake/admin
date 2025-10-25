# Multi-Platform Test Suite

Execute comprehensive validation tests for Gango's backend (Java/Spring Boot), web (React/Vite), and mobile (Flutter) platforms.

## Purpose

Proactively identify and fix issues across all platforms before they impact users:
- Detect compilation errors, type mismatches, and import failures
- Identify broken tests or security vulnerabilities
- Verify build processes and dependencies
- Ensure the application is in a healthy state

## Variables

platform_filter: $ARGUMENT (optional: all | backend | web | mobile | quick)
TEST_COMMAND_TIMEOUT: 10 minutes per test

## Platform Filtering

- `all` or no argument: Run all 15 tests across all platforms (default)
- `backend`: Run only backend tests (tests 1-4)
- `web`: Run only web tests (tests 5-9)
- `mobile`: Run only mobile tests (tests 10-15)
- `quick`: Run fast tests only (compilation, analysis, unit tests - skip builds)

## Test Execution Sequence

### Backend Tests (Java/Spring Boot + Maven)

**1. Java Compilation Check**
- Command: `cd gango-backend && ./mvnw clean compile -DskipTests`
- test_name: `backend_compilation`
- test_purpose: "Validates Java syntax and compilation without running tests"

**2. Backend Unit Tests**
- Command: `cd gango-backend && ./mvnw test`
- test_name: `backend_unit_tests`
- test_purpose: "Validates Spring Boot services, controllers, repositories, and business logic"

**3. Backend Integration Tests**
- Command: `cd gango-backend && ./mvnw verify -Pintegration`
- test_name: `backend_integration_tests`
- test_purpose: "Validates API endpoints, database operations, and external service integrations"

**4. Backend Code Quality**
- Command: `cd gango-backend && ./mvnw checkstyle:check`
- test_name: `backend_code_quality`
- test_purpose: "Validates Java code style and best practices"

### Web Tests (React + Vite + npm)

**5. Node Dependencies Check**
- Command: `cd gango-web && npm install --dry-run`
- test_name: `web_dependencies`
- test_purpose: "Validates package.json dependencies are resolvable"

**6. TypeScript Type Check**
- Command: `cd gango-web && npm run type-check`
- test_name: `web_typescript_check`
- test_purpose: "Validates TypeScript type correctness, catching type errors and incorrect function signatures"

**7. Web Linting**
- Command: `cd gango-web && npm run lint`
- test_name: `web_linting`
- test_purpose: "Validates React/TypeScript code quality and identifies potential bugs"

**8. Web Unit Tests**
- Command: `cd gango-web && npm run test`
- test_name: `web_unit_tests`
- test_purpose: "Validates React component behavior and utility functions"

**9. Web Build**
- Command: `cd gango-web && npm run build`
- test_name: `web_build`
- test_purpose: "Validates the complete frontend build process including bundling and optimization"

### Mobile Tests (Flutter + FVM)

**10. Flutter Dependencies Check**
- Command: `cd gangoapp && fvm flutter pub get --dry-run`
- test_name: `mobile_dependencies`
- test_purpose: "Validates pubspec.yaml dependencies are resolvable"

**11. Flutter Analyze**
- Command: `cd gangoapp && fvm flutter analyze`
- test_name: `mobile_analyze`
- test_purpose: "Validates Dart code quality, identifies unused imports and potential bugs"

**12. Flutter Unit Tests**
- Command: `cd gangoapp && fvm flutter test test/unit/`
- test_name: `mobile_unit_tests`
- test_purpose: "Validates business logic, services, and ViewModels"

**13. Flutter Widget Tests**
- Command: `cd gangoapp && fvm flutter test test/widgets/`
- test_name: `mobile_widget_tests`
- test_purpose: "Validates UI components and screen interactions"

**14. Flutter Build Check (Android)**
- Command: `cd gangoapp && fvm flutter build apk --debug --flavor dev`
- test_name: `mobile_build_android`
- test_purpose: "Validates Android build process completes without errors"

**15. Flutter Build Check (iOS)**
- Command: `cd gangoapp && fvm flutter build ios --debug --flavor dev --no-codesign`
- test_name: `mobile_build_ios`
- test_purpose: "Validates iOS build process completes without errors (macOS only)"

## Quick Mode Tests

When platform_filter is `quick`, run only these tests:
- Backend: compilation + unit tests (tests 1-2)
- Web: TypeScript check + linting (tests 6-7)
- Mobile: analyze + unit tests (tests 11-12)

Total: 6 tests instead of 15

## Instructions

- Execute tests based on platform_filter
- Always run `pwd` and `cd` before each test
- Capture both stdout and stderr
- If a test fails, continue to next test (don't stop)
- Timeout each command after TEST_COMMAND_TIMEOUT
- Return results as JSON array

## Output Structure

```json
[
  {
    "test_name": "string",
    "platform": "backend|web|mobile",
    "passed": boolean,
    "execution_command": "string",
    "test_purpose": "string",
    "error": "optional string",
    "execution_time_seconds": number
  }
]
```

## Example Output

```json
[
  {
    "test_name": "web_typescript_check",
    "platform": "web",
    "passed": false,
    "execution_command": "cd gango-web && npm run type-check",
    "test_purpose": "Validates TypeScript type correctness",
    "error": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number' at WorkoutCard.tsx:45",
    "execution_time_seconds": 12.4
  },
  {
    "test_name": "backend_unit_tests",
    "platform": "backend",
    "passed": true,
    "execution_command": "cd gango-backend && ./mvnw test",
    "test_purpose": "Validates Spring Boot services and business logic",
    "execution_time_seconds": 45.2
  }
]
```

## Report

- IMPORTANT: Return results exclusively as a JSON array
- Sort with failed tests (passed: false) at the top
- Include all executed tests in the output
- The execution_command field should contain the exact reproducible command
- Do not include additional text, explanations, or markdown formatting

## Error Handling

- Capture non-zero exit codes as failures
- Include stderr output in error field
- Track execution time for performance monitoring
- Handle missing tools gracefully (e.g., no FVM installed)
