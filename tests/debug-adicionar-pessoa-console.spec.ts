import { test, expect } from '@playwright/test';

test.describe('Debug "Adicionar Pessoa" Button - Console Logs', () => {
  test('Capture console logs when clicking Adicionar Pessoa button', async ({ page }) => {
    // Array to store all console messages
    const consoleLogs: Array<{ type: string; text: string }> = [];

    // Listen to all console messages
    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, text });
      console.log(`[BROWSER ${type.toUpperCase()}]:`, text);
    });

    // Also listen for page errors
    page.on('pageerror', (error) => {
      consoleLogs.push({ type: 'error', text: error.message });
      console.log('[BROWSER ERROR]:', error.message);
    });

    console.log('\n=== STEP 1: Navigate to login page ===');
    await page.goto('http://localhost:3000/login', { waitUntil: 'load' });
    await page.waitForTimeout(1000);

    console.log('\n=== STEP 2: Login with admin credentials ===');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✓ Successfully logged in and navigated to dashboard');

    console.log('\n=== STEP 3: Navigate to Clients page ===');
    // Click on Clientes menu item
    await page.click('a[href="/dashboard/clients"]');
    await page.waitForURL('**/dashboard/clients**', { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('✓ Navigated to Clients page');

    console.log('\n=== STEP 4: Open "Novo Cliente" modal ===');
    // Click the "Novo Cliente" button
    const novoClienteButton = page.locator('button:has-text("Novo Cliente")');
    await novoClienteButton.waitFor({ state: 'visible', timeout: 10000 });
    await novoClienteButton.click();
    await page.waitForTimeout(1500);
    console.log('✓ "Novo Cliente" modal opened');

    // Take screenshot before clicking button
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/before-adicionar-pessoa-click.png',
      fullPage: true
    });
    console.log('✓ Screenshot taken before clicking button');

    console.log('\n=== STEP 5: Clear console logs array and click "Adicionar Pessoa" ===');
    // Clear previous logs to focus on button click logs
    consoleLogs.length = 0;

    // Wait for the "Adicionar Pessoa" button to be visible
    const adicionarPessoaButton = page.locator('button:has-text("Adicionar Pessoa")');
    await adicionarPessoaButton.waitFor({ state: 'visible', timeout: 10000 });

    console.log('✓ "Adicionar Pessoa" button is visible');
    console.log('\n>>> CLICKING "Adicionar Pessoa" BUTTON NOW <<<\n');

    // Click the button
    await adicionarPessoaButton.click();

    // Wait for potential state updates and console logs
    await page.waitForTimeout(3000);

    console.log('\n=== STEP 6: Capture screenshot with DevTools-like view ===');
    // Take screenshot after clicking button
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/after-adicionar-pessoa-click.png',
      fullPage: true
    });
    console.log('✓ Screenshot taken after clicking button');

    console.log('\n=== STEP 7: Analyze Console Logs ===');
    console.log('\n========================================');
    console.log('ALL CONSOLE LOGS CAPTURED:');
    console.log('========================================\n');

    if (consoleLogs.length === 0) {
      console.log('⚠️  NO CONSOLE LOGS CAPTURED!');
      console.log('This may indicate:');
      console.log('  1. Console.log statements are removed in production build');
      console.log('  2. Logs are being suppressed');
      console.log('  3. Code is not executing as expected');
    } else {
      consoleLogs.forEach((log, index) => {
        console.log(`[${index + 1}] [${log.type.toUpperCase()}] ${log.text}`);
      });
    }

    console.log('\n========================================');
    console.log('FILTERING FOR CRITICAL LOGS:');
    console.log('========================================\n');

    // Filter for specific logs we're looking for
    const relatedPersonsRenderLogs = consoleLogs.filter(log =>
      log.text.includes('RelatedPersonsSection render:')
    );
    const addButtonClickedLogs = consoleLogs.filter(log =>
      log.text.includes('RelatedPersonsSection: Add button clicked')
    );
    const setIsAddingLogs = consoleLogs.filter(log =>
      log.text.includes('setIsAdding')
    );
    const errorLogs = consoleLogs.filter(log => log.type === 'error');

    console.log('📊 RelatedPersonsSection render logs:', relatedPersonsRenderLogs.length);
    relatedPersonsRenderLogs.forEach(log => console.log('  -', log.text));

    console.log('\n📊 Add button clicked logs:', addButtonClickedLogs.length);
    addButtonClickedLogs.forEach(log => console.log('  -', log.text));

    console.log('\n📊 setIsAdding logs:', setIsAddingLogs.length);
    setIsAddingLogs.forEach(log => console.log('  -', log.text));

    console.log('\n📊 Error logs:', errorLogs.length);
    errorLogs.forEach(log => console.log('  -', log.text));

    console.log('\n=== STEP 8: Check if form appeared ===');
    // Check if the person form appeared
    const personForm = page.locator('[class*="person-form"]').or(
      page.locator('input[placeholder*="Nome"]')
    ).or(
      page.locator('label:has-text("Nome")')
    );

    const formVisible = await personForm.count() > 0;
    console.log('\n📋 Person form visible after click:', formVisible);

    if (formVisible) {
      console.log('✓ SUCCESS: Form appeared after clicking button');
    } else {
      console.log('✗ FAILURE: Form did NOT appear after clicking button');
      console.log('Possible causes:');
      console.log('  1. State update is not triggering re-render');
      console.log('  2. Conditional rendering logic is incorrect');
      console.log('  3. Parent state is not being updated');
    }

    console.log('\n=== STEP 9: Inspect DOM for debugging ===');
    // Get the modal content for inspection
    const modalContent = await page.locator('[role="dialog"]').innerHTML();

    // Check if there's any related persons content
    const hasRelatedPersonsSection = modalContent.includes('Adicionar Pessoa');
    console.log('✓ Modal has "Adicionar Pessoa" button:', hasRelatedPersonsSection);

    console.log('\n========================================');
    console.log('SUMMARY OF FINDINGS:');
    console.log('========================================\n');
    console.log('1. Total console logs captured:', consoleLogs.length);
    console.log('2. Form appeared after click:', formVisible);
    console.log('3. Render logs captured:', relatedPersonsRenderLogs.length);
    console.log('4. Button click logs captured:', addButtonClickedLogs.length);
    console.log('5. State update logs captured:', setIsAddingLogs.length);
    console.log('6. Errors detected:', errorLogs.length);
    console.log('\n========================================\n');

    // Save logs to a file for later analysis
    const logReport = {
      timestamp: new Date().toISOString(),
      totalLogs: consoleLogs.length,
      formAppeared: formVisible,
      logs: consoleLogs,
      criticalLogs: {
        renderLogs: relatedPersonsRenderLogs,
        buttonClickLogs: addButtonClickedLogs,
        stateUpdateLogs: setIsAddingLogs,
        errorLogs: errorLogs
      }
    };

    const fs = require('fs');
    fs.writeFileSync(
      '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/console-logs-report.json',
      JSON.stringify(logReport, null, 2)
    );
    console.log('✓ Full log report saved to: tests/screenshots/console-logs-report.json\n');
  });
});
