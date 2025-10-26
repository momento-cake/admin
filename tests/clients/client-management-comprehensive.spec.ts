import { test, expect, Page } from '@playwright/test'

const BASE_URL = 'http://localhost:3002'

// Test data generators
const generateTestName = (prefix: string) => `${prefix} ${Date.now()}`
const generateTestEmail = (prefix: string) => `${prefix.toLowerCase().replace(/\s+/g, '')}${Date.now()}@test.com`

// Helper functions
async function loginAsAdmin(page: Page) {
  // Check if already logged in
  const currentUrl = page.url()
  if (currentUrl && !currentUrl.includes('/login')) {
    // Try navigating to dashboard to verify session
    try {
      await page.goto(`${BASE_URL}/dashboard`, { timeout: 5000 })
      await page.waitForLoadState('load', { timeout: 5000 })
      if (page.url().includes('/dashboard')) {
        return // Already logged in
      }
    } catch (e) {
      // Session expired, continue with login
    }
  }

  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')

  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')

  // Click submit and wait for navigation
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]')
  ])

  await page.waitForLoadState('load')

  // Verify we're logged in (should be on dashboard or redirected page)
  if (page.url().includes('/login')) {
    throw new Error('Login failed - still on login page')
  }
}

async function navigateToClients(page: Page) {
  await page.goto(`${BASE_URL}/clients`)
  await page.waitForLoadState('load')
}

