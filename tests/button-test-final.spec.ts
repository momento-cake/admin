import { test, expect } from '@playwright/test';

test.describe('Novo Cliente Modal - Button Interaction Tests', () => {
  test('verify Adicionar Pessoa and Adicionar Data buttons work correctly', async ({ page }) => {
    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'log') {
        console.log('PAGE LOG:', msg.text());
      } else if (msg.type() === 'error') {
        console.error('PAGE ERROR:', msg.text());
      }
    });

    // Track JavaScript errors
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
      console.error('JavaScript Error:', error.message);
    });

    console.log('Step 1: Navigate to login page');
    await page.goto('http://localhost:3002/login');
    await page.waitForLoadState('load');

    console.log('Step 2: Fill in login credentials');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');

    console.log('Step 3: Submit login form');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard - handle redirect
    try {
      await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    } catch (error) {
      // Check if we're on dashboard anyway (URL might not match pattern exactly)
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard')) {
        console.log('✓ On dashboard page (URL pattern different than expected)');
      } else {
        throw error;
      }
    }
    console.log('✓ Successfully logged in and navigated to dashboard');

    // Wait for dashboard to fully load
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log('Step 4: Navigate to Clients section');
    // Click on Clientes in sidebar or navigate directly
    await page.goto('http://localhost:3002/clients');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);

    console.log('Step 5: Open Novo Cliente modal');
    // Look for "Novo Cliente" button - try multiple selectors
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(novoClienteButton).toBeVisible({ timeout: 5000 });
    await novoClienteButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Verify modal is open by checking for title
    const modalTitle = page.locator('h2:has-text("Novo Cliente")');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });
    console.log('✓ Novo Cliente modal opened successfully');

    // Take screenshot of empty modal
    await page.screenshot({
      path: 'tests/screenshots/01-novo-cliente-modal-empty.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Empty modal captured');

    // =====================================================
    // TEST 1: ADICIONAR PESSOA BUTTON
    // =====================================================
    console.log('\n=== Testing Adicionar Pessoa Button ===');

    // Scroll to "Pessoas Relacionadas" section
    console.log('Step 6: Scroll to Pessoas Relacionadas section');
    const pessoasSection = page.locator('text=Pessoas Relacionadas').first();
    await pessoasSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Find and click "Adicionar Pessoa" button
    console.log('Step 7: Click Adicionar Pessoa button');
    const adicionarPessoaBtn = page.locator('button:has-text("Adicionar Pessoa")').first();
    await expect(adicionarPessoaBtn).toBeVisible({ timeout: 5000 });

    // Click the button
    await adicionarPessoaBtn.click();
    await page.waitForTimeout(2000); // Wait longer for React state update

    // Verify form fields appear
    console.log('Step 8: Verify Adicionar Pessoa form fields appear');

    // Wait for the form card to appear (the Card component with bg-gray-50)
    const formCard = page.locator('.bg-gray-50').first();
    await expect(formCard).toBeVisible({ timeout: 5000 });
    console.log('✓ Form card appeared');

    const nomeInput = page.locator('input[placeholder*="Nome completo"]').first();
    await expect(nomeInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Nome input is visible');

    // Look for the relationship select - it's a native select with options
    const relacionamentoSelect = page.locator('select').filter({ has: page.locator('option:has-text("Filho")') }).first();
    await expect(relacionamentoSelect).toBeVisible({ timeout: 5000 });
    console.log('✓ Relacionamento select is visible');

    // Fill in test data
    console.log('Step 9: Fill in person data');
    await nomeInput.fill('João Silva');

    // Select relationship (native select with "Filho(a)" option)
    await relacionamentoSelect.selectOption({ label: 'Filho(a)' });
    console.log('✓ Selected relationship: Filho(a)');

    // Fill email
    const emailInput = page.locator('input[type="email"][placeholder*="email"]').first();
    await emailInput.fill('joao@example.com');
    console.log('✓ Filled email');

    // Submit the person form
    console.log('Step 10: Submit person form');
    const submitPessoaBtn = page.locator('button:has-text("Adicionar Pessoa")').last();
    await submitPessoaBtn.click();
    await page.waitForTimeout(1500);

    // Verify person appears in list
    console.log('Step 11: Verify person appears in list');
    const pessoaAdded = page.locator('text=João Silva');
    await expect(pessoaAdded).toBeVisible({ timeout: 5000 });
    console.log('✓ Person "João Silva" added to list');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/02-pessoa-added.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Person added captured');

    // Log success to page console (visible in test output)
    await page.evaluate(() => {
      console.log('✓ Adicionar Pessoa button works');
    });

    // =====================================================
    // TEST 2: ADICIONAR DATA BUTTON
    // =====================================================
    console.log('\n=== Testing Adicionar Data Button ===');

    // Scroll to "Datas Especiais" section
    console.log('Step 12: Scroll to Datas Especiais section');
    const datasSection = page.locator('text=Datas Especiais').first();
    await datasSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Find and click "Adicionar Data" button
    console.log('Step 13: Click Adicionar Data button');
    const adicionarDataBtn = page.locator('button:has-text("Adicionar Data")').first();
    await expect(adicionarDataBtn).toBeVisible({ timeout: 5000 });

    // Click the button
    await adicionarDataBtn.click();
    await page.waitForTimeout(1000);

    // Verify form fields appear
    console.log('Step 14: Verify Adicionar Data form fields appear');
    const dateInput = page.locator('input[type="date"]').last(); // Use .last() to get the one in Special Dates section
    await expect(dateInput).toBeVisible({ timeout: 5000 });
    console.log('✓ Date input is visible');

    // Look for the type select - it's a native select with "Aniversário" option
    const typeSelect = page.locator('select').filter({ has: page.locator('option:has-text("Aniversário")') }).first();
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    console.log('✓ Type select is visible');

    // Fill in test data
    console.log('Step 15: Fill in date data');
    await dateInput.fill('2025-12-25');

    // Select type
    await typeSelect.selectOption({ label: 'Aniversário' });
    console.log('✓ Selected type: Aniversário');

    // Fill description (required field)
    const descriptionInput = page.locator('input[placeholder*="Descrição"]').first();
    await descriptionInput.fill('Natal');
    console.log('✓ Filled description');

    // Fill notes (optional)
    const notesTextarea = page.locator('textarea[placeholder*="observações"]').first();
    await notesTextarea.fill('Christmas celebration');
    console.log('✓ Filled notes');

    // Submit the date form
    console.log('Step 16: Submit date form');
    const submitDataBtn = page.locator('button:has-text("Adicionar Data")').last();
    await submitDataBtn.click();
    await page.waitForTimeout(1500);

    // Verify date appears in list
    console.log('Step 17: Verify date appears in list');
    const dataAdded = page.locator('text=Natal');
    await expect(dataAdded).toBeVisible({ timeout: 5000 });
    console.log('✓ Date "Natal" added to list');

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/03-data-added.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Date added captured');

    // Log success to page console
    await page.evaluate(() => {
      console.log('✓ Adicionar Data button works');
    });

    // =====================================================
    // VERIFICATION: MODAL STILL OPEN & NO ERRORS
    // =====================================================
    console.log('\n=== Final Verification ===');

    // Verify modal is still open
    await expect(modalTitle).toBeVisible();
    console.log('✓ Modal remains open (did not auto-submit)');

    // Check for JavaScript errors
    if (jsErrors.length > 0) {
      console.error('JavaScript Errors Detected:', jsErrors);
      throw new Error(`Test failed: ${jsErrors.length} JavaScript errors found`);
    } else {
      console.log('✓ No JavaScript errors detected');
    }

    // Take final screenshot
    await page.screenshot({
      path: 'tests/screenshots/04-final-state.png',
      fullPage: true
    });
    console.log('✓ Screenshot: Final state captured');

    console.log('\n=== TEST PASSED ===');
    console.log('✓ Both "Adicionar Pessoa" and "Adicionar Data" buttons work correctly');
    console.log('✓ No nested form issues detected');
    console.log('✓ Modal remains open after button clicks');
    console.log('✓ No JavaScript errors encountered');
  });
});
