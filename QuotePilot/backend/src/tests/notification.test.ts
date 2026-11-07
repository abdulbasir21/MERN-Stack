import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { NotificationService } from '../modules/notifications/notification.service';
import { EmailService } from '../modules/notifications/email.service';
import { runSeed } from '../scripts/seed';
import { generateToken } from '../utils/auth';

describe('Phase 9: In-App Notifications & Email Dispatch Tests', () => {
  let app: any;
  let userToken: string;
  let otherUserToken: string;
  let testUser: any;
  let otherUser: any;

  beforeAll(async () => {
    app = createApp();
    await runSeed();

    testUser = await User.findOne({ email: 'zain.customer@example.com' });
    userToken = generateToken({
      sub: testUser!._id.toString(),
      role: testUser!.role,
      email: testUser!.email,
    });

    otherUser = await User.create({
      name: 'Other Notif User',
      email: `notif.${Date.now()}@example.com`,
      passwordHash: 'HashedPassword123!',
      role: 'customer',
      isSeedData: true,
    });
    otherUserToken = generateToken({
      sub: otherUser._id.toString(),
      role: otherUser.role,
      email: otherUser.email,
    });
  });

  afterAll(async () => {
    if (testUser?._id) {
      await Notification.deleteMany({ userId: { $in: [testUser._id, otherUser?._id].filter(Boolean) } });
    }
    if (otherUser?._id) await User.deleteOne({ _id: otherUser._id });
  });

  let createdNotifId: string;

  it('T-NOT-01: NotificationService.notify creates notification in database', async () => {
    const notif = await NotificationService.notify({
      userId: testUser._id,
      type: 'quotation_received',
      title: 'Formal Quotation Slip Dispatched',
      body: 'Pixel & Pine Studio issued quotation slip #QP-2026-Q1 for PKR 150,000.',
      link: '/inquiries/65f000000000000000000001',
      entity: { type: 'quotation', id: '65f000000000000000000002' },
    });

    expect(notif).toBeDefined();
    expect(notif.userId.toString()).toBe(testUser._id.toString());
    expect(notif.type).toBe('quotation_received');
    expect(notif.title).toContain('Formal Quotation Slip');
    createdNotifId = notif._id.toString();

    // Create a second unread notification
    await NotificationService.notify({
      userId: testUser._id,
      type: 'message_received',
      title: 'New Discussion Message',
      body: 'Studio replied in your docket.',
      link: '/inquiries/65f000000000000000000001',
    });
  });

  it('T-NOT-02: GET /api/v1/notifications lists user notifications with metadata', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.meta.unreadCount).toBeGreaterThanOrEqual(2);
  });

  it('T-NOT-03: GET /api/v1/notifications/unread-count returns accurate count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(2);
  });

  it('T-NOT-04: POST /api/v1/notifications/:id/read marks single notification as read', async () => {
    const res = await request(app)
      .post(`/api/v1/notifications/${createdNotifId}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.readAt).toBeDefined();
  });

  it('T-NOT-05: POST /api/v1/notifications/read-all marks all unread notifications read', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated).toBeGreaterThanOrEqual(1);

    // Verify unread count is now 0
    const countRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${userToken}`);
    expect(countRes.body.data.count).toBe(0);
  });

  it('T-NOT-06: Tenant isolation prevents user from viewing or marking other user notifications', async () => {
    // Attempt to mark testUser's notification using otherUserToken
    const res = await request(app)
      .post(`/api/v1/notifications/${createdNotifId}/read`)
      .set('Authorization', `Bearer ${otherUserToken}`);

    expect(res.status).toBe(404);
  });

  it('T-NOT-07: EmailService stubs synthetic @example.com addresses without outbound call (AGENTS.md §8)', async () => {
    const result = await EmailService.sendInquiryReceivedEmail({
      to: 'synthetic.client@example.com',
      recipientName: 'Synthetic Client',
      referenceNumber: 'QP-SYN-001',
      serviceTitle: 'Packaging Design',
      customerName: 'Test Client',
    });

    expect(result.sent).toBe(false);
    expect(result.stubbed).toBe(true);
  });
});
