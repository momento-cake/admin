# Momento Cake Admin Test Suite

Execute comprehensive validation tests for Momento Cake Admin (Next.js + Firebase).

## Purpose

Proactively identify and fix issues before they impact users:
- Detect compilation errors, type mismatches, and import failures
- Identify broken tests or security vulnerabilities
- Verify build processes and dependencies
- Ensure the application is in a healthy state

## Variables

test_filter: $ARGUMENT (optional: all | quick | e2e)
TEST_COMMAND_TIMEOUT: 10 minutes per test

## Test Filtering

- `all` or no argument: Run all tests (default)
- `quick`: Run fast tests only (type check + lint - skip builds)
- `e2e`: Run only Playwright E2E tests

## Test Execution Sequence

### Web Tests (Next.js + Firebase + npm)

**1. Node Dependencies Check**
- Command: `npm install --dry-run`
- test_name: `web_dependencies`
- test_purpose: "Validates package.json dependencies are resolvable"

**2. TypeScript Type Check**
- Command: `npm run type-check`
- test_name: `web_typescript_check`
- test_purpose: "Validates TypeScript type correctness, catching type errors and incorrect function signatures"

**3. Web Linting**
- Command: `npm run lint`
- test_name: `web_linting`
- test_purpose: "Validates Next.js/TypeScript code quality and identifies potential bugs"

**4. Web Build (Dev Environment)**
- Command: `NEXT_PUBLIC_ENVIRONMENT=dev npm run build`
- test_name: `web_build_dev`
- test_purpose: "Validates the complete Next.js build process for dev environment"

**5. Web Build (Prod Environment)**
- Command: `NEXT_PUBLIC_ENVIRONMENT=prod npm run build`
- test_name: `web_build_prod`
- test_purpose: "Validates the complete Next.js build process for production environment"

### E2E Tests (Playwright)

**6. Playwright E2E Tests**
- Command: `npx playwright test`
- test_name: `e2e_tests`
- test_purpose: "Validates user workflows, authentication, and CRUD operations"

## Quick Mode Tests

When test_filter is `quick`, run only these tests:
- TypeScript check (test 2)
- Linting (test 3)

Total: 2 tests instead of 6

## E2E Mode Tests

When test_filter is `e2e`, run only:
- Playwright E2E tests (test 6)

## Instructions

- Execute tests based on test_filter
- Always run from project root directory
- Capture both stdout and stderr
- If a test fails, continue to next test (don't stop)
- Timeout each command after TEST_COMMAND_TIMEOUT
- Return results as JSON array

## Output Structure

```json
[
  {
    "test_name": "string",
    "platform": "web",
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
    "execution_command": "npm run type-check",
    "test_purpose": "Validates TypeScript type correctness",
    "error": "TS2345: Argument of type 'string' is not assignable to parameter of type 'number' at ProductCard.tsx:45",
    "execution_time_seconds": 12.4
  },
  {
    "test_name": "web_build_dev",
    "platform": "web",
    "passed": true,
    "execution_command": "NEXT_PUBLIC_ENVIRONMENT=dev npm run build",
    "test_purpose": "Validates Next.js build process for dev environment",
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
- Handle missing tools gracefully
