import { test, expect } from '@playwright/test';

test.describe('EduConnect Portal Login', () => {
  test('should load the login page correctly', async ({ page }) => {
    await page.goto('/');

    // Check for production branding
    await expect(page.locator('h1')).toContainText('EduConnect Portal');
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });

  test('should show error on invalid login', async ({ page }) => {
    await page.goto('/');

    await page.fill('input[type="email"]', 'wrong@educonnect.app');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Verify error message appears
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });
});
