import { test } from '@playwright/test';

// Disable global setup for this test
test.use({
  baseURL: 'http://localhost:4000',
});

test.describe('Special Dates Dashboard Debug - Simple', () => {
  test('capture console logs and screenshots', async ({ page }) => {
    // Array to collect all console messages
    const consoleMessages: Array<{ type: string; text: string; timestamp: Date }> = [];

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({
        type: msg.type(),
        text: text,
        timestamp: new Date()
      });

      // Print to terminal in real-time
      const prefix = `[${msg.type().toUpperCase()}]`;
      console.log(`${prefix} ${text}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      const errorText = `PAGE ERROR: ${error.message}\n${error.stack}`;
      console.error(`[ERROR] ${errorText}`);
      consoleMessages.push({
        type: 'error',
        text: errorText,
        timestamp: new Date()
      });
    });

    // Capture failed requests
    page.on('requestfailed', request => {
      console.error(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
    });

    try {
      console.log('\n=== STEP 1: Logging in ===');
      await page.goto('http://localhost:4000/login', { waitUntil: 'load', timeout: 30000 });

      await page.fill('input[type="email"]', 'admin@momentocake.com.br');
      await page.fill('input[type="password"]', 'G8j5k188');

      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/01-login-page.png',
        fullPage: true
      });

      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard (or timeout and continue)
      try {
        await page.waitForURL('**/dashboard**', { timeout: 15000 });
        console.log('✓ Login successful, now at:', page.url());
      } catch (e) {
        console.log('⚠️  Dashboard did not fully load, but continuing. Current URL:', page.url());
        // Wait a bit more
        await page.waitForTimeout(3000);
      }

      // Navigate to special dates dashboard
      console.log('\n=== STEP 2: Navigating to Special Dates Dashboard ===');
      await page.goto('http://localhost:4000/clients/special-dates', { waitUntil: 'load', timeout: 30000 });
      console.log('✓ Navigated to:', page.url());

      // Wait for any async operations
      await page.waitForTimeout(5000);

      // Take screenshot of the page
      console.log('\n=== STEP 3: Capturing Screenshots ===');
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/02-special-dates-page.png',
        fullPage: true
      });
      console.log('✓ Page screenshot saved');

      // Get page content
      console.log('\n=== STEP 4: Analyzing Page Content ===');
      const bodyText = await page.locator('body').innerText();
      console.log('\nPage body text (first 1000 chars):');
      console.log(bodyText.substring(0, 1000));
      console.log('\n...\n');

      // Check for specific elements
      const pageTitle = await page.locator('h1, h2').first().textContent().catch(() => 'No title found');
      console.log(`\nPage title: ${pageTitle}`);

      // Check for various element types
      const hasTable = await page.locator('table').count();
      const hasTableBody = await page.locator('tbody').count();
      const hasTableRows = await page.locator('tbody tr').count();
      const hasList = await page.locator('[role="list"]').count();
      const hasCards = await page.locator('[class*="card"]').count();
      const hasLoading = await page.locator('text=/loading|carregando/i').count();
      const hasError = await page.locator('text=/error|erro/i').count();
      const hasEmpty = await page.locator('text=/nenhum|vazio|empty|no.*found/i').count();

      console.log(`\nElements found:`);
      console.log(`- Tables: ${hasTable}`);
      console.log(`- Table bodies: ${hasTableBody}`);
      console.log(`- Table rows: ${hasTableRows}`);
      console.log(`- Lists: ${hasList}`);
      console.log(`- Cards: ${hasCards}`);
      console.log(`- Loading indicators: ${hasLoading}`);
      console.log(`- Error messages: ${hasError}`);
      console.log(`- Empty state messages: ${hasEmpty}`);

      // Try to get table data if it exists
      if (hasTable > 0 && hasTableBody > 0) {
        console.log('\n=== Table Content ===');
        const rows = await page.locator('tbody tr').all();
        console.log(`Found ${rows.length} table rows`);

        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const rowText = await rows[i].innerText();
          console.log(`Row ${i + 1}: ${rowText.substring(0, 100)}`);
        }
      }

      // Print console messages summary
      console.log('\n=== STEP 5: Console Messages Analysis ===');
      console.log(`Total console messages: ${consoleMessages.length}\n`);

      // Group by type
      const byType: Record<string, typeof consoleMessages> = {};
      consoleMessages.forEach(msg => {
        if (!byType[msg.type]) byType[msg.type] = [];
        byType[msg.type].push(msg);
      });

      // Print errors
      if (byType['error']) {
        console.log(`\n🔴 ERRORS (${byType['error'].length}):`);
        byType['error'].forEach(msg => console.log(`   ${msg.text}`));
      }

      // Print warnings
      if (byType['warning']) {
        console.log(`\n⚠️  WARNINGS (${byType['warning'].length}):`);
        byType['warning'].forEach(msg => console.log(`   ${msg.text}`));
      }

      // Print relevant logs
      const relevantKeywords = ['client', 'special', 'date', 'fetch', 'transform', 'dashboard', 'loading', 'data'];
      const relevantLogs = consoleMessages.filter(msg =>
        msg.type === 'log' &&
        relevantKeywords.some(keyword => msg.text.toLowerCase().includes(keyword))
      );

      if (relevantLogs.length > 0) {
        console.log(`\n📋 RELEVANT DEBUG LOGS (${relevantLogs.length}):`);
        relevantLogs.forEach(msg => console.log(`   ${msg.text}`));
      } else {
        console.log(`\n⚠️  NO RELEVANT DEBUG LOGS FOUND`);
        console.log('   Debug logging may not be enabled in the component');
      }

      // Print all other logs
      console.log(`\n📝 ALL CONSOLE LOGS:`);
      consoleMessages.filter(m => m.type === 'log').forEach(msg => {
        console.log(`   ${msg.text}`);
      });

      console.log('\n=== DEBUG SESSION COMPLETE ===');

      // Create summary report
      const report = {
        timestamp: new Date().toISOString(),
        url: page.url(),
        pageTitle,
        elementsFound: {
          tables: hasTable,
          tableBodies: hasTableBody,
          tableRows: hasTableRows,
          lists: hasList,
          cards: hasCards,
          loadingIndicators: hasLoading,
          errorMessages: hasError,
          emptyStateMessages: hasEmpty
        },
        consoleMessages: {
          total: consoleMessages.length,
          errors: byType['error']?.map(m => m.text) || [],
          warnings: byType['warning']?.map(m => m.text) || [],
          relevantLogs: relevantLogs.map(m => m.text),
          allLogs: consoleMessages.filter(m => m.type === 'log').map(m => m.text)
        }
      };

      console.log('\n=== SUMMARY REPORT ===');
      console.log(JSON.stringify(report, null, 2));

      // Save report
      const fs = require('fs');
      fs.writeFileSync(
        '/Users/gabrielaraujo/projects/momentocake/admin/tests/special-dates-debug-report.json',
        JSON.stringify(report, null, 2)
      );
      console.log('\n✓ Report saved to tests/special-dates-debug-report.json');

    } catch (error) {
      console.error('\n❌ Test failed with error:', error);

      // Take error screenshot
      await page.screenshot({
        path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/error-screenshot.png',
        fullPage: true
      });

      throw error;
    }
  });
});
