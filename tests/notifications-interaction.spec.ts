import { test, expect } from '@playwright/test';

test.describe('Notification Bell Interaction', () => {
  test('should open the notification dropdown on bell click', async ({ page }) => {
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
    await page.goto('/');
    const bellButton = page.locator('button[aria-label="Open notifications"]');
    await bellButton.click();

    const dropdown = page.locator('[role="dialog"][aria-label="Notifications"]');
    await expect(dropdown).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dropdown).not.toBeVisible();
  });
});