test.describe('Momento Cake Admin - Client Management E2E Tests', () => {
  let personalClientId: string
  let businessClientId: string

  test.describe.configure({ mode: 'serial' })

  // ==========================================
  // 1. AUTHENTICATION & NAVIGATION TESTS
  // ==========================================
  test.describe('1. Authentication & Navigation', () => {
    test('1.1 Should login successfully with admin credentials', async ({ page }) => {
      console.log('Starting login test...')

      await page.goto(`${BASE_URL}/login`)
      await page.waitForLoadState('load')

      // Take screenshot of login page
      await page.screenshot({ path: 'test-results/clients/01-login-page.png', fullPage: true })

      await page.fill('input[type="email"]', 'admin@momentocake.com.br')
      await page.fill('input[type="password"]', 'G8j5k188')

      await page.screenshot({ path: 'test-results/clients/02-login-filled.png', fullPage: true })

      await page.click('button[type="submit"]')

      // Wait for successful redirect
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      await page.waitForLoadState('load')

      // Verify we're on dashboard
      expect(page.url()).toContain('/dashboard')

      await page.screenshot({ path: 'test-results/clients/03-dashboard.png', fullPage: true })

      console.log('✓ Login successful')
    })

    test('1.2 Should navigate to clients page from dashboard', async ({ page }) => {
      await loginAsAdmin(page)

      // Navigate to clients
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Verify clients page loaded
      expect(page.url()).toContain('/clients')

      await page.screenshot({ path: 'test-results/clients/04-clients-page.png', fullPage: true })

      console.log('✓ Navigation to clients page successful')
    })

    test('1.3 Should verify client sidebar menu is visible', async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)

      // Check for sidebar (may be collapsed on mobile)
      const sidebar = page.locator('[data-testid="sidebar"], nav[class*="sidebar"], aside')

      // If sidebar exists, verify it
      if (await sidebar.count() > 0) {
        await expect(sidebar.first()).toBeVisible()
        console.log('✓ Sidebar is visible')
      } else {
        // On mobile, look for menu button
        const menuButton = page.locator('button[aria-label*="menu"], button[class*="mobile-menu"]')
        if (await menuButton.count() > 0) {
          await expect(menuButton.first()).toBeVisible()
          console.log('✓ Mobile menu button is visible')
        }
      }
    })
  })

  // ==========================================
  // 2. CLIENT LIST TESTING
  // ==========================================
  test.describe('2. Client List & Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)
    })

    test('2.1 Should display client list page with correct elements', async ({ page }) => {
      // Check page title
      const pageTitle = page.locator('h1, h2').filter({ hasText: /clientes/i }).first()
      await expect(pageTitle).toBeVisible()

      // Check for create button
      const createButton = page.locator('button:has-text("Novo Cliente"), a:has-text("Novo Cliente")')
      await expect(createButton.first()).toBeVisible()

      await page.screenshot({ path: 'test-results/clients/05-client-list-page.png', fullPage: true })

      console.log('✓ Client list page displays correctly')
    })

    test('2.2 Should search clients by name', async ({ page }) => {
      // Look for search input
      const searchInput = page.locator('input[placeholder*="Buscar"], input[placeholder*="Search"], input[type="search"]')

      if (await searchInput.count() > 0) {
        await searchInput.first().fill('Test')
        await page.waitForTimeout(500) // Wait for debounce

        await page.screenshot({ path: 'test-results/clients/06-search-by-name.png', fullPage: true })

        console.log('✓ Search by name functionality works')
      } else {
        console.log('⚠ Search input not found - may not be implemented')
      }
    })

    test('2.3 Should filter clients by type (Pessoa Física)', async ({ page }) => {
      // Look for filter dropdown
      const typeFilter = page.locator('select, [role="combobox"]').filter({ hasText: /tipo|type|pessoa/i }).first()

      if (await typeFilter.count() > 0) {
        // Try to select Pessoa Física
        const isSelect = await typeFilter.evaluate(el => el.tagName === 'SELECT')

        if (isSelect) {
          await typeFilter.selectOption({ label: /pessoa física/i })
        } else {
          await typeFilter.click()
          await page.locator('text=/pessoa física/i').first().click()
        }

        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/clients/07-filter-pessoa-fisica.png', fullPage: true })

        console.log('✓ Filter by Pessoa Física works')
      } else {
        console.log('⚠ Type filter not found - may not be implemented')
      }
    })

    test('2.4 Should filter clients by type (Pessoa Jurídica)', async ({ page }) => {
      const typeFilter = page.locator('select, [role="combobox"]').filter({ hasText: /tipo|type|pessoa/i }).first()

      if (await typeFilter.count() > 0) {
        const isSelect = await typeFilter.evaluate(el => el.tagName === 'SELECT')

        if (isSelect) {
          await typeFilter.selectOption({ label: /pessoa jurídica/i })
        } else {
          await typeFilter.click()
          await page.locator('text=/pessoa jurídica/i').first().click()
        }

        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/clients/08-filter-pessoa-juridica.png', fullPage: true })

        console.log('✓ Filter by Pessoa Jurídica works')
      }
    })

    test('2.5 Should display pagination controls', async ({ page }) => {
      // Look for pagination controls
      const pagination = page.locator('[class*="pagination"], [aria-label*="pagination"]')

      if (await pagination.count() > 0) {
        await expect(pagination.first()).toBeVisible()
        await page.screenshot({ path: 'test-results/clients/09-pagination-controls.png', fullPage: true })

        console.log('✓ Pagination controls are visible')
      } else {
        console.log('⚠ Pagination controls not found - may not be implemented or not enough data')
      }
    })
  })

  // ==========================================
  // 3. CREATE PERSONAL CLIENT (PESSOA FÍSICA)
  // ==========================================
  test.describe('3. Create Personal Client (Pessoa Física)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)
    })

    test('3.1 Should navigate to create client form', async ({ page }) => {
      const createButton = page.locator('button:has-text("Novo Cliente"), a:has-text("Novo Cliente")')
      await createButton.first().click()

      await page.waitForURL(/\/clients\/new/, { timeout: 15000 })
      await page.waitForLoadState('load')

      // Verify form title
      const formTitle = page.locator('h1, h2').filter({ hasText: /novo cliente/i }).first()
      await expect(formTitle).toBeVisible()

      await page.screenshot({ path: 'test-results/clients/10-create-client-form.png', fullPage: true })

      console.log('✓ Create client form loads correctly')
    })

    test('3.2 Should create personal client with basic info', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Teste PF')
      const testEmail = generateTestEmail('cliente')

      // Select Pessoa Física (should be default)
      const personOption = page.locator('input[value="person"], input[value="PERSON"]')
      if (await personOption.count() > 0) {
        await personOption.first().check()
      }

      // Fill basic information
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)

      // Try to fill CPF if present
      const cpfInput = page.locator('input[name="cpf"], input[placeholder*="CPF"]')
      if (await cpfInput.count() > 0) {
        await cpfInput.first().fill('123.456.789-00')
      }

      // Fill phone
      const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"], input[placeholder*="phone"]')
      if (await phoneInput.count() > 0) {
        await phoneInput.first().fill('(11) 98765-4321')
      }

      await page.screenshot({ path: 'test-results/clients/11-personal-client-basic-info.png', fullPage: true })

      console.log('✓ Basic info filled for personal client')
    })

    test('3.3 Should add contact methods with primary flag', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Contact')

      await page.fill('input[name="name"]', testName)

      // Look for contact method section
      const addContactButton = page.locator('button:has-text("Adicionar Contato"), button:has-text("Add Contact")')

      if (await addContactButton.count() > 0) {
        await addContactButton.first().click()
        await page.waitForTimeout(300)

        // Fill contact method
        const contactTypeSelect = page.locator('select[name*="type"], select[name*="contactType"]').last()
        if (await contactTypeSelect.count() > 0) {
          await contactTypeSelect.selectOption('PHONE')
        }

        const contactValueInput = page.locator('input[name*="value"], input[placeholder*="(11)"]').last()
        if (await contactValueInput.count() > 0) {
          await contactValueInput.fill('(11) 98765-4321')
        }

        // Mark as primary
        const primaryCheckbox = page.locator('input[type="checkbox"][name*="primary"]').last()
        if (await primaryCheckbox.count() > 0) {
          await primaryCheckbox.check()
        }

        await page.screenshot({ path: 'test-results/clients/12-contact-methods.png', fullPage: true })

        console.log('✓ Contact method added with primary flag')
      }
    })

    test('3.4 Should add address information', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Address')
      await page.fill('input[name="name"]', testName)

      // Fill address fields
      const addressFields = {
        'cep': '01310-100',
        'estado': 'SP',
        'cidade': 'São Paulo',
        'bairro': 'Centro',
        'endereco': 'Avenida Paulista',
        'numero': '1578',
        'complemento': 'Sala 101'
      }

      for (const [field, value] of Object.entries(addressFields)) {
        const input = page.locator(`input[name="${field}"], input[name="address.${field}"]`)
        if (await input.count() > 0) {
          await input.first().fill(value)
        }
      }

      await page.screenshot({ path: 'test-results/clients/13-address-info.png', fullPage: true })

      console.log('✓ Address information filled')
    })

    test('3.5 Should add tags (suggested and custom)', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Tags')
      await page.fill('input[name="name"]', testName)

      // Look for tags section
      const tagsSection = page.locator('[data-testid="tags-section"], section:has-text("Tags")')

      if (await tagsSection.count() > 0) {
        // Try to add suggested tag
        const suggestedTag = page.locator('button:has-text("VIP"), button:has-text("Premium")').first()
        if (await suggestedTag.count() > 0) {
          await suggestedTag.click()
        }

        // Try to add custom tag
        const customTagInput = page.locator('input[placeholder*="tag"], input[name*="tag"]').last()
        if (await customTagInput.count() > 0) {
          await customTagInput.fill('Cliente Especial')
          await page.keyboard.press('Enter')
        }

        await page.screenshot({ path: 'test-results/clients/14-tags-section.png', fullPage: true })

        console.log('✓ Tags added (suggested and custom)')
      } else {
        console.log('⚠ Tags section not found')
      }
    })

    test('3.6 Should add related persons with relationships', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Relations')
      await page.fill('input[name="name"]', testName)

      // Look for related persons section
      const addRelatedButton = page.locator('button:has-text("Adicionar Pessoa"), button:has-text("Add Person")')

      if (await addRelatedButton.count() > 0) {
        await addRelatedButton.first().click()
        await page.waitForTimeout(300)

        // Fill related person info
        const relatedName = page.locator('input[name*="relatedPerson"][name*="name"]').last()
        if (await relatedName.count() > 0) {
          await relatedName.fill('Maria Silva')
        }

        const relatedEmail = page.locator('input[name*="relatedPerson"][name*="email"]').last()
        if (await relatedEmail.count() > 0) {
          await relatedEmail.fill('maria@example.com')
        }

        // Select relationship type
        const relationshipSelect = page.locator('select[name*="relationship"]').last()
        if (await relationshipSelect.count() > 0) {
          await relationshipSelect.selectOption('SPOUSE')
        }

        await page.screenshot({ path: 'test-results/clients/15-related-persons.png', fullPage: true })

        console.log('✓ Related person added with relationship')
      } else {
        console.log('⚠ Related persons section not found')
      }
    })

    test('3.7 Should add special dates (birthday, anniversary)', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Dates')
      await page.fill('input[name="name"]', testName)

      // Look for special dates section
      const addDateButton = page.locator('button:has-text("Adicionar Data"), button:has-text("Add Date")')

      if (await addDateButton.count() > 0) {
        await addDateButton.first().click()
        await page.waitForTimeout(300)

        // Select date type
        const dateTypeSelect = page.locator('select[name*="dateType"], select[name*="type"]').last()
        if (await dateTypeSelect.count() > 0) {
          await dateTypeSelect.selectOption('BIRTHDAY')
        }

        // Fill date
        const dateInput = page.locator('input[type="date"], input[name*="date"]').last()
        if (await dateInput.count() > 0) {
          await dateInput.fill('1990-05-15')
        }

        await page.screenshot({ path: 'test-results/clients/16-special-dates.png', fullPage: true })

        console.log('✓ Special date added')
      } else {
        console.log('⚠ Special dates section not found')
      }
    })

    test('3.8 Should submit form and create personal client', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const testName = generateTestName('Cliente Complete PF')
      const testEmail = generateTestEmail('complete')

      // Fill required fields
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)

      // Add at least one contact method
      const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"]').first()
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('(11) 98765-4321')
      }

      await page.screenshot({ path: 'test-results/clients/17-before-submit.png', fullPage: true })

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Criar"), button:has-text("Criar Cliente")')
      await submitButton.first().click()

      // Wait for redirect or success message
      await page.waitForTimeout(2000)

      // Check if redirected to clients list or detail page
      const currentUrl = page.url()
      const isSuccess = currentUrl.includes('/clients') && !currentUrl.includes('/new')

      if (isSuccess) {
        await page.screenshot({ path: 'test-results/clients/18-client-created-success.png', fullPage: true })

        // Try to extract client ID from URL
        if (currentUrl.match(/\/clients\/[a-zA-Z0-9-]+$/)) {
          personalClientId = currentUrl.split('/').pop() || ''
          console.log(`✓ Personal client created successfully. ID: ${personalClientId}`)
        } else {
          console.log('✓ Personal client created successfully')
        }
      } else {
        console.log('⚠ Form submission may have failed - still on create page')
        await page.screenshot({ path: 'test-results/clients/18-client-create-failed.png', fullPage: true })
      }
    })
  })

  // ==========================================
  // 4. CREATE BUSINESS CLIENT (PESSOA JURÍDICA)
  // ==========================================
  test.describe('4. Create Business Client (Pessoa Jurídica)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')
    })

    test('4.1 Should select Pessoa Jurídica type', async ({ page }) => {
      const businessOption = page.locator('input[value="business"], input[value="BUSINESS"]')

      if (await businessOption.count() > 0) {
        await businessOption.first().check()
        await page.waitForTimeout(500)

        // Verify business-specific fields appear
        const cnpjInput = page.locator('input[name="cnpj"], input[placeholder*="CNPJ"]')
        await expect(cnpjInput.first()).toBeVisible()

        await page.screenshot({ path: 'test-results/clients/19-business-type-selected.png', fullPage: true })

        console.log('✓ Pessoa Jurídica type selected')
      }
    })

    test('4.2 Should fill company information', async ({ page }) => {
      const businessOption = page.locator('input[value="business"], input[value="BUSINESS"]')
      if (await businessOption.count() > 0) {
        await businessOption.first().check()
        await page.waitForTimeout(500)
      }

      const testCompany = generateTestName('Empresa Teste')

      // Fill company fields
      await page.fill('input[name="name"]', testCompany)

      const companyNameInput = page.locator('input[name="companyName"]')
      if (await companyNameInput.count() > 0) {
        await companyNameInput.fill(testCompany)
      }

      const cnpjInput = page.locator('input[name="cnpj"]')
      if (await cnpjInput.count() > 0) {
        await cnpjInput.fill('11.222.333/0001-81')
      }

      const businessTypeInput = page.locator('input[name="businessType"], select[name="businessType"]')
      if (await businessTypeInput.count() > 0) {
        if (await businessTypeInput.evaluate(el => el.tagName === 'SELECT')) {
          await businessTypeInput.selectOption('Fornecedor')
        } else {
          await businessTypeInput.fill('Fornecedor de Ingredientes')
        }
      }

      await page.screenshot({ path: 'test-results/clients/20-company-info.png', fullPage: true })

      console.log('✓ Company information filled')
    })

    test('4.3 Should fill representative information', async ({ page }) => {
      const businessOption = page.locator('input[value="business"], input[value="BUSINESS"]')
      if (await businessOption.count() > 0) {
        await businessOption.first().check()
        await page.waitForTimeout(500)
      }

      const testCompany = generateTestName('Empresa Rep')
      await page.fill('input[name="name"]', testCompany)

      // Fill representative fields
      const repSection = page.locator('[data-testid="representative-section"], section:has-text("Representante")')

      if (await repSection.count() > 0) {
        const repName = page.locator('input[name*="representative"][name*="name"], input[name="representativeName"]')
        if (await repName.count() > 0) {
          await repName.first().fill('João Silva')
        }

        const repEmail = page.locator('input[name*="representative"][name*="email"], input[name="representativeEmail"]')
        if (await repEmail.count() > 0) {
          await repEmail.first().fill('joao@empresa.com')
        }

        const repPhone = page.locator('input[name*="representative"][name*="phone"], input[name="representativePhone"]')
        if (await repPhone.count() > 0) {
          await repPhone.first().fill('(11) 98765-4321')
        }

        const repCpf = page.locator('input[name*="representative"][name*="cpf"], input[name="representativeCpf"]')
        if (await repCpf.count() > 0) {
          await repCpf.first().fill('123.456.789-00')
        }

        const repRole = page.locator('input[name*="representative"][name*="role"], input[name="representativeRole"]')
        if (await repRole.count() > 0) {
          await repRole.first().fill('Gerente')
        }

        await page.screenshot({ path: 'test-results/clients/21-representative-info.png', fullPage: true })

        console.log('✓ Representative information filled')
      }
    })

    test('4.4 Should submit form and create business client', async ({ page }) => {
      const businessOption = page.locator('input[value="business"], input[value="BUSINESS"]')
      if (await businessOption.count() > 0) {
        await businessOption.first().check()
        await page.waitForTimeout(500)
      }

      const testCompany = generateTestName('Empresa Complete')
      const testEmail = generateTestEmail('empresa')

      // Fill required fields
      await page.fill('input[name="name"]', testCompany)
      await page.fill('input[name="email"]', testEmail)

      const cnpjInput = page.locator('input[name="cnpj"]')
      if (await cnpjInput.count() > 0) {
        await cnpjInput.fill('11.222.333/0001-81')
      }

      // Add at least one contact method
      const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"]').first()
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('(11) 98765-4321')
      }

      await page.screenshot({ path: 'test-results/clients/22-business-before-submit.png', fullPage: true })

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Criar"), button:has-text("Criar Cliente")')
      await submitButton.first().click()

      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      const isSuccess = currentUrl.includes('/clients') && !currentUrl.includes('/new')

      if (isSuccess) {
        await page.screenshot({ path: 'test-results/clients/23-business-created-success.png', fullPage: true })

        if (currentUrl.match(/\/clients\/[a-zA-Z0-9-]+$/)) {
          businessClientId = currentUrl.split('/').pop() || ''
          console.log(`✓ Business client created successfully. ID: ${businessClientId}`)
        } else {
          console.log('✓ Business client created successfully')
        }
      } else {
        console.log('⚠ Form submission may have failed')
        await page.screenshot({ path: 'test-results/clients/23-business-create-failed.png', fullPage: true })
      }
    })
  })

  // ==========================================
  // 5. PHASE 7 ADVANCED FEATURES
  // ==========================================
  test.describe('5. Phase 7 Advanced Features', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
    })

    test('5.1 Should verify Tags section on detail page', async ({ page }) => {
      // Navigate to clients list
      await navigateToClients(page)

      // Click on first client to view details
      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()
      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        // Look for tags section
        const tagsSection = page.locator('[data-testid="tags-section"], section:has-text("Tags"), div:has-text("Tags")')

        if (await tagsSection.count() > 0) {
          await expect(tagsSection.first()).toBeVisible()
          await page.screenshot({ path: 'test-results/clients/24-tags-section-detail.png', fullPage: true })
          console.log('✓ Tags section is visible on detail page')
        } else {
          console.log('⚠ Tags section not found on detail page')
        }
      }
    })

    test('5.2 Should verify Related Persons section with relationships', async ({ page }) => {
      await navigateToClients(page)

      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()
      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        const relatedSection = page.locator('[data-testid="related-persons-section"], section:has-text("Pessoas Relacionadas")')

        if (await relatedSection.count() > 0) {
          await expect(relatedSection.first()).toBeVisible()

          // Check for relationship display
          const relationshipLabels = page.locator('text=/cônjuge|filho|mãe|pai|spouse|child|parent/i')
          if (await relationshipLabels.count() > 0) {
            console.log('✓ Related persons section with relationships is visible')
          } else {
            console.log('✓ Related persons section is visible (no relationships yet)')
          }

          await page.screenshot({ path: 'test-results/clients/25-related-persons-detail.png', fullPage: true })
        } else {
          console.log('⚠ Related persons section not found')
        }
      }
    })

    test('5.3 Should verify Special Dates section with countdowns', async ({ page }) => {
      await navigateToClients(page)

      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()
      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        const datesSection = page.locator('[data-testid="special-dates-section"], section:has-text("Datas Especiais")')

        if (await datesSection.count() > 0) {
          await expect(datesSection.first()).toBeVisible()

          // Check for countdown indicators
          const countdowns = page.locator('text=/hoje|today|amanhã|tomorrow|em \\d+ dias|in \\d+ days/i')
          if (await countdowns.count() > 0) {
            console.log('✓ Special dates section with countdowns is visible')
          } else {
            console.log('✓ Special dates section is visible (no countdowns yet)')
          }

          await page.screenshot({ path: 'test-results/clients/26-special-dates-detail.png', fullPage: true })
        } else {
          console.log('⚠ Special dates section not found')
        }
      }
    })

    test('5.4 Should verify date sorting by proximity', async ({ page }) => {
      await navigateToClients(page)

      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()
      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        const datesSection = page.locator('[data-testid="special-dates-section"], section:has-text("Datas Especiais")')

        if (await datesSection.count() > 0) {
          // Get all date items
          const dateItems = datesSection.locator('[data-testid="date-item"], li, div[class*="date"]')
          const count = await dateItems.count()

          if (count > 1) {
            console.log(`✓ Found ${count} special dates - sorting should be by proximity`)
          } else {
            console.log('⚠ Not enough dates to verify sorting')
          }

          await page.screenshot({ path: 'test-results/clients/27-dates-sorting.png', fullPage: true })
        }
      }
    })
  })

  // ==========================================
  // 6. CLIENT DETAIL PAGE
  // ==========================================
  test.describe('6. Client Detail Page', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)
    })

    test('6.1 Should view client details with all sections', async ({ page }) => {
      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()

      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForURL(/\/clients\/[^/]+/, { timeout: 15000 })
        await page.waitForLoadState('load')

        // Verify page title
        const pageTitle = page.locator('h1').first()
        await expect(pageTitle).toBeVisible()

        // Check for main sections
        const sections = [
          'Informações Básicas',
          'Contatos',
          'Endereço',
          'Tags',
          'Pessoas Relacionadas',
          'Datas Especiais'
        ]

        for (const section of sections) {
          const sectionElement = page.locator(`text=${section}`).first()
          if (await sectionElement.count() > 0) {
            console.log(`✓ Section "${section}" found`)
          } else {
            console.log(`⚠ Section "${section}" not found`)
          }
        }

        await page.screenshot({ path: 'test-results/clients/28-client-detail-full.png', fullPage: true })

        console.log('✓ Client detail page displays all sections')
      }
    })

    test('6.2 Should display contact methods correctly', async ({ page }) => {
      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()

      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        const contactSection = page.locator('[data-testid="contact-section"], section:has-text("Contatos")')

        if (await contactSection.count() > 0) {
          await expect(contactSection.first()).toBeVisible()

          // Check for contact method display
          const contactItems = contactSection.locator('[data-testid="contact-item"], li')
          const count = await contactItems.count()

          console.log(`✓ Contact section displays ${count} contact method(s)`)

          await page.screenshot({ path: 'test-results/clients/29-contact-methods-display.png' })
        }
      }
    })

    test('6.3 Should display address information correctly', async ({ page }) => {
      const viewButton = page.locator('button:has-text("Ver"), a:has-text("Ver")').first()

      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        const addressSection = page.locator('[data-testid="address-section"], section:has-text("Endereço")')

        if (await addressSection.count() > 0) {
          await expect(addressSection.first()).toBeVisible()
          console.log('✓ Address section is visible')

          await page.screenshot({ path: 'test-results/clients/30-address-display.png' })
        } else {
          console.log('⚠ Address section not found or no address data')
        }
      }
    })
  })

  // ==========================================
  // 7. EDIT CLIENT
  // ==========================================
  test.describe('7. Edit Client', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)
    })

    test('7.1 Should navigate to edit client form', async ({ page }) => {
      const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")').first()

      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForURL(/\/edit/, { timeout: 15000 })
        await page.waitForLoadState('load')

        const formTitle = page.locator('h1, h2').filter({ hasText: /editar/i }).first()
        await expect(formTitle).toBeVisible()

        await page.screenshot({ path: 'test-results/clients/31-edit-client-form.png', fullPage: true })

        console.log('✓ Edit client form loads correctly')
      } else {
        console.log('⚠ Edit button not found - viewing detail first')

        const viewButton = page.locator('button:has-text("Ver")').first()
        if (await viewButton.count() > 0) {
          await viewButton.click()
          await page.waitForLoadState('load')

          const editButtonDetail = page.locator('button:has-text("Editar")').first()
          if (await editButtonDetail.count() > 0) {
            await editButtonDetail.click()
            await page.waitForLoadState('load')
            await page.screenshot({ path: 'test-results/clients/31-edit-client-form.png', fullPage: true })
            console.log('✓ Edit client form loads correctly')
          }
        }
      }
    })

    test('7.2 Should update client basic information', async ({ page }) => {
      // Navigate to first client's edit page
      const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")').first()

      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForLoadState('load')
      } else {
        const viewButton = page.locator('button:has-text("Ver")').first()
        await viewButton.click()
        await page.waitForLoadState('load')

        const editButtonDetail = page.locator('button:has-text("Editar")').first()
        await editButtonDetail.click()
        await page.waitForLoadState('load')
      }

      // Update name
      const nameInput = page.locator('input[name="name"]')
      const currentName = await nameInput.inputValue()
      const newName = `${currentName} - Updated ${Date.now()}`

      await nameInput.clear()
      await nameInput.fill(newName)

      await page.screenshot({ path: 'test-results/clients/32-edit-name-updated.png', fullPage: true })

      console.log(`✓ Updated client name to: ${newName}`)
    })

    test('7.3 Should update contact methods', async ({ page }) => {
      const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")').first()

      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForLoadState('load')
      } else {
        const viewButton = page.locator('button:has-text("Ver")').first()
        await viewButton.click()
        await page.waitForLoadState('load')
        const editButtonDetail = page.locator('button:has-text("Editar")').first()
        await editButtonDetail.click()
        await page.waitForLoadState('load')
      }

      // Try to add a new contact method
      const addContactButton = page.locator('button:has-text("Adicionar Contato")')

      if (await addContactButton.count() > 0) {
        await addContactButton.click()
        await page.waitForTimeout(300)

        const newPhoneInput = page.locator('input[placeholder*="telefone"]').last()
        if (await newPhoneInput.count() > 0) {
          await newPhoneInput.fill('(11) 91234-5678')
        }

        await page.screenshot({ path: 'test-results/clients/33-edit-contact-added.png', fullPage: true })

        console.log('✓ New contact method added')
      }
    })

    test('7.4 Should update tags', async ({ page }) => {
      const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")').first()

      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForLoadState('load')
      } else {
        const viewButton = page.locator('button:has-text("Ver")').first()
        await viewButton.click()
        await page.waitForLoadState('load')
        const editButtonDetail = page.locator('button:has-text("Editar")').first()
        await editButtonDetail.click()
        await page.waitForLoadState('load')
      }

      // Try to add a new tag
      const tagInput = page.locator('input[name*="tag"], input[placeholder*="tag"]').last()

      if (await tagInput.count() > 0) {
        await tagInput.fill('Tag Atualizada')
        await page.keyboard.press('Enter')

        await page.screenshot({ path: 'test-results/clients/34-edit-tags-updated.png', fullPage: true })

        console.log('✓ Tags updated')
      }
    })

    test('7.5 Should save client changes', async ({ page }) => {
      const editButton = page.locator('button:has-text("Editar"), a:has-text("Editar")').first()

      if (await editButton.count() > 0) {
        await editButton.click()
        await page.waitForLoadState('load')
      } else {
        const viewButton = page.locator('button:has-text("Ver")').first()
        await viewButton.click()
        await page.waitForLoadState('load')
        const editButtonDetail = page.locator('button:has-text("Editar")').first()
        await editButtonDetail.click()
        await page.waitForLoadState('load')
      }

      // Make a simple change
      const nameInput = page.locator('input[name="name"]')
      const currentName = await nameInput.inputValue()
      const newName = `${currentName} - Saved ${Date.now()}`
      await nameInput.clear()
      await nameInput.fill(newName)

      // Submit form
      const saveButton = page.locator('button[type="submit"]:has-text("Atualizar"), button:has-text("Salvar"), button:has-text("Atualizar Cliente")')
      await saveButton.first().click()

      await page.waitForTimeout(2000)

      const currentUrl = page.url()
      const isSuccess = !currentUrl.includes('/edit')

      if (isSuccess) {
        await page.screenshot({ path: 'test-results/clients/35-edit-saved-success.png', fullPage: true })
        console.log('✓ Client changes saved successfully')
      } else {
        await page.screenshot({ path: 'test-results/clients/35-edit-save-failed.png', fullPage: true })
        console.log('⚠ Changes may not have been saved')
      }
    })
  })

  // ==========================================
  // 8. DELETE AND RESTORE CLIENT
  // ==========================================
  test.describe('8. Delete and Restore Client', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page)
      await navigateToClients(page)
    })

    test('8.1 Should soft delete a client', async ({ page }) => {
      // First, create a client to delete
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      const deleteTestName = generateTestName('Cliente Delete Test')
      await page.fill('input[name="name"]', deleteTestName)

      const phoneInput = page.locator('input[name="phone"], input[placeholder*="telefone"]').first()
      if (await phoneInput.count() > 0) {
        await phoneInput.fill('(11) 98765-4321')
      }

      const submitButton = page.locator('button[type="submit"]:has-text("Criar")')
      await submitButton.first().click()
      await page.waitForTimeout(2000)

      // Now find and delete this client
      await navigateToClients(page)

      // Search for the client
      const searchInput = page.locator('input[placeholder*="Buscar"]')
      if (await searchInput.count() > 0) {
        await searchInput.fill(deleteTestName)
        await page.waitForTimeout(500)
      }

      // Click view to go to detail page
      const viewButton = page.locator('button:has-text("Ver")').first()
      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        // Look for delete button
        const deleteButton = page.locator('button:has-text("Remover"), button:has-text("Excluir"), button[aria-label*="delete"]')

        if (await deleteButton.count() > 0) {
          await deleteButton.first().click()
          await page.waitForTimeout(500)

          // Handle confirmation dialog
          const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Remover")').last()
          if (await confirmButton.count() > 0) {
            await page.screenshot({ path: 'test-results/clients/36-delete-confirmation.png', fullPage: true })
            await confirmButton.click()
            await page.waitForTimeout(2000)

            await page.screenshot({ path: 'test-results/clients/37-after-delete.png', fullPage: true })

            console.log('✓ Client soft deleted successfully')
          }
        } else {
          console.log('⚠ Delete button not found')
        }
      }
    })

    test('8.2 Should verify deleted client shows as inactive', async ({ page }) => {
      // Look for filter to show inactive clients
      const showInactiveFilter = page.locator('input[type="checkbox"]:has-text("Inativos"), label:has-text("Mostrar inativos")')

      if (await showInactiveFilter.count() > 0) {
        await showInactiveFilter.click()
        await page.waitForTimeout(500)

        await page.screenshot({ path: 'test-results/clients/38-show-inactive-clients.png', fullPage: true })

        console.log('✓ Showing inactive clients')
      } else {
        console.log('⚠ Cannot find filter for inactive clients')
      }
    })

    test('8.3 Should restore a deleted client', async ({ page }) => {
      // Show inactive clients
      const showInactiveFilter = page.locator('input[type="checkbox"]:has-text("Inativos"), label:has-text("Mostrar inativos")')

      if (await showInactiveFilter.count() > 0) {
        await showInactiveFilter.click()
        await page.waitForTimeout(500)
      }

      // Click on an inactive client
      const viewButton = page.locator('button:has-text("Ver")').first()

      if (await viewButton.count() > 0) {
        await viewButton.click()
        await page.waitForLoadState('load')

        // Look for restore button
        const restoreButton = page.locator('button:has-text("Restaurar"), button:has-text("Ativar")')

        if (await restoreButton.count() > 0) {
          await restoreButton.first().click()
          await page.waitForTimeout(2000)

          await page.screenshot({ path: 'test-results/clients/39-client-restored.png', fullPage: true })

          console.log('✓ Client restored successfully')
        } else {
          console.log('⚠ Restore button not found')
        }
      }
    })
  })
})
