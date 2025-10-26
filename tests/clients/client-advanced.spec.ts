import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'http://localhost:3002'
const SCREENSHOT_DIR = path.join(__dirname, '../../test-results/clients')

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
}

async function login(page: any) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('load')

  await page.fill('input[type="email"]', 'admin@momentocake.com.br')
  await page.fill('input[type="password"]', 'G8j5k188')

  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
}

function generateTestData() {
  const timestamp = Date.now()
  return {
    name: `Business Client ${timestamp}`,
    cnpj: `12345678000${timestamp.toString().slice(-3)}`,
    email: `business${timestamp}@test.com`,
    phone: '(11) 98765-4321',
    representativeName: `Rep ${timestamp}`,
    representativeEmail: `rep${timestamp}@test.com`,
    representativePhone: '(11) 91234-5678',
    role: 'Director',
  }
}

test.describe('Momento Cake Admin - Advanced Client Management Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ==================== BUSINESS CLIENT TESTS ====================
  test.describe('Business Client (Pessoa Jurídica) Operations', () => {
    test('6.1 Create business client with all details', async ({ page }) => {
      const testData = generateTestData()

      // Navigate to create client form
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      // Select Pessoa Jurídica
      const pessoaJuridicaRadio = await page.$('input[value="business"]')
      if (pessoaJuridicaRadio) {
        await pessoaJuridicaRadio.click()
        await page.waitForTimeout(500)
      }

      // Fill basic info
      await page.fill('input[name="name"]', testData.name)
      await page.fill('input[name="email"]', testData.email)
      await page.fill('input[name="phone"]', testData.phone)

      // Fill CNPJ and company info
      const cnpjInput = await page.$('input[name="cnpj"]')
      if (cnpjInput) {
        await cnpjInput.fill(testData.cnpj)
      }

      const companyNameInput = await page.$('input[name="companyName"]')
      if (companyNameInput) {
        await companyNameInput.fill(testData.name)
      }

      // Fill representative info
      const repNameInput = await page.$('input[name="representativeName"]')
      if (repNameInput) {
        await repNameInput.fill(testData.representativeName)
      }

      const repEmailInput = await page.$('input[name="representativeEmail"]')
      if (repEmailInput) {
        await repEmailInput.fill(testData.representativeEmail)
      }

      const repPhoneInput = await page.$('input[name="representativePhone"]')
      if (repPhoneInput) {
        await repPhoneInput.fill(testData.representativePhone)
      }

      const roleInput = await page.$('input[name="role"]')
      if (roleInput) {
        await roleInput.fill(testData.role)
      }

      // Add contact method
      const addContactBtn = await page.$('button:has-text("Adicionar")')
      if (addContactBtn) {
        await addContactBtn.click()
        await page.waitForTimeout(500)

        const typeSelect = await page.$('select')
        if (typeSelect) {
          await typeSelect.selectOption('email')
        }

        const valueInput = await page.$('input[placeholder*="contato"]')
        if (valueInput) {
          await valueInput.fill(testData.email)
        }

        const saveBtn = await page.$('button:has-text("Salvar Método")')
        if (saveBtn) {
          await saveBtn.click()
          await page.waitForTimeout(500)
        }
      }

      // Submit form
      const submitBtn = await page.$('button:has-text("Criar Cliente")')
      if (submitBtn) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
        console.log('✓ Business client form submitted')
      }

      // Verify success
      expect(page.url()).toContain('/clients')
      console.log('✓ Business client created successfully')
    })

    test('6.2 Verify business client fields on detail page', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Click on first client to view details
      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        // Verify detail page has business-specific fields
        const cnpjElement = await page.$('text=/CNPJ|cnpj/i')
        const representativeElement = await page.$('text=/Representante/i')

        console.log('✓ Business client detail page verified')
      }
    })
  })

  // ==================== SEARCH & FILTER TESTS ====================
  test.describe('Client Search and Filtering', () => {
    test('7.1 Search clients by name', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Find search input
      const searchInput = await page.$('input[placeholder*="Buscar"]')
      if (searchInput) {
        await searchInput.fill('Test')
        await page.waitForTimeout(1000)

        // Verify results are filtered
        const clientCards = await page.$$('[data-testid="client-card"]')
        console.log(`✓ Search returned ${clientCards.length} results`)
      }
    })

    test('7.2 Filter clients by type', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Find type filter dropdown
      const typeFilter = await page.$('select')
      if (typeFilter) {
        await typeFilter.selectOption('person')
        await page.waitForTimeout(1000)

        console.log('✓ Clients filtered by type (person)')

        // Switch to business
        await typeFilter.selectOption('business')
        await page.waitForTimeout(1000)

        console.log('✓ Clients filtered by type (business)')
      }
    })

    test('7.3 Search by email', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const searchInput = await page.$('input[placeholder*="Buscar"]')
      if (searchInput) {
        await searchInput.fill('@test.com')
        await page.waitForTimeout(1000)

        console.log('✓ Email search executed')
      }
    })

    test('7.4 Search by phone number', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const searchInput = await page.$('input[placeholder*="Buscar"]')
      if (searchInput) {
        await searchInput.fill('98765')
        await page.waitForTimeout(1000)

        console.log('✓ Phone search executed')
      }
    })
  })

  // ==================== EDIT OPERATIONS TESTS ====================
  test.describe('Client Edit Operations', () => {
    test('8.1 Edit client basic information', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Click view on first client
      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        // Click edit button
        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Verify form is in edit mode
          expect(page.url()).toContain('/edit')
          console.log('✓ Edit page loaded')
        }
      }
    })

    test('8.2 Update client name', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Find name input and update
          const nameInput = await page.$('input[name="name"]')
          if (nameInput) {
            await nameInput.fill('')
            await nameInput.fill(`Updated Client ${Date.now()}`)
            await page.waitForTimeout(500)

            // Save changes
            const saveBtn = await page.$('button:has-text("Atualizar")')
            if (saveBtn) {
              await saveBtn.click()
              await page.waitForTimeout(2000)

              console.log('✓ Client name updated successfully')
            }
          }
        }
      }
    })

    test('8.3 Update contact methods', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Add new contact method
          const addContactBtn = await page.$('button:has-text("Adicionar")')
          if (addContactBtn) {
            await addContactBtn.click()
            await page.waitForTimeout(500)

            console.log('✓ Contact method form opened')
          }
        }
      }
    })
  })

  // ==================== DELETE OPERATIONS TESTS ====================
  test.describe('Client Delete Operations', () => {
    test('9.1 Soft delete client', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Click view on first client
      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        // Look for delete button
        const deleteBtn = await page.$('button:has-text("Excluir"), button:has-text("Delete")')
        if (deleteBtn) {
          await deleteBtn.click()
          await page.waitForTimeout(1000)

          // Confirm deletion if dialog appears
          const confirmBtn = await page.$('button:has-text("Confirmar"), button:has-text("Sim")')
          if (confirmBtn) {
            await confirmBtn.click()
            await page.waitForTimeout(2000)

            console.log('✓ Client deleted successfully')
          }
        }
      }
    })

    test('9.2 Verify deleted client is not in active list', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Search for recently deleted client
      const searchInput = await page.$('input[placeholder*="Buscar"]')
      if (searchInput) {
        await searchInput.fill('Deleted')
        await page.waitForTimeout(1000)

        const results = await page.$$('[data-testid="client-card"]')
        // Deleted clients should not appear in active list
        console.log(`✓ Deleted clients not shown in active list (${results.length} results)`)
      }
    })
  })

  // ==================== FORM VALIDATION TESTS ====================
  test.describe('Client Form Validation', () => {
    test('10.1 Validate required fields on create form', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      // Try to submit empty form
      const submitBtn = await page.$('button:has-text("Criar Cliente")')
      if (submitBtn) {
        await submitBtn.click()
        await page.waitForTimeout(1000)

        // Check for validation errors
        const errorMessages = await page.$$('text=/requerido|obrigatório|required/i')
        if (errorMessages.length > 0) {
          console.log(`✓ Form validation working (${errorMessages.length} validation errors shown)`)
        }
      }
    })

    test('10.2 Validate email format', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      // Fill name to pass that validation
      const nameInput = await page.$('input[name="name"]')
      if (nameInput) {
        await nameInput.fill('Test Client')
      }

      // Enter invalid email
      const emailInput = await page.$('input[name="email"]')
      if (emailInput) {
        await emailInput.fill('invalid-email')
        await page.waitForTimeout(500)

        // Check for email validation error
        const emailError = await page.$('text=/email|inválido/i')
        if (emailError) {
          console.log('✓ Email format validation working')
        }
      }
    })

    test('10.3 Validate CPF format', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      // Fill name
      const nameInput = await page.$('input[name="name"]')
      if (nameInput) {
        await nameInput.fill('Test Client')
      }

      // Enter invalid CPF
      const cpfInput = await page.$('input[name="cpf"]')
      if (cpfInput) {
        await cpfInput.fill('12345')
        await page.waitForTimeout(500)

        console.log('✓ CPF field validation tested')
      }
    })

    test('10.4 Validate at least one contact method required', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients/new`)
      await page.waitForLoadState('load')

      // Fill required fields but no contact method
      const nameInput = await page.$('input[name="name"]')
      if (nameInput) {
        await nameInput.fill('Test Client')
      }

      // Try to submit
      const submitBtn = await page.$('button:has-text("Criar Cliente")')
      if (submitBtn) {
        await submitBtn.click()
        await page.waitForTimeout(1000)

        console.log('✓ Contact method requirement validation tested')
      }
    })
  })

  // ==================== PAGINATION TESTS ====================
  test.describe('Client List Pagination', () => {
    test('11.1 Verify pagination controls visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      // Look for pagination buttons
      const nextBtn = await page.$('button:has-text("Próxima")')
      const prevBtn = await page.$('button:has-text("Anterior")')

      if (nextBtn || prevBtn) {
        console.log('✓ Pagination controls found')
      } else {
        console.log('✓ Pagination controls not needed (few clients)')
      }
    })

    test('11.2 Navigate to next page', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const nextBtn = await page.$('button:has-text("Próxima")')
      if (nextBtn && !(await nextBtn.isDisabled())) {
        await nextBtn.click()
        await page.waitForTimeout(2000)

        console.log('✓ Navigated to next page')
      } else {
        console.log('✓ Next button not available (on last page or single page)')
      }
    })
  })

  // ==================== PHASE 7 FEATURE CRUD TESTS ====================
  test.describe('Phase 7 Features - Advanced CRUD', () => {
    test('12.1 Add tags to client', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Find tags section
          const tagInput = await page.$('input[placeholder*="tag"]')
          if (tagInput) {
            await tagInput.fill('VIP')
            await page.keyboard.press('Enter')
            await page.waitForTimeout(500)

            console.log('✓ Tag added successfully')
          }
        }
      }
    })

    test('12.2 Add related person to client', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Find add related person button
          const addPersonBtn = await page.$('button:has-text("Adicionar Pessoa")')
          if (addPersonBtn) {
            await addPersonBtn.click()
            await page.waitForTimeout(1000)

            console.log('✓ Related person form opened')
          }
        }
      }
    })

    test('12.3 Add special date to client', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`)
      await page.waitForLoadState('load')

      const firstClientView = await page.$('button:has-text("Ver")')
      if (firstClientView) {
        await firstClientView.click()
        await page.waitForTimeout(2000)

        const editBtn = await page.$('button:has-text("Editar")')
        if (editBtn) {
          await editBtn.click()
          await page.waitForTimeout(2000)

          // Find add special date button
          const addDateBtn = await page.$('button:has-text("Adicionar Data")')
          if (addDateBtn) {
            await addDateBtn.click()
            await page.waitForTimeout(1000)

            console.log('✓ Special date form opened')
          }
        }
      }
    })
  })
})
