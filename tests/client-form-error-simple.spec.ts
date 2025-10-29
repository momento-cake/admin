import { test, expect } from '@playwright/test';

test.describe('Client Form Error - Simple Diagnostic', () => {
  test('Capture exact error when submitting client form', async ({ page }) => {
    // Enable verbose console logging
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      console.log(text);
    });

    // Capture network activity
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/clients')) {
        const data: any = {
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        };
        apiRequests.push(data);
        console.log('\n📤 API REQUEST:', request.method(), request.url());
        if (data.postData) {
          console.log('📦 POST Data:', data.postData);
        }
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/clients')) {
        const status = response.status();
        const body = await response.text().catch(() => 'Could not read body');
        console.log('\n📥 API RESPONSE:', status);
        console.log('📄 Body:', body);

        // Find matching request and add response
        const req = apiRequests.find(r => r.url === response.url() && !r.response);
        if (req) {
          req.response = { status, body };
        }
      }
    });

    // Step 1: Login
    console.log('\n=== Step 1: Login ===');
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for dashboard to appear (check for "Dashboard" text)
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    console.log('✅ Logged in successfully');
    await page.screenshot({ path: 'screenshots/01-dashboard.png' });

    // Step 2: Navigate to Clients
    console.log('\n=== Step 2: Navigate to Clients ===');
    await page.click('text=Clientes');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/02-clients-page.png' });
    console.log('✅ On Clients page');

    // Step 3: Open New Client Modal
    console.log('\n=== Step 3: Open New Client Modal ===');

    // Click the "Novo Cliente" button (use first one)
    const addClientButton = page.locator('button:has-text("Novo Cliente")').first();
    await addClientButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/03-modal-opened.png' });
    console.log('✅ Modal opened');

    // Step 4: Fill minimum required fields
    console.log('\n=== Step 4: Fill Form ===');

    // Pessoa Física is already selected by default
    console.log('✅ Pessoa Física is selected by default');

    // Fill the name field
    const nameInput = page.locator('input[placeholder*="João"]');
    await nameInput.fill('Test Person Diagnostic');
    console.log('✅ Filled name');

    // Fill the contact method value (Tipo is already set to Telefone)
    const valorInput = page.locator('input[placeholder="Valor"]');
    await valorInput.fill('11999998888');
    console.log('✅ Filled contact method value');

    await page.screenshot({ path: 'screenshots/04-form-filled.png' });

    // Step 5: Submit and capture error
    console.log('\n=== Step 5: Submit Form ===');

    const submitButton = page.locator('button:has-text("Criar Cliente")');

    // Start listening for dialogs (alerts)
    page.on('dialog', dialog => {
      console.log('🚨 DIALOG:', dialog.type(), '-', dialog.message());
    });

    await submitButton.click();
    console.log('✅ Clicked submit button');

    // Wait for either error or success
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'screenshots/05-after-submit.png' });

    // Check for error messages
    console.log('\n=== Step 6: Check for Error Messages ===');

    // Look for error toast/alert
    const errorElements = await page.locator('[role="alert"], .error, [data-state="error"]').all();
    console.log(`Found ${errorElements.length} error elements`);

    for (let i = 0; i < errorElements.length; i++) {
      const text = await errorElements[i].textContent();
      console.log(`Error ${i + 1}:`, text);
    }

    // Check if modal is still open (form not submitted)
    const modalStillOpen = await page.locator('[role="dialog"]').count() > 0;
    console.log('Modal still open:', modalStillOpen);

    // Check current URL
    console.log('Current URL:', page.url());

    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log('API Requests:', JSON.stringify(apiRequests, null, 2));
    console.log('\nConsole messages (last 10):');
    consoleMessages.slice(-10).forEach(msg => console.log(msg));

    // Write report to file
    const report = {
      timestamp: new Date().toISOString(),
      apiRequests,
      consoleMessages: consoleMessages.slice(-20),
      modalStillOpen,
      currentURL: page.url()
    };

    await page.evaluate((report) => {
      console.log('=== FULL DIAGNOSTIC REPORT ===');
      console.log(JSON.stringify(report, null, 2));
    }, report);

    console.log('\n✅ Test complete - check screenshots folder');
  });
});
