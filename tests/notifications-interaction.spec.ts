import { test, expect } from '@playwright/test';

async function seedAuthenticatedSession(page: import('@playwright/test').Page) {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://example.supabase.co';
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

  await page.route('**/rest/v1/documents**', async (route) => {
    const accept = route.request().headers().accept || '';
    const body = accept.includes('vnd.pgrst.object')
      ? {
          data: {
            roles: ['admin'],
            permissions: {},
            schoolId: 'tenant-a',
            assignedModules: [],
          },
        }
      : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.addInitScript(
    ({ storageKey }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          access_token: 'playwright-local-access-token',
          refresh_token: 'playwright-local-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: expiresAt,
          user: {
            id: 'playwright-user',
            email: 'playwright@educonnect.test',
            app_metadata: { roles: ['admin'] },
            user_metadata: { display_name: 'Playwright Admin' },
            aud: 'authenticated',
            role: 'authenticated',
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    },
    { storageKey: `sb-${projectRef}-auth-token` }
  );
}

test.describe('Notification Bell Interaction', () => {
  test('should open the notification dropdown on bell click', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.goto('/');

    const bellButton = page.locator('button[aria-label="Open notifications"]');
    await expect(bellButton).toBeVisible();

    await bellButton.click();

    const dropdown = page.locator('[role="dialog"][aria-label="Notifications"]');
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText('Notifications');

    await page.click('header');
    await expect(dropdown).not.toBeVisible();
  });

  test('should close on Escape key', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.goto('/');
    const bellButton = page.locator('button[aria-label="Open notifications"]');
    await bellButton.click();

    const dropdown = page.locator('[role="dialog"][aria-label="Notifications"]');
    await expect(dropdown).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });
});
