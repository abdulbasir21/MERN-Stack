import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Service } from '../models/Service';
import { env } from '../config/env';

describe('Phase 3: Services, Checklists, Portfolio & Uploads Tests', () => {
  const app = createApp();
  let companyAAdminToken: string;
  let companyBAdminToken: string;
  let companyAId: string;
  let companyBId: string;
  let pendingCompanyAdminToken: string;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.MONGOURL_TEST || env.MONGOURL);
    }

    // Clean up test records
    await User.deleteMany({ email: { $in: [
      'admin.service.a@example.com',
      'admin.service.b@example.com',
      'admin.service.pending@example.com'
    ] } });
    await Company.deleteMany({ slug: { $in: [
      'service-test-co-a',
      'service-test-co-b',
      'service-test-pending'
    ] } });

    // Register Company A
    const resA = await request(app)
      .post('/api/v1/companies/register')
      .send({
        companyName: 'Service Test Co A',
        ownerName: 'Owner A',
        email: 'admin.service.a@example.com',
        phone: '+92 300 1111111',
        city: 'Islamabad',
        mainCategory: 'Web Development',
        password: 'Password123!'
      });
    companyAId = resA.body.data.company.id;
    companyAAdminToken = resA.body.data.token;

    // Approve Company A
    await Company.findByIdAndUpdate(companyAId, { status: 'approved' });

    // Register Company B
    const resB = await request(app)
      .post('/api/v1/companies/register')
      .send({
        companyName: 'Service Test Co B',
        ownerName: 'Owner B',
        email: 'admin.service.b@example.com',
        phone: '+92 300 2222222',
        city: 'Lahore',
        mainCategory: 'Logo Design',
        password: 'Password123!'
      });
    companyBId = resB.body.data.company.id;
    companyBAdminToken = resB.body.data.token;

    // Approve Company B
    await Company.findByIdAndUpdate(companyBId, { status: 'approved' });

    // Register Pending Company (not approved)
    const resPending = await request(app)
      .post('/api/v1/companies/register')
      .send({
        companyName: 'Service Test Pending',
        ownerName: 'Owner Pending',
        email: 'admin.service.pending@example.com',
        phone: '+92 300 3333333',
        city: 'Karachi',
        mainCategory: 'Accounting',
        password: 'Password123!'
      });
    pendingCompanyAdminToken = resPending.body.data.token;
  }, 30000);

  afterAll(async () => {
    await Service.deleteMany({ companyId: { $in: [companyAId, companyBId] } });
    await User.deleteMany({ email: { $in: [
      'admin.service.a@example.com',
      'admin.service.b@example.com',
      'admin.service.pending@example.com'
    ] } });
    await Company.deleteMany({ slug: { $in: [
      'service-test-co-a',
      'service-test-co-b',
      'service-test-pending'
    ] } });
  });

  describe('Categories Endpoint', () => {
    it('GET /api/v1/categories returns list of categories', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(8);
      expect(res.body.data.categories[0]).toHaveProperty('id');
      expect(res.body.data.categories[0]).toHaveProperty('name');
      expect(res.body.data.categories[0]).toHaveProperty('slug');
    });
  });

  describe('T-PROF-05: ImageKit Auth Endpoint', () => {
    it('rejects unauthenticated request with 401 UNAUTHENTICATED', async () => {
      const res = await request(app).get('/api/v1/uploads/imagekit-auth');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns signed ImageKit parameters to authenticated user without exposing private key', async () => {
      const res = await request(app)
        .get('/api/v1/uploads/imagekit-auth')
        .set('Authorization', `Bearer ${companyAAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('expire');
      expect(res.body.data).toHaveProperty('signature');
      expect(res.body.data).toHaveProperty('publicKey');
      expect(res.body.data).toHaveProperty('urlEndpoint');
      expect(typeof res.body.data.token).toBe('string');
      expect(typeof res.body.data.expire).toBe('number');
      expect(typeof res.body.data.signature).toBe('string');
      expect(res.body.data).not.toHaveProperty('privateKey');
    });
  });

  describe('Services & Checklists CRUD', () => {
    let createdServiceId: string;

    it('rejects service creation if company is not approved (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/v1/company/services')
        .set('Authorization', `Bearer ${pendingCompanyAdminToken}`)
        .send({
          title: 'Unauthorized Service',
          category: 'Accounting',
          startingPrice: 5000
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('T-PROF-01: Company admin creates service; populates default checklist if none provided', async () => {
      const res = await request(app)
        .post('/api/v1/company/services')
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          title: 'Full Stack Web App Development',
          category: 'Web Development',
          description: 'Custom React & Express application tailored to your business needs.',
          startingPrice: 50000,
          pricingUnit: 'starting_at',
          deliveryTimeEstimate: '2-4 weeks'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.service._id || res.body.data.service.id).toBeDefined();
      expect(res.body.data.service.title).toBe('Full Stack Web App Development');
      expect(res.body.data.service.startingPrice).toBe(50000);
      // Verify default checklist items were populated
      expect(res.body.data.service.requirementsChecklist.length).toBe(3);
      expect(res.body.data.service.requirementsChecklist[0].item).toBe(
        'What the project is and its primary goal'
      );

      createdServiceId = res.body.data.service._id || res.body.data.service.id;
    });

    it('T-PROF-02: Duplicate service title under same company returns 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/v1/company/services')
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          title: 'Full Stack Web App Development', // duplicate title
          category: 'Web Development',
          startingPrice: 60000
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('T-PROF-03: Checklist item count > 15 returns 400 VALIDATION_ERROR', async () => {
      const excessiveChecklist = Array.from({ length: 16 }, (_, i) => ({
        item: `Checklist requirement item ${i + 1}`
      }));

      const res = await request(app)
        .post('/api/v1/company/services')
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          title: 'Service with Too Many Rules',
          category: 'Web Development',
          requirementsChecklist: excessiveChecklist
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Tenant Isolation: foreign company admin cannot read or edit another company service', async () => {
      // Company B tries to get Company A's service
      const getRes = await request(app)
        .get(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyBAdminToken}`);

      expect(getRes.status).toBe(404);

      // Company B tries to update Company A's service
      const updateRes = await request(app)
        .patch(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyBAdminToken}`)
        .send({ title: 'Hijacked Service Title' });

      expect(updateRes.status).toBe(404);

      // Company B tries to delete Company A's service
      const deleteRes = await request(app)
        .delete(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyBAdminToken}`);

      expect(deleteRes.status).toBe(404);
    });

    it('Company admin can update service checklist and details', async () => {
      const res = await request(app)
        .patch(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          startingPrice: 55000,
          requirementsChecklist: [
            { item: 'Target audience specifications', required: true, helpText: 'Who will use it?' },
            { item: 'Brand guidelines & logo assets', required: true }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.data.service.startingPrice).toBe(55000);
      expect(res.body.data.service.requirementsChecklist.length).toBe(2);
      expect(res.body.data.service.requirementsChecklist[0].item).toBe(
        'Target audience specifications'
      );
    });

    it('Company admin can delete service', async () => {
      const res = await request(app)
        .delete(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyAAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const verifyRes = await request(app)
        .get(`/api/v1/company/services/${createdServiceId}`)
        .set('Authorization', `Bearer ${companyAAdminToken}`);

      expect(verifyRes.status).toBe(404);
    });
  });

  describe('T-PROF-04: Company Portfolio Management', () => {
    let portfolioItemId: string;

    it('Company admin adds portfolio item with ImageKit image metadata', async () => {
      const res = await request(app)
        .post('/api/v1/company/portfolio')
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          title: 'E-Commerce Marketplace for Artisans',
          description: 'A full-stack multi-vendor marketplace with real-time stock sync.',
          image: {
            url: 'https://ik.imagekit.io/166ie5jqi/samples/ecommerce.webp',
            fileId: 'file_ik_sample_123'
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item).toHaveProperty('_id');
      expect(res.body.data.item.title).toBe('E-Commerce Marketplace for Artisans');
      expect(res.body.data.item.image.url).toBe(
        'https://ik.imagekit.io/166ie5jqi/samples/ecommerce.webp'
      );

      portfolioItemId = res.body.data.item._id;
    });

    it('Company admin updates portfolio item', async () => {
      const res = await request(app)
        .patch(`/api/v1/company/portfolio/${portfolioItemId}`)
        .set('Authorization', `Bearer ${companyAAdminToken}`)
        .send({
          title: 'Artisan Marketplace v2',
          description: 'Updated case study description.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item.title).toBe('Artisan Marketplace v2');
    });

    it('Company admin removes portfolio item', async () => {
      const res = await request(app)
        .delete(`/api/v1/company/portfolio/${portfolioItemId}`)
        .set('Authorization', `Bearer ${companyAAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
