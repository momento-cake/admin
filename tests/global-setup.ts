import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for ingredients management tests');
  
  // Start browser for pre-setup tasks if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if the app is running
    const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    console.log(`📍 Testing against: ${baseURL}`);
    
    // Basic health check
    await page.goto(baseURL, { timeout: 30000 });
    console.log('✅ Application is accessible');
    
    // Verify Firebase connection by checking login page
    try {
      await page.goto(`${baseURL}/login`, { timeout: 10000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      console.log('✅ Firebase authentication is accessible');
    } catch (error) {
      console.log('⚠️ Login page timeout, but continuing...');
    }
    
    // Test API endpoints are accessible
    const apiResponse = await page.request.get(`${baseURL}/api/ingredients`);
    if (apiResponse.status() === 401 || apiResponse.status() === 200) {
      console.log('✅ API endpoints are accessible');
    } else {
      console.warn(`⚠️ API returned status: ${apiResponse.status()}`);
    }
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup