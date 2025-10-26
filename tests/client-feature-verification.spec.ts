import { test, expect } from '@playwright/test';

/**
 * Comprehensive Client Management Feature Verification Test
 *
 * This test verifies two critical fixes:
 * Issue #1: HTTP 500 Error Fix - Clients page should load without errors
 * Issue #2: Form Field Background Color Fix - All inputs should have white backgrounds
 */

test.describe('Client Management Feature - Comprehensive Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');

    // Fill login form using working selectors
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForLoadState('load');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });

  test('Issue #1: Clients page loads without HTTP 500 error', async ({ page }) => {
    console.log('\n=== Testing Issue #1: HTTP 500 Error Fix ===\n');

    // Set up network monitoring to capture API calls
    const apiCalls: any[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/clients')) {
        const status = response.status();
        const url = response.url();
        apiCalls.push({ url, status });
        console.log(`API Call: ${url} - Status: ${status}`);
      }
    });

    // Navigate to clients page
    console.log('Navigating to /clients page...');
    await page.goto('http://localhost:3000/clients');

    // Wait for page to load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Give time for API calls to complete

    // Take screenshot of loaded page
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/clients-page-loaded.png',
      fullPage: true
    });
    console.log('Screenshot saved: clients-page-loaded.png');

    // Verify no error banners are visible
    const errorBanner = page.locator('[role="alert"]').filter({ hasText: /erro|error|500/i });
    const errorCount = await errorBanner.count();
    console.log(`Error banners found: ${errorCount}`);
    expect(errorCount).toBe(0);

    // Verify API call succeeded
    console.log('\nAPI Calls Summary:');
    apiCalls.forEach(call => {
      console.log(`  ${call.url} - Status: ${call.status}`);
    });

    const clientsApiCall = apiCalls.find(call => call.url.includes('/api/clients'));
    expect(clientsApiCall).toBeDefined();
    expect(clientsApiCall?.status).toBe(200);
    console.log('✓ API call to /api/clients returned 200 OK');

    // Verify page content is present (either clients or empty state)
    const hasClients = await page.locator('[data-testid="client-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=Nenhum cliente encontrado').count() > 0;
    const hasNewClientButton = await page.locator('text=Novo Cliente').count() > 0;

    console.log(`\nPage State:`);
    console.log(`  Has client cards: ${hasClients}`);
    console.log(`  Has empty state: ${hasEmptyState}`);
    console.log(`  Has "Novo Cliente" button: ${hasNewClientButton}`);

    expect(hasClients || hasEmptyState).toBe(true);
    expect(hasNewClientButton).toBe(true);

    console.log('\n✓ Issue #1 PASSED: Clients page loads without HTTP 500 error\n');
  });

  test('Issue #2: All form input fields have white backgrounds', async ({ page }) => {
    console.log('\n=== Testing Issue #2: Form Field Background Color Fix ===\n');

    // Navigate to clients page
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);

    // Test search and filter inputs first
    console.log('Testing search and filter inputs...');

    const searchInput = page.locator('input[placeholder*="Buscar"]').first();
    if (await searchInput.count() > 0) {
      const searchBgColor = await searchInput.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`  Search input background: ${searchBgColor}`);

      // Take screenshot of search input
      await searchInput.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/search-input-background.png'
      });

      // White is rgb(255, 255, 255)
      expect(searchBgColor).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*[0-9.]+\)/);
      console.log('✓ Search input has white background');
    }

    // Click "Novo Cliente" button to open modal
    console.log('\nOpening "Novo Cliente" modal...');
    await page.click('text=Novo Cliente');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Take screenshot of the modal
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/client-modal-opened.png',
      fullPage: true
    });
    console.log('Screenshot saved: client-modal-opened.png');

    // Test all form input fields
    console.log('\nTesting form input field backgrounds:');

    const formFields = [
      { selector: 'input[name="name"]', label: 'Nome Completo' },
      { selector: 'input[name="email"]', label: 'Email' },
      { selector: 'input[name="phone"]', label: 'Telefone' },
      { selector: 'textarea[name="notes"]', label: 'Notas Adicionais' },
    ];

    for (const field of formFields) {
      const input = page.locator(field.selector);
      if (await input.count() > 0) {
        const bgColor = await input.evaluate((el) => {
          return window.getComputedStyle(el).backgroundColor;
        });
        console.log(`  ${field.label}: ${bgColor}`);

        // Take screenshot of individual field
        await input.screenshot({
          path: `/Users/gabrielaraujo/projects/momentocake/admin/screenshots/${field.label.toLowerCase().replace(/\s+/g, '-')}-field.png`
        });

        // Verify white background (rgb(255, 255, 255) or rgba(255, 255, 255, ...))
        expect(bgColor).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*[0-9.]+\)/);
        console.log(`  ✓ ${field.label} has white background`);
      }
    }

    // Test select dropdown (contact method)
    const contactMethodSelect = page.locator('select').first();
    if (await contactMethodSelect.count() > 0) {
      const selectBgColor = await contactMethodSelect.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });
      console.log(`  Contact Method Select: ${selectBgColor}`);

      await contactMethodSelect.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/contact-method-select.png'
      });

      expect(selectBgColor).toMatch(/rgb\(255,\s*255,\s*255\)|rgba\(255,\s*255,\s*255,\s*[0-9.]+\)/);
      console.log('  ✓ Contact Method Select has white background');
    }

    // Test client type radio buttons area
    console.log('\nChecking client type selection area...');
    const clientTypeRadio = page.locator('input[type="radio"]').first();
    if (await clientTypeRadio.count() > 0) {
      // Take screenshot of client type area
      await page.locator('text=Tipo de Cliente').screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/client-type-area.png'
      });
      console.log('  Screenshot of client type area saved');
    }

    // Take final screenshot of entire form
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/client-form-all-fields.png',
      fullPage: true
    });
    console.log('\nFinal form screenshot saved: client-form-all-fields.png');

    console.log('\n✓ Issue #2 PASSED: All form input fields have white backgrounds\n');
  });

  test('Browser console should be clean (no errors)', async ({ page }) => {
    console.log('\n=== Checking Browser Console for Errors ===\n');

    const consoleMessages: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text()
        });
      }
    });

    // Navigate to clients page
    await page.goto('http://localhost:3000/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    // Open modal
    await page.click('text=Novo Cliente');
    await page.waitForSelector('[role="dialog"]', { state: 'visible' });
    await page.waitForTimeout(1000);

    // Check for console errors
    console.log(`Console errors found: ${consoleMessages.length}`);
    if (consoleMessages.length > 0) {
      console.log('Errors:');
      consoleMessages.forEach((msg, i) => {
        console.log(`  ${i + 1}. ${msg.text}`);
      });
    } else {
      console.log('✓ No console errors detected');
    }

    // We expect 0 critical errors, but some warnings may be acceptable
    expect(consoleMessages.length).toBe(0);

    console.log('\n✓ Browser console is clean\n');
  });
});
