import app from '../api/index.js';
import request from 'supertest';
import { describe, it, expect } from '@jest/globals';

describe('Vercel Entrypoint Verification', () => {
  it('should export a function (Express app)', () => {
    expect(typeof app).toBe('function');
  });

  it('should respond to /api/health via the entrypoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('should respond to /api/version via the entrypoint', async () => {
    const res = await request(app).get('/api/version');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('app', 'educonnect-api');
  });

  it('OPTIONS /api/notifications should return 204 with CORS headers', async () => {
    const res = await request(app)
      .options('/api/notifications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
  });

  it('GET /api/notifications without auth should return 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });
});
