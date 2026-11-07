import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { env } from '../config/env';
import { runSeed } from '../scripts/seed';
import { Company } from '../models/Company';

describe('Phase 4: Marketplace Discovery & Public Profile Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(env.MONGOURL_TEST || env.MONGOURL);
    }
    // Run seed to ensure standard approved companies exist
    await runSeed();
  }, 30000);

  describe('GET /api/v1/companies (Public Marketplace Search)', () => {
    it('T-MKT-01: returns only approved companies with pagination meta', async () => {
      const res = await request(app).get('/api/v1/companies');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toHaveProperty('total');
      expect(res.body.meta).toHaveProperty('totalPages');
      expect(res.body.meta).toHaveProperty('page', 1);

      // Verify shape of company list items
      const first = res.body.data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('slug');
      expect(first).toHaveProperty('categories');
      expect(first).toHaveProperty('ratingAverage');
    });

    it('T-MKT-02: filter by category returns matching companies only', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .query({ category: 'Interior Design' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      res.body.data.forEach((company: any) => {
        expect(company.categories).toContain('Interior Design');
      });
    });

    it('T-MKT-03: text search query filters companies by name and keywords', async () => {
      const res = await request(app)
        .get('/api/v1/companies')
        .query({ q: 'Pixel' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].slug).toBe('pixel-and-pine-studio');
    });
  });

  describe('GET /api/v1/companies/:slug (Public Profile)', () => {
    it('T-MKT-04: returns public company profile with verified badge and portfolio', async () => {
      const res = await request(app).get('/api/v1/companies/pixel-and-pine-studio');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company).toBeDefined();
      expect(res.body.data.company.name).toBe('Pixel & Pine Studio');
      expect(res.body.data.company.verified).toBe(true);
      expect(Array.isArray(res.body.data.company.portfolio)).toBe(true);
      expect(res.body.data.company.portfolio.length).toBe(2);
    });

    it('T-MKT-05: returns 404 NOT_FOUND for non-existent or unapproved company', async () => {
      const res = await request(app).get('/api/v1/companies/non-existent-company-slug-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/companies/:slug/services (Public Active Services)', () => {
    it('T-MKT-06: returns active services without exposing requirementsChecklist', async () => {
      const res = await request(app).get('/api/v1/companies/pixel-and-pine-studio/services');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.services)).toBe(true);
      expect(res.body.data.services.length).toBe(2);

      const service = res.body.data.services[0];
      expect(service).toHaveProperty('id');
      expect(service).toHaveProperty('title');
      expect(service).toHaveProperty('category');
      expect(service).toHaveProperty('startingPrice');

      // CRITICAL SECURITY RULE: checklist must NOT be exposed publicly
      expect(service).not.toHaveProperty('requirementsChecklist');
    });
  });
});
