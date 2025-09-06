import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Deployment Validation
 * 
 * Tests the deployed Firebase application at:
 * https://momentocake-admin-dev.web.app
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/deployment-*.spec.ts',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-deployment' }],
    ['json', { outputFile: 'deployment-test-results.json' }],
    ['list']
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL is the deployed Firebase application */
    baseURL: 'https://momentocake-admin-dev.web.app',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each test - longer for network requests */
    actionTimeout: 15000,
    
    /* Navigation timeout - longer for deployed app */
    navigationTimeout: 20000,
    
    /* Accept downloads */
    acceptDownloads: true,
    
    /* Ignore HTTPS errors for testing */
    ignoreHTTPSErrors: true,
  },

  /* Configure projects for major browsers and devices */
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        isMobile: true,
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
      },
    },
    {
      name: 'tablet-ipad',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
      },
    },
  ],

  /* Global timeout for each test */
  timeout: 60 * 1000, // 60 seconds for deployment tests
  
  /* Expect timeout */
  expect: {
    timeout: 10 * 1000, // 10 seconds for expect assertions
  },
  
  /* Output directory for test artifacts */
  outputDir: 'deployment-test-results/',
});