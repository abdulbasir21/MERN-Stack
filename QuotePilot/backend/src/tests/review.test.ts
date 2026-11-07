import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { Inquiry } from '../models/Inquiry';
import { Quotation } from '../models/Quotation';
import { Review } from '../models/Review';
import { runSeed } from '../scripts/seed';
import { generateToken } from '../utils/auth';

describe('Phase 10: Reviews, Ratings & Eligibility Tests (BR-14)', () => {
  let app: any;
  let companyAdminToken: string;
  let customerToken: string;
  let otherCustomerToken: string;

  let testCompany: any;
  let testCustomer: any;
  let otherCustomer: any;
  let testService: any;
  let acceptedInquiry: any;
  let pendingInquiry: any;

  beforeAll(async () => {
    app = createApp();
    await runSeed();

    // 1. Approved Company (Pixel & Pine Studio) & Admin
    testCompany = await Company.findOne({ slug: 'pixel-and-pine-studio' });
    const companyAdminUser = await User.findOne({
      companyId: testCompany._id,
      role: 'company_admin',
    });
    companyAdminToken = generateToken({
      sub: companyAdminUser!._id.toString(),
      role: companyAdminUser!.role,
      companyId: testCompany._id.toString(),
      email: companyAdminUser!.email,
    });

    // 2. Primary Customer
    testCustomer = await User.findOne({ email: 'zain.customer@example.com' });
    customerToken = generateToken({
      sub: testCustomer!._id.toString(),
      role: testCustomer!.role,
      email: testCustomer!.email,
    });

    // 3. Other Customer
    otherCustomer = await User.create({
      name: 'Other Reviewer',
      email: `rev.other.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'customer',
      isSeedData: true,
    });
    otherCustomerToken = generateToken({
      sub: otherCustomer._id.toString(),
      role: otherCustomer.role,
      email: otherCustomer.email,
    });

    testService = await Service.findOne({ companyId: testCompany._id });

    // 4. Accepted Inquiry (Eligible for Review)
    acceptedInquiry = await Inquiry.create({
      referenceNumber: `QP-REV-ACC-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      companyId: testCompany._id,
      serviceId: testService._id,
      serviceTitleSnapshot: testService.title,
      description: 'Completed rebrand with full milestone sign-off.',
      status: 'accepted',
      clientRequestId: `req-acc-${Date.now()}`,
      aiValidation: { rounds: 1, overridden: false, skipped: false },
      aiSummary: { status: 'pending' },
      lastMessageAt: new Date(),
    });

    // 5. In-Discussion Inquiry (NOT Eligible for Review)
    pendingInquiry = await Inquiry.create({
      referenceNumber: `QP-REV-PEN-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      companyId: testCompany._id,
      serviceId: testService._id,
      serviceTitleSnapshot: testService.title,
      description: 'Initial intake currently in discussion stage.',
      status: 'in_discussion',
      clientRequestId: `req-pen-${Date.now()}`,
      aiValidation: { rounds: 1, overridden: false, skipped: false },
      aiSummary: { status: 'pending' },
      lastMessageAt: new Date(),
    });
  });

  afterAll(async () => {
    if (acceptedInquiry) {
      await Review.deleteMany({ inquiryId: acceptedInquiry._id });
      await Inquiry.deleteOne({ _id: acceptedInquiry._id });
    }
    if (pendingInquiry) await Inquiry.deleteOne({ _id: pendingInquiry._id });
    if (otherCustomer) await User.deleteOne({ _id: otherCustomer._id });
  });

  it('T-REV-01: Customer cannot review an inquiry before quotation is accepted (BR-14) (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${pendingInquiry._id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 5, comment: 'Premature review attempt' });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('after a formal quotation slip has been accepted');
  });

  it('T-REV-02: Customer submits review for accepted inquiry (POST /api/v1/inquiries/:id/review)', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${acceptedInquiry._id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        rating: 5,
        comment: 'Exceptional craftsmanship and precision on the brand manual deliverables.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.review).toBeDefined();
    expect(res.body.data.review.rating).toBe(5);
    expect(res.body.data.review.reviewerDisplayName).toContain('Zain');
  });

  it('T-REV-03: Company ratingAverage and ratingCount recompute accurately', async () => {
    const updatedCompany = await Company.findById(testCompany._id);
    expect(updatedCompany?.ratingCount).toBeGreaterThanOrEqual(1);
    expect(updatedCompany?.ratingAverage).toBeGreaterThanOrEqual(1);
  });

  it('T-REV-04: Duplicate review attempt on same inquiry returns 409 Conflict (BR-14)', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${acceptedInquiry._id}/review`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, comment: 'Attempting duplicate review' });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('already been submitted');
  });

  it('T-REV-05: Tenant isolation: foreign customer cannot review someone else accepted inquiry (403)', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${acceptedInquiry._id}/review`)
      .set('Authorization', `Bearer ${otherCustomerToken}`)
      .send({ rating: 5, comment: 'Foreign customer intrusion' });

    expect(res.status).toBe(403);
  });

  it('T-REV-06: GET /api/v1/companies/:slug/reviews returns public reviews', async () => {
    const res = await request(app).get(`/api/v1/companies/${testCompany.slug}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].reviewerDisplayName).toBeDefined();
  });

  it('T-REV-07: GET /api/v1/company/reviews returns company own reviews ledger', async () => {
    const res = await request(app)
      .get('/api/v1/company/reviews')
      .set('Authorization', `Bearer ${companyAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
