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

describe('Phase 8: In-Inquiry Messaging, Read Receipts & Audit Thread Tests', () => {
  let app: any;
  let companyAdminToken: string;
  let foreignCompanyAdminToken: string;
  let customerToken: string;
  let foreignCustomerToken: string;

  let testCompany: any;
  let foreignCompany: any;
  let testCustomer: any;
  let foreignCustomer: any;
  let testService: any;
  let testInquiry: any;

  beforeAll(async () => {
    app = createApp();
    await runSeed();

    // 1. Primary Company & Admin
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

    // 3. Foreign Customer
    foreignCustomer = await User.create({
      name: 'Foreign Message Customer',
      email: `msg.foreign.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'customer',
      isSeedData: true,
    });
    foreignCustomerToken = generateToken({
      sub: foreignCustomer._id.toString(),
      role: foreignCustomer.role,
      email: foreignCustomer.email,
    });

    // 4. Foreign Company & Admin
    const foreignCompanyAdmin = await User.create({
      name: 'Foreign Message Admin',
      email: `msg.admin.foreign.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'company_admin',
      companyStatus: 'approved',
      isSeedData: true,
    });

    foreignCompany = await Company.create({
      ownerUserId: foreignCompanyAdmin._id,
      name: 'Phase 8 Foreign Firm',
      slug: `foreign-msg-${Date.now()}`,
      city: 'Rawalpindi',
      mainCategory: 'Web Development',
      status: 'approved',
      contactEmail: `msg.admin.foreign.${Date.now()}@example.com`,
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

    // 5. Test Service & Inquiry in 'submitted' state
    testService = await Service.findOne({ companyId: testCompany._id });
    testInquiry = await Inquiry.create({
      referenceNumber: `QP-MSG-${Date.now().toString().slice(-4)}`,
      customerId: testCustomer._id,
      companyId: testCompany._id,
      serviceId: testService._id,
      serviceTitleSnapshot: testService.title,
      description: 'Initial architectural brief seeking 3D rendering and elevations.',
      status: 'submitted',
      aiValidation: { rounds: 1, overridden: false, skipped: false },
      aiSummary: { status: 'pending' },
      lastMessageAt: new Date(),
    });

    // Create the initial intake message
    await Message.create({
      inquiryId: testInquiry._id,
      senderId: testCustomer._id,
      senderRole: 'customer',
      type: 'initial_request',
      text: testInquiry.description,
    });
  });

  afterAll(async () => {
    if (testInquiry) {
      await Message.deleteMany({ inquiryId: testInquiry._id });
      await Inquiry.deleteOne({ _id: testInquiry._id });
    }
    if (foreignCompany) await Company.deleteOne({ _id: foreignCompany._id });
    if (foreignCustomer) await User.deleteOne({ _id: foreignCustomer._id });
  });

  it('T-MSG-01: Customer sends message in inquiry thread (POST /api/v1/inquiries/:id/messages)', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'Hello, I also wanted to ask if exterior night renders are included?' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBeDefined();
    expect(res.body.data.message.senderRole).toBe('customer');
    expect(res.body.data.message.text).toContain('exterior night renders');

    // Verify inquiry preview updated
    const inq = await Inquiry.findById(testInquiry._id);
    expect(inq?.lastMessagePreview).toContain('exterior night renders');
  });

  it('T-MSG-02: Company admin replies and moves inquiry from submitted to in_discussion', async () => {
    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({ text: 'Yes, we include 2 dusk/night lighting passes in our standard 3D package.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.senderRole).toBe('company_admin');

    // Status transition: submitted -> in_discussion
    const inq = await Inquiry.findById(testInquiry._id);
    expect(inq?.status).toBe('in_discussion');
    expect(inq?.lastMessagePreview).toContain('dusk/night lighting');
  });

  it('T-MSG-03: Validation rejects empty message or message > 2000 chars', async () => {
    // Empty text
    const emptyRes = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: '   ' });

    expect(emptyRes.status).toBe(400);

    // Over 2000 chars
    const longRes = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ text: 'A'.repeat(2005) });

    expect(longRes.status).toBe(400);
  });

  it('T-MSG-04: GET /api/v1/inquiries/:id/messages returns chronological thread history', async () => {
    const res = await request(app)
      .get(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(3); // intake + customer + provider
  });

  it('T-MSG-05: Customer marks provider messages as read (POST /api/v1/inquiries/:id/messages/read)', async () => {
    // Provider posts a fresh message
    await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${companyAdminToken}`)
      .send({ text: 'Please review our preliminary elevation draft.' });

    const res = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages/read`)
      .set('Authorization', `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBeGreaterThanOrEqual(1);

    // Verify messages readAt timestamp in database
    const providerMsg = await Message.findOne({
      inquiryId: testInquiry._id,
      text: 'Please review our preliminary elevation draft.',
    });
    expect(providerMsg?.readAt).toBeDefined();
  });

  it('T-MSG-06: Tenant isolation blocks foreign customer and foreign admin with 404', async () => {
    // Foreign customer read messages
    const foreignCustGet = await request(app)
      .get(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${foreignCustomerToken}`);
    expect(foreignCustGet.status).toBe(404);

    // Foreign customer post message
    const foreignCustPost = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${foreignCustomerToken}`)
      .send({ text: 'Unauthorized message' });
    expect(foreignCustPost.status).toBe(404);

    // Foreign company admin post message
    const foreignAdminPost = await request(app)
      .post(`/api/v1/inquiries/${testInquiry._id}/messages`)
      .set('Authorization', `Bearer ${foreignCompanyAdminToken}`)
      .send({ text: 'Unauthorized message' });
    expect(foreignAdminPost.status).toBe(404);
  });
});
