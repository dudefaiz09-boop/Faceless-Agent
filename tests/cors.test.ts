import request from 'supertest';
import app from '../apps/functions/src/app.ts';

describe('CORS Integration Tests', () => {
  const origin = 'https://educonnect-web-iota.vercel.app';

  describe('OPTIONS /api/notifications', () => {
    it('should return 204 with correct CORS headers and no auth required', async () => {
      const res = await request(app)
        .options('/api/notifications')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization,x-school-id,content-type');

      expect(res.status).toBe(204);
      expect(res.header['access-control-allow-origin']).toBe(origin);
      expect(res.header['access-control-allow-credentials']).toBe('true');
      expect(res.header['access-control-allow-methods']).toContain('GET');
      expect(res.header['access-control-allow-headers']).toContain('authorization');
      expect(res.header['access-control-allow-headers']).toContain('x-school-id');
      expect(res.header['access-control-allow-headers']).toContain('content-type');
    });
  });

  describe('GET /api/notifications', () => {
    it('should return 401 and include Access-Control-Allow-Origin header', async () => {
      const res = await request(app).get('/api/notifications').set('Origin', origin);

      expect(res.status).toBe(401);
      expect(res.header['access-control-allow-origin']).toBe(origin);
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 and include Access-Control-Allow-Origin when Origin header is present', async () => {
      const res = await request(app).get('/api/health').set('Origin', origin);

      expect(res.status).toBe(200);
      expect(res.header['access-control-allow-origin']).toBe(origin);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('CORS Security', () => {
    it('should not allow unauthorized origins', async () => {
      const unauthorizedOrigin = 'https://malicious-site.com';
      const res = await request(app).get('/api/health').set('Origin', unauthorizedOrigin);

      expect(res.header['access-control-allow-origin']).toBeUndefined();
    });

    it('should allow wildcard vercel subdomains', async () => {
      const vercelOrigin = 'https://app-name-git-branch-user.vercel.app';
      const res = await request(app).get('/api/health').set('Origin', vercelOrigin);

      expect(res.header['access-control-allow-origin']).toBe(vercelOrigin);
    });
  });
});
