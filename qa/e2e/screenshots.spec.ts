import { expect, test } from '@playwright/test';
import {
  assertRouteLoaded,
  attachConsoleErrorGuard,
  attachScreenshot,
  loginFirstConfiguredRole,
  stabilizePage,
  visitRoute,
} from './helpers';
import { prRoutes, screenshotRoutes } from './routes';

for (const mode of [
  { label: 'PR responsive screenshots @pr', routes: prRoutes },
  { label: 'full responsive screenshots @full', routes: screenshotRoutes },
]) {
  test.describe(mode.label, () => {
    let authenticated = false;

    test.beforeEach(async ({ page }) => {
      authenticated = await loginFirstConfiguredRole(page);
    });

    for (const route of mode.routes) {
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
}
