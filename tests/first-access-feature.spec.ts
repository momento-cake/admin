import { test, expect, Page, BrowserContext } from '@playwright/test'

/**
 * First Access Feature - Comprehensive Test Suite
 * 
 * Tests the complete first access flow as specified in the documentation:
 * - Main test scenario (Steps 1-5)
 * - Error scenarios (Tests 1-5)
 * - UI/UX validation
 * - Responsive design testing
 * - Cross-browser compatibility
 */

test.describe('First Access Feature', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login')
    await expect(page).toHaveTitle(/Momento Cake/)
  })

  test.describe('Main Test Scenario - Complete First Access Flow', () => {
    
    test('should complete entire first access flow successfully', async ({ page }) => {
      // Step 1: Verify login page shows "Primeiro Acesso" button
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      await expect(page.locator('[data-testid="first-access-button"], text=Primeiro Acesso')).toBeVisible()
      
      // Step 2: Click "Primeiro Acesso" button
      await page.click('text=Primeiro Acesso')
      
      // Step 3: Verify first access form appears
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      await expect(page.locator('text=Digite seu email para verificar')).toBeVisible()
      
      // Step 4: Enter valid email and validate invitation
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      
      // Step 5: Verify success message and form progression
      await expect(page.locator('text=Convite válido para: testuser@example.com')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('text=Complete seu Registro')).toBeVisible()
      
      // Step 6: Verify form is pre-filled correctly
      await expect(page.locator('input[placeholder="João"]')).toHaveValue('Test')
      await expect(page.locator('input[placeholder="Silva"]')).toHaveValue('User')
      await expect(page.locator('input[type="email"][disabled]')).toHaveValue('testuser@example.com')
      
      // Step 7: Complete registration form
      await page.fill('input[type="password"]:not([placeholder*="Confirme"])', 'Test123!')
      await page.fill('input[placeholder*="Confirme sua senha"]', 'Test123!')
      await page.fill('input[type="tel"]', '(11) 99999-9999')
      await page.check('input[type="checkbox"]')
      
      // Step 8: Submit registration
      await page.click('text=Criar Conta')
      
      // Step 9: Verify redirect to login with success message
      await expect(page.locator('text=Conta criada com sucesso')).toBeVisible({ timeout: 15000 })
      await expect(page).toHaveURL(/login/)
      
      // Step 10: Test login with new credentials
      await page.fill('input[type="email"]:not([disabled])', 'testuser@example.com')
      await page.fill('input[type="password"]', 'Test123!')
      await page.click('text=Entrar')
      
      // Step 11: Verify successful login and redirect to dashboard
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 })
      await expect(page.locator('text=Dashboard') || page.locator('text=Painel')).toBeVisible()
    })
    
    test('should show loading states during validation and registration', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      
      // Check for loading state during validation
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Verificando...')).toBeVisible()
      
      // Wait for validation to complete
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      // Fill registration form
      await page.fill('input[type="password"]:not([placeholder*="Confirme"])', 'Test123!')
      await page.fill('input[placeholder*="Confirme sua senha"]', 'Test123!')
      await page.check('input[type="checkbox"]')
      
      // Check for loading state during registration
      await page.click('text=Criar Conta')
      await expect(page.locator('text=Criando conta...')).toBeVisible()
    })
  })

  test.describe('Error Scenarios', () => {
    
    test('Test 1: Invalid Email (No Invitation)', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'notinvited@example.com')
      await page.click('text=Verificar Convite')
      
      await expect(page.locator('text=No pending invitation found for this email')).toBeVisible({ timeout: 10000 })
    })
    
    test('Test 2: Expired Invitation', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'expired@example.com')
      await page.click('text=Verificar Convite')
      
      await expect(page.locator('text=Invitation has expired')).toBeVisible({ timeout: 10000 })
    })
    
    test('Test 3: Weak Password', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      await page.fill('input[type="password"]:not([placeholder*="Confirme"])', '123456')
      await page.fill('input[placeholder*="Confirme sua senha"]', '123456')
      await page.check('input[type="checkbox"]')
      
      await page.click('text=Criar Conta')
      
      await expect(page.locator('text=Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número')).toBeVisible()
    })
    
    test('Test 4: Password Mismatch', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      await page.fill('input[type="password"]:not([placeholder*="Confirme"])', 'Test123!')
      await page.fill('input[placeholder*="Confirme sua senha"]', 'Different123!')
      await page.check('input[type="checkbox"]')
      
      await page.click('text=Criar Conta')
      
      await expect(page.locator('text=Senhas não coincidem')).toBeVisible()
    })
    
    test('Test 5: Missing Terms Acceptance', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      await page.fill('input[type="password"]:not([placeholder*="Confirme"])', 'Test123!')
      await page.fill('input[placeholder*="Confirme sua senha"]', 'Test123!')
      // Intentionally don't check the terms checkbox
      
      await page.click('text=Criar Conta')
      
      await expect(page.locator('text=Você deve aceitar os termos de uso')).toBeVisible()
    })
  })

  test.describe('UI/UX Validation', () => {
    
    test('Navigation - Back arrows should work correctly', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      // Test back arrow from email step
      await expect(page.locator('button[aria-label="Back"], button:has(svg)').first()).toBeVisible()
      await page.click('button[aria-label="Back"], button:has(svg)')
      await expect(page.locator('text=Fazer Login')).toBeVisible()
      
      // Go back to first access
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      // Test back arrow from registration step
      await page.click('button[aria-label="Back"], button:has(svg)')
      await expect(page.locator('text=Digite seu email para verificar')).toBeVisible()
    })
    
    test('Password visibility toggle should work', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      const passwordInput = page.locator('input[type="password"]:not([placeholder*="Confirme"])').first()
      const confirmPasswordInput = page.locator('input[placeholder*="Confirme sua senha"]')
      
      // Fill passwords
      await passwordInput.fill('Test123!')
      await confirmPasswordInput.fill('Test123!')
      
      // Test password visibility toggle
      const passwordToggle = page.locator('button:has(svg)').nth(1) // First toggle button after back button
      await passwordToggle.click()
      await expect(page.locator('input[type="text"]').first()).toHaveValue('Test123!')
      
      // Toggle back
      await passwordToggle.click()
      await expect(passwordInput).toHaveAttribute('type', 'password')
    })
    
    test('Error messages should be displayed in red', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'notinvited@example.com')
      await page.click('text=Verificar Convite')
      
      const errorMessage = page.locator('.text-red-600, .text-destructive, [role="alert"]')
      await expect(errorMessage).toBeVisible({ timeout: 10000 })
    })
    
    test('Success messages should be displayed in green', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      
      const successMessage = page.locator('.text-green-600, .text-green-800, text=Convite válido')
      await expect(successMessage).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Responsive Design', () => {
    
    test('Mobile viewport (375px width)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/login')
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      
      await page.click('text=Primeiro Acesso')
      
      // Verify form remains centered and readable
      const card = page.locator('[class*="card"], .w-full.max-w-md')
      await expect(card).toBeVisible()
      
      // Test form interaction on mobile
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      // Verify registration form is usable on mobile
      await expect(page.locator('input[placeholder="João"]')).toBeVisible()
      await expect(page.locator('input[placeholder="Silva"]')).toBeVisible()
    })
    
    test('Tablet viewport (768px width)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      await page.goto('/login')
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      
      await page.click('text=Primeiro Acesso')
      
      // Verify form layout on tablet
      const card = page.locator('[class*="card"], .w-full.max-w-md')
      await expect(card).toBeVisible()
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
    
    test('Desktop viewport (1920px width)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      await page.goto('/login')
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      
      await page.click('text=Primeiro Acesso')
      
      // Verify form remains centered on desktop
      const card = page.locator('[class*="card"], .w-full.max-w-md')
      await expect(card).toBeVisible()
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Browser Compatibility', () => {
    
    test('Chrome - First access flow', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chrome specific test')
      
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
    
    test('Firefox - First access flow', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox specific test')
      
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
    
    test('Safari - First access flow', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'Safari specific test')
      
      await page.click('text=Primeiro Acesso')
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Accessibility Validation', () => {
    
    test('Form should be keyboard navigable', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab') // Should focus email input
      await page.keyboard.type('testuser@example.com')
      await page.keyboard.press('Tab') // Should focus submit button
      await page.keyboard.press('Enter')
      
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
    })
    
    test('Form fields should have proper labels', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      // Check email step labels
      await expect(page.locator('label:has-text("Email")')).toBeVisible()
      
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      
      // Check registration step labels
      await expect(page.locator('label:has-text("Nome")')).toBeVisible()
      await expect(page.locator('label:has-text("Sobrenome")')).toBeVisible()
      await expect(page.locator('label:has-text("Email")')).toBeVisible()
      await expect(page.locator('label:has-text("Senha")')).toBeVisible()
      await expect(page.locator('label:has-text("Confirmar Senha")')).toBeVisible()
      await expect(page.locator('label:has-text("Telefone")')).toBeVisible()
    })
  })

  test.describe('Performance Validation', () => {
    
    test('Page should load within performance thresholds', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/login')
      await expect(page.locator('text=Primeiro Acesso')).toBeVisible()
      const loadTime = Date.now() - startTime
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })
    
    test('Form transitions should be smooth', async ({ page }) => {
      await page.click('text=Primeiro Acesso')
      
      const startTime = Date.now()
      await page.fill('input[type="email"]', 'testuser@example.com')
      await page.click('text=Verificar Convite')
      await expect(page.locator('text=Complete seu Registro')).toBeVisible({ timeout: 10000 })
      const transitionTime = Date.now() - startTime
      
      // Form transition should complete within 5 seconds
      expect(transitionTime).toBeLessThan(5000)
    })
  })
})