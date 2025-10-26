import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1,
  /* Increase timeout for login and authentication flows */
  timeout: 60 * 1000,
  reporter: [
    ['html', { outputFolder: '../../test-results/clients' }],
    ['json', { outputFile: '../../test-results/clients/results.json' }],
    ['junit', { outputFile: '../../test-results/clients/junit.xml' }],
    ['list']
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on',
    screenshot: 'on',
    video: 'on'
  },

  webServer: {
    command: 'PORT=3002 npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
})
