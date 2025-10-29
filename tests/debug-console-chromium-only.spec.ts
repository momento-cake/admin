import { test, expect, chromium } from '@playwright/test';

test.describe('Debug "Adicionar Pessoa" - Chromium Only', () => {
  test('Capture console logs when clicking Adicionar Pessoa', async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Array to store all console messages
    const consoleLogs: Array<{ type: string; text: string; timestamp: string }> = [];

    // Listen to all console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();
      consoleLogs.push({ type, text, timestamp });
      console.log(`[${timestamp}] [BROWSER ${type.toUpperCase()}]:`, text);
    });

    // Also listen for page errors
    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString();
      consoleLogs.push({ type: 'error', text: error.message, timestamp });
      console.log(`[${timestamp}] [BROWSER ERROR]:`, error.message);
    });

    try {
      console.log('\n=== STEP 1: Navigate to login page ===');
      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      console.log('\n=== STEP 2: Login with admin credentials ===');
      await page.fill('input[type="email"]', 'admin@momentocake.com.br');
      await page.fill('input[type="password"]', 'G8j5k188');

      // Click login and wait for either dashboard or login redirect
      await page.click('button[type="submit"]');

      try {
        await page.waitForURL('**/dashboard**', { timeout: 15000 });
        console.log('✓ Successfully logged in and navigated to dashboard');
      } catch (e) {
        console.log('⚠️ Login may have failed, checking current URL...');
        console.log('Current URL:', page.url());

        // Try to see if there's an error message
        const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => null);
        if (errorMsg) {
          console.log('Error message on page:', errorMsg);
        }

        // Let's continue anyway to see what happens
      }

      await page.waitForTimeout(3000);

      console.log('\n=== STEP 3: Navigate to Clients page ===');
      // Try to click Clientes menu
      const clientesLink = page.locator('a[href="/dashboard/clients"]');
      const linkVisible = await clientesLink.isVisible().catch(() => false);

      if (!linkVisible) {
        console.log('⚠️ Clientes link not visible. Current page:', page.url());
        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/no-clientes-link.png',
          fullPage: true
        });

        // Try to navigate directly
        console.log('Attempting direct navigation to clients page...');
        await page.goto('http://localhost:3000/dashboard/clients', { waitUntil: 'domcontentloaded' });
      } else {
        await clientesLink.click();
        await page.waitForURL('**/dashboard/clients**', { timeout: 10000 });
      }

      await page.waitForTimeout(2000);
      console.log('✓ On Clients page');

      console.log('\n=== STEP 4: Open "Novo Cliente" modal ===');
      const novoClienteButton = page.locator('button:has-text("Novo Cliente")');
      await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });
      await novoClienteButton.click();
      await page.waitForTimeout(2000);
      console.log('✓ "Novo Cliente" modal opened');

      // Take screenshot of modal
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/modal-opened.png',
        fullPage: true
      });

      console.log('\n=== STEP 5: Clear console logs and click "Adicionar Pessoa" ===');
      consoleLogs.length = 0; // Clear previous logs

      const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
      const buttonVisible = await adicionarPessoaButton.isVisible();
      console.log('✓ "Adicionar Pessoa" button visible:', buttonVisible);

      if (buttonVisible) {
        console.log('\n>>> CLICKING "Adicionar Pessoa" BUTTON NOW <<<\n');
        await adicionarPessoaButton.click();

        // Wait for any state updates
        await page.waitForTimeout(4000);

        console.log('\n=== Console logs after button click ===');
        if (consoleLogs.length === 0) {
          console.log('⚠️ NO CONSOLE LOGS CAPTURED AFTER BUTTON CLICK');
        } else {
          console.log(`✓ Captured ${consoleLogs.length} console logs:\n`);
          consoleLogs.forEach((log, i) => {
            console.log(`  [${i + 1}] [${log.type}] ${log.text}`);
          });
        }

        // Take screenshot after click
        await page.screenshot({
          path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-button-click.png',
          fullPage: true
        });

        console.log('\n=== Check if form appeared ===');
        // Look for the person form - try multiple selectors
        const formSelectors = [
          'input[placeholder*="Nome"]',
          'input[name="name"]',
          'label:has-text("Nome")',
          '[data-testid="person-form"]'
        ];

        let formFound = false;
        for (const selector of formSelectors) {
          const count = await page.locator(selector).count();
          if (count > 0) {
            console.log(`✓ Form element found with selector: ${selector}`);
            formFound = true;
            break;
          }
        }

        if (!formFound) {
          console.log('✗ NO FORM ELEMENTS FOUND');

          // Let's check what IS in the modal
          const modalContent = await page.locator('[role="dialog"]').innerHTML();
          console.log('\n=== Modal Content (first 500 chars) ===');
          console.log(modalContent.substring(0, 500));
        }

        // Filter critical logs
        console.log('\n=== Filtering for critical logs ===');
        const renderLogs = consoleLogs.filter(log => log.text.includes('RelatedPersonsSection render:'));
        const clickLogs = consoleLogs.filter(log => log.text.includes('Add button clicked'));
        const stateLogs = consoleLogs.filter(log => log.text.includes('setIsAdding'));
        const errorLogs = consoleLogs.filter(log => log.type === 'error');

        console.log('\nRender logs:', renderLogs.length);
        renderLogs.forEach(log => console.log('  -', log.text));

        console.log('\nClick logs:', clickLogs.length);
        clickLogs.forEach(log => console.log('  -', log.text));

        console.log('\nState update logs:', stateLogs.length);
        stateLogs.forEach(log => console.log('  -', log.text));

        console.log('\nError logs:', errorLogs.length);
        errorLogs.forEach(log => console.log('  -', log.text));

        // Save full report
        const fs = require('fs');
        const report = {
          timestamp: new Date().toISOString(),
          formAppeared: formFound,
          totalLogs: consoleLogs.length,
          logs: consoleLogs,
          criticalLogs: {
            renderLogs,
            clickLogs,
            stateLogs,
            errorLogs
          }
        };

        fs.writeFileSync(
          '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/console-report.json',
          JSON.stringify(report, null, 2)
        );
        console.log('\n✓ Full report saved to: tests/screenshots/console-report.json');
      }

    } finally {
      await page.waitForTimeout(5000); // Keep browser open for 5 seconds
      await browser.close();
    }
  });
});
