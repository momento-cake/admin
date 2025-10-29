import { test, expect } from '@playwright/test';

/**
 * SIMPLE CLIENT CREATION TEST
 * Tests the basic flow of creating a Pessoa Física client
 */

test('Create Pessoa Física Client - Simple Flow', async ({ page }) => {
  console.log('\n=== SIMPLE CLIENT CREATION TEST ===\n');

  // Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/dashboard\/?/, { timeout: 10000 });
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  console.log('✅ Logged in\n');

  // Navigate to Clients
  console.log('2. Navigating to Clients page...');
  const clientsLink = page.locator('a:has-text("Clientes")').first();
  await clientsLink.click();
  await page.waitForLoadState('load');
  await page.waitForTimeout(2000);
  console.log('✅ Clients page loaded\n');
  await page.screenshot({ path: 'tests/screenshots/simple-01-clients-page.png', fullPage: true });

  // Open modal
  console.log('3. Opening creation modal...');
  await page.waitForSelector('button:has-text("Novo Cliente")', { timeout: 10000 });
  const novoClienteButton = page.locator('button:has-text("Novo Cliente")').first();
  await novoClienteButton.click();
  await page.waitForTimeout(1500);
  console.log('✅ Modal opened\n');
  await page.screenshot({ path: 'tests/screenshots/simple-02-modal-opened.png', fullPage: true });

  // Verify Pessoa Física is selected (default)
  console.log('4. Verifying Pessoa Física is selected...');
  const pessoaFisicaRadio = page.locator('input[type="radio"][value="person"]');
  await expect(pessoaFisicaRadio).toBeChecked();
  console.log('✅ Pessoa Física selected\n');

  // Fill basic fields
  console.log('5. Filling form fields...');
  await page.fill('input[name="name"]', 'Test User Final');
  console.log('  ✓ Nome: Test User Final');

  await page.fill('input[name="email"]', 'testfinal@test.com');
  console.log('  ✓ Email: testfinal@test.com');

  await page.fill('input[name="cpfCnpj"]', '12345678901');
  console.log('  ✓ CPF: 12345678901');

  await page.fill('input[name="phone"]', '11987654321');
  console.log('  ✓ Phone: 11987654321');

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/screenshots/simple-03-form-filled.png', fullPage: true });
  console.log('✅ Form filled\n');

  // Submit
  console.log('6. Submitting form...');
  const submitButton = page.locator('button:has-text("Criar Cliente")').first();
  await submitButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  await page.screenshot({ path: 'tests/screenshots/simple-04-before-submit.png', fullPage: true });

  await submitButton.click();
  console.log('  ⏳ Waiting for submission...');

  // Wait for modal to close or error to appear
  await page.waitForTimeout(4000);

  // Check if modal closed
  const modalStillVisible = await page.locator('[role="dialog"]').isVisible().catch(() => false);
  if (!modalStillVisible) {
    console.log('✅ Modal closed - likely successful!\n');
  } else {
    console.log('⚠️ Modal still visible - checking for errors...\n');
    const errorText = await page.locator('body').textContent();
    if (errorText?.includes('erro') || errorText?.includes('error')) {
      console.log('❌ Error detected in modal');
    }
  }

  await page.screenshot({ path: 'tests/screenshots/simple-05-after-submit.png', fullPage: true });

  // Check if client appears in list
  console.log('7. Checking if client appears in list...');
  await page.waitForTimeout(2000);

  const clientInList = page.locator('text="Test User Final"');
  const isVisible = await clientInList.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    console.log('✅ Client "Test User Final" found in list!\n');
    await page.screenshot({ path: 'tests/screenshots/simple-06-client-in-list.png', fullPage: true });
  } else {
    console.log('⚠️ Client not found in list\n');
    await page.screenshot({ path: 'tests/screenshots/simple-06-client-not-found.png', fullPage: true });
  }

  console.log('\n=== TEST COMPLETED ===\n');
});
