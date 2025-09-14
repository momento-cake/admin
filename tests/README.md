# E2E Testing for Ingredients Management System

This directory contains comprehensive End-to-End (E2E) tests for the ingredients management system using Playwright.

## 🏗️ Test Structure

```
tests/
├── fixtures/
│   └── ingredients.ts          # Test data fixtures
├── helpers/
│   ├── auth.ts                # Authentication helpers
│   ├── ingredients.ts         # Ingredients page helpers
│   └── suppliers.ts           # Suppliers page helpers
├── ingredients/
│   ├── ingredients-crud.spec.ts      # CRUD operations tests
│   ├── stock-management.spec.ts      # Stock management tests
│   ├── supplier-management.spec.ts   # Supplier management tests
│   ├── search-and-filters.spec.ts    # Search and filtering tests
│   └── error-handling.spec.ts        # Error handling tests
├── global-setup.ts            # Global test setup
├── global-teardown.ts         # Global test teardown
└── README.md                  # This file
```

## 🧪 Test Coverage

### Ingredients CRUD Operations
- ✅ Create ingredients with validation
- ✅ Read/list ingredients with pagination
- ✅ Update ingredient information
- ✅ Delete ingredients with confirmation
- ✅ Form validation and error handling
- ✅ Duplicate prevention

### Stock Management
- ✅ Add stock with cost tracking
- ✅ Remove stock with reason tracking
- ✅ Adjust stock to specific quantities
- ✅ Stock level indicators (good/low/critical/out)
- ✅ Stock history tracking
- ✅ Stock alerts and notifications

### Supplier Management
- ✅ Create and manage suppliers
- ✅ Link ingredients to suppliers
- ✅ Supplier-ingredient relationship constraints
- ✅ Supplier search and filtering
- ✅ Supplier deletion restrictions

### Search and Filtering
- ✅ Search by ingredient name and description
- ✅ Filter by category, supplier, and stock status
- ✅ Combined search and filter operations
- ✅ Filter persistence and clearing
- ✅ Debounced search functionality

### Error Handling
- ✅ Network failure recovery
- ✅ API error responses (400, 401, 403, 404, 409, 500)
- ✅ Form validation errors
- ✅ Database constraint violations
- ✅ Authentication/authorization errors
- ✅ Concurrent modification handling

## 🚀 Running Tests

### Prerequisites
1. **Application Running**: Ensure the Next.js app is running on `http://localhost:3000`
2. **Authentication Setup**: Admin user should exist with credentials:
   - Email: `admin@momentocake.com.br`
   - Password: `G8j5k188`
3. **Firebase Connection**: Firebase should be configured and accessible

### Basic Commands

```bash
# Run all tests
npm run test:e2e

# Run specific test suite
npm run test:e2e:ingredients

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug specific test
npm run test:e2e:debug -- tests/ingredients/ingredients-crud.spec.ts
```

### Advanced Commands

```bash
# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests with specific configuration
npx playwright test --config=playwright-deployment.config.ts

# Generate test report
npx playwright show-report

# Update snapshots (if using visual tests)
npx playwright test --update-snapshots
```

## 🔧 Configuration Options

### Environment Variables
- `TEST_BASE_URL`: Base URL for testing (default: `http://localhost:3000`)
- `CI`: Set to `true` in CI environments for optimized settings

### Browser Configuration
Tests are configured to run on:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)
- **Tablet**: iPad Pro

### Test Timeouts
- **Global timeout**: 30 seconds per test
- **Action timeout**: 10 seconds per action
- **Navigation timeout**: 15 seconds per navigation
- **Expect timeout**: 5 seconds per assertion

## 📊 Test Helpers and Utilities

### Authentication Helper (`helpers/auth.ts`)
```typescript
const authHelper = new AuthHelper(page);
await authHelper.setupAuth();
await authHelper.loginAsAdmin();
await authHelper.logout();
```

### Ingredients Page Helper (`helpers/ingredients.ts`)
```typescript
const ingredientsPage = new IngredientsPage(page);
await ingredientsPage.navigateToIngredients();
await ingredientsPage.searchIngredients('flour');
await ingredientsPage.filterByCategory('flour');
await ingredientsPage.addStock(10, 12.50, 'Restock');
```

### Suppliers Page Helper (`helpers/suppliers.ts`)
```typescript
const suppliersPage = new SuppliersPage(page);
await suppliersPage.navigateToSuppliers();
await suppliersPage.fillSupplierForm(supplierData);
await suppliersPage.submitSupplierForm();
```

### API Helpers
```typescript
const ingredientsAPI = new IngredientsAPI(page);
const ingredient = await ingredientsAPI.createIngredient(testData);
await ingredientsAPI.updateIngredient(id, updateData);
await ingredientsAPI.deleteIngredient(id);
```

## 🎯 Test Data and Fixtures

### Test Data Location
Test data is defined in `fixtures/ingredients.ts`:
- `testIngredients`: Sample ingredient data
- `testSuppliers`: Sample supplier data
- `createIngredientFormData`: Form input test data
- `stockMovementData`: Stock management test data

### Data Management
- **Setup**: Each test creates its own test data
- **Cleanup**: Automatic cleanup in `afterEach` hooks
- **Isolation**: Tests are independent and don't share data

## 🔍 Debugging Tests

### Visual Debugging
```bash
# Run with headed browser
npm run test:e2e:headed

# Run with debug mode
npm run test:e2e:debug

# Use trace viewer
npx playwright show-trace trace.zip
```

### Common Debug Techniques
1. **Add screenshots**: `await page.screenshot({ path: 'debug.png' })`
2. **Pause execution**: `await page.pause()`
3. **Console logging**: Check browser console in headed mode
4. **Step through**: Use `--debug` flag for step-by-step execution

### Troubleshooting Common Issues

#### Authentication Failures
- Verify admin credentials are correct
- Check if Firebase auth is configured
- Ensure app is running and accessible

#### Element Not Found
- Check if selectors match current DOM structure
- Verify page has fully loaded with `waitForLoadState`
- Use more specific selectors or data-testid attributes

#### API Failures
- Verify API endpoints are accessible
- Check if Firebase connection is working
- Ensure proper error handling in tests

#### Timing Issues
- Increase timeouts for slow operations
- Use proper wait strategies (`waitForLoadState`, `waitForSelector`)
- Implement retry logic for flaky operations

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npm run build
    npm start &
    npm run test:e2e
  env:
    CI: true
    TEST_BASE_URL: http://localhost:3000
```

### Docker Testing
```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "test:e2e"]
```

## 🛠️ Test Maintenance

### Regular Updates
1. **Update selectors** when UI changes
2. **Add new test cases** for new features
3. **Update test data** to match current requirements
4. **Review and clean up** obsolete tests

### Best Practices
1. **Use data-testid** for stable element selection
2. **Keep tests independent** and properly isolated
3. **Use meaningful test descriptions** and grouping
4. **Implement proper error handling** and cleanup
5. **Follow Page Object Model** pattern for maintainability

## 📋 Test Checklist

Before deploying:
- [ ] All CRUD operations work correctly
- [ ] Stock management functions properly
- [ ] Search and filtering work as expected
- [ ] Error handling covers edge cases
- [ ] Authentication flows are secure
- [ ] Performance is acceptable on all browsers
- [ ] Tests are stable and not flaky

## 🤝 Contributing

When adding new tests:
1. Follow existing patterns and structure
2. Add proper cleanup in `afterEach` hooks
3. Use meaningful test names and descriptions
4. Include both happy path and error scenarios
5. Update this README if adding new test categories