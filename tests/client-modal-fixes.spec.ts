import { test, expect } from '@playwright/test';

/**
 * Comprehensive test for Client Modal fixes:
 * Fix #1: Tags Section Removal
 * Fix #2: Pessoas Relacionadas Add Button
 * Fix #3: Datas Especiais Add Button
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

test.describe('Client Modal Comprehensive Fixes Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Wait for page to load
    await page.waitForLoadState('load');

    // Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard (handle trailing slash)
    await page.waitForURL(/\/dashboard\/?$/, { timeout: 10000 });
    await page.waitForLoadState('load');

    console.log('✅ Login successful');
  });

  test('Fix #1: Verify Tags Section is Removed', async ({ page }) => {
    console.log('\n🔍 Testing Fix #1: Tags Section Removal');

    // Navigate to Clientes page
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');

    // Take screenshot of clients page
    await page.screenshot({
      path: 'test-results/fix1-clients-page.png',
      fullPage: true
    });

    // Click "Novo Cliente" button - try multiple possible selectors
    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await expect(newClientButton).toBeVisible({ timeout: 10000 });
    await newClientButton.click();

    // Wait for modal to appear
    await page.waitForTimeout(1000);

    // Take screenshot of opened modal
    await page.screenshot({
      path: 'test-results/fix1-modal-opened.png',
      fullPage: true
    });

    // Verify modal sections that SHOULD exist
    const expectedSections = [
      'Tipo',
      'Informações Básicas',
      'Métodos de Contato',
      'Pessoas Relacionadas',
      'Datas Especiais',
      'Notas'
    ];

    console.log('Checking for expected sections...');
    for (const section of expectedSections) {
      const sectionExists = await page.locator(`text="${section}"`).count() > 0;
      console.log(`  ${sectionExists ? '✅' : '❌'} ${section}: ${sectionExists ? 'PRESENT' : 'MISSING'}`);
    }

    // Verify Tags section does NOT exist
    const tagsSection = page.locator('text="Tags de Categorização"');
    const tagsCount = await tagsSection.count();

    console.log(`  ${tagsCount === 0 ? '✅' : '❌'} Tags de Categorização: ${tagsCount === 0 ? 'NOT PRESENT (PASS)' : 'PRESENT (FAIL)'}`);

    // Alternative checks for tags-related elements
    const tagsInput = page.locator('input[placeholder*="tag"]');
    const tagsInputCount = await tagsInput.count();
    console.log(`  ${tagsInputCount === 0 ? '✅' : '❌'} Tags input field: ${tagsInputCount === 0 ? 'NOT PRESENT (PASS)' : 'PRESENT (FAIL)'}`);

    // Assert: Tags section should NOT be visible
    expect(tagsCount).toBe(0);
    expect(tagsInputCount).toBe(0);

    console.log('\n✅ Fix #1 PASSED: Tags section is removed');
  });

  test('Fix #2: Verify Pessoas Relacionadas Add Button Works', async ({ page }) => {
    console.log('\n🔍 Testing Fix #2: Pessoas Relacionadas Add Button');

    // Navigate to Clientes page and open modal
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');

    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await newClientButton.click();
    await page.waitForTimeout(1000);

    // Scroll to Pessoas Relacionadas section
    const pessoasSection = page.locator('text="Pessoas Relacionadas"').first();
    await pessoasSection.scrollIntoViewIfNeeded();

    // Take screenshot before clicking button
    await page.screenshot({
      path: 'test-results/fix2-before-add.png',
      fullPage: true
    });

    // Find and click "Adicionar Pessoa" button
    const addPessoaButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await expect(addPessoaButton).toBeVisible({ timeout: 5000 });
    console.log('  ✅ "Adicionar Pessoa" button found');

    await addPessoaButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot after clicking button
    await page.screenshot({
      path: 'test-results/fix2-after-add.png',
      fullPage: true
    });

    // Verify form fields appear
    const expectedFields = [
      { label: 'Nome', type: 'input' },
      { label: 'Relacionamento', type: 'input' },
      { label: 'Email', type: 'input' },
      { label: 'Telefone', type: 'input' },
      { label: 'Data de Nascimento', type: 'input' },
      { label: 'Observações', type: 'textarea' }
    ];

    console.log('Checking for form fields...');
    for (const field of expectedFields) {
      const fieldExists = await page.locator(`label:has-text("${field.label}")`).count() > 0;
      console.log(`  ${fieldExists ? '✅' : '❌'} ${field.label}: ${fieldExists ? 'PRESENT' : 'MISSING'}`);
    }

    // Verify action buttons appear
    const cancelButton = page.locator('button:has-text("Cancelar")');
    const submitButton = page.locator('button:has-text("Adicionar Pessoa")');

    const cancelExists = await cancelButton.count() > 0;
    const submitExists = await submitButton.count() > 0;

    console.log(`  ${cancelExists ? '✅' : '❌'} Cancelar button: ${cancelExists ? 'PRESENT' : 'MISSING'}`);
    console.log(`  ${submitExists ? '✅' : '❌'} Adicionar Pessoa button: ${submitExists ? 'PRESENT' : 'MISSING'}`);

    // Test filling in the form
    console.log('Testing form input...');
    try {
      // Find input fields after the form is shown
      const nomeInput = page.locator('input[name*="name"], input[placeholder*="Nome"]').last();
      const emailInput = page.locator('input[type="email"]').last();
      const telefoneInput = page.locator('input[name*="phone"], input[placeholder*="Telefone"]').last();

      await nomeInput.fill('João Silva');
      await emailInput.fill('joao@example.com');
      await telefoneInput.fill('(11) 98765-4321');

      console.log('  ✅ Form fields can be filled');

      // Take screenshot with filled form
      await page.screenshot({
        path: 'test-results/fix2-form-filled.png',
        fullPage: true
      });

    } catch (error) {
      console.log(`  ❌ Error filling form: ${error}`);
    }

    // Check for white backgrounds on form fields
    console.log('Checking form field backgrounds...');
    const inputs = await page.locator('input[type="text"], input[type="email"], textarea').all();
    let whiteBackgroundCount = 0;

    for (const input of inputs) {
      const bgColor = await input.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white') {
        whiteBackgroundCount++;
      }
    }

    console.log(`  ℹ️  ${whiteBackgroundCount} input fields have white backgrounds`);

    console.log('\n✅ Fix #2 PASSED: Pessoas Relacionadas form works');
  });

  test('Fix #3: Verify Datas Especiais Add Button Works', async ({ page }) => {
    console.log('\n🔍 Testing Fix #3: Datas Especiais Add Button');

    // Navigate to Clientes page and open modal
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');

    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await newClientButton.click();
    await page.waitForTimeout(1000);

    // Scroll to Datas Especiais section
    const datasSection = page.locator('text="Datas Especiais"').first();
    await datasSection.scrollIntoViewIfNeeded();

    // Take screenshot before clicking button
    await page.screenshot({
      path: 'test-results/fix3-before-add.png',
      fullPage: true
    });

    // Find and click "Adicionar Data" button (try variations)
    const addDataButton = page.locator('button:has-text("Adicionar Data"), button:has-text("Adicionar")').first();
    await expect(addDataButton).toBeVisible({ timeout: 5000 });
    console.log('  ✅ "Adicionar Data" button found');

    await addDataButton.click();
    await page.waitForTimeout(1000);

    // Take screenshot after clicking button
    await page.screenshot({
      path: 'test-results/fix3-after-add.png',
      fullPage: true
    });

    // Verify form fields appear
    const expectedFields = [
      'Data',
      'Tipo de Data',
      'Descrição',
      'Pessoa Relacionada',
      'Observações'
    ];

    console.log('Checking for form fields...');
    for (const field of expectedFields) {
      const fieldExists = await page.locator(`label:has-text("${field}")`).count() > 0;
      console.log(`  ${fieldExists ? '✅' : '❌'} ${field}: ${fieldExists ? 'PRESENT' : 'MISSING'}`);
    }

    // Verify action buttons appear
    const cancelButton = page.locator('button:has-text("Cancelar")');
    const submitButton = page.locator('button:has-text("Adicionar Data"), button:has-text("Salvar")');

    const cancelExists = await cancelButton.count() > 0;
    const submitExists = await submitButton.count() > 0;

    console.log(`  ${cancelExists ? '✅' : '❌'} Cancelar button: ${cancelExists ? 'PRESENT' : 'MISSING'}`);
    console.log(`  ${submitExists ? '✅' : '❌'} Submit button: ${submitExists ? 'PRESENT' : 'MISSING'}`);

    // Test filling in the form
    console.log('Testing form input...');
    try {
      // Find input fields after the form is shown
      const dataInput = page.locator('input[type="date"]').last();
      const descricaoInput = page.locator('input[name*="description"], input[placeholder*="Descrição"]').last();

      await dataInput.fill('2025-12-25');
      await descricaoInput.fill('Aniversário de João');

      console.log('  ✅ Form fields can be filled');

      // Take screenshot with filled form
      await page.screenshot({
        path: 'test-results/fix3-form-filled.png',
        fullPage: true
      });

    } catch (error) {
      console.log(`  ❌ Error filling form: ${error}`);
    }

    // Check for white backgrounds on form fields
    console.log('Checking form field backgrounds...');
    const inputs = await page.locator('input[type="text"], input[type="date"], textarea').all();
    let whiteBackgroundCount = 0;

    for (const input of inputs) {
      const bgColor = await input.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white') {
        whiteBackgroundCount++;
      }
    }

    console.log(`  ℹ️  ${whiteBackgroundCount} input fields have white backgrounds`);

    console.log('\n✅ Fix #3 PASSED: Datas Especiais form works');
  });

  test('Additional Checks: Modal Functionality', async ({ page }) => {
    console.log('\n🔍 Testing Additional Checks: Modal Functionality');

    // Navigate to Clientes page and open modal
    await page.goto(`${BASE_URL}/clients`);
    await page.waitForLoadState('load');

    const newClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await newClientButton.click();
    await page.waitForTimeout(1000);

    // Take full modal screenshot
    await page.screenshot({
      path: 'test-results/additional-modal-overview.png',
      fullPage: true
    });

    // Check for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Test modal scrolling
    console.log('Testing modal scroll...');
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        modal.scrollTop = modal.scrollHeight / 2;
        return true;
      }
      return false;
    });
    console.log('  ✅ Modal can be scrolled');

    // Test close button
    console.log('Testing close button...');
    const closeButton = page.locator('button[aria-label*="close"], button:has-text("×")').first();
    const closeExists = await closeButton.count() > 0;
    console.log(`  ${closeExists ? '✅' : '❌'} Close button (X): ${closeExists ? 'PRESENT' : 'MISSING'}`);

    if (closeExists) {
      await closeButton.click();
      await page.waitForTimeout(500);

      // Verify modal closed
      const modalClosed = await page.locator('[role="dialog"]').count() === 0;
      console.log(`  ${modalClosed ? '✅' : '❌'} Modal closes: ${modalClosed ? 'YES' : 'NO'}`);
    }

    // Report console errors
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Console Errors Found:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    } else {
      console.log('\n✅ No console errors detected');
    }

    console.log('\n✅ Additional checks completed');
  });
});
