import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
    /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers:  1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['line']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    trace: 'retain-on-failure'
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'api-testing',
      testDir: './tests/api-tests',
      dependencies: ['api-smoke-tests'],
    },
    {
      name: 'api-smoke-tests',
      testDir: './tests/api-tests',
      testMatch: 'smokeTest.spec.ts',
    },
    {
      name: 'ui-testing',
      testDir: './tests/ui-tests',
      use:{
        defaultBrowserType: 'chromium'
      }
    }

  ],

});
