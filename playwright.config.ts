import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
  'pnpm --filter @educonnect/web build && pnpm --filter @educonnect/web preview --host 127.0.0.1 --port 4173';

const previewEnv = {
  VITE_ENVIRONMENT: process.env.VITE_ENVIRONMENT || 'preview',
  VITE_DEMO_MODE: process.env.VITE_DEMO_MODE || 'true',
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'qa-placeholder-anon-key',
  VITE_SUPABASE_UPLOADS_BUCKET: process.env.VITE_SUPABASE_UPLOADS_BUCKET || 'educonnect-uploads',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
};

export default defineConfig({
  testDir: './qa/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.02,
    },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: 'qa/results/playwright-artifacts',
  reporter: process.env.CI
    ? [['list'], ['html', { outputFolder: 'qa/results/playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'qa/results/playwright-report', open: 'on-failure' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: previewEnv,
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'desktop-chromium',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
    {
      name: 'tablet-chromium',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        isMobile: true,
        hasTouch: true,
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile-chromium',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
});
