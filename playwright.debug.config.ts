import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:4000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No global setup/teardown
  timeout: 120 * 1000,

  expect: {
    timeout: 10 * 1000,
  },
});
