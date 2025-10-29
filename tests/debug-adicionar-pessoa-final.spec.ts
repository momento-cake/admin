import { test, expect, chromium } from '@playwright/test';

test.describe('Debug Adicionar Pessoa Button - Final Test', () => {
  test('Capture console logs and test button interaction', async () => {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Store console logs
    const consoleLogs: Array<{ type: string; text: string; timestamp: string }> = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      const timestamp = new Date().toISOString();
      consoleLogs.push({ type, text, timestamp });
      console.log(`[${timestamp}] [${type.toUpperCase()}]:`, text);
    });

    page.on('pageerror', (error) => {
      const timestamp = new Date().toISOString();
      consoleLogs.push({ type: 'error', text: error.message, timestamp });
      console.log(`[${timestamp}] [ERROR]:`, error.message);
    });

    try {
      console.log('\n========================================');
      console.log('STEP 1: Login to the application');
      console.log('========================================\n');

      await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      await page.fill('input[type="email"]', 'admin@momentocake.com.br');
      await page.fill('input[type="password"]', 'G8j5k188');
      await page.click('button[type="submit"]');

      // Wait for dashboard - use a more flexible approach
      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      console.log('Current URL after login:', currentUrl);

      if (currentUrl.includes('/dashboard')) {
        console.log('✓ Successfully logged in\n');
      } else {
        console.log('⚠️ Not on dashboard, but continuing...\n');
      }

      console.log('========================================');
      console.log('STEP 2: Navigate to Clientes page');
      console.log('========================================\n');

      // Click on Clientes menu item in sidebar
      const clientesMenuItem = page.locator('a:has-text("Clientes")').or(
        page.locator('[href*="/clientes"]')
      ).or(
        page.locator('button:has-text("Clientes")')
      );

      await clientesMenuItem.first().click();
      await page.waitForTimeout(2000);

      // Check if we're on clients page or if there's a "Novo Cliente" button
      console.log('Current URL after clicking Clientes:', page.url());

      // Take screenshot of current page
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/1-clients-page.png',
        fullPage: true
      });
      console.log('✓ Screenshot saved: 1-clients-page.png\n');

      console.log('========================================');
      console.log('STEP 3: Open "Novo Cliente" modal');
      console.log('========================================\n');

      // Find and click "Novo Cliente" or "Adicionar Cliente" button
      const novoClienteButton = page.locator('button:has-text("Novo Cliente")').or(
        page.locator('button:has-text("Adicionar Cliente")')
      );

      const buttonCount = await novoClienteButton.count();
      console.log('Found', buttonCount, 'button(s) to add client');

      if (buttonCount === 0) {
        console.log('⚠️ No "Novo Cliente" or "Adicionar Cliente" button found');
        throw new Error('No button found to add client');
      }

      await novoClienteButton.first().click();
      await page.waitForTimeout(2000);
      console.log('✓ Clicked button to add client\n');

      // Take screenshot of modal
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/2-modal-opened.png',
        fullPage: true
      });
      console.log('✓ Screenshot saved: 2-modal-opened.png\n');

      console.log('========================================');
      console.log('STEP 4: Locate "Adicionar Pessoa" button');
      console.log('========================================\n');

      // Clear console logs to focus on button click
      consoleLogs.length = 0;

      const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
      const addButtonVisible = await adicionarPessoaButton.isVisible({ timeout: 5000 }).catch(() => false);

      console.log('✓ "Adicionar Pessoa" button visible:', addButtonVisible);

      if (!addButtonVisible) {
        console.log('⚠️ Button not visible, checking modal content...');
        const modalContent = await page.locator('[role="dialog"]').textContent().catch(() => 'N/A');
        console.log('Modal content (first 300 chars):', modalContent.substring(0, 300));
        throw new Error('Adicionar Pessoa button not found');
      }

      console.log('\n========================================');
      console.log('STEP 5: CLICK "Adicionar Pessoa" button');
      console.log('========================================\n');

      console.log('>>> CLICKING BUTTON NOW <<<\n');
      await adicionarPessoaButton.click({ force: false });

      // Wait for state updates and console logs
      await page.waitForTimeout(3000);

      console.log('\n========================================');
      console.log('STEP 6: ANALYZE CONSOLE LOGS');
      console.log('========================================\n');

      if (consoleLogs.length === 0) {
        console.log('⚠️ NO CONSOLE LOGS CAPTURED');
        console.log('This indicates either:');
        console.log('  - Console logs are stripped in build');
        console.log('  - Component is not re-rendering');
        console.log('  - Event handler is not executing\n');
      } else {
        console.log(`✓ Captured ${consoleLogs.length} console log(s):\n`);
        consoleLogs.forEach((log, i) => {
          console.log(`  [${i + 1}] [${log.type}] ${log.text}`);
        });
      }

      // Filter for specific logs
      console.log('\n--- Critical Logs ---');
      const renderLogs = consoleLogs.filter(log => log.text.includes('RelatedPersonsSection render:'));
      const clickLogs = consoleLogs.filter(log => log.text.includes('Add button clicked'));
      const setIsAddingLogs = consoleLogs.filter(log => log.text.includes('setIsAdding'));
      const parentCallLogs = consoleLogs.filter(log => log.text.includes('parentOnShowAddForm'));

      console.log('Render logs:', renderLogs.length);
      renderLogs.forEach(log => console.log('  •', log.text));

      console.log('\nButton click logs:', clickLogs.length);
      clickLogs.forEach(log => console.log('  •', log.text));

      console.log('\nsetIsAdding logs:', setIsAddingLogs.length);
      setIsAddingLogs.forEach(log => console.log('  •', log.text));

      console.log('\nParent callback logs:', parentCallLogs.length);
      parentCallLogs.forEach(log => console.log('  •', log.text));

      // Take screenshot after click
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/3-after-button-click.png',
        fullPage: true
      });
      console.log('\n✓ Screenshot saved: 3-after-button-click.png\n');

      console.log('========================================');
      console.log('STEP 7: CHECK IF FORM APPEARED');
      console.log('========================================\n');

      // Check for form fields that should appear
      const formSelectors = [
        'input[placeholder*="Nome"]',
        'input[placeholder*="Nome completo"]',
        'label:has-text("Nome *")',
        'select', // Relationship dropdown
      ];

      let formFound = false;
      let foundSelector = '';

      for (const selector of formSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          const visible = await page.locator(selector).first().isVisible();
          if (visible) {
            formFound = true;
            foundSelector = selector;
            console.log(`✓ Form element found: ${selector}`);
            break;
          }
        }
      }

      if (!formFound) {
        console.log('✗ NO FORM APPEARED after button click');
        console.log('This indicates the state update failed or form rendering is broken');
      } else {
        console.log(`\n✓ SUCCESS! Form appeared with selector: ${foundSelector}`);
      }

      console.log('\n========================================');
      console.log('SUMMARY');
      console.log('========================================\n');
      console.log('Total console logs:', consoleLogs.length);
      console.log('Form appeared:', formFound);
      console.log('Render logs:', renderLogs.length);
      console.log('Click logs:', clickLogs.length);
      console.log('State update logs:', setIsAddingLogs.length);
      console.log('Parent callback logs:', parentCallLogs.length);

      // Save full report
      const fs = require('fs');
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          formAppeared: formFound,
          foundSelector,
          totalLogs: consoleLogs.length,
          renderLogsCount: renderLogs.length,
          clickLogsCount: clickLogs.length,
          stateUpdateLogsCount: setIsAddingLogs.length,
          parentCallbackLogsCount: parentCallLogs.length
        },
        allLogs: consoleLogs,
        criticalLogs: {
          renderLogs,
          clickLogs,
          setIsAddingLogs,
          parentCallLogs
        }
      };

      fs.writeFileSync(
        '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/CONSOLE_REPORT.json',
        JSON.stringify(report, null, 2)
      );
      console.log('\n✓ Full report saved: tests/screenshots/CONSOLE_REPORT.json');

      console.log('\n========================================');
      console.log('TEST COMPLETE');
      console.log('========================================\n');

    } finally {
      await page.waitForTimeout(3000);
      await browser.close();
    }
  });
});
