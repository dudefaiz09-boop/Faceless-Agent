import { test } from '@playwright/test';
import { assertRouteLoaded, loginFirstConfiguredRole, stabilizePage, visitRoute } from './helpers';
import { prRoutes, screenshotRoutes } from './routes';

const visualRoutes = process.env.QA_FULL_VISUAL === 'true' ? screenshotRoutes : prRoutes;

test.describe('Percy visual checks @visual', () => {
  let authenticated = false;

  test.beforeEach(async ({ page }) => {
    authenticated = await loginFirstConfiguredRole(page);
  });

  for (const route of visualRoutes) {
    test(`${route.name} visual check`, async ({ page }, testInfo) => {
      const { default: percySnapshot } = await import('@percy/playwright');

      await visitRoute(page, route);
      await assertRouteLoaded(page, route, authenticated);
      await stabilizePage(page);
      await percySnapshot(page, `${testInfo.project.name}-${route.name}`);
    });
  }
});
