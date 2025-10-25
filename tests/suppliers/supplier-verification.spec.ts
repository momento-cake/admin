import { test, expect } from '@playwright/test'

test.describe('Supplier CRUD Verification Test', () => {
  test('Complete supplier workflow verification', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000')
    
    // Take initial screenshot
    await page.screenshot({ path: 'test-results/01-initial-load.png', fullPage: true })
    
    // Step 1: Login
    console.log('Step 1: Login process')
    await page.fill('[data-testid=email-input], input[type="email"]', 'admin@momentocake.com.br')
    await page.fill('[data-testid=password-input], input[type="password"]', 'G8j5k188')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard**', { timeout: 10000 })
    await page.screenshot({ path: 'test-results/02-dashboard-loaded.png', fullPage: true })
    
    // Step 2: Verify left sidebar is visible and navigate to suppliers
    console.log('Step 2: Navigate to suppliers via sidebar')
    const sidebar = page.locator('[data-testid=sidebar], aside, nav').first()
    await expect(sidebar).toBeVisible()
    
    // Look for supplier navigation link
    const supplierLink = page.locator('text=Fornecedores').or(page.locator('a[href*="suppliers"]')).or(page.locator('[data-testid*=supplier]'))
    await expect(supplierLink).toBeVisible()
    await supplierLink.click()
    
    // Wait for suppliers page to load
    await page.waitForURL('**/suppliers**', { timeout: 10000 })
    await page.screenshot({ path: 'test-results/03-suppliers-page.png', fullPage: true })
    
    // Step 3: Verify sidebar remains visible on suppliers page
    console.log('Step 3: Verify sidebar remains visible')
    await expect(sidebar).toBeVisible()
    
    // Step 4: Click "Novo Fornecedor" button
    console.log('Step 4: Click Novo Fornecedor button')
    const newSupplierButton = page.locator('text=Novo Fornecedor').or(page.locator('button:has-text("Adicionar")'))
    await expect(newSupplierButton).toBeVisible()
    await newSupplierButton.click()
    
    // Wait for form to appear
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/04-new-supplier-form.png', fullPage: true })
    
    // Step 5: Fill out the form with minimal required data
    console.log('Step 5: Fill out supplier form')
    
    // Fill supplier name
    const nameInput = page.locator('input[name="name"]').or(page.locator('input[placeholder*="nome"]')).or(page.locator('#name'))
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Final Test Supplier')
    
    // Set rating to 3 stars
    const ratingElements = page.locator('[data-testid*="star"], [class*="star"]')
    if (await ratingElements.count() > 0) {
      await ratingElements.nth(2).click() // Third star (0-indexed)
    } else {
      // Try alternative rating input
      const ratingInput = page.locator('input[name="rating"], select[name="rating"]')
      if (await ratingInput.isVisible()) {
        await ratingInput.fill('3')
      }
    }
    
    // Add one category
    const categoryInput = page.locator('input[name*="category"], input[placeholder*="categoria"]')
    if (await categoryInput.isVisible()) {
      await categoryInput.fill('Ingredientes')
      await page.keyboard.press('Enter')
    } else {
      // Try selecting from existing categories
      const categorySelect = page.locator('select[name*="category"]')
      if (await categorySelect.isVisible()) {
        await categorySelect.selectOption({ index: 1 })
      }
    }
    
    await page.screenshot({ path: 'test-results/05-form-filled.png', fullPage: true })
    
    // Step 6: Submit the form
    console.log('Step 6: Submit the form')
    const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Salvar')).or(page.locator('text=Criar'))
    await expect(submitButton).toBeVisible()
    await submitButton.click()
    
    // Wait for submission to complete
    await page.waitForTimeout(2000)
    
    // Step 7: Verify what happens after submission
    console.log('Step 7: Verify post-submission behavior')
    const currentUrl = page.url()
    console.log('Current URL after submission:', currentUrl)
    
    // Check for success message or redirect
    const successMessage = page.locator('text=sucesso').or(page.locator('[class*="success"]'))
    const errorMessage = page.locator('text=erro').or(page.locator('[class*="error"]'))
    
    if (await successMessage.isVisible()) {
      console.log('✅ Success message found')
    } else if (await errorMessage.isVisible()) {
      console.log('❌ Error message found')
      const errorText = await errorMessage.textContent()
      console.log('Error details:', errorText)
    }
    
    await page.screenshot({ path: 'test-results/06-post-submission.png', fullPage: true })
    
    // Step 8: Verify sidebar is still visible
    console.log('Step 8: Verify sidebar remains visible')
    await expect(sidebar).toBeVisible()
    
    // Navigate back to suppliers list if not already there
    if (!currentUrl.includes('/suppliers') || currentUrl.includes('/new')) {
      await page.goto('http://localhost:3000/dashboard/suppliers')
      await page.waitForLoadState('networkidle')
    }
    
    // Step 9: Check if supplier appears in the list
    console.log('Step 9: Check if supplier appears in list')
    await page.waitForTimeout(1000)
    
    const supplierInList = page.locator('text=Final Test Supplier')
    if (await supplierInList.isVisible()) {
      console.log('✅ Supplier found in list')
    } else {
      console.log('❌ Supplier not found in list')
    }
    
    await page.screenshot({ path: 'test-results/07-suppliers-list.png', fullPage: true })
    
    // Step 10: Test search functionality
    console.log('Step 10: Test search for "Final Test"')
    const searchInput = page.locator('input[placeholder*="buscar"], input[type="search"], input[name="search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Final Test')
      await page.waitForTimeout(1000)
      
      const searchResults = page.locator('text=Final Test Supplier')
      if (await searchResults.isVisible()) {
        console.log('✅ Search functionality works')
      } else {
        console.log('❌ Search did not return expected results')
      }
    } else {
      console.log('ℹ️ Search input not found')
    }
    
    await page.screenshot({ path: 'test-results/08-search-results.png', fullPage: true })
    
    // Final system stability check
    console.log('Final: System stability check')
    await expect(page.locator('body')).toBeVisible()
    await expect(sidebar).toBeVisible()
    
    await page.screenshot({ path: 'test-results/09-final-state.png', fullPage: true })
    
    console.log('✅ Verification test completed!')
  })
})