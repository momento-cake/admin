# Client Management E2E Tests

Comprehensive end-to-end tests for the Client Management System using Playwright.

## Overview

This test suite validates the complete Client CRUD functionality including:
- Creating personal and business clients
- Searching and filtering clients
- Viewing client details
- Editing client information
- Deleting clients
- Form validation
- Pagination

## Test Structure

### Test File: `client-management.spec.ts`

#### Setup
- **beforeEach**: Logs in with admin credentials and navigates to clients page

#### Test Cases

1. **Display Clients Page**
   - Verifies page title and navigation
   - Takes screenshot of initial state

2. **Create Personal Client**
   - Fills form with personal client information
   - Tests all basic fields (name, email, phone, CPF)
   - Tests address fields (CEP, estado, cidade, etc.)
   - Tests notes field
   - Verifies client appears in list

3. **Create Business Client**
   - Selects "Pessoa Jurídica" option
   - Fills company information (name, CNPJ, business type)
   - Fills representative details (name, email, phone)
   - Verifies business client appears in list

4. **Search Clients**
   - Creates a test client
   - Uses search box to find client
   - Verifies search results

5. **Filter by Type**
   - Uses filter dropdown to show only personal clients
   - Takes screenshot of filtered results

6. **View Client Details**
   - Creates a test client
   - Clicks View button
   - Verifies all details are displayed correctly

7. **Edit Client**
   - Creates a test client
   - Clicks Edit button
   - Updates client information
   - Verifies changes are saved and displayed

8. **Delete Client**
   - Creates a test client
   - Clicks delete button
   - Confirms deletion
   - Verifies client is removed from list

9. **Validation Errors**
   - Tries to submit empty form
   - Verifies error messages are displayed

10. **Pagination**
    - Checks for pagination controls
    - Tests navigation to next page

## Running Tests

### Prerequisites
- Application running on `http://localhost:3001`
- Database accessible
- Valid login credentials in `.env.local`

### Run All Tests
```bash
npx playwright test tests/clients/
```

### Run Specific Test
```bash
npx playwright test tests/clients/client-management.spec.ts -g "should create a personal client"
```

### Run Tests in Headed Mode
```bash
npx playwright test tests/clients/ --headed
```

### Run Tests with UI
```bash
npx playwright test tests/clients/ --ui
```

### View Test Report
```bash
npx playwright show-report test-results/clients
```

## Test Data

Tests use dynamic data with timestamps to ensure uniqueness:
- Client names: `Cliente Teste {timestamp}`
- Company names: `Empresa Teste {timestamp}`
- Email: Dynamic based on test type

## Login Credentials

Tests use admin credentials for authentication:
- Email: `admin@momentocake.com.br`
- Password: `G8j5k188`

## Troubleshooting

### Test Timeouts
- Ensure application is running on port 3001
- Check network connectivity
- Increase timeout in config if needed

### Element Not Found
- Verify selectors match current UI
- Update selectors if component structure changed
- Check if elements are visible/enabled

### Login Fails
- Verify credentials are correct
- Check Firebase configuration
- Ensure database is accessible

## Screenshots

Test results include screenshots for:
- Initial page state
- Form filled with data
- Success states
- Error states
- Pagination controls

Screenshots are saved to `test-results/clients/`

## CI/CD Integration

For GitHub Actions or similar:

```yaml
- name: Run Client Management Tests
  run: npx playwright test tests/clients/ --reporter=html

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: test-results/clients/
```

## Maintenance

### Updating Tests
1. Update selectors if UI changes
2. Add new tests for new features
3. Update test data as needed
4. Run full suite before committing

### Known Issues
- Tests may timeout if network is slow
- Business client form uses nested inputs (multiple elements with same name)
- Delete confirmation dialog timing varies

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Client CRUD Master Plan](../../context/specs/0_master/client-crud.md)
- [Client API Documentation](../../docs/api/clients.md)

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use descriptive test names
3. Include screenshots for validation
4. Test both happy and sad paths
5. Update this README with new test cases
