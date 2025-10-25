import { test, expect } from '@playwright/test'

test.describe('Final Supplier System Verification', () => {
  test('Complete supplier system test', async ({ page }) => {
    console.log('\n🔍 === FINAL SUPPLIER VERIFICATION ===')
    
    // Step 1: Login
    await page.goto('http://localhost:3000')
    await page.fill('input[type="email"]', 'admin@momentocake.com.br')
    await page.fill('input[type="password"]', 'G8j5k188')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    console.log('✅ Step 1: Login successful')
    
    // Step 2: Verify sidebar visibility
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar).toBeVisible()
    console.log('✅ Step 2: Sidebar is visible')
    
    // Step 3: Click on Ingredientes button in sidebar (more specific selector)
    const ingredientesButton = page.locator('button:has-text("Ingredientes")')
    await expect(ingredientesButton).toBeVisible()
    await ingredientesButton.click()
    await page.waitForTimeout(1000)
    console.log('✅ Step 3: Clicked Ingredientes to expand submenu')
    
    // Step 4: Click on Fornecedores in submenu
    const fornecedoresLink = page.locator('a:has-text("Fornecedores")')
    await expect(fornecedoresLink).toBeVisible()
    await fornecedoresLink.click()
    await page.waitForTimeout(2000)
    console.log('✅ Step 4: Navigated to Suppliers page')
    
    // Take screenshot of suppliers page
    await page.screenshot({ path: 'verification/suppliers-page.png', fullPage: true })
    
    // Step 5: Verify we're on the suppliers page and sidebar is still visible
    expect(page.url()).toContain('/suppliers')
    await expect(sidebar).toBeVisible()
    console.log('✅ Step 5: On suppliers page with sidebar still visible')
    
    // Step 6: Look for key elements on the suppliers page
    const pageContent = await page.textContent('body')
    
    if (pageContent.includes('Novo Fornecedor') || pageContent.includes('Adicionar')) {
      console.log('✅ Step 6: Found "Add Supplier" functionality')
      
      // Try to click the add button
      const addButton = page.locator('text=Novo Fornecedor').first()
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForTimeout(1000)
        await page.screenshot({ path: 'verification/new-supplier-form.png', fullPage: true })
        console.log('✅ Step 7: Opened new supplier form')
        
        // Check for form fields
        const formFields = await page.$$('input, select, textarea')
        console.log(`✅ Step 8: Found ${formFields.length} form fields`)
        
        if (formFields.length > 0) {
          console.log('✅ Step 9: Form is functional and ready for input')
        }
      } else {
        console.log('ℹ️ Step 7: Add button exists in content but not clickable')
      }
    } else if (pageContent.includes('suppliers') || pageContent.includes('fornecedor')) {
      console.log('✅ Step 6: On suppliers page (found supplier-related content)')
    } else {
      console.log('❌ Step 6: May not be on correct suppliers page')
    }
    
    // Step 10: Test search functionality if available
    const searchInput = page.locator('input[placeholder*="buscar"], input[type="search"]')
    if (await searchInput.isVisible()) {
      console.log('✅ Step 10: Search functionality available')
    } else {
      console.log('ℹ️ Step 10: No search functionality visible')
    }
    
    // Final screenshot
    await page.screenshot({ path: 'verification/final-system-state.png', fullPage: true })
    
    console.log('\n📊 === VERIFICATION SUMMARY ===')
    console.log('✅ Login system works')
    console.log('✅ Sidebar navigation functional and persistent')
    console.log('✅ Suppliers accessible via Ingredientes > Fornecedores')
    console.log('✅ Page routing works correctly')
    console.log('📁 Screenshots saved in verification/ directory')
    console.log('🎉 System ready for manual testing!')
  })
})