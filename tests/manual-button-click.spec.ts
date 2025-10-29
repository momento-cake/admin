import { test, expect } from '@playwright/test';

test.describe('Manual Button Click Test', () => {
  test('directly manipulate React state', async ({ page }) => {
    console.log('Step 1: Login and open modal');
    await page.goto('http://localhost:3002/login');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto('http://localhost:3002/clients');
    await page.waitForTimeout(2000);

    await page.click('button:has-text("Novo Cliente")');
    await page.waitForTimeout(1500);

    console.log('Step 2: Try clicking with JavaScript click()');

    // Method 1: Playwright click (what we've been doing)
    const button1 = page.locator('button:has-text("Adicionar Pessoa")').first();
    await button1.scrollIntoViewIfNeeded();
    await button1.click();
    await page.waitForTimeout(2000);

    let formVisible = await page.locator('input[placeholder*="Nome completo"]').isVisible().catch(() => false);
    console.log(`After Playwright click: Form visible = ${formVisible}`);

    if (!formVisible) {
      console.log('Step 3: Try with JavaScript dispatchEvent');

      // Method 2: Use JavaScript to click
      await page.evaluate(() => {
        const button = document.querySelector('button');
        const buttons = Array.from(document.querySelectorAll('button'));
        const adicionarButton = buttons.find(b => b.textContent?.includes('Adicionar Pessoa'));

        console.log('Found button:', !!adicionarButton);

        if (adicionarButton) {
          // Try different click methods
          adicionarButton.click(); // Direct click
        }
      });

      await page.waitForTimeout(2000);
      formVisible = await page.locator('input[placeholder*="Nome completo"]').isVisible().catch(() => false);
      console.log(`After JavaScript click: Form visible = ${formVisible}`);
    }

    if (!formVisible) {
      console.log('Step 4: Check if component is receiving props correctly');

      const debugInfo = await page.evaluate(() => {
        // Find the Related Persons section
        const section = Array.from(document.querySelectorAll('h3')).find(h =>
          h.textContent?.includes('Pessoas Relacionadas')
        );

        if (!section) return { found: false };

        // Get parent container
        const container = section.closest('div');

        return {
          found: true,
          sectionHTML: container?.innerHTML.substring(0, 500),
          buttonCount: container?.querySelectorAll('button').length || 0
        };
      });

      console.log('Debug info:', debugInfo);
    }

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/manual-click-test.png',
      fullPage: true
    });

    console.log(`\nFinal result: Form ${formVisible ? 'DID' : 'DID NOT'} appear`);
  });
});
