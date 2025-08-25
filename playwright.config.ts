import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './pw-tests',
  timeout: 30_000,
  // Define explicit projects so we can target --project=chromium in local/CI runs
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium', headless: true }
    }
    // Additional browsers (firefox, webkit) can be added later for broader coverage
  ],
  use: {
    headless: true,
    viewport: { width: 800, height: 600 },
    ignoreHTTPSErrors: true,
    trace: process.env.CI ? 'retain-on-failure' : 'off',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [
        ['list'],
        ['json', { outputFile: 'playwright-report.json' }],
        ['junit', { outputFile: 'playwright-junit.xml' }],
        ['html', { outputFolder: 'playwright-html-report', open: 'never' }]
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-html-report', open: 'never' }]
      ]
});
