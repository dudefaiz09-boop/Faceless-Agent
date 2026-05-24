import { expect, type Page, type TestInfo } from '@playwright/test';
import type { QaRole, QaRoute } from './routes';

const ignoredConsoleFragments = [
  'Failed to load resource: the server responded with a status of 403',
  'Failed to load resource: the server responded with a status of 404',
  'Failed to load resource: the server responded with a status of 429',
  'ApiTenantError: Tenant context missing or denied',
  'favicon',
  'Supabase',
  'Auth session missing',
];

export function storageStatePath(role: QaRole) {
  return `qa/.auth/${role}.json`;
}

export function getRoleCredentials(role: QaRole) {
  const prefix = `WEB_QA_${role.toUpperCase().replace(/-/g, '_')}`;
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  return { email, password };
}

export function hasRoleCredentials(role: QaRole) {
  const { email, password } = getRoleCredentials(role);
  return Boolean(email && password);
}

export function attachConsoleErrorGuard(page: Page) {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (ignoredConsoleFragments.some((fragment) => text.includes(fragment))) return;
    errors.push(text);
  });

  page.on('pageerror', (error) => {
    const message = error.message;
    if (ignoredConsoleFragments.some((fragment) => message.includes(fragment))) return;
    errors.push(message);
  });

  return () => errors;
}

export async function loginAsRole(page: Page, role: QaRole) {
  const { email, password } = getRoleCredentials(role);

  if (!email || !password) {
    throw new Error(
      `Missing test credentials for ${role}. Set WEB_QA_${role.toUpperCase()}_EMAIL and WEB_QA_${role.toUpperCase()}_PASSWORD.`
    );
  }

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

export async function loginFirstConfiguredRole(page: Page) {
  const role = process.env.WEB_QA_DEFAULT_ROLE as QaRole | undefined;
  if (role && hasRoleCredentials(role)) {
    await loginAsRole(page, role);
    return true;
  }

  const email = process.env.WEB_QA_EMAIL;
  const password = process.env.WEB_QA_PASSWORD;

  if (!email || !password) return false;

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
  return true;
}

export async function visitRoute(page: Page, route: QaRoute) {
  await page.goto(route.path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

export async function assertRouteLoaded(page: Page, route: QaRoute, authenticated: boolean) {
  const body = page.locator('body');
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(
    /Something went wrong|Application error|Invalid web environment/i
  );

  if (route.authRequired && !authenticated) {
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    return;
  }

  if (route.name === 'login') {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  }
}

export async function assertAccessState(page: Page, shouldHaveAccess: boolean) {
  const body = page.locator('body');
  await expect(body).toBeVisible();
  await expect(body).not.toContainText(
    /Something went wrong|Application error|Invalid web environment/i
  );

  if (shouldHaveAccess) {
    await expect(body).not.toContainText(/Access denied/i);
  } else {
    await expect(body).toContainText(/Access denied/i);
  }
}

export async function stabilizePage(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(500);
}

export async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(name, { body: screenshot, contentType: 'image/png' });
}
