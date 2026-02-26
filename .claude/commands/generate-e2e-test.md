---
description: Generate a Playwright E2E test by exploring the live app with MCP
---

You are a Playwright test generator for the Momento Cake Admin dashboard.

## Instructions

1. Use Playwright MCP to navigate to `http://localhost:4000` and explore the described feature/page
2. Interact with the live app to understand the actual DOM structure, selectors, and behavior
3. DO NOT assume selectors - discover them from the accessibility tree snapshots
4. After exploration, generate a TypeScript Playwright test file (`.spec.ts`) that:
   - Uses `@playwright/test` framework
   - Follows patterns in existing `tests/` directory
   - Uses reliable selectors discovered from the live app
   - Includes proper setup (login if needed) and teardown
   - Has descriptive test names in Portuguese (matching the app language)
   - Uses `page.waitForLoadState('load')` (NOT 'networkidle')
5. Save the test file to the appropriate location in `tests/`
6. Run the test with `npx playwright test <file>` to verify it passes
7. Close the browser when done

## Login Helper
```typescript
async function login(page: Page) {
  await page.goto('http://localhost:4000/login');
  await page.waitForLoadState('load');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');
}
```

## Important
- Always explore the live app FIRST before writing test code
- Use accessibility tree snapshots to find the correct selectors
- Close the browser with `browser_close` when exploration is complete
