import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { env } from '../config/env';
import { User } from '../models/User';
import { createPlatformAdmin } from '../scripts/createPlatformAdmin';

describe('Phase 1: Authentication & Authorization Tests', () => {
  const app = createApp();

  const testCustomerEmail = `test.customer.${Date.now()}@example.com`;
  let customerToken: string;
  let customerId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGOURL);
    }
  });

  afterAll(async () => {
    // Clean up test documents specific to auth tests
    await User.deleteMany({ email: { $regex: /^test\.customer/ } });
  });

  // T-AUTH-01: Register customer with valid data
  it('T-AUTH-01: registers customer with valid data and returns 201 with token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Customer',
        email: testCustomerEmail,
        password: 'Password123!',
        phone: '+92 300 1234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testCustomerEmail.toLowerCase());
    expect(res.body.data.user.role).toBe('customer');
    expect(res.body.data.token).toBeDefined();

    customerToken = res.body.data.token;
    customerId = res.body.data.user.id;

    // Verify password is not plaintext in DB
    const dbUser = await User.findById(customerId).select('+passwordHash');
    expect(dbUser?.passwordHash).not.toBe('Password123!');
    expect(dbUser?.passwordHash.startsWith('$2')).toBe(true);
  });

  // T-AUTH-02: Duplicate email (case-insensitive) -> 409
  it('T-AUTH-02: duplicate email returns 409 conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Jane Duplicate',
        email: testCustomerEmail.toUpperCase(),
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // T-AUTH-03: Invalid email / short password -> 400
  it('T-AUTH-03: validation rejects invalid email and short password with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'J',
        email: 'invalid-email',
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  // T-AUTH-04: Login success and wrong password failure
  it('T-AUTH-04: login succeeds with correct credentials and fails generically with wrong password', async () => {
    // Correct login
    const successRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'Password123!',
      });

    expect(successRes.status).toBe(200);
    expect(successRes.body.data.token).toBeDefined();
    expect(successRes.body.data.user.role).toBe('customer');

    // Wrong password
    const failRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testCustomerEmail,
        password: 'WrongPassword!',
      });

    expect(failRes.status).toBe(401);
    expect(failRes.body.success).toBe(false);
    expect(failRes.body.error.code).toBe('UNAUTHENTICATED');
    expect(failRes.body.error.message).toBe('Invalid email or password.');
  });

  // T-AUTH-05: Blocked user login -> 403 ACCOUNT_BLOCKED
  it('T-AUTH-05: blocked user cannot log in and receives 403 ACCOUNT_BLOCKED', async () => {
    const blockedEmail = `blocked.${Date.now()}@example.com`;
    await User.create({
      name: 'Blocked User',
      email: blockedEmail,
      passwordHash: await import('../utils/auth').then((m) => m.hashPassword('Password123!')),
      role: 'customer',
      status: 'blocked',
      isSeedData: false,
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: blockedEmail,
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
  });

  // T-AUTH-06: Protected route without/invalid token -> 401
  it('T-AUTH-06: protected route without token returns 401', async () => {
    const noTokenRes = await request(app).get('/api/v1/auth/me');
    expect(noTokenRes.status).toBe(401);
    expect(noTokenRes.body.error.code).toBe('UNAUTHENTICATED');

    const badTokenRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(badTokenRes.status).toBe(401);
  });

  // GET /auth/me with valid token
  it('GET /api/v1/auth/me returns authenticated user details', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(customerId);
    expect(res.body.data.user.email).toBe(testCustomerEmail.toLowerCase());
  });

  // T-AUTH-09: Platform admin script creates admin with role platform_admin
  it('T-AUTH-09: platform admin script creates platform_admin and login works', async () => {
    const admin = await createPlatformAdmin();
    expect(admin.role).toBe('platform_admin');

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: env.PLATFORM_ADMIN_EMAIL,
        password: env.PLATFORM_ADMIN_PASSWORD,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('platform_admin');
  });
});
