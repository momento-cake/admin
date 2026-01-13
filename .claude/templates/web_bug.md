# Web Platform Bug Debugging

## Web Debugging Tools
- Browser DevTools console (JavaScript errors/warnings)
- React DevTools (component state and props)
- Network tab (API call failures, response inspection)
- Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- localStorage/sessionStorage inspector
- Responsive design mode (mobile/tablet breakpoints)

## Steps to Reproduce (Web)

### Environment Setup
<Describe the web environment setup required>

### Reproduction Steps
1. Navigate to: `<URL or route>`
2. Perform action: <Click, type, submit, etc.>
3. Observe: <What happens>

**Expected Result:** <What should happen>
**Actual Result:** <What actually happens>
**Console Error:** <Browser console error if any>

### Reproduction Frequency
- [ ] Always (100%)
- [ ] Often (>50%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)

## Web Environment Details
- **Browser**: <name and version>
- **React version**: <version>
- **Node version**: <version>
- **Operating System**: <OS and version>
- **Screen size**: <if responsive issue>
- **Device type**: Desktop | Tablet | Mobile

## Relevant Web Files

### Files to Modify
- `src/pages/<Page>.tsx:<line>` - <Why this file needs modification>
- `src/components/<Component>.tsx:<line>` - <Why this file needs modification>
- `src/hooks/use<Hook>.ts:<line>` - <Why this file needs modification>
- `src/lib/api/<resource>.ts:<line>` - <API client modification>

### Files to Reference (Patterns)
- <List files with similar patterns to follow for the fix>

### New Files (if any)
- <List new files needed, with purpose>

## Web Fix Implementation Tasks

### Task 1: Reproduce Bug Locally
- [ ] Set up web development environment
- [ ] Start backend API if needed
- [ ] Start web dev server: `PORT=3001 npm run dev`
- [ ] Navigate to affected page/component
- [ ] Perform actions that trigger bug
- [ ] Confirm bug exists and matches reported behavior
- [ ] Save console errors and network logs as evidence

### Task 2: Verify Root Cause
- [ ] Open browser DevTools console
- [ ] Add console.log statements to suspected code
- [ ] Use React DevTools to inspect component state/props
- [ ] Check Network tab for failed API calls
- [ ] Inspect localStorage/sessionStorage for data issues
- [ ] Test in different browsers for compatibility issues
- [ ] Document confirmation of root cause

### Task 3: Write Failing Test
- [ ] Create component test that reproduces bug
- [ ] Create integration test if API interaction affected
- [ ] Test should fail with current code
- [ ] Add assertions for expected vs actual behavior
- [ ] Run test to confirm it fails: `npm run test -- <test-file>`

### Task 4: Implement Minimal Web Fix
- [ ] Modify only the identified problematic component/hook
- [ ] Add error boundaries or validation as needed
- [ ] Update TypeScript types if needed
- [ ] Fix API client calls if integration issue
- [ ] Update form validation if form-related bug
- [ ] DO NOT refactor unrelated components
- [ ] DO NOT add new features
- [ ] Verify fix addresses root cause

### Task 5: Verify Test Now Passes
- [ ] Run the previously failing test
- [ ] Confirm test now passes
- [ ] Add edge case tests if needed
- [ ] Run full test suite: `npm run test`
- [ ] Fix any regressions

### Task 6: Manual Web Verification
- [ ] Start web locally: `PORT=3001 npm run dev`
- [ ] Reproduce original bug scenario
- [ ] Confirm bug no longer occurs
- [ ] Test in different browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test responsive design on mobile/tablet sizes
- [ ] Verify error messages are user-friendly
- [ ] Check console for warnings/errors
- [ ] Test related features for regressions
- [ ] Verify accessibility (keyboard navigation, screen readers)

## Web Testing Strategy

### Component Tests
- UI component rendering
- User interactions (clicks, inputs)
- Form validation
- Error states
- Loading states

### Integration Tests
- Data fetching with TanStack Query
- API client functions
- Routing and navigation
- Authentication flows
- localStorage/sessionStorage operations

### Edge Cases to Test
- [ ] Empty/null data
- [ ] Invalid input formats
- [ ] Network failures (offline, timeout)
- [ ] Large data sets (pagination, performance)
- [ ] Different screen sizes (responsive)
- [ ] Different browsers
- [ ] Slow network conditions
- [ ] Concurrent user actions

## Web Validation Commands

```bash
# Navigate to web
cd gango-web

# Install dependencies
npm install

# Type check TypeScript
npm run type-check

# Run linting
npm run lint

# Run specific test for this bug
npm run test -- <test-file>

# Run full test suite
npm run test

# Build for production (validates build process)
npm run build

# Start web locally for manual testing
PORT=3001 npm run dev
```

## Web Manual Testing Checklist
- [ ] Reproduce original bug scenario - verify it's fixed
- [ ] Test with different input variations
- [ ] Test on Chrome, Firefox, Safari, and Edge
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Verify form validation works correctly
- [ ] Test keyboard navigation and accessibility
- [ ] Check localStorage/sessionStorage behavior
- [ ] Verify error messages are user-friendly
- [ ] Test with slow network (throttling)
- [ ] Verify no console errors or warnings
- [ ] Test related features to ensure no regressions
- [ ] Check UI matches design system (shadcn/ui, Tailwind)
