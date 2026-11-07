import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { env } from '../config/env';
import { runSeed } from '../scripts/seed';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { Inquiry } from '../models/Inquiry';
import { Message } from '../models/Message';

describe('Phase 5: Inquiries & AI Step 1 (Customer Brief & Intake Validation) Tests', () => {
  const app = createApp();

  let customerToken: string;
  let customerUser: any;
  let otherCustomerToken: string;
  let companyAdminToken: string;
  let targetService: any;
  let targetCompany: any;
  let createdInquiryId: string;
  let createdReferenceNumber: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.MONGOURL_TEST || env.MONGOURL);
    }

    // Run seed to ensure standard approved companies and services exist
    await runSeed();

    // 1. Login or create customer
    const customerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'zain.customer@example.com',
      password: 'Password123!',
    });
    customerToken = customerLogin.body.data.token;
    customerUser = customerLogin.body.data.user;

    // 2. Create another customer for tenant isolation testing
    const otherEmail = `other.customer.${Date.now()}@example.com`;
    const otherReg = await request(app).post('/api/v1/auth/register').send({
      name: 'Other Customer',
      email: otherEmail,
      password: 'Password123!',
    });
    otherCustomerToken = otherReg.body.data.token;

    // 3. Login company admin for Pixel & Pine Studio
    const coAdminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'tariq.pixel@example.com',
      password: 'Password123!',
    });
    companyAdminToken = coAdminLogin.body.data.token;

    // 4. Fetch the target service from Pixel & Pine Studio
    targetCompany = await Company.findOne({ slug: 'pixel-and-pine-studio' });
    targetService = await Service.findOne({
      companyId: targetCompany._id,
      title: 'Custom E-Commerce & Marketplace Architecture',
    });
  }, 30000);

  afterAll(async () => {
    if (createdInquiryId) {
      await Inquiry.findByIdAndDelete(createdInquiryId);
      await Message.deleteMany({ inquiryId: createdInquiryId });
    }
    await User.deleteMany({ email: { $regex: /^other\.customer/ } });
  });

  describe('POST /api/v1/inquiries/validate (Gemini AI Intake Gatekeeper)', () => {
    it('T-INQ-01: identifies missing checklist requirements when brief is brief/incomplete', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'I need an online store built as soon as possible.',
          round: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('isComplete');
      expect(res.body.data).toHaveProperty('missing');
      expect(res.body.data).toHaveProperty('message');
      expect(res.body.data).toHaveProperty('canSubmitAnyway');
      expect(res.body.data).toHaveProperty('skipped');

      // Vague brief in round 1 should not be permitted without override
      if (!res.body.data.skipped) {
        expect(res.body.data.isComplete).toBe(false);
        expect(res.body.data.canSubmitAnyway).toBe(false);
        expect(res.body.data.missing.length).toBeGreaterThan(0);
      }
    }, 20000);

    it('T-INQ-02: passes validation when brief satisfies the checklist requirements', async () => {
      const completeBrief = `
We are launching a luxury artisan marketplace in Pakistan with an initial catalog of 250 SKUs.
We need Meezan Bank payment gateway integration and automated bank reconciliation.
Our target launch date is in 6 weeks with a staged rollout.
We already have logistics partnership with CallCourier for automated booking.
`.trim();

      const res = await request(app)
        .post('/api/v1/inquiries/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: completeBrief,
          budget: 95000,
          deadline: '2026-12-15',
          round: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canSubmitAnyway).toBe(true);
    }, 20000);

    it('T-INQ-03: allows submission override (canSubmitAnyway: true) when round >= 2', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'Still a brief note about our store requirements.',
          round: 2, // Second attempt
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.canSubmitAnyway).toBe(true);
    }, 20000);

    it('flags meaningless random characters (e.g. asdfdsfsdf) as invalid brief', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'asdfdsfsdfasdfdsfsdfasdfdsfsdf',
          round: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isComplete).toBe(false);
      expect(res.body.data.missing.length).toBeGreaterThan(0);
      expect(res.body.data.message).toMatch(/random characters|meaningless text/i);
    });
  });

  describe('POST /api/v1/inquiries (Inquiry Submission)', () => {
    it('T-INQ-04: creates inquiry, assigns QP-### reference number and creates initial message', async () => {
      const briefText =
        'Detailed requirements for our marketplace with 300 SKUs, Meezan payment integration, and Courier API syncing within 4 weeks.';

      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: briefText,
          budget: 85000,
          deadline: '2026-12-01',
          aiValidation: {
            rounds: 1,
            overridden: false,
            skipped: false,
          },
          clientRequestId: 'client-req-unique-001',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inquiry).toHaveProperty('id');
      expect(res.body.data.inquiry).toHaveProperty('referenceNumber');
      expect(res.body.data.inquiry.referenceNumber).toMatch(/^QP-\d{3,}$/);
      expect(res.body.data.inquiry.status).toBe('submitted');

      createdInquiryId = res.body.data.inquiry.id;
      createdReferenceNumber = res.body.data.inquiry.referenceNumber;

      // Verify the first message of type 'initial_request' was created
      const initialMessage = await Message.findOne({
        inquiryId: createdInquiryId,
        type: 'initial_request',
      });
      expect(initialMessage).toBeDefined();
      expect(initialMessage?.text).toBe(briefText);
      expect(initialMessage?.senderRole).toBe('customer');
    });

    it('T-INQ-05: duplicate clientRequestId returns 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'A duplicate brief trying to use the same idempotency key.',
          clientRequestId: 'client-req-unique-001', // duplicate key
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('enforces backend audit check and rejects incomplete brief without override', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'asdfdsfsdfasdfdsfsdfasdfdsfsdf',
          clientRequestId: `client-req-${Date.now()}`,
          aiValidation: {
            rounds: 1,
            overridden: false,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INCOMPLETE_BRIEF');
    });

    it('enforces backend check and rejects premature override when rounds < 2', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'Brief that user attempts to override on round 1 prematurely.',
          clientRequestId: `client-req-${Date.now()}`,
          aiValidation: {
            rounds: 1,
            overridden: true,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('allows backend submission when override is performed after 2 rounds', async () => {
      const res = await request(app)
        .post('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          serviceId: targetService._id.toString(),
          description: 'Brief that user overrides after reaching the 2-round limit.',
          clientRequestId: `client-req-${Date.now()}`,
          aiValidation: {
            rounds: 2,
            overridden: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.inquiry).toHaveProperty('id');
      // Clean up
      await Inquiry.findByIdAndDelete(res.body.data.inquiry.id);
      await Message.deleteMany({ inquiryId: res.body.data.inquiry.id });
    });
  });

  describe('GET /api/v1/inquiries & GET /api/v1/inquiries/:id (Tenant Scoping)', () => {
    it('T-INQ-06: tenant isolation denies foreign customer and foreign company access with 404', async () => {
      // Other customer tries to view created inquiry
      const resOtherCust = await request(app)
        .get(`/api/v1/inquiries/${createdInquiryId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`);

      expect(resOtherCust.status).toBe(404);
      expect(resOtherCust.body.error.code).toBe('NOT_FOUND');
    });

    it('T-INQ-07: customer view omits aiSummary from inquiry details and list', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/inquiries/${createdInquiryId}`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.inquiry).toBeDefined();
      expect(detailRes.body.data.inquiry.referenceNumber).toBe(createdReferenceNumber);
      // Customer must NEVER see aiSummary
      expect(detailRes.body.data.inquiry).not.toHaveProperty('aiSummary');

      const listRes = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
      listRes.body.data.forEach((item: any) => {
        expect(item).not.toHaveProperty('aiSummary');
        expect(item).toHaveProperty('company');
      });
    });

    it('T-INQ-08: company admin views inquiry with customer details and company-visible fields', async () => {
      const detailRes = await request(app)
        .get(`/api/v1/inquiries/${createdInquiryId}`)
        .set('Authorization', `Bearer ${companyAdminToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.inquiry).toBeDefined();
      expect(detailRes.body.data.inquiry.customer).toHaveProperty('email');
      expect(detailRes.body.data.inquiry).toHaveProperty('aiSummary');

      const listRes = await request(app)
        .get('/api/v1/inquiries')
        .set('Authorization', `Bearer ${companyAdminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
      const targetItem = listRes.body.data.find(
        (i: any) => i.referenceNumber === createdReferenceNumber
      );
      expect(targetItem).toBeDefined();
      expect(targetItem).toHaveProperty('customer');
      expect(targetItem).toHaveProperty('aiSummary');
    });
  });
});
