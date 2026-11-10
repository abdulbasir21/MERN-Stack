import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import app from '../../src/app.js';
import { centralErrorHandler } from '../../src/middleware/errorHandler.js';

describe('Phase 0: Server Setup & Health Check', () => {
  it('GET /health returns 200 OK without exposing secrets or DB details', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('scopesentry-api');
    expect(res.body.data).toHaveProperty('timestamp');

    // Security assertions: Never expose internals
    expect(res.body.data).not.toHaveProperty('mongoUri');
    expect(res.body.data).not.toHaveProperty('database');
    expect(res.body.data).not.toHaveProperty('env');
    expect(res.body.data).not.toHaveProperty('credentials');
  });

  it('GET /api/v1/health also returns 200 OK', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('Unmapped routes return standardized 404 error format', async () => {
    const res = await request(app).get('/non-existent-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Resource not found');
    expect(res.body.error).not.toHaveProperty('stack');
  });

  it('Central error handler hides stack traces and sensitive error messages on 500', async () => {
    const errorApp = express();
    errorApp.use(express.json());
    errorApp.get('/trigger-crash', (req, res, next) => {
      const err = new Error('Database password was 123456');
      next(err);
    });
    errorApp.use(centralErrorHandler);

    const res = await request(errorApp).get('/trigger-crash');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.message).toBe('Internal server error');
    expect(res.body.error).not.toHaveProperty('stack');
    expect(res.body.error.message).not.toContain('password');
  });
});
