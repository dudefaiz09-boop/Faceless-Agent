import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import app from '../apps/functions/src/app.ts';

describe('Vercel Entrypoint Verification', () => {
  it('api/index.ts imports the Express app source directly', () => {
    const entrypoint = readFileSync(join(process.cwd(), 'api/index.ts'), 'utf8');

    expect(entrypoint).toContain('../apps/functions/src/app');
    expect(entrypoint).not.toContain('../apps/functions/dist/app.js');
    expect(entrypoint).not.toContain('../apps/functions/dist/index.js');
    expect(entrypoint).not.toContain('../apps/functions/src/index.ts');
  });

  it('source app exports an Express app function', () => {
    expect(typeof app).toBe('function');
  });

  describe('Public Diagnostic Routes Resilience', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // simulate missing critical env vars
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('should respond to /api/health even when Supabase env is missing', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'healthy');
    });

    it('should respond to /api/version even when Supabase env is missing', async () => {
      const res = await request(app).get('/api/version');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('app', 'educonnect-api');
      expect(res.body.nodeEnv).toBeDefined();
    });

    it('should respond to /api/ready with 503 when Supabase env is missing, not crash', async () => {
      const res = await request(app).get('/api/ready');
      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
      expect(res.body.missing).toContain('SUPABASE_URL');
    });
  });

  it('OPTIONS /api/notifications should return 204 with CORS headers', async () => {
    const res = await request(app)
      .options('/api/notifications')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization,x-school-id,content-type');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-methods']).toContain('GET');
    expect(res.headers['access-control-allow-headers']).toContain('authorization');
  });

  it('GET /api/notifications without auth should return 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });
});
