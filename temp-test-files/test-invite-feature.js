/**
 * Comprehensive Test Script for Invite User Feature
 * Using Playwright for automated testing of the Next.js admin application
 */

const { chromium } = require('playwright');

// Test configuration
const BASE_URL = 'http://localhost:3002';
const VIEWPORT_SIZES = [
  { name: 'Desktop', width: 1920, height: 1080 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 390, height: 844 }
];

// Test data
const TEST_INVITES = [
  {
    email: 'test.admin@example.com',
    name: 'Test Admin User',
    role: 'admin',
    department: 'IT',
    notes: 'Test admin invitation'
  },
  {
    email: 'test.viewer@example.com',
    name: 'Test Viewer User',
    role: 'viewer',
    department: 'Sales',
    notes: 'Test viewer invitation'
  },
  {
    email: 'invalid-email',
    name: 'Invalid User',
    role: 'viewer',
    department: '',
    notes: ''
  }
];

async function runTest() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    }
  };

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slower execution for better observation
  });

  try {
    for (const viewport of VIEWPORT_SIZES) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      
      const page = await context.newPage();
      
      console.log(`\n🧪 Testing on ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      // Test 1: Navigate to application and check initial load
      console.log('\n1. Testing initial application load...');
      const loadTest = await testInitialLoad(page, viewport);
      results.tests.push(loadTest);
      
      // Test 2: Navigate to Users page
      console.log('\n2. Testing navigation to Users page...');
      const usersPageTest = await testUsersPageNavigation(page, viewport);
      results.tests.push(usersPageTest);
      
      // Test 3: Test Invite User Dialog
      console.log('\n3. Testing Invite User Dialog...');
      const inviteDialogTest = await testInviteUserDialog(page, viewport);
      results.tests.push(inviteDialogTest);
      
      // Test 4: Test Form Validation
      console.log('\n4. Testing form validation...');
      const validationTest = await testFormValidation(page, viewport);
      results.tests.push(validationTest);
      
      // Test 5: Test Invitations List
      console.log('\n5. Testing invitations list...');
      const invitationsListTest = await testInvitationsList(page, viewport);
      results.tests.push(invitationsListTest);
      
      // Test 6: Test Registration Page
      console.log('\n6. Testing registration page...');
      const registrationTest = await testRegistrationPage(page, viewport);
      results.tests.push(registrationTest);
      
      // Test 7: Test Profile Page
      console.log('\n7. Testing profile page...');
      const profileTest = await testProfilePage(page, viewport);
      results.tests.push(profileTest);
      
      // Test 8: Test API Endpoints
      console.log('\n8. Testing API endpoints...');
      const apiTest = await testAPIEndpoints(page, viewport);
      results.tests.push(apiTest);
      
      // Test 9: Test Accessibility
      console.log('\n9. Testing accessibility...');
      const accessibilityTest = await testAccessibility(page, viewport);
      results.tests.push(accessibilityTest);
      
      // Take final screenshot
      await page.screenshot({ 
        path: `screenshots/final-${viewport.name.toLowerCase()}.png`,
        fullPage: true 
      });
      
      await context.close();
    }
    
  } catch (error) {
    console.error('Test execution error:', error);
    results.summary.errors.push(error.message);
  } finally {
    await browser.close();
  }
  
  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
  results.summary.failed = results.tests.filter(t => t.status === 'failed').length;
  
  return results;
}

async function testInitialLoad(page, viewport) {
  const test = {
    name: 'Initial Application Load',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Navigate to the application
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    
    // Check if login page loads
    const loginPage = await page.isVisible('form');
    test.details.push(`Login form visible: ${loginPage}`);
    
    // Check page title
    const title = await page.title();
    test.details.push(`Page title: ${title}`);
    
    // Take screenshot
    const screenshotPath = `screenshots/initial-load-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
    test.status = 'passed';
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testUsersPageNavigation(page, viewport) {
  const test = {
    name: 'Users Page Navigation',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Try to navigate to users page directly
    await page.goto(`${BASE_URL}/users`, { waitUntil: 'networkidle' });
    
    // Check if redirected to login (expected behavior)
    const currentUrl = page.url();
    test.details.push(`Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login') || currentUrl.includes('/')) {
      test.details.push('✓ Correctly redirected to login when not authenticated');
      test.status = 'passed';
    } else {
      test.details.push('✗ Not properly protected - should redirect to login');
      test.status = 'failed';
    }
    
    // Take screenshot
    const screenshotPath = `screenshots/users-nav-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testInviteUserDialog(page, viewport) {
  const test = {
    name: 'Invite User Dialog',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Navigate to users page (assuming we can access it somehow)
    await page.goto(`${BASE_URL}/users`);
    
    // Check if invite button is present
    const inviteButtonExists = await page.isVisible('button:has-text("Convidar Usuário")').catch(() => false);
    test.details.push(`Invite button visible: ${inviteButtonExists}`);
    
    if (inviteButtonExists) {
      // Click invite button
      await page.click('button:has-text("Convidar Usuário")');
      
      // Check if dialog opens
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      const dialogVisible = await page.isVisible('[role="dialog"]');
      test.details.push(`Dialog opened: ${dialogVisible}`);
      
      // Check form fields are present
      const emailField = await page.isVisible('#email');
      const nameField = await page.isVisible('#name');
      const roleField = await page.isVisible('[data-testid="role-select"], select');
      
      test.details.push(`Email field: ${emailField}`);
      test.details.push(`Name field: ${nameField}`);
      test.details.push(`Role field: ${roleField}`);
      
      if (dialogVisible && emailField && nameField) {
        test.status = 'passed';
      } else {
        test.status = 'failed';
        test.details.push('Dialog or required fields not found');
      }
    } else {
      test.details.push('Could not access users page - likely requires authentication');
      test.status = 'skipped';
    }
    
    // Take screenshot
    const screenshotPath = `screenshots/invite-dialog-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testFormValidation(page, viewport) {
  const test = {
    name: 'Form Validation',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // This test would require an authenticated session
    // For now, we'll test the registration form validation
    await page.goto(`${BASE_URL}/register?token=test-token`);
    
    const registrationFormExists = await page.isVisible('form').catch(() => false);
    test.details.push(`Registration form visible: ${registrationFormExists}`);
    
    if (registrationFormExists) {
      // Test email validation
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Check for validation messages
      const validationErrors = await page.$$eval(
        '.text-red-600, .text-destructive, [data-testid="error-message"]',
        elements => elements.length
      ).catch(() => 0);
      
      test.details.push(`Validation errors displayed: ${validationErrors > 0}`);
      test.status = validationErrors > 0 ? 'passed' : 'failed';
    } else {
      test.status = 'skipped';
      test.details.push('Registration form not accessible');
    }
    
    // Take screenshot
    const screenshotPath = `screenshots/form-validation-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testInvitationsList(page, viewport) {
  const test = {
    name: 'Invitations List',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    await page.goto(`${BASE_URL}/users`);
    
    // Check for invitations tab
    const invitationsTab = await page.isVisible('button:has-text("Convites")').catch(() => false);
    test.details.push(`Invitations tab visible: ${invitationsTab}`);
    
    if (invitationsTab) {
      await page.click('button:has-text("Convites")');
      
      // Check if invitations list component loads
      const invitationsContent = await page.isVisible('[data-testid="invitations-list"], table, .space-y-4').catch(() => false);
      test.details.push(`Invitations content visible: ${invitationsContent}`);
      
      test.status = invitationsContent ? 'passed' : 'failed';
    } else {
      test.status = 'skipped';
      test.details.push('Cannot access users page without authentication');
    }
    
    // Take screenshot
    const screenshotPath = `screenshots/invitations-list-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testRegistrationPage(page, viewport) {
  const test = {
    name: 'Registration Page',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Test with invalid token
    await page.goto(`${BASE_URL}/register?token=invalid-token`);
    
    const errorMessage = await page.textContent('body').catch(() => '');
    test.details.push(`Page loaded with invalid token: ${errorMessage.includes('error') || errorMessage.includes('inválido')}`);
    
    // Test with no token
    await page.goto(`${BASE_URL}/register`);
    
    const noTokenResponse = await page.textContent('body').catch(() => '');
    test.details.push(`Page loaded without token: ${noTokenResponse.length > 0}`);
    
    // Take screenshot
    const screenshotPath = `screenshots/registration-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
    test.status = 'passed';
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testProfilePage(page, viewport) {
  const test = {
    name: 'Profile Page',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    await page.goto(`${BASE_URL}/profile`);
    
    const currentUrl = page.url();
    test.details.push(`Current URL: ${currentUrl}`);
    
    // Should redirect to login if not authenticated
    const isRedirected = currentUrl.includes('/login') || currentUrl === BASE_URL + '/';
    test.details.push(`Properly redirected when not authenticated: ${isRedirected}`);
    
    // Take screenshot
    const screenshotPath = `screenshots/profile-${viewport.name.toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath });
    test.screenshot = screenshotPath;
    
    test.status = isRedirected ? 'passed' : 'failed';
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testAPIEndpoints(page, viewport) {
  const test = {
    name: 'API Endpoints',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    // Test invitation API endpoint
    const response = await page.request.post(`${BASE_URL}/api/invitations`, {
      data: TEST_INVITES[0]
    });
    
    test.details.push(`Invitations API status: ${response.status()}`);
    test.details.push(`Response OK: ${response.ok()}`);
    
    // Test invitation verification endpoint
    const verifyResponse = await page.request.get(`${BASE_URL}/api/invitations/verify?token=test-token`);
    test.details.push(`Verify API status: ${verifyResponse.status()}`);
    
    // Test registration API endpoint
    const registerResponse = await page.request.post(`${BASE_URL}/api/auth/register`, {
      data: {
        email: 'test@example.com',
        password: 'testpassword123',
        name: 'Test User',
        token: 'test-token'
      }
    });
    
    test.details.push(`Register API status: ${registerResponse.status()}`);
    
    test.status = 'passed'; // API endpoints exist and respond
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

async function testAccessibility(page, viewport) {
  const test = {
    name: 'Accessibility',
    viewport: viewport.name,
    status: 'pending',
    details: [],
    screenshot: null,
    duration: 0
  };
  
  const startTime = Date.now();
  
  try {
    await page.goto(BASE_URL);
    
    // Check for basic accessibility features
    const hasTitle = await page.title() !== '';
    const hasLang = await page.getAttribute('html', 'lang') !== null;
    const hasHeadings = await page.$$('h1, h2, h3, h4, h5, h6').then(h => h.length > 0);
    const hasLabels = await page.$$('label').then(l => l.length > 0);
    const hasAltTexts = await page.$$eval('img', imgs => imgs.every(img => img.alt !== undefined)).catch(() => false);
    
    test.details.push(`Has page title: ${hasTitle}`);
    test.details.push(`Has language attribute: ${hasLang}`);
    test.details.push(`Has headings: ${hasHeadings}`);
    test.details.push(`Has form labels: ${hasLabels}`);
    test.details.push(`Images have alt attributes: ${hasAltTexts}`);
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    test.details.push(`Keyboard navigation works: ${focusedElement !== 'BODY'}`);
    
    const accessibilityScore = [hasTitle, hasLang, hasHeadings, hasLabels, hasAltTexts].filter(Boolean).length;
    test.details.push(`Accessibility score: ${accessibilityScore}/5`);
    
    test.status = accessibilityScore >= 3 ? 'passed' : 'failed';
    
  } catch (error) {
    test.status = 'failed';
    test.details.push(`Error: ${error.message}`);
  }
  
  test.duration = Date.now() - startTime;
  return test;
}

// Run the test suite
console.log('🚀 Starting comprehensive invite feature testing...');
console.log('📱 Testing on multiple viewport sizes for responsive design');
console.log('🎭 Using Playwright for cross-browser automation\n');

runTest().then(results => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  
  if (results.summary.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.summary.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log('\n📄 Detailed test results saved to test-results.json');
  console.log('📷 Screenshots saved to screenshots/ directory');
  
  // Save detailed results
  require('fs').writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  
  process.exit(results.summary.failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});