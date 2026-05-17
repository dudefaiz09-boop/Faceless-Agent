import { test, expect } from '@playwright/test';

test.describe('Notification Bell Interaction', () => {
  test('should open the notification dropdown on bell click', async ({ page }) => {
    await page.goto('/');

    // The bell button has aria-label="Open notifications"
    const bellButton = page.locator('button[aria-label="Open notifications"]');
    await expect(bellButton).toBeVisible();

    // Click the bell
    await bellButton.click();

    // Check if dropdown is visible via portal (role="dialog" and aria-label="Notifications")
    const dropdown = page.locator('div[role="dialog"][aria-label="Notifications"]');
    await expect(dropdown).toBeVisible();

    // Verify it contains a header with "Notifications"
    await expect(dropdown).toContainText('Notifications');

    // Close on click outside (click topbar background)
    await page.click('header');
    await expect(dropdown).not.toBeVisible();
  });

  test('should close on Escape key', async ({ page }) => {
    await page.goto('/');
    const bellButton = page.locator('button[aria-label="Open notifications"]');
    await bellButton.click();

    const dropdown = page.locator('div[role="dialog"][aria-label="Notifications"]');
    await expect(dropdown).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });
});
