import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const SCREENSHOT_DIR = path.join(__dirname, '../test-results/form-styling-check');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Helper function to login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('load');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

test('Detailed form field styling inspection', async ({ page }) => {
  console.log('\n=== DETAILED FORM FIELD STYLING INSPECTION ===\n');

  // Login and navigate to clients
  await login(page);
  await page.goto(`${BASE_URL}/clients`);
  await page.waitForLoadState('load');

  // Open modal
  const novoClienteButton = page.locator('button:has-text("Novo Cliente"), a:has-text("Novo Cliente")').first();
  await novoClienteButton.click();
  await page.waitForTimeout(1500);

  // Take full modal screenshot
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'modal-full.png'),
    fullPage: true
  });

  // Find ALL input elements in the modal
  const allInputs = await page.locator('[role="dialog"] input, [data-radix-dialog-content] input').all();
  console.log(`Found ${allInputs.length} input elements in modal`);

  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i];
    const isVisible = await input.isVisible().catch(() => false);

    if (isVisible) {
      console.log(`\nInput ${i + 1}:`);

      const attrs = await input.evaluate(el => ({
        type: el.getAttribute('type'),
        name: el.getAttribute('name'),
        id: el.getAttribute('id'),
        placeholder: el.getAttribute('placeholder'),
        className: el.getAttribute('class')
      }));

      console.log(`  Type: ${attrs.type}`);
      console.log(`  Name: ${attrs.name}`);
      console.log(`  ID: ${attrs.id}`);
      console.log(`  Placeholder: ${attrs.placeholder}`);
      console.log(`  Classes: ${attrs.className}`);

      const styles = await input.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          border: computed.border,
          borderColor: computed.borderColor,
          borderWidth: computed.borderWidth,
          borderRadius: computed.borderRadius,
          padding: computed.padding,
          fontSize: computed.fontSize,
          height: computed.height
        };
      });

      console.log('  Styles:');
      console.log(`    Background: ${styles.backgroundColor}`);
      console.log(`    Color: ${styles.color}`);
      console.log(`    Border: ${styles.border}`);
      console.log(`    Border radius: ${styles.borderRadius}`);
      console.log(`    Padding: ${styles.padding}`);
      console.log(`    Height: ${styles.height}`);

      // Check if background is distinct
      const isTransparent = styles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
                           styles.backgroundColor === 'transparent';
      const isWhite = styles.backgroundColor === 'rgb(255, 255, 255)';

      console.log(`    Is transparent: ${isTransparent ? 'YES' : 'NO'}`);
      console.log(`    Is white: ${isWhite ? 'YES' : 'NO'}`);
      console.log(`    Has distinct background: ${!isTransparent && !isWhite ? '✓ PASS' : '✗ FAIL'}`);

      // Take individual screenshot
      await input.screenshot({
        path: path.join(SCREENSHOT_DIR, `input-${i + 1}.png`)
      });
    }
  }

  // Get modal background color for comparison
  const modalContent = page.locator('[role="dialog"], [data-radix-dialog-content]').first();
  const modalBg = await modalContent.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return computed.backgroundColor;
  });
  console.log(`\nModal content background: ${modalBg}`);

  // Get overlay background
  const overlay = page.locator('[data-radix-dialog-overlay]').first();
  const overlayBg = await overlay.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return computed.backgroundColor;
  }).catch(() => 'Not found');
  console.log(`Modal overlay background: ${overlayBg}`);

  console.log('\n=== INSPECTION COMPLETE ===\n');
});
