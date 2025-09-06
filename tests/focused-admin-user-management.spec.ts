/**
 * Focused Admin User Management Test
 * Target the Users section to find invitation functionality
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'https://momentocake-admin-dev.web.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

test('Admin User Management and Invitation Test', async ({ page }) => {
  console.log('🎯 Focused test: Admin User Management and Invitations');
  
  // Login as admin
  console.log('🔐 Logging in as admin...');
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const loginButton = page.locator('button[type="submit"], button:has-text("Entrar")').first();
  
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await loginButton.click();
  
  // Wait for dashboard
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'admin-logged-in.png', fullPage: true });
  console.log('📸 Admin logged in screenshot saved');
  
  // Click on "Usuários" in sidebar
  console.log('👥 Clicking on Users section...');
  const usersLink = page.locator('a:has-text("Usuários"), [data-testid="users"], nav a[href*="users"]').first();
  
  if (await usersLink.isVisible()) {
    await usersLink.click();
    console.log('✅ Clicked on Users section');
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'users-section.png', fullPage: true });
    console.log('📸 Users section screenshot saved');
    
    // Analyze the users page
    const usersPageAnalysis = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, .btn')).map(btn => ({
        text: btn.textContent?.trim(),
        classes: btn.className,
        id: btn.id,
        dataTestId: btn.getAttribute('data-testid')
      }));
      
      const hasInviteButton = buttons.some(btn => 
        /convite|invite|adicionar|add.*user|novo.*usuário/i.test(btn.text || '')
      );
      
      const tables = document.querySelectorAll('table, .table, .data-table');
      const hasUserTable = tables.length > 0;
      
      const bodyText = document.body.textContent || '';
      const hasInviteKeywords = /convite|invite|adicionar.*usuário|add.*user/i.test(bodyText);
      
      return {
        url: window.location.href,
        buttons: buttons.filter(btn => btn.text && btn.text.length > 2),
        hasInviteButton,
        hasUserTable,
        hasInviteKeywords,
        tableCount: tables.length
      };
    });
    
    console.log('📊 Users Page Analysis:');
    console.log(`   URL: ${usersPageAnalysis.url}`);
    console.log(`   Has invite button: ${usersPageAnalysis.hasInviteButton}`);
    console.log(`   Has user table: ${usersPageAnalysis.hasUserTable}`);
    console.log(`   Has invite keywords: ${usersPageAnalysis.hasInviteKeywords}`);
    console.log(`   Tables found: ${usersPageAnalysis.tableCount}`);
    console.log(`   Buttons found: ${usersPageAnalysis.buttons.length}`);
    
    // Show all buttons
    if (usersPageAnalysis.buttons.length > 0) {
      console.log('🔘 Available Buttons:');
      usersPageAnalysis.buttons.forEach((btn, i) => {
        console.log(`   ${i + 1}. "${btn.text}"`);
      });
    }
    
    // Look for invite/add user button
    const inviteButtons = [
      'button:has-text("Convidar")',
      'button:has-text("Invite")',
      'button:has-text("Adicionar")',
      'button:has-text("Add User")',
      'button:has-text("Novo")',
      '[data-testid="invite-user"]',
      '[data-testid="add-user"]',
      '.btn:has-text("+")'
    ];
    
    let foundInviteButton = false;
    for (const selector of inviteButtons) {
      const button = page.locator(selector).first();
      if (await button.isVisible()) {
        console.log(`🎯 Found invite button: ${selector}`);
        
        // Click the invite button
        await button.click();
        console.log('✅ Clicked invite button');
        
        await page.waitForTimeout(1500);
        await page.screenshot({ path: 'invite-form-opened.png', fullPage: true });
        console.log('📸 Invite form opened screenshot saved');
        
        foundInviteButton = true;
        
        // Analyze the invite form
        const formAnalysis = await page.evaluate(() => {
          const forms = document.querySelectorAll('form, .form, [role="dialog"]');
          const inputs = document.querySelectorAll('input[type="email"], input[name*="email"]');
          const selects = document.querySelectorAll('select, [role="combobox"]');
          const submitButtons = document.querySelectorAll('button[type="submit"], button:has-text("Convidar"), button:has-text("Send")');
          
          return {
            formsFound: forms.length,
            emailInputsFound: inputs.length,
            selectsFound: selects.length,
            submitButtonsFound: submitButtons.length,
            modalVisible: document.querySelector('.modal, .popup, [role="dialog"]') !== null
          };
        });
        
        console.log('📋 Invite Form Analysis:');
        console.log(`   Forms found: ${formAnalysis.formsFound}`);
        console.log(`   Email inputs: ${formAnalysis.emailInputsFound}`);
        console.log(`   Role selectors: ${formAnalysis.selectsFound}`);
        console.log(`   Submit buttons: ${formAnalysis.submitButtonsFound}`);
        console.log(`   Modal visible: ${formAnalysis.modalVisible}`);
        
        // Try to fill and submit the form
        if (formAnalysis.emailInputsFound > 0) {
          const testEmail = `test-invite-${Date.now()}@example.com`;
          const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
          
          await emailInput.fill(testEmail);
          console.log(`📧 Filled email: ${testEmail}`);
          
          // Look for role selector
          const roleSelect = page.locator('select, [role="combobox"]').first();
          if (await roleSelect.isVisible()) {
            const options = await roleSelect.locator('option').allTextContents();
            console.log('📋 Available roles:', options);
            
            // Select first available role
            if (options.length > 1) {
              await roleSelect.selectOption({ index: 1 }); // Skip first (usually empty)
              console.log('✅ Selected role');
            }
          }
          
          await page.screenshot({ path: 'invite-form-filled.png', fullPage: true });
          console.log('📸 Invite form filled screenshot saved');
          
          // Submit the form
          const submitButton = page.locator('button[type="submit"], button:has-text("Convidar"), button:has-text("Send")').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            console.log('📤 Submitted invitation form');
            
            await page.waitForTimeout(2000);
            await page.screenshot({ path: 'invite-submitted.png', fullPage: true });
            console.log('📸 Invite submitted screenshot saved');
            
            // Check for success message
            const successSelectors = ['.success', '.alert-success', '[data-testid="success"]'];
            for (const selector of successSelectors) {
              const successMsg = page.locator(selector).first();
              if (await successMsg.isVisible()) {
                const text = await successMsg.textContent();
                console.log(`✅ Success message: ${text}`);
              }
            }
          }
        }
        
        break;
      }
    }
    
    if (!foundInviteButton) {
      console.log('⚠️ No invite button found, but users section is accessible');
    }
    
  } else {
    console.log('❌ Users link not found in sidebar');
    
    // Try direct URL
    console.log('🔄 Trying direct users URL...');
    await page.goto(`${APP_URL}/users`);
    await page.waitForTimeout(2000);
    
    const directUrlResult = await page.evaluate(() => ({
      url: window.location.href,
      isUsersPage: window.location.href.includes('/users') && !window.location.href.includes('/login')
    }));
    
    if (directUrlResult.isUsersPage) {
      console.log('✅ Direct users URL works');
      await page.screenshot({ path: 'direct-users-page.png', fullPage: true });
    } else {
      console.log('❌ Direct users URL redirected');
    }
  }
  
  // Final screenshot
  await page.screenshot({ path: 'final-test-state.png', fullPage: true });
  console.log('📸 Final test state screenshot saved');
});

// Additional test to check existing invitations/users
test('Check Existing Users and Invitations', async ({ page }) => {
  console.log('📋 Checking existing users and invitations...');
  
  // Login
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const loginButton = page.locator('button[type="submit"]').first();
  
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  await loginButton.click();
  await page.waitForTimeout(3000);
  
  // Go to users section
  await page.goto(`${APP_URL}/users`);
  await page.waitForTimeout(2000);
  
  // Check for existing users/invitations
  const userListAnalysis = await page.evaluate(() => {
    const rows = document.querySelectorAll('tr, .user-item, .invite-item');
    const userEmails = Array.from(document.querySelectorAll('td, .email, [data-email]')).map(el => el.textContent?.trim()).filter(text => text?.includes('@'));
    const pendingInvites = Array.from(document.querySelectorAll('.pending, [data-status="pending"]'));
    
    return {
      rowCount: rows.length,
      emailsFound: userEmails,
      pendingInvitesCount: pendingInvites.length,
      hasUserData: rows.length > 1 // More than header row
    };
  });
  
  console.log('👥 User List Analysis:');
  console.log(`   Rows found: ${userListAnalysis.rowCount}`);
  console.log(`   Emails found: ${userListAnalysis.emailsFound.length}`);
  console.log(`   Pending invites: ${userListAnalysis.pendingInvitesCount}`);
  console.log(`   Has user data: ${userListAnalysis.hasUserData}`);
  
  if (userListAnalysis.emailsFound.length > 0) {
    console.log('📧 Found emails:');
    userListAnalysis.emailsFound.forEach((email, i) => {
      console.log(`   ${i + 1}. ${email}`);
    });
  }
  
  await page.screenshot({ path: 'existing-users-check.png', fullPage: true });
  console.log('📸 Existing users check screenshot saved');
});