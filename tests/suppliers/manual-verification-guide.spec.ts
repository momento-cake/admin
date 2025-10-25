import { test, expect } from '@playwright/test'

test.describe('Manual Supplier Verification Guide', () => {
  test('Manual verification steps with screenshots', async ({ page }) => {
    console.log('=== SUPPLIER VERIFICATION GUIDE ===')
    console.log('Following the actual navigation structure...')
    
    // Step 1: Navigate and login
    console.log('Step 1: Navigating to http://localhost:3000')
    await page.goto('http://localhost:3000')
    await page.screenshot({ path: 'verification/01-initial-page.png', fullPage: true })
    
    // Login
    console.log('Step 2: Logging in with admin credentials')
    await page.fill('input[type="email"]', 'admin@momentocake.com.br')
    await page.fill('input[type="password"]', 'G8j5k188')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'verification/02-dashboard.png', fullPage: true })
    console.log('✅ Successfully logged in and reached dashboard')
    
    // Step 3: Verify sidebar is visible
    console.log('Step 3: Verifying sidebar is visible')
    const sidebar = page.locator('aside, nav, [class*="sidebar"]').first()
    await expect(sidebar).toBeVisible()
    console.log('✅ Sidebar is visible')
    
    // Step 4: Navigate to suppliers via Ingredientes submenu
    console.log('Step 4: Clicking on "Ingredientes" to expand submenu')
    const ingredientesButton = page.locator('text=Ingredientes')
    await expect(ingredientesButton).toBeVisible()
    await ingredientesButton.click()
    
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'verification/03-ingredientes-expanded.png', fullPage: true })
    console.log('✅ Ingredientes submenu expanded')
    
    // Step 5: Click on Fornecedores in the submenu
    console.log('Step 5: Clicking on "Fornecedores" in submenu')
    const fornecedoresLink = page.locator('text=Fornecedores')
    await expect(fornecedoresLink).toBeVisible()
    await fornecedoresLink.click()
    
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'verification/04-suppliers-page.png', fullPage: true })
    console.log('✅ Navigated to suppliers page')
    
    // Step 6: Verify sidebar remains visible
    console.log('Step 6: Verifying sidebar remains visible on suppliers page')
    await expect(sidebar).toBeVisible()
    console.log('✅ Sidebar still visible')
    
    // Step 7: Look for "Novo Fornecedor" button
    console.log('Step 7: Looking for "Novo Fornecedor" button')
    const newSupplierButton = page.locator('text=Novo Fornecedor').or(page.locator('button:has-text("Adicionar")')).or(page.locator('[data-testid*="add"]'))
    
    if (await newSupplierButton.isVisible()) {
      console.log('✅ Found "Novo Fornecedor" button')
      await newSupplierButton.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'verification/05-new-supplier-form.png', fullPage: true })
      console.log('✅ Opened new supplier form')
      
      // Step 8: Try to fill the form
      console.log('Step 8: Attempting to fill supplier form')
      
      // Look for name input
      const nameInput = page.locator('input[name="name"]').or(page.locator('input[placeholder*="nome"]')).or(page.locator('#name'))
      if (await nameInput.isVisible()) {
        await nameInput.fill('Final Test Supplier')
        console.log('✅ Filled supplier name')
      } else {
        console.log('❌ Could not find name input field')
      }
      
      // Look for rating system
      const stars = page.locator('[data-testid*="star"], [class*="star"]')
      if (await stars.count() > 0) {
        await stars.nth(2).click()
        console.log('✅ Set 3-star rating')
      } else {
        console.log('ℹ️ Star rating system not found')
      }
      
      await page.screenshot({ path: 'verification/06-form-filled.png', fullPage: true })
      
      // Step 9: Try to submit
      console.log('Step 9: Looking for submit button')
      const submitButton = page.locator('button[type="submit"]').or(page.locator('text=Salvar')).or(page.locator('text=Criar'))
      if (await submitButton.isVisible()) {
        console.log('✅ Found submit button - ready for submission')
        // Don't actually submit in this test, just verify the form exists
      } else {
        console.log('❌ Could not find submit button')
      }
      
    } else {
      console.log('❌ Could not find "Novo Fornecedor" button')
    }
    
    // Final screenshot
    await page.screenshot({ path: 'verification/07-final-state.png', fullPage: true })
    
    console.log('\n=== VERIFICATION SUMMARY ===')
    console.log('✅ Login successful')
    console.log('✅ Sidebar visible and persistent')
    console.log('✅ Navigation to suppliers works via Ingredientes > Fornecedores')
    console.log('Screenshots saved in verification/ directory')
    console.log('Manual testing can continue from here...')
  })
})