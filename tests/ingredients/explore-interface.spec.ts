import { test, expect } from '@playwright/test';

// Test configuration
const ADMIN_EMAIL = 'admin@momentocake.com.br';
const ADMIN_PASSWORD = 'G8j5k188';
const BASE_URL = 'http://localhost:3001';

test.describe('Explore Ingredients Interface', () => {
  test('should explore the admin interface to understand available features', async ({ page }) => {
    console.log('🔐 Starting manual exploration...');
    
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('load');
    
    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
    console.log('✅ Successfully logged in');
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: 'screenshots/manual-dashboard.png',
      fullPage: true 
    });
    console.log('📸 Dashboard screenshot taken');
    
    // Check what navigation options are available
    console.log('🔍 Exploring navigation options...');
    
    // Look for all navigation links
    const navLinks = await page.locator('nav a, aside a, [role="navigation"] a').all();
    
    console.log(`Found ${navLinks.length} navigation links:`);
    for (let i = 0; i < navLinks.length; i++) {
      try {
        const link = navLinks[i];
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        console.log(`  ${i + 1}. "${text}" -> ${href}`);
      } catch (error) {
        console.log(`  ${i + 1}. [Could not read link]`);
      }
    }
    
    // Check the sidebar specifically
    console.log('\n🔍 Checking sidebar navigation...');
    const sidebarLinks = await page.locator('aside a, [data-testid="sidebar"] a').all();
    
    console.log(`Found ${sidebarLinks.length} sidebar links:`);
    for (let i = 0; i < sidebarLinks.length; i++) {
      try {
        const link = sidebarLinks[i];
        const text = await link.textContent();
        const href = await link.getAttribute('href');
        console.log(`  Sidebar ${i + 1}. "${text}" -> ${href}`);
      } catch (error) {
        console.log(`  Sidebar ${i + 1}. [Could not read link]`);
      }
    }
    
    // Look for any expandable menus
    console.log('\n🔍 Looking for expandable menus...');
    const expandableButtons = await page.locator('button[aria-expanded], [role="button"][aria-expanded]').all();
    
    for (let i = 0; i < expandableButtons.length; i++) {
      try {
        const button = expandableButtons[i];
        const text = await button.textContent();
        const expanded = await button.getAttribute('aria-expanded');
        console.log(`  Expandable ${i + 1}. "${text}" (expanded: ${expanded})`);
        
        // If not expanded, try to expand it
        if (expanded === 'false') {
          await button.click();
          await page.waitForTimeout(500);
          console.log(`    -> Expanded menu for "${text}"`);
          
          // Take screenshot after expansion
          await page.screenshot({ 
            path: `screenshots/expanded-menu-${i + 1}.png`,
            fullPage: true 
          });
        }
      } catch (error) {
        console.log(`  Expandable ${i + 1}. [Could not interact]`);
      }
    }
    
    // Try to click on "Ingredientes" specifically
    console.log('\n🔍 Looking for Ingredientes navigation...');
    
    const ingredientLinks = await page.locator('text=Ingredientes').all();
    console.log(`Found ${ingredientLinks.length} "Ingredientes" links`);
    
    for (let i = 0; i < ingredientLinks.length; i++) {
      try {
        const link = ingredientLinks[i];
        const isVisible = await link.isVisible();
        const isClickable = await link.isEnabled();
        console.log(`  Ingredientes ${i + 1}. Visible: ${isVisible}, Clickable: ${isClickable}`);
        
        if (isVisible && isClickable) {
          console.log(`    -> Clicking Ingredientes link ${i + 1}`);
          await link.click();
          await page.waitForTimeout(2000);
          
          // Take screenshot after clicking
          await page.screenshot({ 
            path: `screenshots/after-click-ingredientes-${i + 1}.png`,
            fullPage: true 
          });
          
          // Check current URL
          const currentUrl = page.url();
          console.log(`    -> Current URL: ${currentUrl}`);
          
          // Check page content
          const pageContent = await page.textContent('body');
          if (pageContent?.includes('404')) {
            console.log('    -> Got 404 error');
          } else if (pageContent?.includes('Carregando')) {
            console.log('    -> Page is loading...');
            await page.waitForTimeout(3000); // Wait longer for loading
          } else {
            console.log('    -> Page loaded successfully');
          }
          
          // Look for any buttons or forms on this page
          const buttons = await page.locator('button').all();
          console.log(`    -> Found ${buttons.length} buttons on this page`);
          
          for (let j = 0; j < Math.min(buttons.length, 10); j++) { // Limit to first 10 buttons
            try {
              const button = buttons[j];
              const buttonText = await button.textContent();
              const buttonType = await button.getAttribute('type');
              const buttonClass = await button.getAttribute('class');
              console.log(`      Button ${j + 1}: "${buttonText}" (type: ${buttonType})`);
            } catch (error) {
              console.log(`      Button ${j + 1}: [Could not read]`);
            }
          }
          
          // Look for any forms
          const forms = await page.locator('form').all();
          console.log(`    -> Found ${forms.length} forms on this page`);
          
          // Look for any inputs
          const inputs = await page.locator('input').all();
          console.log(`    -> Found ${inputs.length} input fields on this page`);
          
          break; // Only click the first working link
        }
      } catch (error) {
        console.log(`  Error interacting with Ingredientes link ${i + 1}:`, error);
      }
    }
    
    // Try direct navigation to known ingredient URLs
    console.log('\n🔍 Trying direct navigation to ingredient URLs...');
    
    const urlsToTry = [
      '/ingredients/inventory',
      '/ingredients',
      '/dashboard/ingredients',
      '/ingredientes',
      '/ingredientes/inventory'
    ];
    
    for (const urlPath of urlsToTry) {
      try {
        const fullUrl = `${BASE_URL}${urlPath}`;
        console.log(`  -> Trying: ${fullUrl}`);
        
        await page.goto(fullUrl);
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        const pageContent = await page.textContent('body');
        
        if (pageContent?.includes('404')) {
          console.log(`    ❌ 404 error at ${urlPath}`);
        } else if (currentUrl.includes('login')) {
          console.log(`    🔄 Redirected to login from ${urlPath}`);
        } else {
          console.log(`    ✅ Successfully loaded ${urlPath}`);
          
          // Take screenshot
          await page.screenshot({ 
            path: `screenshots/direct-nav-${urlPath.replace(/\//g, '-')}.png`,
            fullPage: true 
          });
          
          // Check for any add/create buttons
          const addButtons = await page.locator('button:has-text("Add"), button:has-text("Adicionar"), button:has-text("Novo"), button:has-text("Create"), button:has-text("Criar")').all();
          console.log(`    -> Found ${addButtons.length} potential add buttons`);
          
          for (let k = 0; k < addButtons.length; k++) {
            try {
              const button = addButtons[k];
              const buttonText = await button.textContent();
              console.log(`      Add button ${k + 1}: "${buttonText}"`);
            } catch (error) {
              console.log(`      Add button ${k + 1}: [Could not read]`);
            }
          }
          
          // If this page works, break and use it
          if (!pageContent?.includes('Carregando') && !pageContent?.includes('Error')) {
            console.log(`    🎉 Found working ingredients page at ${urlPath}`);
            break;
          }
        }
      } catch (error) {
        console.log(`    ❌ Error navigating to ${urlPath}:`, error.message);
      }
    }
    
    // Final screenshot
    await page.screenshot({ 
      path: 'screenshots/manual-exploration-final.png',
      fullPage: true 
    });
    
    console.log('🎉 Manual exploration completed!');
  });
});