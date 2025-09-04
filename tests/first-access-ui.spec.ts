import { test, expect, Page } from '@playwright/test'

/**
 * First Access Feature - UI Testing
 * 
 * Focus on UI elements, navigation, and responsive design
 * without requiring backend functionality
 */

test.describe('First Access Feature - UI Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display "Primeiro Acesso" button on login page', async ({ page }) => {
    // Check if login page loads correctly
    await expect(page.locator('text=Momento Cake')).toBeVisible()
    await expect(page.locator('text=Fazer Login')).toBeVisible()
    
    // Verify "Primeiro Acesso" button is present
    const primeiroAcessoButton = page.locator('text=Primeiro Acesso')
    await expect(primeiroAcessoButton).toBeVisible()
    
    // Check button styling and icon
    const buttonWithIcon = page.locator('button:has-text("Primeiro Acesso")')
    await expect(buttonWithIcon).toBeVisible()
  })

  test('should navigate to first access form when button is clicked', async ({ page }) => {
    await page.click('text=Primeiro Acesso')
    
    // Verify navigation to first access form
    await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
    await expect(page.locator('text=Digite seu email para verificar')).toBeVisible()
    
    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('text=Verificar Convite')).toBeVisible()
  })

  test('should show back button and navigation works', async ({ page }) => {
    await page.click('text=Primeiro Acesso')
    
    // Verify back button is present
    const backButton = page.locator('button').first() // Back arrow button
    await expect(backButton).toBeVisible()
    
    // Click back and verify return to login
    await backButton.click()
    await expect(page.locator('text=Fazer Login')).toBeVisible()
  })

  test('should validate email input field', async ({ page }) => {
    await page.click('text=Primeiro Acesso')
    
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('placeholder', 'seu@email.com')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')
    
    // Test that we can type in the field
    await emailInput.fill('test@example.com')
    await expect(emailInput).toHaveValue('test@example.com')
  })

  test('should have proper form labels and accessibility', async ({ page }) => {
    await page.click('text=Primeiro Acesso')
    
    // Check form labels
    await expect(page.locator('label:has-text("Email")')).toBeVisible()
    
    // Check button accessibility
    const submitButton = page.locator('button:has-text("Verificar Convite")')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toHaveAttribute('type', 'submit')
  })

  test.describe('Responsive Design Tests', () => {
    
    test('Mobile layout (375px)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      await page.click('text=Primeiro Acesso')
      
      // Form should be visible and usable on mobile
      const card = page.locator('.w-full.max-w-md, [class*="card"]')
      await expect(card).toBeVisible()
      
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
      await emailInput.fill('test@mobile.com')
      await expect(emailInput).toHaveValue('test@mobile.com')
    })

    test('Tablet layout (768px)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      await page.click('text=Primeiro Acesso')
      
      const emailInput = page.locator('input[type="email"]')
      await expect(emailInput).toBeVisible()
    })

    test('Desktop layout (1920px)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      await page.click('text=Primeiro Acesso')
      
      // Form should remain centered on large screens
      const container = page.locator('.min-h-screen.flex.items-center.justify-center')
      await expect(container).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    
    test('should support keyboard navigation', async ({ page }) => {
      // Tab to "Primeiro Acesso" button
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab') // May need to tab multiple times to reach the button
      
      // Find and focus the "Primeiro Acesso" button specifically
      await page.locator('text=Primeiro Acesso').focus()
      await page.keyboard.press('Enter')
      
      // Should navigate to first access form
      await expect(page.locator('text=Digite seu email para verificar')).toBeVisible()
      
      // Tab should focus email input
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBe('INPUT')
    })
  })

  test.describe('Visual Elements', () => {
    
    test('should display proper branding and styling', async ({ page }) => {
      // Check main branding
      await expect(page.locator('h1:has-text("Momento Cake")')).toBeVisible()
      await expect(page.locator('text=Sistema de Administração')).toBeVisible()
      
      // Navigate to first access
      await page.click('text=Primeiro Acesso')
      
      // Branding should be consistent
      await expect(page.locator('h1:has-text("Momento Cake")')).toBeVisible()
      await expect(page.locator('text=Sistema de Administração')).toBeVisible()
    })

    test('should have consistent card layout', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      // Check card structure
      const card = page.locator('[class*="card"]')
      await expect(card).toBeVisible()
      
      // Check card header
      const cardHeader = page.locator('[class*="card"] header, [class*="CardHeader"]')
      await expect(cardHeader).toBeVisible()
      
      // Check card content
      const cardContent = page.locator('[class*="card"] main, [class*="CardContent"]')
      await expect(cardContent).toBeVisible()
    })
  })

  test.describe('Button States and Interactions', () => {
    
    test('should handle button hover and active states', async ({ page }) => {
      const primeiroAcessoButton = page.locator('text=Primeiro Acesso')
      
      // Test hover (if applicable)
      await primeiroAcessoButton.hover()
      await expect(primeiroAcessoButton).toBeVisible()
      
      // Test click
      await primeiroAcessoButton.click()
      await expect(page.locator('text=Digite seu email para verificar')).toBeVisible()
    })

    test('should disable submit button appropriately', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      const submitButton = page.locator('button:has-text("Verificar Convite")')
      await expect(submitButton).toBeVisible()
      
      // Should be enabled by default (since form validation happens on submit)
      await expect(submitButton).not.toBeDisabled()
    })
  })

  test('should take screenshots for visual regression', async ({ page }) => {
    // Login page
    await page.screenshot({ 
      path: 'test-results/login-page.png',
      fullPage: true 
    })
    
    // First access form
    await page.click('text=Primeiro Acesso')
    await page.screenshot({ 
      path: 'test-results/first-access-form.png',
      fullPage: true 
    })
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    await page.click('text=Primeiro Acesso')
    await page.screenshot({ 
      path: 'test-results/first-access-mobile.png',
      fullPage: true 
    })
  })
})