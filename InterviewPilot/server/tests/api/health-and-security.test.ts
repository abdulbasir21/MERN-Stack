import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

describe('Phase 0 — Health, CORS, and Error Handler (SEC-4, SEC-6)', () => {
  const app = createApp({ allowedOrigin: 'http://localhost:3000' });

  it('returns 200 OK from GET /api/health with X-Request-Id and security headers', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'ok',
      service: 'interviewpilot-api',
    });
    expect(typeof res.body.data.timestamp).toBe('string');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('rejects requests from an unauthorized CORS origin (SEC-4)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://malicious.example.com');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: {
        code: 'CORS_NOT_ALLOWED',
        message: 'Cross-origin request from this origin is not allowed.',
      },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('hides stack traces, SQL, and internal secrets on unhandled errors (SEC-6)', async () => {
    const res = await request(app).get('/api/__test/unhandled-error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected server error occurred.',
      },
    });
    const rawBody = JSON.stringify(res.body);
    expect(rawBody).not.toContain('SELECT * FROM users');
    expect(rawBody).not.toContain('SUPER_SECRET_LEAK');
    expect(rawBody).not.toContain('stack');
  });
});
