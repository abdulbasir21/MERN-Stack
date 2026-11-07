import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { Inquiry } from '../models/Inquiry';
import { Quotation } from '../models/Quotation';
import { Message } from '../models/Message';
import { runSeed } from '../scripts/seed';
import { generateToken } from '../utils/auth';

describe('Phase 7: Formal Quotation Slips, Milestones & Revision Cycle Tests', () => {
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

    // 2. Fetch or create customer
    testCustomer = await User.findOne({ email: 'zain.customer@example.com' });
    customerToken = generateToken({
      sub: testCustomer!._id.toString(),
      role: testCustomer!.role,
      email: testCustomer!.email,
    });

    // 3. Create foreign company admin
    foreignCompanyAdmin = await User.create({
      name: 'Foreign Quote Admin',
      email: `quote.foreign.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'company_admin',
      companyStatus: 'approved',
      isSeedData: true,
    });

    foreignCompany = await Company.create({
      ownerUserId: foreignCompanyAdmin._id,
      name: 'Phase 7 Foreign Agency',
      slug: `foreign-quote-${Date.now()}`,
      city: 'Islamabad',
      mainCategory: 'Web Development',
      status: 'approved',
      contactEmail: `quote.foreign.${Date.now()}@example.com`,
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

    // 5. Create test inquiry
    testInquiry = await Inquiry.create({
      referenceNumber: `QP-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      companyId: testCompany._id,
      serviceId: testService._id,
      serviceTitleSnapshot: testService.title,
      description: 'End-to-end luxury corporate rebrand with typographic hierarchy guidelines and asset packaging.',
      budget: 150000,
      deadline: new Date(Date.now() + 21 * 86400000),
      status: 'in_discussion',
      aiValidation: { rounds: 1, overridden: false, skipped: false },
      aiSummary: { status: 'pending' },
      lastMessageAt: new Date(),
    });
  });

  afterAll(async () => {
    await Quotation.deleteMany({ isSeedData: { $ne: true } });
    if (foreignCompany) await Company.deleteOne({ _id: foreignCompany._id });
    if (foreignCompanyAdmin) await User.deleteOne({ _id: foreignCompanyAdmin._id });
    if (testInquiry) await Inquiry.deleteOne({ _id: testInquiry._id });
  });

  let createdQuotationId: string;

  it('T-QUOTE-01: Company admin creates milestone quotation slip (POST /api/v1/inquiries/:id/quote)', async () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const payload = {
      totalAmount: 150000,
      validUntil: futureDate,
      termsAndConditions: 'All deliverables subject to client milestone sign-off and SECP compliant escrow release.',
      milestones: [
        {
          title: 'Brand Strategy & Visual Direction',
          amount: 50000,
          deliverables: ['Moodboards', 'Typography system', 'Color palette'],
          estimatedDeliveryDays: 7,
        },
        {
          title: 'Master Logo Assets & Stationery Suite',
          amount: 60000,
          deliverables: ['Vector logos (AI, SVG, PNG)', 'Business card and letterhead layouts'],
          estimatedDeliveryDays: 7,
        },
        {
          title: 'Brand Guidelines Manual (40 Pages)',
          amount: 40000,
          deliverables: ['Comprehensive brand book', 'Social media launch templates'],
          estimatedDeliveryDays: 5,
        },
      ],
    };

    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quotation).toBeDefined();
    expect(res.body.data.quotation.totalAmount).toBe(150000);
    expect(res.body.data.quotation.milestones).toHaveLength(3);
    expect(res.body.data.quotation.version).toBe(1);

    createdQuotationId = res.body.data.quotation._id;

    // Verify inquiry status updated to quoted
    const updatedInquiry = await Inquiry.findById(testInquiry._id);
    expect(updatedInquiry?.status).toBe('quoted');
    expect(updatedInquiry?.quotationId?.toString()).toBe(createdQuotationId);

    // Verify automated system message was logged in thread
    const threadMessage = await Message.findOne({
      inquiryId: testInquiry._id,
      text: { $regex: /Formal Quotation Slip/ },
    });
    expect(threadMessage).toBeDefined();
  });

  it('T-QUOTE-02: Validation error if milestone amounts do not sum to totalAmount (400 Bad Request)', async () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const invalidPayload = {
      totalAmount: 150000,
      validUntil: futureDate,
      milestones: [
        {
          title: 'Milestone 1',
          amount: 50000,
          deliverables: ['Test'],
          estimatedDeliveryDays: 5,
        },
        {
          title: 'Milestone 2',
          amount: 60000, // Sum = 110,000 !== 150,000
          deliverables: ['Test'],
          estimatedDeliveryDays: 5,
        },
      ],
    };

    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('T-QUOTE-03: Duplicate quotation on same inquiry returns 409 Conflict (BR-11)', async () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const payload = {
      totalAmount: 150000,
      validUntil: futureDate,
      milestones: [
        {
          title: 'Duplicate Attempt',
          amount: 150000,
          deliverables: ['Scope'],
          estimatedDeliveryDays: 10,
        },
      ],
    };

    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already exists');
  });

  it('T-QUOTE-04: Company admin revises quote (PUT /api/v1/inquiries/:id/quote), bumps version and records history', async () => {
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const revisionPayload = {
      totalAmount: 135000, // Discount applied
      validUntil: futureDate,
      changeReason: 'Client requested adjusted scope removing physical stationery print runs.',
      milestones: [
        {
          title: 'Brand Strategy & Visual Direction',
          amount: 50000,
          deliverables: ['Moodboards', 'Typography system', 'Color palette'],
          estimatedDeliveryDays: 7,
        },
        {
          title: 'Digital Master Logo Suite (No Print)',
          amount: 45000,
          deliverables: ['Vector logos (AI, SVG, PNG)'],
          estimatedDeliveryDays: 5,
        },
        {
          title: 'Brand Guidelines Manual (40 Pages)',
          amount: 40000,
          deliverables: ['Comprehensive brand book', 'Social media launch templates'],
          estimatedDeliveryDays: 5,
        },
      ],
    };

    const res = await request(app)
      .put(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send(revisionPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quotation.version).toBe(2);
    expect(res.body.data.quotation.totalAmount).toBe(135000);
    expect(res.body.data.quotation.versionHistory).toHaveLength(1);
    expect(res.body.data.quotation.versionHistory[0].version).toBe(1);
    expect(res.body.data.quotation.versionHistory[0].totalAmount).toBe(150000);
  });

  it('T-QUOTE-05: Customer views quotation slip (GET /api/v1/inquiries/:id/quote & /quotations/:id)', async () => {
    // Via inquiry reference
    const resInquiry = await request(app)
      .get(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(resInquiry.status).toBe(200);
    expect(resInquiry.body.data.quotation).toBeDefined();
    expect(resInquiry.body.data.quotation.totalAmount).toBe(135000);
    expect(resInquiry.body.data.quotation.companyId.name).toBe(testCompany.name);

    // Via direct quotation ID
    const resDirect = await request(app)
      .get(`/api/v1/quotations/${createdQuotationId}`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(resDirect.status).toBe(200);
    expect(resDirect.body.data.quotation._id).toBe(createdQuotationId);
  });

  it('T-QUOTE-06: Tenant isolation prevents foreign company admin from modifying or viewing quotation (404)', async () => {
    // Attempt view
    const viewRes = await request(app)
      .get(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${foreignCompanyAdminToken}`);

    expect(viewRes.status).toBe(404);

    // Attempt direct view
    const directRes = await request(app)
      .get(`/api/v1/quotations/${createdQuotationId}`)
      .set('Authorization', `Bearer ${foreignCompanyAdminToken}`);

    expect(directRes.status).toBe(404);

    // Attempt revision
    const futureDate = new Date(Date.now() + 14 * 86400000).toISOString();
    const editRes = await request(app)
      .put(`/api/v1/inquiries/${testInquiry._id}/quote`)
      .set('Authorization', `Bearer ${foreignCompanyAdminToken}`)
      .send({
        totalAmount: 100000,
        validUntil: futureDate,
        milestones: [
          {
            title: 'Unauthorized milestone',
            amount: 100000,
            deliverables: ['Hack'],
            estimatedDeliveryDays: 1,
          },
        ],
      });

    expect(editRes.status).toBe(404);
  });

  it('T-QUOTE-07: Customer accepts quotation slip (POST /api/v1/quotations/:id/accept)', async () => {
    const res = await request(app)
      .post(`/api/v1/quotations/${createdQuotationId}/accept`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quotation.status).toBe('accepted');
    expect(res.body.data.inquiryStatus).toBe('accepted');

    // Verify inquiry status in database
    const updatedInquiry = await Inquiry.findById(testInquiry._id);
    expect(updatedInquiry?.status).toBe('accepted');

    // Verify acceptance message in thread
    const acceptMsg = await Message.findOne({
      inquiryId: testInquiry._id,
      text: { $regex: /Customer accepted Quotation Slip/ },
    });
    expect(acceptMsg).toBeDefined();
  });

  it('T-QUOTE-08: Cannot reject an already accepted quotation (400 Bad Request)', async () => {
    const res = await request(app)
      .post(`/api/v1/quotations/${createdQuotationId}/reject`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ reason: 'Changed my mind' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already accepted');
  });
});
