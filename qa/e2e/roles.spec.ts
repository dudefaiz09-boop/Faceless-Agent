import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  assertAccessState,
  attachConsoleErrorGuard,
  hasRoleCredentials,
  storageStatePath,
  visitRoute,
} from "./helpers";
import { canRoleAccessRoute, protectedRoutes, qaRoles } from "./routes";

async function isInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  if (!box || !viewport) return false;

  return (
    box.x < viewport.width &&
    box.x + box.width > 0 &&
    box.y < viewport.height &&
    box.y + box.height > 0
  );
}

for (const role of qaRoles) {
  test.describe(`${role} role access matrix @full`, () => {
    test.use({ storageState: storageStatePath(role) });

    test.beforeEach(() => {
      test.skip(
        !hasRoleCredentials(role),
        `Missing ${role} QA credentials; skipping role matrix.`,
      );
    });

    for (const route of protectedRoutes) {
      const accessLabel = canRoleAccessRoute(role, route)
        ? "can access"
        : "is blocked from";

      test(`${role} ${accessLabel} ${route.name}`, async ({ page }) => {
        const getConsoleErrors = attachConsoleErrorGuard(page);
        const shouldHaveAccess = canRoleAccessRoute(role, route);

        await visitRoute(page, route);
        await assertAccessState(page, shouldHaveAccess);

        expect(
          getConsoleErrors(),
          `${role}/${route.name} should not emit console/page errors`,
        ).toEqual([]);
      });
    }

    test(`${role} can log out`, async ({ page }) => {
      await page.goto("/");
      const signOutButton = page.getByRole("button", { name: /sign out/i });
      const menuButton = page.getByRole("button", { name: /open navigation menu/i });

      try {
        await expect(signOutButton).toBeVisible({ timeout: 5_000 });
      } catch {
        await menuButton.click();
        await expect(signOutButton).toBeVisible();
      }

      if (!(await isInViewport(page, signOutButton)) && (await menuButton.isVisible())) {
        await menuButton.click();
        await expect(signOutButton).toBeVisible();
      }

      await Promise.all([
        page.waitForURL(/\/auth\/login/, { timeout: 15_000 }),
        signOutButton.click(),
      ]);
    });
  });
}
