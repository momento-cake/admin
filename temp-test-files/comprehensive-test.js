const { chromium } = require('playwright');
const fs = require('fs');

async function comprehensiveTest() {
  console.log('🚀 Comprehensive Momento Cake Admin Test Suite');
  console.log('==============================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Add some delay to better observe
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testResults = {
    timestamp: new Date().toISOString(),
    baseUrl: 'https://momentocake-admin.web.app',
    tests: [],
    screenshots: [],
    routes: {},
    performance: {},
    errors: [],
    overall_status: 'PARTIAL'
  };

  // Set up error and console monitoring
  page.on('console', message => {
    if (message.type() === 'error') {
      testResults.errors.push({
        type: 'console',
        message: message.text(),
        timestamp: new Date().toISOString()
      });
    }
  });

  page.on('pageerror', error => {
    testResults.errors.push({
      type: 'page',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  });

  try {
    console.log('\n🌐 Test 1: Root URL Analysis');
    console.log('============================');
    
    const startTime = Date.now();
    const response = await page.goto(testResults.baseUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    const loadTime = Date.now() - startTime;
    
    testResults.performance.rootLoadTime = loadTime;
    testResults.routes['/'] = {
      status: response.status(),
      loadTime: loadTime,
      finalUrl: page.url()
    };
    
    console.log(`✅ Status: ${response.status()}`);
    console.log(`✅ Load time: ${loadTime}ms`);
    console.log(`✅ Final URL: ${page.url()}`);
    
    // Take screenshot of root
    await page.screenshot({ 
      path: 'screenshots/01-root.png',
      fullPage: true 
    });
    testResults.screenshots.push('01-root.png');
    
    // Check if stuck on redirect
    const pageContent = await page.evaluate(() => {
      return {
        text: document.body.innerText,
        hasSpinner: !!document.querySelector('[class*="animate-spin"], [class*="spinner"], [class*="loading"]'),
        isRedirecting: document.body.innerText.includes('Redirecionando')
      };
    });
    
    console.log(`📄 Page content: "${pageContent.text}"`);
    console.log(`🔄 Has spinner: ${pageContent.hasSpinner}`);
    console.log(`↗️  Is redirecting: ${pageContent.isRedirecting}`);
    
    testResults.tests.push({
      name: 'Root URL Access',
      status: pageContent.isRedirecting ? 'PARTIAL' : 'PASS',
      details: pageContent
    });

    console.log('\n🔍 Test 2: Direct Route Testing');
    console.log('================================');
    
    // Test common routes
    const routesToTest = [
      '/login',
      '/auth/login',
      '/signin',
      '/dashboard',
      '/home'
    ];
    
    for (const route of routesToTest) {
      console.log(`\nTesting route: ${route}`);
      try {
        const routeStartTime = Date.now();
        const routeResponse = await page.goto(testResults.baseUrl + route, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        const routeLoadTime = Date.now() - routeStartTime;
        
        await page.waitForTimeout(2000); // Wait for any client-side routing
        
        const routeContent = await page.evaluate(() => ({
          text: document.body.innerText.substring(0, 200),
          title: document.title,
          url: window.location.href,
          hasForm: document.querySelectorAll('form').length > 0,
          hasInputs: document.querySelectorAll('input').length > 0,
          hasButtons: document.querySelectorAll('button').length > 0,
          isRedirecting: document.body.innerText.includes('Redirecionando')
        }));
        
        testResults.routes[route] = {
          status: routeResponse.status(),
          loadTime: routeLoadTime,
          finalUrl: page.url(),
          content: routeContent
        };
        
        console.log(`  ✅ Status: ${routeResponse.status()}`);
        console.log(`  ✅ Load time: ${routeLoadTime}ms`);
        console.log(`  ✅ Final URL: ${page.url()}`);
        console.log(`  📝 Has form: ${routeContent.hasForm}`);
        console.log(`  📝 Has inputs: ${routeContent.hasInputs}`);
        console.log(`  🔘 Has buttons: ${routeContent.hasButtons}`);
        console.log(`  📄 Content preview: "${routeContent.text}"`);
        
        // Take screenshot if different from redirect page
        if (!routeContent.isRedirecting) {
          await page.screenshot({ 
            path: `screenshots/02-route-${route.replace('/', '')}.png`,
            fullPage: true 
          });
          testResults.screenshots.push(`02-route-${route.replace('/', '')}.png`);
        }
        
        // If we found a page with actual content, test it further
        if (!routeContent.isRedirecting && (routeContent.hasForm || routeContent.hasInputs || routeContent.hasButtons)) {
          console.log(`  🎯 Found interactive content on ${route}!`);
          await testLoginPage(page, route, testResults);
        }
        
      } catch (error) {
        console.log(`  ❌ Error accessing ${route}: ${error.message}`);
        testResults.routes[route] = {
          status: 'ERROR',
          error: error.message
        };
      }
    }

    console.log('\n⚡ Test 3: Performance Analysis');
    console.log('===============================');
    
    // Go back to root for performance testing
    await page.goto(testResults.baseUrl, { waitUntil: 'networkidle' });
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        return {
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          loadComplete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          totalLoadTime: Math.round(navigation.loadEventEnd - navigation.navigationStart),
          firstPaint: Math.round(navigation.responseStart - navigation.navigationStart),
          responseTime: Math.round(navigation.responseEnd - navigation.responseStart)
        };
      }
      return null;
    });
    
    if (performanceMetrics) {
      testResults.performance = { ...testResults.performance, ...performanceMetrics };
      console.log(`✅ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`✅ Load Complete: ${performanceMetrics.loadComplete}ms`);
      console.log(`✅ Total Load Time: ${performanceMetrics.totalLoadTime}ms`);
      console.log(`✅ First Paint: ${performanceMetrics.firstPaint}ms`);
      console.log(`✅ Response Time: ${performanceMetrics.responseTime}ms`);
    }

    console.log('\n📱 Test 4: Responsive Design');
    console.log('=============================');
    
    const viewports = [
      { name: 'Mobile', width: 390, height: 844 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 }
    ];
    
    for (const viewport of viewports) {
      console.log(`\nTesting ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      await page.screenshot({ 
        path: `screenshots/03-responsive-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
      testResults.screenshots.push(`03-responsive-${viewport.name.toLowerCase()}.png`);
      
      const responsiveCheck = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        hasVerticalScroll: document.body.scrollHeight > window.innerHeight
      }));
      
      console.log(`  ✅ Viewport: ${responsiveCheck.viewportWidth}x${responsiveCheck.viewportHeight}`);
      console.log(`  📏 Horizontal scroll: ${responsiveCheck.hasHorizontalScroll}`);
      console.log(`  📏 Vertical scroll: ${responsiveCheck.hasVerticalScroll}`);
    }

    console.log('\n🛡️ Test 5: Security Headers');
    console.log('============================');
    
    const headers = response.headers();
    const securityHeaders = {
      'content-security-policy': headers['content-security-policy'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'strict-transport-security': headers['strict-transport-security']
    };
    
    console.log('Security headers:');
    Object.entries(securityHeaders).forEach(([header, value]) => {
      console.log(`  ${value ? '✅' : '❌'} ${header}: ${value || 'Not set'}`);
    });
    
    testResults.tests.push({
      name: 'Security Headers',
      status: Object.values(securityHeaders).some(v => v) ? 'PARTIAL' : 'FAIL',
      details: securityHeaders
    });

    console.log('\n📊 Test 6: Firebase Hosting Analysis');
    console.log('====================================');
    
    const hostingInfo = await page.evaluate(() => {
      const isFirebase = window.location.hostname.includes('web.app') || 
                        window.location.hostname.includes('firebaseapp.com');
      
      return {
        isFirebaseHosting: isFirebase,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        userAgent: navigator.userAgent,
        cookies: document.cookie.split(';').length
      };
    });
    
    console.log(`✅ Firebase Hosting: ${hostingInfo.isFirebaseHosting}`);
    console.log(`✅ Hostname: ${hostingInfo.hostname}`);
    console.log(`✅ Protocol: ${hostingInfo.protocol}`);
    console.log(`🍪 Cookies: ${hostingInfo.cookies}`);
    
    testResults.tests.push({
      name: 'Firebase Hosting',
      status: hostingInfo.isFirebaseHosting ? 'PASS' : 'FAIL',
      details: hostingInfo
    });

  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.errors.push({
      type: 'execution',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    await browser.close();
  }

  // Generate final report
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=============================');
  
  const passedTests = testResults.tests.filter(test => test.status === 'PASS').length;
  const failedTests = testResults.tests.filter(test => test.status === 'FAIL').length;
  const partialTests = testResults.tests.filter(test => test.status === 'PARTIAL').length;
  
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`⚠️  Partial: ${partialTests}`);
  console.log(`📸 Screenshots: ${testResults.screenshots.length}`);
  console.log(`⚠️  Errors: ${testResults.errors.length}`);
  
  // Route analysis summary
  console.log('\n🛣️  ROUTE ANALYSIS:');
  Object.entries(testResults.routes).forEach(([route, info]) => {
    console.log(`  ${route}: ${info.status} (${info.loadTime || 'N/A'}ms)`);
    if (info.content && !info.content.isRedirecting) {
      console.log(`    → Content found: forms=${info.content.hasForm}, inputs=${info.content.hasInputs}, buttons=${info.content.hasButtons}`);
    }
  });
  
  // Determine overall status
  if (passedTests >= partialTests + failedTests) {
    testResults.overall_status = 'PASS';
  } else if (passedTests > 0 || partialTests > 0) {
    testResults.overall_status = 'PARTIAL';
  } else {
    testResults.overall_status = 'FAIL';
  }
  
  // Main findings
  console.log('\n🔍 KEY FINDINGS:');
  const workingRoutes = Object.entries(testResults.routes)
    .filter(([_, info]) => info.content && !info.content.isRedirecting)
    .map(([route, _]) => route);
  
  if (workingRoutes.length === 0) {
    console.log('❌ No functional login pages found');
    console.log('⚠️  Application appears to be stuck on redirect/loading screen');
    console.log('💡 This suggests potential issues with:');
    console.log('   - Client-side routing configuration');
    console.log('   - Firebase Auth initialization');
    console.log('   - Build/deployment configuration');
  } else {
    console.log(`✅ Found ${workingRoutes.length} functional route(s): ${workingRoutes.join(', ')}`);
  }
  
  if (testResults.errors.length > 0) {
    console.log(`⚠️  ${testResults.errors.length} error(s) detected in browser console`);
  }
  
  // Save comprehensive report
  fs.writeFileSync('comprehensive-test-report.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 Comprehensive report saved to: comprehensive-test-report.json');
  console.log('📸 Screenshots saved to: screenshots/ directory');
  
  return testResults;
}

// Helper function to test login functionality when found
async function testLoginPage(page, route, testResults) {
  console.log(`\n  🧪 Testing login functionality on ${route}`);
  
  try {
    // Look for form elements
    const formElements = await page.evaluate(() => {
      return {
        inputs: Array.from(document.querySelectorAll('input')).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        })),
        buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          type: btn.type,
          id: btn.id
        })),
        links: Array.from(document.querySelectorAll('a')).map(link => ({
          text: link.textContent?.trim(),
          href: link.href
        }))
      };
    });
    
    console.log(`    📝 Found ${formElements.inputs.length} inputs`);
    console.log(`    🔘 Found ${formElements.buttons.length} buttons`);
    console.log(`    🔗 Found ${formElements.links.length} links`);
    
    // Try to interact with form if found
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = await page.locator('button[type="submit"], button:has-text("Entrar")').first();
    const firstAccessButton = await page.locator('*:has-text("Primeiro Acesso")').first();
    
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('test@example.com');
      console.log(`    ✅ Email input: Successfully filled`);
    }
    
    if (await passwordInput.isVisible().catch(() => false)) {
      await passwordInput.fill('testpassword');
      console.log(`    ✅ Password input: Successfully filled`);
    }
    
    if (await firstAccessButton.isVisible().catch(() => false)) {
      const buttonText = await firstAccessButton.textContent();
      console.log(`    ✅ First Access Button found: "${buttonText.trim()}"`);
      await firstAccessButton.hover();
    }
    
    // Take screenshot of the working login page
    await page.screenshot({ 
      path: `screenshots/04-login-page-${route.replace('/', '')}.png`,
      fullPage: true 
    });
    testResults.screenshots.push(`04-login-page-${route.replace('/', '')}.png`);
    
    testResults.tests.push({
      name: `Login Page Functionality (${route})`,
      status: 'PASS',
      details: formElements
    });
    
  } catch (error) {
    console.log(`    ❌ Error testing login functionality: ${error.message}`);
    testResults.tests.push({
      name: `Login Page Functionality (${route})`,
      status: 'FAIL',
      details: error.message
    });
  }
}

// Create screenshots directory
fs.mkdirSync('screenshots', { recursive: true });

// Run the comprehensive test
comprehensiveTest().then(results => {
  console.log('\n🏁 Comprehensive testing completed!');
  process.exit(results.overall_status === 'PASS' ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});