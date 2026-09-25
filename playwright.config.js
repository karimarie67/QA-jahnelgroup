const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  projects: [
    {
      name: 'local',
      use: {
        baseURL: 'http://localhost:8000',
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    
    {
      name: 'staging',
      use: {
        // The site has no staging copy; staging points at the live site, where
        // every test is read-only.
        baseURL: 'https://www.jahnelgroup.com',
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    {
      name: 'production',
      use: {
        baseURL: 'https://www.jahnelgroup.com',
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    {
      name: 'staging-mobile',
      use: {
        // Phone emulation, not just a narrow window: on a phone the header
        // menu becomes a menu button that slides the menu in.
        ...devices['Pixel 5'],
        baseURL: 'https://www.jahnelgroup.com',
        headless: true,
        trace: 'on-first-retry',
      },
    },
    {
      name: 'production-mobile',
      use: {
        // Phone emulation, not just a narrow window: on a phone the header
        // menu becomes a menu button that slides the menu in.
        ...devices['Pixel 5'],
        baseURL: 'https://www.jahnelgroup.com',
        headless: true,
        trace: 'on-first-retry',
      },
    },
    // Special project for link checking - no traces/screenshots to avoid thousands of files
    {
      name: 'link-checker',
      testMatch: /check-links\.spec\.js$/,
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
      timeout: 1800000, // 30 minutes for link checking
      retries: 0, // Don't retry link checks
    },
  ],
  use: {
    screenshot: 'on',
    video: 'off',
  },
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  timeout: 90000,
  retries: 1,
  // One page at a time: the tests run against the live site.
  workers: 1,
});