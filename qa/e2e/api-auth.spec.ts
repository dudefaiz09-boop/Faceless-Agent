import { expect, test } from '@playwright/test';

const protectedApiPaths = [
  '/api/students',
  '/api/announcements',
  '/api/attendance',
  '/api/assignments',
  '/api/library',
  '/api/fees',
  '/api/performance',
  '/api/users',
];

test.describe('protected API authorization smoke checks @full', () => {
  test.skip(
    !/^https?:\/\//i.test((process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || '').trim()),
    'Protected API auth checks require an absolute API_BASE_URL or VITE_API_BASE_URL.'
  );

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'API checks run once.');
  });

  for (const path of protectedApiPaths) {
    test(`${path} rejects unauthenticated requests`, async ({ request }) => {
      const apiBaseUrl = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || '').trim();
      const url = `${apiBaseUrl.replace(/\/+$/, '')}${path.replace(/^\/api(?=\/|$)/, '')}`;
      const response = await request.get(url, { failOnStatusCode: false });
      expect([401, 403]).toContain(response.status());
    });
  }
});
