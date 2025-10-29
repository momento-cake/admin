import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Client Modal Layout - Simple Test', () => {
  test('Verify layout alignment - content left, buttons right', async ({ page }) => {
    console.log('=== CLIENT MODAL LAYOUT VERIFICATION ===\n');

    // Step 1: Login
    console.log('Step 1: Login');
    await page.goto('http://localhost:4000/login');
    await page.fill('input[type="email"]', 'admin@momentocake.com.br');
    await page.fill('input[type="password"]', 'G8j5k188');
    await page.click('button[type="submit"]');

    // Wait for dashboard - more flexible wait
    await page.waitForTimeout(3000);

    // Take screenshot of dashboard
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-01-dashboard.png'),
      fullPage: true
    });
    console.log('✓ Logged in and on dashboard\n');

    // Step 2: Navigate to Clients
    console.log('Step 2: Navigate to Clients');

    // Click on Clientes in sidebar
    const clientesLink = page.locator('text=Clientes').first();
    await clientesLink.click();
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-02-clients-page.png'),
      fullPage: true
    });
    console.log('✓ On clients page\n');

    // Step 3: Open Novo Cliente modal
    console.log('Step 3: Open Novo Cliente modal');

    const novoClienteButton = page.locator('button:has-text("Novo Cliente"), button:has-text("Adicionar Cliente")').first();
    await novoClienteButton.click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-03-modal-opened.png'),
      fullPage: true
    });
    console.log('✓ Modal opened\n');

    // Step 4: Add Related Person
    console.log('Step 4: Add Related Person');

    // Scroll to related persons section
    const relatedPersonsSection = page.locator('text=Pessoas Relacionadas').first();
    await relatedPersonsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Click "Adicionar Pessoa"
    const addPersonButton = page.locator('button:has-text("Adicionar Pessoa")').first();
    await addPersonButton.click();
    await page.waitForTimeout(500);

    // Fill person details
    const personForm = page.locator('[data-section="related-persons"]').first();
    await personForm.locator('input[placeholder*="nome"], input[name="name"]').fill('João Silva');
    await personForm.locator('select[name="relationship"]').selectOption('child');
    await personForm.locator('input[placeholder*="email"], input[name="email"]').fill('joao@email.com');
    await personForm.locator('input[placeholder*="telefone"], input[name="phone"]').fill('(11) 98765-4321');

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-04-person-form-filled.png'),
      fullPage: true
    });

    // Submit person
    const submitPersonButton = page.locator('button:has-text("Adicionar Pessoa")').last();
    await submitPersonButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-05-person-added.png'),
      fullPage: true
    });
    console.log('✓ Person added\n');

    // Step 5: Verify Person Layout
    console.log('Step 5: Verify Person Layout');

    // Find the person item
    const personItem = page.locator('text=João Silva').locator('..').first();

    // Scroll to item
    await personItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get bounding box
    const itemBox = await personItem.boundingBox();

    if (itemBox) {
      console.log(`Person item box: x=${itemBox.x}, y=${itemBox.y}, width=${itemBox.width}, height=${itemBox.height}`);

      // Find content and buttons
      const nameText = personItem.locator('text=João Silva');
      const editButton = personItem.locator('button').filter({ hasText: '✏️' }).or(personItem.locator('button[aria-label*="Editar"]')).first();
      const deleteButton = personItem.locator('button').filter({ hasText: '🗑️' }).or(personItem.locator('button[aria-label*="Excluir"]')).first();

      const nameBox = await nameText.boundingBox();
      const editBox = await editButton.boundingBox();

      if (nameBox && editBox) {
        console.log(`Name: x=${nameBox.x}, y=${nameBox.y}`);
        console.log(`Edit button: x=${editBox.x}, y=${editBox.y}`);

        const midpoint = itemBox.x + (itemBox.width / 2);
        console.log(`Item midpoint: ${midpoint}`);

        const contentOnLeft = nameBox.x < midpoint;
        const buttonsOnRight = editBox.x > midpoint;
        const verticallyAligned = Math.abs(nameBox.y - editBox.y) < 50;

        console.log(`✓ Content on left: ${contentOnLeft}`);
        console.log(`✓ Buttons on right: ${buttonsOnRight}`);
        console.log(`✓ Vertically aligned: ${verticallyAligned}`);
        console.log(`✓ Y-axis difference: ${Math.abs(nameBox.y - editBox.y)}px\n`);

        expect(contentOnLeft, 'Content should be on the left').toBeTruthy();
        expect(buttonsOnRight, 'Buttons should be on the right').toBeTruthy();
        expect(verticallyAligned, 'Buttons should not be below content').toBeTruthy();
      }
    }

    // Take detailed screenshot of person item
    await personItem.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-06-person-detail.png')
    });

    // Step 6: Add Special Date
    console.log('Step 6: Add Special Date');

    // Scroll to special dates section
    const specialDatesSection = page.locator('text=Datas Especiais').first();
    await specialDatesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Click "Adicionar Data"
    const addDateButton = page.locator('button:has-text("Adicionar Data")').first();
    await addDateButton.click();
    await page.waitForTimeout(500);

    // Fill date details
    const dateForm = page.locator('[data-section="special-dates"]').first();
    await dateForm.locator('input[type="date"]').fill('2025-12-25');
    await dateForm.locator('select[name="type"]').selectOption('birthday');
    await dateForm.locator('input[placeholder*="descrição"], input[name="description"]').fill('Aniversário');

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-07-date-form-filled.png'),
      fullPage: true
    });

    // Submit date
    const submitDateButton = page.locator('button:has-text("Adicionar Data")').last();
    await submitDateButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-08-date-added.png'),
      fullPage: true
    });
    console.log('✓ Date added\n');

    // Step 7: Verify Date Layout
    console.log('Step 7: Verify Date Layout');

    // Find the date item
    const dateItem = page.locator('text=Aniversário').locator('..').first();

    // Scroll to item
    await dateItem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Get bounding box
    const dateItemBox = await dateItem.boundingBox();

    if (dateItemBox) {
      console.log(`Date item box: x=${dateItemBox.x}, y=${dateItemBox.y}, width=${dateItemBox.width}, height=${dateItemBox.height}`);

      // Find content and buttons
      const descText = dateItem.locator('text=Aniversário');
      const editDateButton = dateItem.locator('button').filter({ hasText: '✏️' }).or(dateItem.locator('button[aria-label*="Editar"]')).first();

      const descBox = await descText.boundingBox();
      const editDateBox = await editDateButton.boundingBox();

      if (descBox && editDateBox) {
        console.log(`Description: x=${descBox.x}, y=${descBox.y}`);
        console.log(`Edit button: x=${editDateBox.x}, y=${editDateBox.y}`);

        const midpoint = dateItemBox.x + (dateItemBox.width / 2);
        console.log(`Item midpoint: ${midpoint}`);

        const contentOnLeft = descBox.x < midpoint;
        const buttonsOnRight = editDateBox.x > midpoint;
        const verticallyAligned = Math.abs(descBox.y - editDateBox.y) < 50;

        console.log(`✓ Content on left: ${contentOnLeft}`);
        console.log(`✓ Buttons on right: ${buttonsOnRight}`);
        console.log(`✓ Vertically aligned: ${verticallyAligned}`);
        console.log(`✓ Y-axis difference: ${Math.abs(descBox.y - editDateBox.y)}px\n`);

        expect(contentOnLeft, 'Date content should be on the left').toBeTruthy();
        expect(buttonsOnRight, 'Date buttons should be on the right').toBeTruthy();
        expect(verticallyAligned, 'Date buttons should not be below content').toBeTruthy();
      }
    }

    // Take detailed screenshot of date item
    await dateItem.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-09-date-detail.png')
    });

    // Final screenshot
    await page.screenshot({
      path: path.join(__dirname, 'screenshots', 'simple-10-final-view.png'),
      fullPage: true
    });

    console.log('=== LAYOUT VERIFICATION COMPLETE ===');
  });
});
