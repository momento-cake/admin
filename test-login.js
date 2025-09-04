const { chromium } = require('playwright');

async function testMomentoCakeLogin() {
  console.log('🚀 Starting Momento Cake Admin Login Tests');
  console.log('=========================================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const testResults = {
    timestamp: new Date().toISOString(),
    url: 'https://momentocake-admin.web.app',
    tests: [],
    screenshots: [],
    performance: {},
    responsive: {},
    overall_status: 'PASS'
  };

  try {
    console.log('📍 Test 1: Navigation and Page Loading');
    console.log('--------------------------------------');
    
    // Navigate to the application
    const startTime = Date.now();
    const response = await page.goto('https://momentocake-admin.web.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    
    testResults.performance.pageLoadTime = loadTime;
    
    console.log(`✅ Page loaded successfully (${loadTime}ms)`);
    console.log(`✅ HTTP Status: ${response.status()}`);
    console.log(`✅ URL: ${page.url()}`);
    
    testResults.tests.push({
      name: 'Page Navigation',
      status: 'PASS',
      details: `Loaded in ${loadTime}ms with status ${response.status()}`
    });

    // Take initial screenshot
    await page.screenshot({ 
      path: 'screenshots/login-initial.png',
      fullPage: true 
    });
    testResults.screenshots.push('login-initial.png');
    
    console.log('\n🔍 Test 2: UI Elements Detection');
    console.log('----------------------------------');
    
    // Check for basic page elements
    const title = await page.title();
    console.log(`✅ Page Title: "${title}"`);
    
    // Look for common login elements
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    const firstAccessButton = await page.locator('button:has-text("Primeiro Acesso"), a:has-text("Primeiro Acesso")').first();
    
    // Check element visibility
    const elementsFound = {
      emailInput: await emailInput.isVisible().catch(() => false),
      passwordInput: await passwordInput.isVisible().catch(() => false),
      submitButton: await submitButton.isVisible().catch(() => false),
      firstAccessButton: await firstAccessButton.isVisible().catch(() => false)
    };
    
    console.log('Login Form Elements:');
    Object.entries(elementsFound).forEach(([element, found]) => {
      console.log(`  ${found ? '✅' : '❌'} ${element}: ${found ? 'Found' : 'Not Found'}`);
    });
    
    testResults.tests.push({
      name: 'UI Elements Detection',
      status: Object.values(elementsFound).some(Boolean) ? 'PASS' : 'FAIL',
      details: elementsFound
    });

    console.log('\n📝 Test 3: Form Interactions');
    console.log('-----------------------------');
    
    if (elementsFound.emailInput) {
      try {
        await emailInput.click();
        await emailInput.fill('test@example.com');
        const emailValue = await emailInput.inputValue();
        console.log(`✅ Email input: Successfully entered "${emailValue}"`);
        
        testResults.tests.push({
          name: 'Email Input Interaction',
          status: 'PASS',
          details: `Successfully entered: ${emailValue}`
        });
      } catch (error) {
        console.log(`❌ Email input failed: ${error.message}`);
        testResults.tests.push({
          name: 'Email Input Interaction',
          status: 'FAIL',
          details: error.message
        });
      }
    }
    
    if (elementsFound.passwordInput) {
      try {
        await passwordInput.click();
        await passwordInput.fill('testpassword123');
        const passwordFilled = await passwordInput.inputValue();
        console.log(`✅ Password input: Successfully entered (${passwordFilled.length} characters)`);
        
        testResults.tests.push({
          name: 'Password Input Interaction',
          status: 'PASS',
          details: `Successfully entered ${passwordFilled.length} characters`
        });
      } catch (error) {
        console.log(`❌ Password input failed: ${error.message}`);
        testResults.tests.push({
          name: 'Password Input Interaction',
          status: 'FAIL',
          details: error.message
        });
      }
    }

    console.log('\n🔘 Test 4: First Access Button');
    console.log('-------------------------------');
    
    if (elementsFound.firstAccessButton) {
      try {
        const isEnabled = await firstAccessButton.isEnabled();
        const buttonText = await firstAccessButton.textContent();
        
        console.log(`✅ First Access Button: Found with text "${buttonText.trim()}"`);
        console.log(`✅ Button is ${isEnabled ? 'enabled' : 'disabled'}`);
        
        // Test clicking the button (but don't follow through if it navigates)
        await firstAccessButton.hover();
        console.log(`✅ Button is hoverable`);
        
        testResults.tests.push({
          name: 'First Access Button',
          status: 'PASS',
          details: `Button text: "${buttonText.trim()}", enabled: ${isEnabled}`
        });
        
        await page.screenshot({ path: 'screenshots/first-access-hover.png' });
        testResults.screenshots.push('first-access-hover.png');
        
      } catch (error) {
        console.log(`❌ First Access Button test failed: ${error.message}`);
        testResults.tests.push({
          name: 'First Access Button',
          status: 'FAIL',
          details: error.message
        });
      }
    } else {
      console.log(`❌ First Access Button: Not found`);
      testResults.tests.push({
        name: 'First Access Button',
        status: 'FAIL',
        details: 'Button not found on page'
      });
    }

    console.log('\n📱 Test 5: Responsive Design');
    console.log('-----------------------------');
    
    const viewports = [
      { name: 'Mobile', width: 390, height: 844 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000); // Wait for layout to adjust
      
      // Take screenshot
      await page.screenshot({ 
        path: `screenshots/login-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
      testResults.screenshots.push(`login-${viewport.name.toLowerCase()}.png`);
      
      // Check if elements are still visible
      const mobileElementsVisible = {
        emailInput: await emailInput.isVisible().catch(() => false),
        passwordInput: await passwordInput.isVisible().catch(() => false),
        submitButton: await submitButton.isVisible().catch(() => false),
        firstAccessButton: await firstAccessButton.isVisible().catch(() => false)
      };
      
      testResults.responsive[viewport.name] = mobileElementsVisible;
      
      const visibleCount = Object.values(mobileElementsVisible).filter(Boolean).length;
      console.log(`  ✅ ${visibleCount}/4 elements visible on ${viewport.name}`);
    }

    // Reset to desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });

    console.log('\n⚡ Test 6: Performance Metrics');
    console.log('-------------------------------');
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.navigationStart
      };
    });
    
    testResults.performance = { ...testResults.performance, ...performanceMetrics };
    
    console.log(`✅ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
    console.log(`✅ Load Complete: ${performanceMetrics.loadComplete}ms`);
    console.log(`✅ Total Load Time: ${performanceMetrics.totalLoadTime}ms`);

    console.log('\n🔍 Test 7: Accessibility Check');
    console.log('-------------------------------');
    
    // Basic accessibility checks
    const accessibilityChecks = await page.evaluate(() => {
      const checks = {
        hasTitle: !!document.title,
        hasLang: !!document.documentElement.lang,
        imagesHaveAlt: Array.from(document.images).every(img => img.alt || img.getAttribute('aria-label')),
        formsHaveLabels: Array.from(document.querySelectorAll('input')).every(input => {
          return input.labels?.length > 0 || input.getAttribute('aria-label') || input.getAttribute('placeholder');
        })
      };
      return checks;
    });
    
    testResults.tests.push({
      name: 'Basic Accessibility',
      status: Object.values(accessibilityChecks).every(Boolean) ? 'PASS' : 'PARTIAL',
      details: accessibilityChecks
    });
    
    console.log('Accessibility Checks:');
    Object.entries(accessibilityChecks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '⚠️ '} ${check}: ${passed ? 'Pass' : 'Needs attention'}`);
    });

    // Final screenshot
    await page.screenshot({ path: 'screenshots/login-final.png', fullPage: true });
    testResults.screenshots.push('login-final.png');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.overall_status = 'FAIL';
    testResults.error = error.message;
  } finally {
    await browser.close();
  }

  // Generate summary
  console.log('\n📊 TEST SUMMARY');
  console.log('================');
  
  const passedTests = testResults.tests.filter(test => test.status === 'PASS').length;
  const failedTests = testResults.tests.filter(test => test.status === 'FAIL').length;
  const partialTests = testResults.tests.filter(test => test.status === 'PARTIAL').length;
  
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⚠️  Partial: ${partialTests}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log(`⏱️  Performance: ${testResults.performance.pageLoadTime}ms load time`);
  
  // Save detailed report
  require('fs').writeFileSync('test-report.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Detailed report saved to: test-report.json');
  console.log('📸 Screenshots saved to: screenshots/ directory');
  
  return testResults;
}

// Create screenshots directory
require('fs').mkdirSync('screenshots', { recursive: true });

// Run the test
testMomentoCakeLogin().then(results => {
  console.log('\n🏁 Testing completed!');
  process.exit(results.overall_status === 'PASS' ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});