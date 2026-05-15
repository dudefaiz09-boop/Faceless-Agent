import request from 'supertest';
import app from '../apps/functions/src/app.ts';

describe('API Smoke Tests', () => {
  it('GET /api/health returns healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({ status: 'healthy' }));
  });

  it('GET /api/ready returns 503 when required env is missing (no secrets leaked)', async () => {
    const oldUrl = process.env.SUPABASE_URL;
    const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body).toEqual(expect.objectContaining({ status: 'not_ready' }));
    expect(JSON.stringify(res.body)).not.toContain('SUPABASE_SERVICE_ROLE_KEY=');

    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;

    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
  });

  it('protected routes return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/users/create')
      .set('x-school-id', 'test-school')
      .send({});
    expect(res.status).toBe(401);
  });
});
