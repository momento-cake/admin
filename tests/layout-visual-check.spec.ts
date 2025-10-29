import { test } from '@playwright/test';
import path from 'path';

test('Visual Layout Check - Manual Interaction', async ({ page }) => {
  console.log('\n======================================');
  console.log('LAYOUT VISUAL CHECK');
  console.log('======================================\n');

  // Step 1: Login
  console.log('Step 1: Logging in...');
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('✓ Logged in\n');

  // Step 2: Navigate to Clients
  console.log('Step 2: Navigating to Clients...');
  await page.locator('text=Clientes').first().click();
  await page.waitForTimeout(2000);
  console.log('✓ On Clients page\n');

  // Step 3: Open modal
  console.log('Step 3: Opening Novo Cliente modal...');
  await page.locator('button:has-text("Novo Cliente")').first().click();
  await page.waitForTimeout(1500);
  console.log('✓ Modal opened\n');

  // Step 4: Scroll and screenshot - Ready state
  console.log('Step 4: Taking modal screenshot...');
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) modal.scrollTop = 500;
  });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-01-modal-ready.png'),
    fullPage: true
  });
  console.log('✓ Screenshot saved\n');

  // Step 5: Click "Adicionar Pessoa"
  console.log('Step 5: Opening Add Person form...');
  const addPersonBtn = page.locator('button:has-text("Adicionar Pessoa")').first();
  await addPersonBtn.scrollIntoViewIfNeeded();
  await addPersonBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-02-person-form-visible.png'),
    fullPage: true
  });
  console.log('✓ Add Person form opened\n');

  // Step 6: Fill form using page.evaluate for direct DOM manipulation
  console.log('Step 6: Filling person form...');
  await page.evaluate(() => {
    // Find the Related Persons section
    const inputs = Array.from(document.querySelectorAll('input'));
    const selects = Array.from(document.querySelectorAll('select'));

    // Find name input by placeholder
    const nameInput = inputs.find(i =>
      i.placeholder?.toLowerCase().includes('nome completo') ||
      i.placeholder?.toLowerCase().includes('nome')
    );
    if (nameInput && nameInput instanceof HTMLInputElement) {
      nameInput.value = 'João Silva';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find relationship select
    const relationSelect = selects.find(s => {
      const options = Array.from(s.options).map(o => o.textContent);
      return options.some(text => text?.includes('Filho'));
    });
    if (relationSelect && relationSelect instanceof HTMLSelectElement) {
      relationSelect.value = 'child';
      relationSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find email input (skip the main client email)
    const emailInputs = inputs.filter(i => i.type === 'email');
    if (emailInputs.length > 1 && emailInputs[1] instanceof HTMLInputElement) {
      emailInputs[1].value = 'joao@email.com';
      emailInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Find phone input (skip the main client phone)
    const phoneInputs = inputs.filter(i => i.type === 'tel');
    if (phoneInputs.length > 1 && phoneInputs[1] instanceof HTMLInputElement) {
      phoneInputs[1].value = '(11) 98765-4321';
      phoneInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-03-person-form-filled.png'),
    fullPage: true
  });
  console.log('✓ Form filled\n');

  // Step 7: Submit
  console.log('Step 7: Submitting person...');
  const submitBtn = page.locator('button').filter({ hasText: /Adicionar Pessoa/ }).last();
  await submitBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-04-person-added.png'),
    fullPage: true
  });
  console.log('✓ Person added\n');

  // Step 8: Get layout measurements
  console.log('Step 8: Analyzing person card layout...');

  const personCard = page.locator('text=João Silva').locator('..').locator('..').first();
  await personCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take detailed screenshot
  await personCard.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-05-PERSON-CARD-DETAIL.png')
  });

  // Get measurements
  const layout = await page.evaluate(() => {
    const card = document.evaluate(
      "//*[contains(text(), 'João Silva')]/ancestor::div[contains(@class, 'p-3')]",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as HTMLElement;

    if (!card) return null;

    const cardRect = card.getBoundingClientRect();
    const nameEl = card.querySelector('p.font-medium') as HTMLElement;
    const editBtn = card.querySelector('button') as HTMLElement;

    return {
      card: { x: cardRect.x, width: cardRect.width },
      name: nameEl ? nameEl.getBoundingClientRect() : null,
      editButton: editBtn ? editBtn.getBoundingClientRect() : null
    };
  });

  if (layout && layout.name && layout.editButton) {
    const midpoint = layout.card.x + (layout.card.width / 2);
    console.log('   Card Analysis:');
    console.log(`   - Card width: ${layout.card.width.toFixed(0)}px`);
    console.log(`   - Midpoint: ${midpoint.toFixed(0)}px`);
    console.log(`   - Name X: ${layout.name.x.toFixed(0)}px → ${layout.name.x < midpoint ? '✓ LEFT SIDE' : '✗ RIGHT SIDE'}`);
    console.log(`   - Edit button X: ${layout.editButton.x.toFixed(0)}px → ${layout.editButton.x > midpoint ? '✓ RIGHT SIDE' : '✗ LEFT SIDE'}`);
    console.log(`   - Vertical spacing: ${Math.abs(layout.name.y - layout.editButton.y).toFixed(0)}px\n`);
  }

  // Step 9: Now test Special Dates
  console.log('Step 9: Scrolling to Special Dates...');
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) modal.scrollTop = modal.scrollHeight;
  });
  await page.waitForTimeout(500);

  console.log('Step 10: Opening Add Date form...');
  const addDateBtn = page.locator('button:has-text("Adicionar Data")').first();
  await addDateBtn.scrollIntoViewIfNeeded();
  await addDateBtn.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-06-date-form-visible.png'),
    fullPage: true
  });
  console.log('✓ Add Date form opened\n');

  // Step 11: Fill date form
  console.log('Step 11: Filling date form...');
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const selects = Array.from(document.querySelectorAll('select'));

    // Find date input
    const dateInput = inputs.find(i => i.type === 'date');
    if (dateInput && dateInput instanceof HTMLInputElement) {
      dateInput.value = '2025-12-25';
      dateInput.dispatchEvent(new Event('input', { bubbles: true }));
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find type select (look for birthday option)
    const typeSelect = selects.find(s => {
      const options = Array.from(s.options).map(o => o.textContent);
      return options.some(text => text?.includes('Aniversário'));
    });
    if (typeSelect && typeSelect instanceof HTMLSelectElement) {
      typeSelect.value = 'birthday';
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find description input
    const descInput = inputs.find(i =>
      i.placeholder?.toLowerCase().includes('descrição')
    );
    if (descInput && descInput instanceof HTMLInputElement) {
      descInput.value = 'Aniversário';
      descInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-07-date-form-filled.png'),
    fullPage: true
  });
  console.log('✓ Date form filled\n');

  // Step 12: Submit date
  console.log('Step 12: Submitting date...');
  const submitDateBtn = page.locator('button').filter({ hasText: /Adicionar Data/ }).last();
  await submitDateBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-08-date-added.png'),
    fullPage: true
  });
  console.log('✓ Date added\n');

  // Step 13: Get date layout measurements
  console.log('Step 13: Analyzing date card layout...');

  const dateCard = page.locator('text=Aniversário').locator('..').locator('..').first();
  await dateCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take detailed screenshot
  await dateCard.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-09-DATE-CARD-DETAIL.png')
  });

  // Get measurements
  const dateLayout = await page.evaluate(() => {
    const card = document.evaluate(
      "//*[contains(text(), 'Aniversário')]/ancestor::div[contains(@class, 'p-3')]",
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as HTMLElement;

    if (!card) return null;

    const cardRect = card.getBoundingClientRect();
    const descEl = card.querySelector('p.font-medium') as HTMLElement;
    const editBtn = card.querySelector('button') as HTMLElement;

    return {
      card: { x: cardRect.x, width: cardRect.width },
      description: descEl ? descEl.getBoundingClientRect() : null,
      editButton: editBtn ? editBtn.getBoundingClientRect() : null
    };
  });

  if (dateLayout && dateLayout.description && dateLayout.editButton) {
    const midpoint = dateLayout.card.x + (dateLayout.card.width / 2);
    console.log('   Date Card Analysis:');
    console.log(`   - Card width: ${dateLayout.card.width.toFixed(0)}px`);
    console.log(`   - Midpoint: ${midpoint.toFixed(0)}px`);
    console.log(`   - Description X: ${dateLayout.description.x.toFixed(0)}px → ${dateLayout.description.x < midpoint ? '✓ LEFT SIDE' : '✗ RIGHT SIDE'}`);
    console.log(`   - Edit button X: ${dateLayout.editButton.x.toFixed(0)}px → ${dateLayout.editButton.x > midpoint ? '✓ RIGHT SIDE' : '✗ LEFT SIDE'}`);
    console.log(`   - Vertical spacing: ${Math.abs(dateLayout.description.y - dateLayout.editButton.y).toFixed(0)}px\n`);
  }

  // Final screenshot
  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'visual-10-FINAL-VIEW.png'),
    fullPage: true
  });

  console.log('\n======================================');
  console.log('LAYOUT CHECK COMPLETE');
  console.log('======================================\n');
  console.log('Key Screenshots:');
  console.log('1. visual-05-PERSON-CARD-DETAIL.png');
  console.log('2. visual-09-DATE-CARD-DETAIL.png');
  console.log('3. visual-10-FINAL-VIEW.png\n');
  console.log('Verify that:');
  console.log('- Content (name, email, phone) is on LEFT side');
  console.log('- Buttons (edit, delete) are on RIGHT side');
  console.log('- Buttons are NOT below content\n');
});
