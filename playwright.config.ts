import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for MatchFlow
 *
 * Covers:
 *   - §11 P4: Accessibility axe-core scan (test/accessibility/)
 *   - §11 P5: E2E matchday scenario (test/e2e/)
 *
 * The webServer block auto-starts the Next.js dev server if WEB_BASE_URL
 * is not set externally (e.g. in CI pointing at a deployed preview URL).
 */
export default defineConfig({
  testDir: './test',
  testMatch: [
    '**/accessibility/**/*.test.ts',
    '**/e2e/**/*.test.ts',
    '**/integration/**/*.test.ts',
  ],

  // Maximum time a single test is allowed to run
  timeout: 60_000,

  // Retry once on CI to handle flaky network
  retries: process.env.CI ? 1 : 0,

  // Run each test file in parallel; isolate per file
  fullyParallel: false,
  workers: 1,

  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:3000',
    // Take screenshots on failure
    screenshot: 'only-on-failure',
    // Record video on first retry
    video: 'on-first-retry',
    // Standard viewport matching the Night Match design
    viewport: { width: 1280, height: 800 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start the Next.js dev server before running tests
  // Skip if WEB_BASE_URL is already pointing at an external host
  webServer: process.env.WEB_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -w apps/web',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
