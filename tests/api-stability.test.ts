import request from 'supertest';
import app from '../apps/functions/src/app.js';
import { describe, it, expect } from '@jest/globals';

describe('API Stability and Middleware Flow', () => {
  describe('Public Routes', () => {
    it('GET /api/health should return 200 JSON', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 'healthy',
        })
      );
    });

    it('GET /api/ready should return 200 or 503 JSON', async () => {
      const res = await request(app).get('/api/ready');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('GET /api/ai/status should return 200 JSON', async () => {
      const res = await request(app).get('/api/ai/status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('allowedFreeModels');
    });
  });

  describe('Protected Routes - Unauthenticated', () => {
    const protectedRoutes = [
      '/api/notifications',
      '/api/announcements',
      '/api/attendance',
      '/api/assignments',
      '/api/library',
      '/api/fees',
      '/api/performance',
      '/api/teachers',
      '/api/chat',
      '/api/users',
      '/api/students',
    ];

    protectedRoutes.forEach((route) => {
      it(`GET ${route} without auth should return 401 JSON`, async () => {
        const res = await request(app).get(route);
        expect(res.status).toBe(401);
        expect(res.body).toEqual(
          expect.objectContaining({
            status: 'error',
            code: 'AUTH_MISSING',
            message: 'Authentication required',
            correlationId: expect.any(String),
          })
        );
        expect(res.header['x-correlation-id']).toBeTruthy();
      });
    });
  });

  describe('Protected Routes - Authenticated but Missing Tenant', () => {
    // We can't easily mock auth in a unit test without more setup,
    // but we can verify the middleware logic if we had a way to inject a user.
    // For now, these smoke tests cover the crash prevention.
  });
});
