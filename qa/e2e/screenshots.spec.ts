import { expect, test } from '@playwright/test';
import {
  assertRouteLoaded,
  attachConsoleErrorGuard,
  attachScreenshot,
  loginIfConfigured,
  stabilizePage,
  visitRoute,
} from './helpers';
import { screenshotRoutes } from './routes';

test.describe('responsive screenshots', () => {
  let authenticated = false;

  test.beforeEach(async ({ page }) => {
    authenticated = await loginIfConfigured(page);
  });

  for (const route of screenshotRoutes) {
    test(`${route.name} renders at current viewport`, async ({ page }, testInfo) => {
      const getConsoleErrors = attachConsoleErrorGuard(page);

      await visitRoute(page, route);
      await assertRouteLoaded(page, route, authenticated);
      await stabilizePage(page);
      await attachScreenshot(page, testInfo, `${testInfo.project.name}-${route.name}.png`);

      expect(getConsoleErrors(), `${route.name} should not emit console/page errors`).toEqual([]);
    });
  }
});
