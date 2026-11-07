import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { env } from '../config/env';

describe('Phase 0: Health & Foundation API', () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGOURL);
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('GET /api/v1/health returns status ok and database up', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('db', 'up');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('service', 'QuotePilot Backend API');
  });

  it('GET /unknown-route returns standard 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(res.body.error.message).toContain('Cannot GET /api/v1/unknown-endpoint');
  });
});
