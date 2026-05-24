import { expect, test } from '@playwright/test';
import {
  attachConsoleErrorGuard,
  assertRouteLoaded,
  loginFirstConfiguredRole,
  visitRoute,
} from './helpers';
import { prRoutes, smokeRoutes } from './routes';

for (const mode of [
  { label: 'PR smoke checks @pr', routes: prRoutes },
  { label: 'full smoke checks @full', routes: smokeRoutes },
]) {
  test.describe(mode.label, () => {
    for (const route of mode.routes) {
      test(`${route.name} loads without crashing`, async ({ page }) => {
        const getConsoleErrors = attachConsoleErrorGuard(page);
        const authenticated = route.authRequired ? await loginFirstConfiguredRole(page) : false;

        await visitRoute(page, route);
        await assertRouteLoaded(page, route, authenticated);

        expect(getConsoleErrors(), `${route.name} should not emit console/page errors`).toEqual([]);
      });
    }
  });
}
