import { test, expect } from '@playwright/test';

test.describe('Special Dates Dashboard Debug', () => {
  test('debug console logs and page state', async ({ page }) => {
    // Array to collect all console messages
    const consoleMessages: Array<{ type: string; text: string; timestamp: Date }> = [];

    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: new Date()
      });

      // Print to terminal in real-time for debugging
      console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture page errors
    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
      consoleMessages.push({
        type: 'error',
        text: `PAGE ERROR: ${error.message}\n${error.stack}`,
        timestamp: new Date()
      });
    });

    // Login first
    console.log('\n=== STEP 1: Logging in ===');
    await page.goto('http://localhost:4000/login');
    await page.waitForLoadState('load');

    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    console.log('✓ Login successful');

    // Navigate to special dates dashboard
    console.log('\n=== STEP 2: Navigating to Special Dates Dashboard ===');
    await page.goto('http://localhost:4000/clients/special-dates');
    await page.waitForLoadState('load');

    // Wait a bit for any async operations
    await page.waitForTimeout(3000);

    console.log('✓ Page loaded');

    // Take screenshot of the page
    console.log('\n=== STEP 3: Capturing Screenshots ===');
    await page.screenshot({
      path: '/Users/gabrielaraujo/projects/momentocake/admin/tests/screenshots/special-dates-dashboard-page.png',
      fullPage: true
    });
    console.log('✓ Page screenshot saved');

    // Get page content to see what's rendered
    console.log('\n=== STEP 4: Analyzing Page Content ===');
    const bodyText = await page.locator('body').innerText();
    console.log('Page body text preview (first 500 chars):');
    console.log(bodyText.substring(0, 500));

    // Check for specific elements
    const pageTitle = await page.locator('h1').first().textContent().catch(() => null);
    console.log(`\nPage title: ${pageTitle}`);

    // Check for table or list elements
    const hasTable = await page.locator('table').count();
    const hasList = await page.locator('[role="list"]').count();
    const hasCards = await page.locator('.card, [class*="card"]').count();

    console.log(`\nElements found:`);
    console.log(`- Tables: ${hasTable}`);
    console.log(`- Lists: ${hasList}`);
    console.log(`- Cards: ${hasCards}`);

    // Check for "No data" or empty state messages
    const emptyStateText = await page.locator('text=/nenhum|vazio|empty|no.*found/i').first().textContent().catch(() => null);
    if (emptyStateText) {
      console.log(`\n⚠️  Empty state message found: "${emptyStateText}"`);
    }

    // Print all collected console messages
    console.log('\n=== STEP 5: Console Messages Summary ===');
    console.log(`\nTotal console messages captured: ${consoleMessages.length}\n`);

    // Categorize messages
    const messagesByType = consoleMessages.reduce((acc, msg) => {
      acc[msg.type] = acc[msg.type] || [];
      acc[msg.type].push(msg);
      return acc;
    }, {} as Record<string, typeof consoleMessages>);

    // Print errors first (most important)
    if (messagesByType['error']) {
      console.log(`\n🔴 ERRORS (${messagesByType['error'].length}):`);
      messagesByType['error'].forEach(msg => {
        console.log(`   ${msg.text}`);
      });
    }

    // Print warnings
    if (messagesByType['warning']) {
      console.log(`\n⚠️  WARNINGS (${messagesByType['warning'].length}):`);
      messagesByType['warning'].forEach(msg => {
        console.log(`   ${msg.text}`);
      });
    }

    // Print debug/log messages related to special dates
    const relevantLogs = consoleMessages.filter(msg =>
      msg.type === 'log' &&
      (msg.text.toLowerCase().includes('client') ||
       msg.text.toLowerCase().includes('special') ||
       msg.text.toLowerCase().includes('date') ||
       msg.text.toLowerCase().includes('fetch') ||
       msg.text.toLowerCase().includes('transform'))
    );

    if (relevantLogs.length > 0) {
      console.log(`\n📋 RELEVANT DEBUG LOGS (${relevantLogs.length}):`);
      relevantLogs.forEach(msg => {
        console.log(`   ${msg.text}`);
      });
    } else {
      console.log(`\n⚠️  NO RELEVANT DEBUG LOGS FOUND`);
      console.log('   This might indicate that debug logging is not enabled in the component');
    }

    // Print all other logs for completeness
    const otherLogs = consoleMessages.filter(msg =>
      msg.type === 'log' && !relevantLogs.includes(msg)
    );

    if (otherLogs.length > 0) {
      console.log(`\n📝 OTHER LOGS (${otherLogs.length}):`);
      otherLogs.forEach(msg => {
        console.log(`   ${msg.text}`);
      });
    }

    // Check network requests
    console.log('\n=== STEP 6: Checking Network Activity ===');

    // Wait for any pending requests
    await page.waitForTimeout(2000);

    console.log('\n=== DEBUG SESSION COMPLETE ===');

    // Create a summary report
    const report = {
      timestamp: new Date().toISOString(),
      url: page.url(),
      pageTitle,
      elementsFound: { tables: hasTable, lists: hasList, cards: hasCards },
      emptyStateMessage: emptyStateText,
      consoleMessages: {
        total: consoleMessages.length,
        byType: Object.keys(messagesByType).map(type => ({
          type,
          count: messagesByType[type].length
        })),
        errors: messagesByType['error']?.map(m => m.text) || [],
        relevantLogs: relevantLogs.map(m => m.text)
      }
    };

    console.log('\n=== SUMMARY REPORT ===');
    console.log(JSON.stringify(report, null, 2));

    // Save report to file
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/gabrielaraujo/projects/momentocake/admin/tests/special-dates-debug-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n✓ Report saved to tests/special-dates-debug-report.json');
  });
});
