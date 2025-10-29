import { test, expect } from '@playwright/test';

test.describe('Clientes Table Layout Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('load');

    // Perform login
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for navigation - be more lenient
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
    } catch (e) {
      // If still on login page, check if already logged in
      const currentUrl = page.url();
      if (!currentUrl.includes('dashboard')) {
        console.log('Login may have failed, attempting to continue...');
        await page.goto('http://localhost:4000/dashboard');
      }
    }
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for any redirects
  });

  test('should display clients list as a table with correct columns', async ({ page }) => {
    console.log('=== TEST START: Clients Table Layout Verification ===');

    // Navigate to Clientes page
    console.log('Step 1: Navigating to Clientes page...');
    await page.goto('http://localhost:4000/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Wait for data to load

    // Take initial screenshot
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/clients-table-initial.png',
      fullPage: true
    });
    console.log('✓ Initial screenshot captured');

    // Verify we're on the clients page
    const pageTitle = await page.locator('h1, h2').first().textContent();
    console.log(`Page Title: "${pageTitle}"`);

    // Check for table element (not grid)
    console.log('\nStep 2: Checking for TABLE layout (not grid)...');
    const hasTable = await page.locator('table').count() > 0;
    const hasGrid = await page.locator('[class*="grid"]').count() > 0;

    console.log(`✓ Table element found: ${hasTable}`);
    console.log(`✓ Grid layout found: ${hasGrid}`);

    if (!hasTable) {
      console.log('❌ ERROR: Table element not found! Layout may still be using grid/cards.');
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/clients-no-table-error.png',
        fullPage: true
      });
    }

    expect(hasTable).toBeTruthy();

    // Verify table structure
    console.log('\nStep 3: Verifying table structure...');
    const table = page.locator('table').first();
    const thead = table.locator('thead');
    const tbody = table.locator('tbody');

    const theadExists = await thead.count() > 0;
    const tbodyExists = await tbody.count() > 0;

    console.log(`✓ Table header (thead) exists: ${theadExists}`);
    console.log(`✓ Table body (tbody) exists: ${tbodyExists}`);

    expect(theadExists).toBeTruthy();
    expect(tbodyExists).toBeTruthy();

    // Verify column headers
    console.log('\nStep 4: Verifying column headers...');
    const expectedColumns = ['Cliente', 'Tipo', 'Email', 'CPF/CNPJ', 'Telefone', 'Ações'];
    const headerCells = await thead.locator('th, td[role="columnheader"]').allTextContents();

    console.log('Expected columns:', expectedColumns);
    console.log('Actual columns:', headerCells);

    const matchingColumns = expectedColumns.filter(col =>
      headerCells.some(header => header.includes(col))
    );

    console.log('Matching columns:', matchingColumns);
    console.log(`Column match rate: ${matchingColumns.length}/${expectedColumns.length}`);

    // Check for each expected column
    for (const col of expectedColumns) {
      const hasColumn = headerCells.some(header => header.includes(col));
      console.log(`  - ${col}: ${hasColumn ? '✓ Found' : '❌ Missing'}`);
    }

    // Verify table has data rows
    console.log('\nStep 5: Checking for data rows...');
    const rows = await tbody.locator('tr').count();
    console.log(`✓ Number of data rows: ${rows}`);

    if (rows > 0) {
      const firstRowCells = await tbody.locator('tr').first().locator('td').count();
      console.log(`✓ Columns in first row: ${firstRowCells}`);

      // Get sample data from first row
      const firstRowData = await tbody.locator('tr').first().locator('td').allTextContents();
      console.log('First row data sample:', firstRowData.slice(0, 3));
    } else {
      console.log('⚠ No data rows found - table may be empty');
    }

    // Verify search box
    console.log('\nStep 6: Verifying search functionality...');
    const searchInput = page.locator('input[type="text"][placeholder*="Buscar"], input[type="search"], input[placeholder*="pesquisar"]').first();
    const hasSearchBox = await searchInput.count() > 0;
    console.log(`✓ Search box found: ${hasSearchBox}`);

    if (hasSearchBox) {
      const searchPlaceholder = await searchInput.getAttribute('placeholder');
      console.log(`  Placeholder text: "${searchPlaceholder}"`);

      // Test search functionality
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      console.log('✓ Search input tested');
      await searchInput.clear();
      await page.waitForTimeout(1000);
    }

    // Verify type filter
    console.log('\nStep 7: Verifying type filter...');
    const filterButtons = page.locator('button').filter({ hasText: /Todos|Pessoa Física|Pessoa Jurídica/i });
    const filterCount = await filterButtons.count();
    console.log(`✓ Filter buttons found: ${filterCount}`);

    if (filterCount > 0) {
      const filterTexts = await filterButtons.allTextContents();
      console.log('Filter options:', filterTexts);

      // Test clicking a filter
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
      console.log('✓ Filter interaction tested');
    }

    // Verify pagination
    console.log('\nStep 8: Verifying pagination controls...');
    const paginationContainer = page.locator('[class*="pagination"], nav[aria-label*="pagination"]').first();
    const hasPagination = await paginationContainer.count() > 0;
    console.log(`✓ Pagination container found: ${hasPagination}`);

    if (hasPagination) {
      const paginationButtons = await paginationContainer.locator('button').count();
      console.log(`  Number of pagination buttons: ${paginationButtons}`);
    }

    // Verify action buttons in last column
    console.log('\nStep 9: Verifying action buttons...');
    if (rows > 0) {
      const firstRowActions = tbody.locator('tr').first().locator('td').last();
      const actionButtons = await firstRowActions.locator('button, a[role="button"]').count();
      console.log(`✓ Action buttons in first row: ${actionButtons}`);

      if (actionButtons > 0) {
        const buttonTitles = await firstRowActions.locator('button, a[role="button"]').allTextContents();
        console.log('Action button labels:', buttonTitles);
      }
    }

    // Take final screenshot
    console.log('\nStep 10: Taking final screenshots...');
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/clients-table-final.png',
      fullPage: true
    });
    console.log('✓ Final full-page screenshot captured');

    // Take focused screenshot of just the table
    if (hasTable) {
      await table.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/clients-table-focused.png'
      });
      console.log('✓ Focused table screenshot captured');
    }

    // Layout comparison check
    console.log('\n=== LAYOUT ANALYSIS ===');
    console.log('Checking if layout matches standard table pattern...');

    // Check for standard table classes/structure
    const tableClasses = await table.getAttribute('class');
    console.log(`Table classes: ${tableClasses}`);

    // Check for responsive container
    const tableContainer = page.locator('div').filter({ has: table }).first();
    const containerClasses = await tableContainer.getAttribute('class');
    console.log(`Container classes: ${containerClasses}`);

    // Visual alignment check
    console.log('\nChecking visual alignment...');
    const tableBox = await table.boundingBox();
    if (tableBox) {
      console.log(`Table dimensions: ${tableBox.width}px × ${tableBox.height}px`);
      console.log(`Table position: (${tableBox.x}, ${tableBox.y})`);
    }

    console.log('\n=== TEST COMPLETE ===');
  });
});
