import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { Inquiry } from '../models/Inquiry';
import { Message } from '../models/Message';
import { runSeed } from '../scripts/seed';
import { generateToken } from '../utils/auth';

describe('Phase 6: Company Desk, In-Inquiry Discussions & AI Step 2 Tests', () => {
  let app: any;
  let companyAdminToken: string;
  let foreignCompanyAdminToken: string;
  let customerToken: string;

  let testCompany: any;
  let foreignCompany: any;
  let testCustomer: any;
  let foreignCompanyAdmin: any;
  let testService: any;
  let testInquiry: any;

  beforeAll(async () => {
    app = createApp();
    await runSeed();

    // 1. Fetch primary approved company (Pixel & Pine Studio) and admin
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

    // 2. Fetch or create a customer
    testCustomer = await User.findOne({ email: 'zain.customer@example.com' });
    customerToken = generateToken({
      sub: testCustomer!._id.toString(),
      role: testCustomer!.role,
      email: testCustomer!.email,
    });

    // 3. Create a foreign company + admin for tenant isolation verification
    foreignCompanyAdmin = await User.create({
      name: 'Foreign Desk Admin',
      email: `desk.foreign.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'company_admin',
      companyStatus: 'approved',
      isSeedData: true,
    });

    foreignCompany = await Company.create({
      ownerUserId: foreignCompanyAdmin._id,
      name: 'Phase 6 Foreign Architects',
      slug: `foreign-desk-${Date.now()}`,
      city: 'Karachi',
      mainCategory: 'Web Development',
      status: 'approved',
      contactEmail: `desk.foreign.${Date.now()}@example.com`,
      isSeedData: true,
    });

    foreignCompanyAdmin.companyId = foreignCompany._id;
    await foreignCompanyAdmin.save();

    foreignCompanyAdminToken = generateToken({
      sub: foreignCompanyAdmin._id.toString(),
      role: 'company_admin',
      companyId: foreignCompany._id.toString(),
      email: foreignCompanyAdmin.email,
    });

    // 4. Fetch service for Pixel & Pine Studio
    testService = await Service.findOne({ companyId: testCompany._id });

    // 5. Create an inquiry submitted to Pixel & Pine Studio
    testInquiry = await Inquiry.create({
      referenceNumber: `QP-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      companyId: testCompany._id,
      serviceId: testService._id,
      serviceTitleSnapshot: testService.title,
      description: 'Comprehensive luxury packaging design for organic tea cartons with gold leaf accents.',
      budget: 85000,
      deadline: new Date(Date.now() + 14 * 86400000),
      status: 'submitted',
      aiValidation: {
        rounds: 1,
        overridden: false,
        skipped: false,
      },
      aiSummary: {
        status: 'pending',
      },
      lastMessageAt: new Date(),
      lastMessagePreview: 'Comprehensive luxury packaging design...',
      clientRequestId: `req-desk-${Date.now()}`,
    });

    await Message.create({
      inquiryId: testInquiry._id,
      senderId: testCustomer._id,
      senderRole: 'customer',
      type: 'initial_request',
      text: testInquiry.description,
    });
  });

  afterAll(async () => {
    // Teardown test documents
    if (foreignCompany) {
      await Company.deleteOne({ _id: foreignCompany._id });
      await User.deleteOne({ _id: foreignCompanyAdmin._id });
    }
    if (testInquiry) {
      await Message.deleteMany({ inquiryId: testInquiry._id });
      await Inquiry.deleteOne({ _id: testInquiry._id });
    }
  });

  describe('GET /api/v1/inquiries/desk/stats (Provider Desk Metrics)', () => {
    it('T-DESK-01: returns operational pipeline counts for authenticated company', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries/desk/stats')
        .set('Authorization', `Bearer ${companyAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.stats).toHaveProperty('total');
      expect(res.body.data.stats).toHaveProperty('actionRequired');
      expect(res.body.data.stats).toHaveProperty('inDiscussion');
      expect(res.body.data.stats).toHaveProperty('quoted');
      expect(res.body.data.stats.total).toBeGreaterThanOrEqual(1);
    });

    it('T-DESK-02: denies customer access with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/inquiries/desk/stats')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/inquiries/:id/summary/regenerate (AI Step 2 Brief Summary)', () => {
    it('T-DESK-03: generates structured brief summary for provider without prices (BR-09)', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${testInquiry._id}/summary/regenerate`)
        .set('Authorization', `Bearer ${companyAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.aiSummary).toBeDefined();
      expect(res.body.data.aiSummary.status).toBe('ready');
      expect(typeof res.body.data.aiSummary.summary).toBe('string');
      expect(Array.isArray(res.body.data.aiSummary.requirements)).toBe(true);
      expect(Array.isArray(res.body.data.aiSummary.suggestedNextSteps)).toBe(true);

      // Verify BR-09: AI summary text does not set price
      const summaryText = res.body.data.aiSummary.summary.toLowerCase();
      expect(summaryText).not.toContain('pkr ');
      expect(summaryText).not.toContain('final price');
    });

    it('T-DESK-04: customer cannot regenerate AI summary (receives 403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${testInquiry._id}/summary/regenerate`)
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('T-DESK-05: foreign company receives 404 NOT_FOUND (tenant isolation)', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${testInquiry._id}/summary/regenerate`)
        .set('Authorization', `Bearer ${foreignCompanyAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('In-Inquiry Messaging & Thread Discussions (BR-12)', () => {
    it('T-DESK-06: GET /api/v1/inquiries/:id/messages returns thread history', async () => {
      const res = await request(app)
        .get(`/api/v1/inquiries/${testInquiry._id}/messages`)
        .set('Authorization', `Bearer ${companyAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.messages[0].type).toBe('initial_request');
      expect(res.body.data.messages[0].senderRole).toBe('customer');
    });

    it('T-DESK-07: POST /api/v1/inquiries/:id/messages posts response & transitions status to in_discussion', async () => {
      const res = await request(app)
        .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
        .set('Authorization', `Bearer ${companyAdminToken}`)
        .send({
          text: 'Thank you for reaching out Zain! We have received your tea packaging brief and are reviewing the die-line tolerances.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.text).toContain('die-line tolerances');
      expect(res.body.data.message.senderRole).toBe('company_admin');

      // Verify inquiry status transitioned to 'in_discussion'
      const updatedInquiry = await Inquiry.findById(testInquiry._id);
      expect(updatedInquiry!.status).toBe('in_discussion');
      expect(updatedInquiry!.lastMessagePreview).toContain('tea packaging brief');
    });

    it('T-DESK-08: tenant isolation denies foreign company admin from viewing or posting messages', async () => {
      const getRes = await request(app)
        .get(`/api/v1/inquiries/${testInquiry._id}/messages`)
        .set('Authorization', `Bearer ${foreignCompanyAdminToken}`);
      expect(getRes.status).toBe(404);

      const postRes = await request(app)
        .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
        .set('Authorization', `Bearer ${foreignCompanyAdminToken}`)
        .send({ text: 'Malicious attempt' });
      expect(postRes.status).toBe(404);
    });
  });
});
