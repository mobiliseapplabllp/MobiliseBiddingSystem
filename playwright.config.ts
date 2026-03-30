import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
    screenshot: 'on',              // Screenshot EVERY test (pass or fail)
    video: 'retain-on-failure',    // Keep video only for failures
    trace: 'retain-on-failure',    // Keep trace only for failures
    launchOptions: {
      slowMo: 1200,
    },
  },
  reporter: [
    ['list'],
    ['json', { outputFile: 'e2e/test-results/report.json' }],
  ],
  outputDir: './e2e/test-results',
});
