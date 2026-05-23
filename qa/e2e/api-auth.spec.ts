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
  for (const path of protectedApiPaths) {
    test(`${path} rejects unauthenticated requests`, async ({ request }) => {
      const response = await request.get(path, { failOnStatusCode: false });
      expect([401, 403]).toContain(response.status());
    });
  }
});
