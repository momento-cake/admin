import { test, expect } from '@playwright/test';

/**
 * Final Client Feature Verification Test
 * Tests both fixes with proper selectors
 */

test('Final comprehensive verification of Client feature fixes', async ({ page }) => {
  console.log('\n=== FINAL CLIENT FEATURE VERIFICATION ===\n');

  // Login
  console.log('Step 1: Logging in...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  console.log('✓ Login completed\n');

  // ===== ISSUE #1: HTTP 500 Error Fix =====
  console.log('=== ISSUE #1: HTTP 500 ERROR FIX ===\n');

  const apiCalls: any[] = [];
  let has500Error = false;

  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();

    if (url.includes('/api/clients')) {
      apiCalls.push({ url, status });
      console.log(`API: ${url.split('?')[0]}?${url.split('?')[1] || ''}`);
      console.log(`Status: ${status}`);

      if (status === 500) {
        has500Error = true;
      }
    }
  });

  console.log('Navigating to /clients...');
  await page.goto('http://localhost:3000/clients');
  await page.waitForLoadState('load');
  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({
    path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue1-clients-page.png',
    fullPage: true
  });

  // Check for visible errors on page
  const errorTexts = await page.locator('text=/erro|error|falha|failed/i').count();
  const has500Text = await page.locator('text=/500|internal server/i').count();

  console.log('\n--- ISSUE #1 RESULTS ---');
  console.log(`HTTP 500 errors from API: ${has500Error ? 'FOUND ❌' : 'NONE ✓'}`);
  console.log(`Error text on page: ${errorTexts > 0 ? `${errorTexts} found` : 'None ✓'}`);
  console.log(`"500" text visible: ${has500Text > 0 ? 'YES ❌' : 'NO ✓'}`);
  console.log(`Page loaded with content: ${await page.locator('text=Novo Cliente').count() > 0 ? 'YES ✓' : 'NO ❌'}`);

  const issue1Pass = !has500Error && has500Text === 0;
  console.log(`\n${issue1Pass ? '✅ ISSUE #1 PASSED' : '❌ ISSUE #1 FAILED'}\n`);

  // ===== ISSUE #2: Form Field Background Colors =====
  console.log('=== ISSUE #2: FORM FIELD BACKGROUND COLORS ===\n');

  // Check search input first
  console.log('Checking search input...');
  const searchInput = page.locator('input[placeholder*="Buscar"]').first();
  const searchBg = await searchInput.evaluate((el) => {
    return window.getComputedStyle(el).backgroundColor;
  });
  const searchIsWhite = searchBg.includes('255, 255, 255');
  console.log(`Search input: ${searchBg}`);
  console.log(`Is white: ${searchIsWhite ? 'YES ✓' : 'NO ❌'}\n`);

  await searchInput.screenshot({
    path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-search-input.png'
  });

  // Open modal with better selector
  console.log('Opening client form modal...');
  const newClientButton = page.locator('button', { hasText: 'Novo Cliente' }).first();
  await newClientButton.click();

  // Wait for modal content instead of role
  await page.waitForSelector('text=Tipo de Cliente', { state: 'visible', timeout: 5000 });
  await page.waitForTimeout(1500);
  console.log('✓ Modal opened\n');

  // Take modal screenshot
  await page.screenshot({
    path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-modal-full.png',
    fullPage: true
  });

  // Test all form fields
  console.log('Testing form field backgrounds:');
  const fieldResults: any[] = [];

  // Nome Completo
  const nameInput = page.locator('input[name="name"]');
  if (await nameInput.count() > 0) {
    const bg = await nameInput.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Nome Completo', bg, isWhite });
    console.log(`Nome Completo: ${bg} - ${isWhite ? '✓' : '❌'}`);
    await nameInput.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-nome-field.png'
    });
  }

  // Email
  const emailInput = page.locator('input[name="email"]');
  if (await emailInput.count() > 0) {
    const bg = await emailInput.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Email', bg, isWhite });
    console.log(`Email: ${bg} - ${isWhite ? '✓' : '❌'}`);
    await emailInput.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-email-field.png'
    });
  }

  // Phone
  const phoneInput = page.locator('input[name="phone"]');
  if (await phoneInput.count() > 0) {
    const bg = await phoneInput.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Telefone', bg, isWhite });
    console.log(`Telefone: ${bg} - ${isWhite ? '✓' : '❌'}`);
    await phoneInput.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-phone-field.png'
    });
  }

  // Notes textarea
  const notesTextarea = page.locator('textarea[name="notes"]');
  if (await notesTextarea.count() > 0) {
    const bg = await notesTextarea.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Notas', bg, isWhite });
    console.log(`Notas: ${bg} - ${isWhite ? '✓' : '❌'}`);
    await notesTextarea.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/screenshots/issue2-notes-field.png'
    });
  }

  // Contact method select
  const contactSelect = page.locator('select').first();
  if (await contactSelect.count() > 0) {
    const bg = await contactSelect.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Contact Select', bg, isWhite });
    console.log(`Contact Select: ${bg} - ${isWhite ? '✓' : '❌'}`);
  }

  // Contact value input
  const valueInput = page.locator('input[placeholder*="Valor"], input[value=""]').filter({ hasText: '' }).first();
  if (await valueInput.count() > 0) {
    const bg = await valueInput.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const isWhite = bg.includes('255, 255, 255');
    fieldResults.push({ field: 'Contact Value', bg, isWhite });
    console.log(`Contact Value Input: ${bg} - ${isWhite ? '✓' : '❌'}`);
  }

  console.log('\n--- ISSUE #2 RESULTS ---');
  const allWhite = fieldResults.every(r => r.isWhite);
  const searchAndAllWhite = searchIsWhite && allWhite;

  console.log(`Search input white: ${searchIsWhite ? '✓' : '❌'}`);
  console.log(`Form fields tested: ${fieldResults.length}`);
  console.log(`All form fields white: ${allWhite ? '✓' : '❌'}`);
  console.log(`Overall: ${searchAndAllWhite ? '✅ PASSED' : '❌ FAILED'}`);

  fieldResults.forEach(r => {
    console.log(`  ${r.field}: ${r.isWhite ? '✓' : '❌'}`);
  });

  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('\nScreenshots saved:');
  console.log('  - issue1-clients-page.png');
  console.log('  - issue2-search-input.png');
  console.log('  - issue2-modal-full.png');
  console.log('  - issue2-[field]-field.png (individual fields)');

  console.log('\n=== FINAL RESULTS ===');
  console.log(`Issue #1 (HTTP 500): ${issue1Pass ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Issue #2 (White backgrounds): ${searchAndAllWhite ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Overall: ${issue1Pass && searchAndAllWhite ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

  // Assertions
  expect(has500Error, 'Should not have HTTP 500 errors').toBe(false);
  expect(has500Text, 'Should not show "500" error text on page').toBe(0);
  expect(searchIsWhite, 'Search input should have white background').toBe(true);
  expect(allWhite, 'All form fields should have white backgrounds').toBe(true);
});
