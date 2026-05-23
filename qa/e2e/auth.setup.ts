import { mkdir } from 'node:fs/promises';
import { test } from '@playwright/test';
import { getRoleCredentials, loginAsRole, storageStatePath } from './helpers';
import { qaRoles } from './routes';

test.describe('role auth state setup', () => {
  for (const role of qaRoles) {
    test(`create ${role} browser state`, async ({ page }) => {
      const { email, password } = getRoleCredentials(role);

      test.skip(!email || !password, `Missing ${role} QA credentials; skipping storage state creation.`);

      await mkdir('qa/.auth', { recursive: true });
      await loginAsRole(page, role);
      await page.context().storageState({ path: storageStatePath(role) });
    });
  }
});
