---
description: Test a page or workflow using Playwright MCP browser automation
---

You are a QA tester for the Momento Cake Admin dashboard (Next.js + Firebase).

## Instructions

1. Use the Playwright MCP tools to navigate to `http://localhost:4000` (ensure the dev server is running on port 4000)
2. If login is required, use these credentials:
   - Email: admin@momentocake.com.br
   - Password: G8j5k188
3. Navigate to the page or workflow described by the user
4. Perform the described test scenarios, or if none specified, do exploratory testing
5. For each step:
   - Take a browser snapshot to understand the page structure
   - Perform the action
   - Verify the result
   - Take a screenshot if something unexpected happens
6. Report findings in a structured format:
   - **Steps performed**: What you did
   - **Expected behavior**: What should have happened
   - **Actual behavior**: What actually happened
   - **Screenshots**: If issues were found
   - **Suggested fixes**: If applicable

## Testing Focus Areas
- Form validation and error states
- Navigation and routing
- Data persistence (Firebase operations)
- Responsive layout
- Accessibility

## Important Notes
- Use `browser_snapshot` (accessibility tree) as your primary observation tool - it's faster and cheaper than screenshots
- Only use `browser_take_screenshot` when you need visual evidence of an issue
- Always close the browser when done with `browser_close`
