/**
 * Manual Admin Invitation Interface Test
 * Interactive test to find and document the invitation functionality
 */

import { test, expect } from '@playwright/test';

const APP_URL = 'https://momentocake-admin-dev.web.app';
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';

test('Manual Admin Interface Exploration', async ({ page }) => {
  console.log('🔐 Starting manual admin interface exploration...');
  
  // Set longer timeouts for manual interaction
  page.setDefaultTimeout(30000);
  
  // Navigate to login
  await page.goto(`${APP_URL}/login`);
  await page.waitForLoadState('networkidle');
  
  // Take screenshot of login page
  await page.screenshot({ path: 'screenshot-login.png', fullPage: true });
  console.log('📸 Login page screenshot saved');
  
  // Login as admin
  console.log('🔑 Logging in as admin...');
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  
  await emailInput.fill(ADMIN_EMAIL);
  await passwordInput.fill(ADMIN_PASSWORD);
  
  // Take screenshot of filled form
  await page.screenshot({ path: 'login-form-filled.png', fullPage: true });
  console.log('📸 Login form filled screenshot saved');
  
  const loginButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
  await loginButton.click();
  
  // Wait for redirect
  try {
    await page.waitForURL(url => !url.includes('/login'), { timeout: 20000 });
    console.log('✅ Login successful, redirected to:', page.url());
  } catch (error) {
    console.log('⚠️ Login may have failed or timeout occurred');
  }
  
  // Take screenshot of dashboard/home page
  await page.screenshot({ path: 'screenshot-dashboard.png', fullPage: true });
  console.log('📸 Dashboard screenshot saved');
  
  // Analyze page structure
  const pageAnalysis = await page.evaluate(() => {
    // Get navigation elements
    const navElements = Array.from(document.querySelectorAll('nav a, .navigation a, .sidebar a, .menu a')).map(link => ({
      text: link.textContent?.trim(),
      href: link.getAttribute('href'),
      classes: link.className
    }));
    
    // Get all buttons
    const buttons = Array.from(document.querySelectorAll('button, .btn')).map(btn => ({
      text: btn.textContent?.trim(),
      id: btn.id,
      classes: btn.className,
      type: btn.getAttribute('type')
    }));
    
    // Get page content for keywords
    const bodyText = document.body.textContent || '';
    const hasUserKeywords = /usuário|user|convite|invite|gerenciar|manage|admin/i.test(bodyText);
    
    // Check for specific elements
    const hasDropdownMenus = document.querySelectorAll('[role="menu"], .dropdown, .dropdown-menu').length > 0;
    const hasSidebar = document.querySelectorAll('.sidebar, nav, .navigation').length > 0;
    
    return {
      url: window.location.href,
      title: document.title,
      navElements: navElements.filter(el => el.text && el.text.length > 0),
      buttons: buttons.filter(btn => btn.text && btn.text.length > 0),
      hasUserKeywords,
      hasDropdownMenus,
      hasSidebar,
      bodyTextPreview: bodyText.substring(0, 500)
    };
  });
  
  console.log('📊 Page Analysis Results:');
  console.log(`   URL: ${pageAnalysis.url}`);
  console.log(`   Title: ${pageAnalysis.title}`);
  console.log(`   Has user-related keywords: ${pageAnalysis.hasUserKeywords}`);
  console.log(`   Has sidebar: ${pageAnalysis.hasSidebar}`);
  console.log(`   Has dropdown menus: ${pageAnalysis.hasDropdownMenus}`);
  console.log(`   Navigation elements: ${pageAnalysis.navElements.length}`);
  console.log(`   Buttons: ${pageAnalysis.buttons.length}`);
  
  // Print navigation elements
  if (pageAnalysis.navElements.length > 0) {
    console.log('🧭 Navigation Elements:');
    pageAnalysis.navElements.forEach((nav, i) => {
      console.log(`   ${i + 1}. "${nav.text}" → ${nav.href}`);
    });
  }
  
  // Print buttons
  if (pageAnalysis.buttons.length > 0) {
    console.log('🔘 Buttons:');
    pageAnalysis.buttons.slice(0, 10).forEach((btn, i) => {
      console.log(`   ${i + 1}. "${btn.text}" (${btn.type || 'button'})`);
    });
  }
  
  console.log('📝 Body Content Preview:');
  console.log(pageAnalysis.bodyTextPreview);
  
  // Try common admin URLs
  const adminUrls = [
    '/admin',
    '/dashboard',
    '/users',
    '/invite',
    '/convites',
    '/usuarios',
    '/gerenciar',
    '/management'
  ];
  
  for (const url of adminUrls) {
    try {
      console.log(`🔍 Testing URL: ${APP_URL}${url}`);
      await page.goto(`${APP_URL}${url}`, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      
      const currentUrl = page.url();
      console.log(`   Result: ${currentUrl}`);
      
      if (!currentUrl.includes('/login') && currentUrl.includes(url)) {
        console.log(`   ✅ URL ${url} is accessible`);
        
        // Check if this page has invitation functionality
        const hasInviteFeatures = await page.evaluate(() => {
          const text = document.body.textContent || '';
          return /convite|invite|adicionar.*usuário|add.*user/i.test(text);
        });
        
        if (hasInviteFeatures) {
          console.log(`   🎯 Page ${url} appears to have invitation features!`);
          await page.screenshot({ path: `screenshot-${url.replace('/', '')}.png`, fullPage: true });
          console.log(`   📸 Screenshot saved for ${url}`);
        }
      } else {
        console.log(`   ⚠️ URL ${url} not accessible or redirected`);
      }
    } catch (error) {
      console.log(`   ❌ URL ${url} failed: ${error.message}`);
    }
  }
  
  // Final screenshot of current state
  await page.screenshot({ path: 'screenshot-final.png', fullPage: true });
  console.log('📸 Final screenshot saved');
  
  // Manual wait for inspection (in headed mode)
  console.log('⏸️ Test complete - check screenshots for invitation interface');
});

// Additional test to check for setup/initialization page
test('Check for Setup or First Access Page', async ({ page }) => {
  console.log('🔧 Checking for setup/first access page...');
  
  // Try setup-related URLs
  const setupUrls = [
    '/',
    '/setup',
    '/first-access',
    '/initialize',
    '/admin/setup',
    '/primeiro-acesso'
  ];
  
  for (const url of setupUrls) {
    try {
      await page.goto(`${APP_URL}${url}`);
      await page.waitForLoadState('domcontentloaded');
      
      const pageContent = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        hasSetupKeywords: /setup|primeiro.*acesso|first.*access|initialize|configuração/i.test(document.body.textContent || ''),
        bodyPreview: (document.body.textContent || '').substring(0, 300)
      }));
      
      console.log(`🔍 URL ${url}:`);
      console.log(`   Current URL: ${pageContent.url}`);
      console.log(`   Title: ${pageContent.title}`);
      console.log(`   Has setup keywords: ${pageContent.hasSetupKeywords}`);
      
      if (pageContent.hasSetupKeywords) {
        console.log(`   🎯 Found setup page at ${url}!`);
        await page.screenshot({ path: `screenshot-setup-${url.replace('/', 'root')}.png`, fullPage: true });
        console.log(`   📸 Setup page screenshot saved`);
      }
      
    } catch (error) {
      console.log(`   ❌ URL ${url} error: ${error.message}`);
    }
  }
});