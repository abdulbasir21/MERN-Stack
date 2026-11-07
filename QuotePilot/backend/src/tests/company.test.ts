import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { env } from '../config/env';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { createPlatformAdmin } from '../scripts/createPlatformAdmin';

describe('Phase 2: Company Onboarding & Platform Approvals Tests', () => {
  const app = createApp();

  let adminToken: string;
  const testEmail = `company.test.${Date.now()}@example.com`;
  let companyAdminToken: string;
  let companyId: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGOURL);
    }

    // Ensure platform admin exists and login
    await createPlatformAdmin();
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: env.PLATFORM_ADMIN_EMAIL,
      password: env.PLATFORM_ADMIN_PASSWORD,
    });
    adminToken = loginRes.body.data.token;
  });

  afterAll(async () => {
    // Clean up test documents specific to company tests
    await Company.deleteMany({ slug: { $regex: /^apex-web/ } });
    await User.deleteMany({ email: { $regex: /^company\.test/ } });
  });

  // T-COMP-01: Register company -> user + company pending
  it('T-COMP-01: registers company with status pending and company_admin user', async () => {
    const res = await request(app)
      .post('/api/v1/companies/register')
      .send({
        companyName: 'Apex Web Architects',
        ownerName: 'Tariq Malik',
        email: testEmail,
        phone: '+92 321 9876543',
        city: 'Lahore',
        mainCategory: 'Web Development',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.company.status).toBe('pending');
    expect(res.body.data.user.role).toBe('company_admin');
    expect(res.body.data.token).toBeDefined();

    companyAdminToken = res.body.data.token;
    companyId = res.body.data.company.id;

    // Verify company is pending in DB
    const dbCompany = await Company.findById(companyId);
    expect(dbCompany?.status).toBe('pending');
  });

  // T-COMP-08: Pending company cannot edit profile -> 403
  it('T-COMP-08: pending company cannot modify profile details', async () => {
    const res = await request(app)
      .patch('/api/v1/company/me')
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({
        tagline: 'We build the best web applications',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // T-COMP-03: Reject with reason (validates 10-500 chars)
  it('T-COMP-03: admin rejects company with reason (short reason rejected with 400)', async () => {
    // Short reason -> 400
    const shortRes = await request(app)
      .post(`/api/v1/admin/companies/${companyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Too short' });

    expect(shortRes.status).toBe(400);
    expect(shortRes.body.error.code).toBe('VALIDATION_ERROR');

    // Valid reason -> 200 and sets status rejected
    const validRes = await request(app)
      .post(`/api/v1/admin/companies/${companyId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Please provide a valid company phone number and verifiable portfolio link.' });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.company.status).toBe('rejected');
    expect(validRes.body.data.company.rejectionReason).toContain('verifiable portfolio');

    // Verify rejection reason is visible to company admin via /company/me
    const meRes = await request(app)
      .get('/api/v1/company/me')
      .set('Authorization', `Bearer ${companyAdminToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.company.status).toBe('rejected');
    expect(meRes.body.data.company.rejectionReason).toBeDefined();
  });

  // T-COMP-04: Rejected admin resubmits -> pending, reason cleared
  it('T-COMP-04: rejected admin resubmits company, status becomes pending and reason cleared', async () => {
    const res = await request(app)
      .post('/api/v1/company/me/resubmit')
      .set('Authorization', `Bearer ${companyAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.company.status).toBe('pending');
    expect(res.body.data.company.rejectionReason).toBeUndefined();
  });

  // T-COMP-02: Admin approve -> approved
  it('T-COMP-02: platform admin approves company, status becomes approved', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/companies/${companyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.company.status).toBe('approved');
    expect(res.body.data.company.reviewedBy).toBeDefined();
  });

  // T-COMP-06: Invalid transition (approve an already approved company) -> 409
  it('T-COMP-06: approving an already approved company returns 409 conflict', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/companies/${companyId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // Now that company is approved, profile editing is allowed
  it('approved company can update profile details via PATCH /company/me', async () => {
    const res = await request(app)
      .patch('/api/v1/company/me')
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({
        tagline: 'Premier Web & Digital Engineering Studio',
        city: 'Lahore (Gulberg)',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.company.tagline).toBe('Premier Web & Digital Engineering Studio');
    expect(res.body.data.company.city).toBe('Lahore (Gulberg)');
  });

  // T-COMP-05: Block permanently -> user status blocked, login denied, cannot re-register
  it('T-COMP-05: blocking company blocks owner user and denies login', async () => {
    const blockRes = await request(app)
      .post(`/api/v1/admin/companies/${companyId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Fraudulent registration details.' });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.data.company.status).toBe('blocked');

    // Login must now be rejected with 403 ACCOUNT_BLOCKED
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testEmail,
      password: 'Password123!',
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_BLOCKED');
  });
});
