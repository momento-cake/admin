import { test, expect } from '@playwright/test';

/**
 * Manual Button Interaction Test
 * Run with: npx playwright test manual-button-test.spec.ts --ui
 *
 * This test allows manual verification of the "Adicionar Pessoa" and "Adicionar Data" buttons
 */

test.describe('Manual Client Modal Button Test', () => {
  test('Manual test - Follow the prompts', async ({ page }) => {
    console.log('\n==============================================');
    console.log('MANUAL TEST INSTRUCTIONS');
    console.log('==============================================\n');
    console.log('1. The browser will open to the login page');
    console.log('2. Manually login with: admin@momentocake.com.br / G8j5k188');
    console.log('3. Navigate to the clients page');
    console.log('4. Click "Novo Cliente" to open the modal');
    console.log('5. Test the "Adicionar Pessoa" button');
    console.log('6. Test the "Adicionar Data" button');
    console.log('7. Report back your findings\n');
    console.log('==============================================\n');

    // Step 1: Navigate to login
    await page.goto('http://localhost:3001/login');
    console.log('✅ Navigated to login page');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/manual-01-login-page.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-01-login-page.png');

    // Wait for manual login (give user 30 seconds)
    console.log('\n⏳ Waiting 30 seconds for you to login...');
    await page.waitForTimeout(30000);

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Take screenshot after login attempt
    await page.screenshot({ path: 'screenshots/manual-02-after-login.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-02-after-login.png');

    // Try to navigate to clients page
    const possiblePaths = [
      '/dashboard/clients',
      '/clients',
      '/dashboard/clientes',
      '/clientes'
    ];

    console.log('\n🔍 Trying to find clients page...');
    for (const path of possiblePaths) {
      try {
        await page.goto(`http://localhost:3001${path}`, { waitUntil: 'load', timeout: 5000 });
        console.log(`✅ Successfully navigated to: ${path}`);
        break;
      } catch (e) {
        console.log(`❌ Path not accessible: ${path}`);
      }
    }

    // Take screenshot of clients page
    await page.screenshot({ path: 'screenshots/manual-03-clients-page.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-03-clients-page.png');

    // Wait for user to interact
    console.log('\n⏳ Waiting 60 seconds for you to test the buttons...');
    console.log('   - Click "Novo Cliente" to open the modal');
    console.log('   - Try clicking "Adicionar Pessoa" button');
    console.log('   - Try clicking "Adicionar Data" button');
    console.log('   - Observe if forms appear and are functional\n');

    await page.waitForTimeout(60000);

    // Final screenshot
    await page.screenshot({ path: 'screenshots/manual-04-final-state.png', fullPage: true });
    console.log('📸 Screenshot saved: manual-04-final-state.png');

    console.log('\n==============================================');
    console.log('Manual test completed!');
    console.log('Check screenshots in: screenshots/manual-*.png');
    console.log('==============================================\n');
  });
});
