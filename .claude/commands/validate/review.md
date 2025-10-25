# Code Review

Review implemented work against specification to ensure features match requirements. Capture visual evidence and identify issues by severity.

## Variables

spec_file: $ARGUMENT (required: path to spec file in specs/*.md)
review_mode: $ARGUMENT (optional: quick | thorough | visual - default: thorough)
platform_filter: $ARGUMENT (optional: all | backend | web | mobile - default: all)

## Instructions

### 1. Initial Analysis
- Check current git branch: `git branch --show-current`
- View all changes: `git diff origin/main`
- Read the specified spec file to understand requirements
- Identify which platforms are affected by the changes
- Determine review scope based on platform_filter

### 2. Code Review Checklist

#### Backend Review (Java/Spring Boot)

**API Endpoints:**
- [ ] REST endpoints match spec signatures
- [ ] Request/response DTOs are correctly structured
- [ ] HTTP status codes are appropriate
- [ ] Error responses follow standard format

**Business Logic:**
- [ ] Service layer implements requirements correctly
- [ ] Validation rules are comprehensive
- [ ] Edge cases are handled
- [ ] Error handling is robust

**Database:**
- [ ] Flyway migrations are correct and reversible
- [ ] Entity relationships match spec
- [ ] Indexes exist for frequently queried fields
- [ ] No N+1 query problems

**Testing:**
- [ ] Unit tests cover business logic (>80% coverage)
- [ ] Integration tests cover API endpoints
- [ ] Tests follow existing patterns
- [ ] Test data is realistic

**Security:**
- [ ] Authentication is implemented correctly
- [ ] Authorization checks are in place
- [ ] Input validation prevents injection
- [ ] Sensitive data is not logged

**Performance:**
- [ ] Redis caching is used appropriately
- [ ] Database queries are optimized
- [ ] Pagination is implemented for lists
- [ ] No obvious performance issues

#### Web Review (React/Vite)

**UI Implementation:**
- [ ] Pages/routes match spec
- [ ] shadcn/ui components are used correctly
- [ ] UI matches design specifications
- [ ] Responsive design works (mobile, tablet, desktop)

**Data Fetching:**
- [ ] TanStack Query hooks are implemented
- [ ] Loading states are shown during fetch
- [ ] Error states are handled gracefully
- [ ] Optimistic updates work correctly

**Forms:**
- [ ] Form validation uses Zod schemas
- [ ] Error messages are user-friendly
- [ ] Submit buttons disable during submission
- [ ] Success feedback is provided

**Testing:**
- [ ] Component tests cover critical paths
- [ ] User interactions are tested
- [ ] Error scenarios are tested
- [ ] Tests use React Testing Library patterns

**Accessibility:**
- [ ] Semantic HTML is used
- [ ] ARIA labels are present where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG 2.1 AA

**Performance:**
- [ ] Code splitting is used for routes
- [ ] Images are optimized
- [ ] No unnecessary re-renders
- [ ] Bundle size is reasonable

#### Mobile Review (Flutter)

**Architecture:**
- [ ] Screens follow MVVM pattern
- [ ] ViewModels use Riverpod correctly
- [ ] State management is clean
- [ ] Navigation uses GoRouter

**UI Implementation:**
- [ ] Screens match spec and design
- [ ] Widgets are reusable and composable
- [ ] Loading states are shown
- [ ] Error states are handled

**Offline Support:**
- [ ] Local storage is implemented (Hive/Drift)
- [ ] Sync mechanism works correctly
- [ ] Offline mode is user-friendly
- [ ] Conflicts are resolved properly

**Testing:**
- [ ] Unit tests cover ViewModel logic
- [ ] Widget tests cover UI components
- [ ] Tests are maintainable
- [ ] Test coverage is adequate (>70%)

**Platform-Specific:**
- [ ] iOS behavior is correct
- [ ] Android behavior is correct
- [ ] Permissions are requested properly
- [ ] Platform differences are handled

**Performance:**
- [ ] No jank or dropped frames
- [ ] Images are cached properly
- [ ] Build performance is acceptable
- [ ] Memory usage is reasonable

### 3. Functional Testing

#### Backend Testing
```bash
# Start backend service
cd gango-backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev

# Test endpoints with curl
curl -X GET http://localhost:8080/api/v1/<endpoint> \
  -H "Authorization: Bearer <token>"

curl -X POST http://localhost:8080/api/v1/<endpoint> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"field": "value"}'

# Check application logs
tail -f gango-backend/logs/application.log
```

#### Web Testing
```bash
# Start web application
cd gango-web && PORT=3001 npm run dev

# Application available at: http://localhost:3001

# Use browser DevTools to:
# - Check console for errors
# - Verify network requests
# - Test responsive design
# - Check accessibility with Lighthouse
```

**Using Playwright MCP (if available):**
- Navigate to feature pages
- Test user interactions
- Capture screenshots of functionality
- Verify visual appearance matches spec

#### Mobile Testing
```bash
# Start Flutter app on iOS simulator
cd gangoapp && fvm flutter run --flavor dev -d "iPhone 15 Pro"

# Start Flutter app on Android emulator
cd gangoapp && fvm flutter run --flavor dev -d emulator-5554

# Run on physical device
cd gangoapp && fvm flutter run --flavor dev
```

### 4. Screenshot Capture Requirements

**Purpose:**
- Provide visual evidence that features work as specified
- Document any visual issues found
- Create artifact for review discussion

**Guidelines:**
- Take 3-7 targeted screenshots showing critical functionality
- Number screenshots: `01_<feature_name>.png`, `02_<action>.png`, etc.
- Capture ONLY critical paths, not every step
- Include error states and edge cases if relevant
- For multi-step flows, show beginning, middle, end

**What to Capture:**

**Happy Path** (primary flow working):
- Feature entry point
- Key interaction or state
- Success state or result

**Error Handling** (if applicable):
- Error state displayed correctly
- User-friendly error message
- Recovery path

**Edge Cases** (if specified in spec):
- Boundary conditions
- Unusual but valid scenarios
- Platform-specific behavior

**Mobile-Specific:**
- Different screen sizes (if responsive)
- Different orientations (if applicable)
- Offline mode (if applicable)

**Web-Specific:**
- Different browsers (if compatibility is concern)
- Responsive breakpoints (mobile, tablet, desktop)

**Screenshot Storage:**
- Create directory: `.claude/reviews/<branch-name>/`
- Store all screenshots in this directory
- Use absolute paths in review output

### 5. Issue Classification

**Issue Severity Levels:**

**blocker** - Prevents release, must fix immediately:
- Feature doesn't work as specified
- Crashes or unhandled exceptions
- Data loss or corruption risk
- Security vulnerability
- Broken user experience
- API contract doesn't match spec
- Performance is unacceptable
- Accessibility failure (WCAG violation)

**tech_debt** - Non-blocker but creates future burden:
- Code duplication that should be refactored
- Missing test coverage on edge cases
- Hardcoded values that should be configurable
- Suboptimal performance (but acceptable)
- Missing documentation
- Inconsistent patterns with rest of codebase

**skippable** - Non-blocker, minor improvement:
- Minor UI alignment issues
- Missing tooltip or help text
- Color/styling doesn't perfectly match design
- Minor UX improvement opportunity
- Non-critical accessibility enhancement

## Review Modes

### Quick Review (15-30 minutes)
**Focus**: Essential validation only
- Code review of changed files
- Run automated test suites
- Basic manual testing
- 1-3 screenshots of core functionality
- Report only blocker issues

**When to Use**: Small changes, bug fixes, minor features

### Thorough Review (1-2 hours) [DEFAULT]
**Focus**: Comprehensive validation
- Detailed code review of all changes
- Run all test suites across all platforms
- Detailed manual testing of all scenarios
- 5-7 screenshots of functionality and edge cases
- Test error handling and edge cases
- Performance check
- Report all issues (blocker, tech_debt, skippable)

**When to Use**: New features, complex changes, multi-platform work

### Visual Review (30-45 minutes)
**Focus**: UI/UX validation
- Review UI code changes
- Extensive screenshot capture (7-10 screenshots)
- Test on multiple devices/browsers
- Verify responsive design breakpoints
- Check accessibility (keyboard nav, screen readers)
- Validate design system usage (colors, typography, spacing)
- Report visual issues and accessibility problems

**When to Use**: UI redesigns, new screens/pages, design system changes

## Testing Execution

### Run Automated Tests

**Backend Tests:**
```bash
cd gango-backend
./mvnw clean compile -DskipTests  # Verify compilation
./mvnw test                        # Unit tests
./mvnw verify -Pintegration        # Integration tests
./mvnw checkstyle:check            # Code quality
```

**Web Tests:**
```bash
cd gango-web
npm install                        # Install dependencies
npm run type-check                 # TypeScript validation
npm run lint                       # ESLint
npm run test                       # Unit tests
npm run build                      # Production build
```

**Mobile Tests:**
```bash
cd gangoapp
fvm flutter pub get               # Get dependencies
fvm flutter analyze               # Static analysis
fvm flutter test test/unit/       # Unit tests
fvm flutter test test/widgets/    # Widget tests
```

### Manual Testing Priorities

**For All Platforms:**
1. Test the happy path (primary user flow)
2. Test error scenarios (invalid input, network errors)
3. Test edge cases (boundary values, empty states)
4. Test user experience (loading states, feedback)

**Platform-Specific:**
- **Backend**: Test API endpoints with various inputs
- **Web**: Test on Chrome, Safari, Firefox; Test responsive design
- **Mobile**: Test on iOS and Android; Test offline mode

## Output Format

Return results ONLY as JSON (no markdown, no explanations):

```json
{
  "success": boolean,
  "review_summary": "string",
  "platforms_reviewed": ["backend", "web", "mobile"],
  "review_issues": [
    {
      "review_issue_number": number,
      "platform": "backend|web|mobile",
      "screenshot_path": "string (absolute path, optional)",
      "issue_description": "string",
      "issue_resolution": "string",
      "issue_severity": "blocker|tech_debt|skippable",
      "affected_files": ["file1:line", "file2:line"]
    }
  ],
  "screenshots": [
    {
      "path": "/absolute/path/to/screenshot.png",
      "description": "string",
      "platform": "web|mobile"
    }
  ],
  "test_results": {
    "backend_tests": "passed|failed|not_run",
    "web_tests": "passed|failed|not_run",
    "mobile_tests": "passed|failed|not_run"
  },
  "recommendations": [
    "string (optional suggestions for improvement)"
  ]
}
```

### Output Field Details

**success**: `true` if there are NO blocker issues, `false` if there are blocker issues
- Note: Can have tech_debt or skippable issues and still be `true`

**review_summary**: 2-4 sentences describing:
- What was implemented
- Whether it matches the spec
- Overall quality assessment
- Write as if reporting in a standup meeting

**platforms_reviewed**: Array of platforms that were reviewed

**review_issues**: Array of issues found (can be empty)
- Include ALL issues regardless of severity
- Order by severity: blocker → tech_debt → skippable

**screenshots**: Array of screenshot objects (should always have screenshots)
- Use absolute paths
- Include descriptive text

**test_results**: Status of automated tests
- `passed`: All tests passed
- `failed`: Some tests failed
- `not_run`: Tests were not executed (wrong platform_filter)

**recommendations**: Optional array of suggestions
- Keep recommendations constructive and specific
- Focus on improvements, not just criticisms

## Validation Commands

### Before Review
```bash
# Ensure you're on the correct branch
git branch --show-current

# See what changed
git diff origin/main --stat
git log origin/main..HEAD --oneline

# Pull latest changes
git pull origin <branch-name>
```

### During Review
Run tests for affected platforms (see "Run Automated Tests" section above)

### After Review
```bash
# If there are blocker issues, create GitHub issue or comment
# If review passed, notify team that review is complete
```

## Example Review Summaries

**Successful Review:**
```
The workout sharing feature has been implemented across web and mobile platforms.
The implementation matches spec requirements including social media integration and
privacy controls. All tests pass with >85% coverage. Minor UI alignment issues
exist but core functionality works as specified.
```

**Review with Blockers:**
```
The group challenge feed has been partially implemented on mobile. The UI matches
the spec and looks great, but the offline sync mechanism fails when resolving
conflicts. This is a blocker as it can cause data loss. Backend API works correctly.
Fix needed before release.
```

**Visual Review:**
```
The dashboard redesign has been implemented following the new design system.
shadcn/ui components are used correctly and responsive design works well.
Accessibility testing passed WCAG 2.1 AA standards. Color contrast issue exists
on secondary buttons (tech debt).
```

## Gango-Specific Quality Standards

### Backend Quality Standards
- [ ] Follows Controller → Service → Repository pattern
- [ ] Uses DTOs for API request/response boundaries
- [ ] Implements proper exception handling with custom exceptions
- [ ] Redis caching is used for frequently accessed data
- [ ] Firebase Admin SDK is used correctly for authentication
- [ ] Database migrations are reversible and tested
- [ ] Tests use @SpringBootTest or @WebMvcTest appropriately
- [ ] Logging uses SLF4J with appropriate levels

### Web Quality Standards
- [ ] Uses shadcn/ui components (not raw HTML)
- [ ] TanStack Query patterns for data fetching (not useEffect)
- [ ] Forms use Zod validation schemas
- [ ] Responsive design tested at 320px, 768px, 1024px, 1920px
- [ ] Accessibility: semantic HTML, ARIA labels, keyboard navigation
- [ ] Loading states use skeleton components (not spinners only)
- [ ] Error boundaries catch component errors
- [ ] Performance: Code splitting, lazy loading, optimized images

### Mobile Quality Standards
- [ ] Follows MVVM architecture strictly
- [ ] Riverpod providers are properly structured and scoped
- [ ] Offline-first: Local storage syncs with backend
- [ ] Navigation uses GoRouter with proper deep linking
- [ ] Widget tests use testWidgets and WidgetTester
- [ ] Performance: No dropped frames, smooth 60fps
- [ ] Platform-specific code uses MethodChannel correctly
- [ ] Works on both iOS and Android

### Cross-Platform Standards
- [ ] API contracts match between backend and clients
- [ ] Error handling is consistent across platforms
- [ ] Authentication flow works identically
- [ ] Data models are aligned (same field names, types)
- [ ] Firebase integration is consistent
- [ ] Logging format is similar across platforms

## Tips for Effective Reviews

1. **Read the Spec First**: Understand requirements before looking at code
2. **Focus on Requirements**: Does it match what was specified?
3. **Test Don't Assume**: Actually run the code and test it
4. **Be Constructive**: Suggest improvements, not just criticisms
5. **Classify Accurately**: Not every issue is a blocker
6. **Capture Evidence**: Screenshots prove functionality works
7. **Think About Users**: Would this provide good UX?
8. **Consider Maintainability**: Is this code easy to understand and modify?

## Example Usage

```bash
# Thorough review of multi-platform feature
/review specs/feature-123-workout-sharing.md

# Quick review of bug fix
/review specs/bug-456-login-timeout.md quick

# Visual review of UI changes (web only)
/review specs/feature-789-dashboard-redesign.md visual web

# Backend-only review
/review specs/feature-321-activity-api.md thorough backend
```
