import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm --filter @educonnect/web dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        env: {
          VITE_SUPABASE_URL:
            process.env.VITE_SUPABASE_URL ||
            process.env.SUPABASE_URL ||
            'https://example.supabase.co',
          VITE_SUPABASE_ANON_KEY:
            process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'test-anon-key',
          VITE_SUPABASE_UPLOADS_BUCKET:
            process.env.VITE_SUPABASE_UPLOADS_BUCKET ||
            process.env.SUPABASE_UPLOADS_BUCKET ||
            'educonnect-uploads',
          VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '/api',
        },
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
