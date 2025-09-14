import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for ingredients management tests');
  
  try {
    // Log test completion
    console.log('📊 Test execution completed');
    
    // Future: Clean up any global test data if needed
    // Note: Individual test cleanup should handle most cases
    
    // Generate test summary if needed
    const testResults = process.env.PLAYWRIGHT_JSON_OUTPUT_NAME;
    if (testResults) {
      console.log(`📈 Test results saved to: ${testResults}`);
    }
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
  
  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown