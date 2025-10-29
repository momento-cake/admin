import { test } from '@playwright/test';
import path from 'path';

test('Manual Layout Test - Take Screenshots Only', async ({ page }) => {
  console.log('\n=== MANUAL LAYOUT TEST ===\n');

  // Login
  console.log('1. Logging in...');
  await page.goto('http://localhost:4000/login');
  await page.fill('input[type="email"]', 'admin@momentocake.com.br');
  await page.fill('input[type="password"]', 'G8j5k188');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  console.log('   ✓ Logged in\n');

  // Navigate to Clients
  console.log('2. Opening Clients page...');
  await page.locator('text=Clientes').first().click();
  await page.waitForTimeout(2000);
  console.log('   ✓ On Clients page\n');

  // Open modal
  console.log('3. Opening Novo Cliente modal...');
  await page.locator('button:has-text("Novo Cliente")').first().click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-01-modal-opened.png'),
    fullPage: true
  });
  console.log('   ✓ Modal opened (screenshot saved)\n');

  // Scroll to see Related Persons section
  console.log('4. Scrolling to Related Persons section...');
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      modal.scrollTop = 500;
    }
  });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-02-scrolled.png'),
    fullPage: true
  });
  console.log('   ✓ Scrolled (screenshot saved)\n');

  // Click "Adicionar Pessoa"
  console.log('5. Clicking "Adicionar Pessoa"...');
  const addButton = page.locator('button:has-text("Adicionar Pessoa")').first();
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-03-add-person-form.png'),
    fullPage: true
  });
  console.log('   ✓ Add person form visible (screenshot saved)\n');

  // Fill form - use simple selectors
  console.log('6. Filling person form...');

  // Find inputs by type and visible text
  const inputs = await page.locator('input[type="text"]').all();
  if (inputs.length > 0) {
    // First text input should be name
    await inputs[0].fill('João Silva');
  }

  // Select relationship
  const selects = await page.locator('select').all();
  if (selects.length > 0) {
    await selects[0].selectOption('child');
  }

  // Fill email
  const emailInputs = await page.locator('input[type="email"]').all();
  if (emailInputs.length > 1) {
    // Second email input (first is client email)
    await emailInputs[1].fill('joao@email.com');
  }

  // Fill phone
  const telInputs = await page.locator('input[type="tel"]').all();
  if (telInputs.length > 1) {
    // Second tel input (first is client phone)
    await telInputs[1].fill('(11) 98765-4321');
  }

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-04-form-filled.png'),
    fullPage: true
  });
  console.log('   ✓ Form filled (screenshot saved)\n');

  // Submit form
  console.log('7. Submitting person...');
  const submitButton = page.locator('button').filter({ hasText: /Adicionar Pessoa/ }).last();
  await submitButton.click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-05-person-added.png'),
    fullPage: true
  });
  console.log('   ✓ Person added (screenshot saved)\n');

  // Scroll to see the added person
  console.log('8. Focusing on added person...');
  const personCard = page.locator('text=João Silva').locator('..').locator('..');
  await personCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take detailed screenshot
  await personCard.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-06-person-card-detail.png')
  });
  console.log('   ✓ Person card detail (screenshot saved)\n');

  // Check button positions
  console.log('9. Analyzing layout...');
  const cardBox = await personCard.boundingBox();
  const nameElement = page.locator('text=João Silva').first();
  const nameBox = await nameElement.boundingBox();
  const editButton = personCard.locator('button').first();
  const editBox = await editButton.boundingBox();

  if (cardBox && nameBox && editBox) {
    const midpoint = cardBox.x + (cardBox.width / 2);
    console.log(`   Card width: ${cardBox.width}px`);
    console.log(`   Midpoint: ${midpoint}px`);
    console.log(`   Name position: ${nameBox.x}px (${nameBox.x < midpoint ? 'LEFT ✓' : 'RIGHT ✗'})`);
    console.log(`   Edit button position: ${editBox.x}px (${editBox.x > midpoint ? 'RIGHT ✓' : 'LEFT ✗'})`);
    console.log(`   Vertical alignment: ${Math.abs(nameBox.y - editBox.y)}px difference`);
  }
  console.log();

  // Now test Special Dates
  console.log('10. Scrolling to Special Dates section...');
  await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      modal.scrollTop = modal.scrollHeight;
    }
  });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-07-special-dates-section.png'),
    fullPage: true
  });
  console.log('    ✓ Special Dates section (screenshot saved)\n');

  // Click "Adicionar Data"
  console.log('11. Clicking "Adicionar Data"...');
  const addDateButton = page.locator('button:has-text("Adicionar Data")').first();
  await addDateButton.scrollIntoViewIfNeeded();
  await addDateButton.click();
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-08-add-date-form.png'),
    fullPage: true
  });
  console.log('    ✓ Add date form visible (screenshot saved)\n');

  // Fill date form
  console.log('12. Filling date form...');
  const dateInputs = await page.locator('input[type="date"]').all();
  if (dateInputs.length > 0) {
    await dateInputs[0].fill('2025-12-25');
  }

  const dateSelects = await page.locator('select').all();
  for (const select of dateSelects) {
    const options = await select.locator('option').allTextContents();
    if (options.some(opt => opt.includes('Aniversário'))) {
      await select.selectOption('birthday');
      break;
    }
  }

  const textInputs = await page.locator('input[type="text"]').all();
  for (const input of textInputs) {
    const placeholder = await input.getAttribute('placeholder');
    if (placeholder?.toLowerCase().includes('descrição')) {
      await input.fill('Aniversário');
      break;
    }
  }

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-09-date-form-filled.png'),
    fullPage: true
  });
  console.log('    ✓ Date form filled (screenshot saved)\n');

  // Submit date
  console.log('13. Submitting date...');
  const submitDateButton = page.locator('button').filter({ hasText: /Adicionar Data/ }).last();
  await submitDateButton.click();
  await page.waitForTimeout(1500);

  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-10-date-added.png'),
    fullPage: true
  });
  console.log('    ✓ Date added (screenshot saved)\n');

  // Scroll to see the added date
  console.log('14. Focusing on added date...');
  const dateCard = page.locator('text=Aniversário').locator('..').locator('..');
  await dateCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Take detailed screenshot
  await dateCard.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-11-date-card-detail.png')
  });
  console.log('    ✓ Date card detail (screenshot saved)\n');

  // Check date button positions
  console.log('15. Analyzing date layout...');
  const dateCardBox = await dateCard.boundingBox();
  const descElement = page.locator('text=Aniversário').first();
  const descBox = await descElement.boundingBox();
  const editDateButton = dateCard.locator('button').first();
  const editDateBox = await editDateButton.boundingBox();

  if (dateCardBox && descBox && editDateBox) {
    const midpoint = dateCardBox.x + (dateCardBox.width / 2);
    console.log(`    Card width: ${dateCardBox.width}px`);
    console.log(`    Midpoint: ${midpoint}px`);
    console.log(`    Description position: ${descBox.x}px (${descBox.x < midpoint ? 'LEFT ✓' : 'RIGHT ✗'})`);
    console.log(`    Edit button position: ${editDateBox.x}px (${editDateBox.x > midpoint ? 'RIGHT ✓' : 'LEFT ✗'})`);
    console.log(`    Vertical alignment: ${Math.abs(descBox.y - editDateBox.y)}px difference`);
  }
  console.log();

  // Final full view
  console.log('16. Taking final full view...');
  await page.screenshot({
    path: path.join(__dirname, 'screenshots', 'manual-12-final-full-view.png'),
    fullPage: true
  });
  console.log('    ✓ Final view (screenshot saved)\n');

  console.log('=== TEST COMPLETE ===\n');
  console.log('All screenshots saved to tests/screenshots/\n');
  console.log('Review the following screenshots:');
  console.log('- manual-06-person-card-detail.png (Person layout)');
  console.log('- manual-11-date-card-detail.png (Date layout)');
  console.log();
});
