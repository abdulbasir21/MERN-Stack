import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';

describe('Phase 8: Inventory (Assets, Stock, Assignments, Deactivation Guard) Tests', () => {
  let ownerToken: string;
  let inventoryToken: string;
  let inventoryId: string;
  let empToken: string;
  let empId: string;

  let testAssetId: string;
  let testStockId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const dept = await prisma.department.findFirst();

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // Inventory Manager
    const invMgr = await prisma.user.upsert({
      where: { email: 'inventory.mgr@crewdesk.agency' },
      update: { role: 'INVENTORY_MANAGER' },
      create: {
        name: 'Inventory Tester',
        email: 'inventory.mgr@crewdesk.agency',
        passwordHash,
        role: 'INVENTORY_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    inventoryId = invMgr.id;
    inventoryToken = signAccessToken({
      userId: invMgr.id,
      email: invMgr.email,
      role: 'INVENTORY_MANAGER',
      mustChangePassword: false,
    });

    // Employee
    const emp = await prisma.user.upsert({
      where: { email: 'emp.hardware@crewdesk.agency' },
      update: { role: 'EMPLOYEE', isActive: true },
      create: {
        name: 'Hardware Receiver',
        email: 'emp.hardware@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    empId = emp.id;
    empToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });
  });

  afterAll(async () => {
    if (testAssetId) {
      await prisma.assetAssignment.deleteMany({ where: { itemId: testAssetId } });
      await prisma.inventoryItem.deleteMany({ where: { id: testAssetId } });
    }
    if (testStockId) {
      await prisma.stockMovement.deleteMany({ where: { itemId: testStockId } });
      await prisma.inventoryItem.deleteMany({ where: { id: testStockId } });
    }
  });

  it('Inventory Manager creates hardware ASSET with serial number', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        kind: 'ASSET',
        name: 'MacBook Pro 16 M3 Max',
        category: 'Laptops',
        serialNumber: 'MBP-M3-0099',
        location: 'Storage Locker 4',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.kind).toBe('ASSET');
    expect(res.body.data.assetStatus).toBe('AVAILABLE');
    expect(res.body.data.serialNumber).toBe('MBP-M3-0099');
    testAssetId = res.body.data.id;
  });

  it('Hardware ASSET creation fails if serial number is missing', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        kind: 'ASSET',
        name: 'Dell UltraSharp 27',
        category: 'Monitors',
      });

    expect(res.status).toBe(500); // Zod refine rejection
  });

  it('Assign asset to employee in 1 transaction (status ASSIGNED, assignment history, audit log)', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${testAssetId}/assign`)
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        userId: empId,
        notes: 'Assigned for primary workstation duties',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.assetStatus).toBe('ASSIGNED');
    expect(res.body.data.assignedUserId).toBe(empId);

    // Verify assignment history row
    const assignment = await prisma.assetAssignment.findFirst({
      where: { itemId: testAssetId, userId: empId, returnedAt: null },
    });
    expect(assignment).toBeDefined();
    expect(assignment?.assignedById).toBe(inventoryId);

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'asset:assign', entityId: assignment!.id },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(inventoryId);
  });

  it('Cannot assign an already ASSIGNED asset (400 ASSET_NOT_AVAILABLE)', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${testAssetId}/assign`)
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        userId: empId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ASSET_NOT_AVAILABLE');
  });

  it('Employee can fetch their own assigned hardware assets', async () => {
    const res = await request(app)
      .get('/api/inventory/my-assets')
      .set('Cookie', [`access_token=${empToken}`]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((a: any) => a.id === testAssetId);
    expect(found).toBeDefined();
  });

  it('Deactivating a user who holds assigned assets is BLOCKED (400 USER_HAS_ASSIGNED_ASSETS)', async () => {
    // Attempt to deactivate emp who holds the MacBook Pro
    const res = await request(app)
      .patch(`/api/users/${empId}/deactivate`)
      .set('Cookie', [`access_token=${ownerToken}`]);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('USER_HAS_ASSIGNED_ASSETS');
  });

  it('Return asset in 1 transaction (status AVAILABLE, returnedAt set, audit log)', async () => {
    const res = await request(app)
      .post(`/api/inventory/items/${testAssetId}/return`)
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        condition: 'Excellent, no scratches',
        nextStatus: 'AVAILABLE',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.assetStatus).toBe('AVAILABLE');
    expect(res.body.data.assignedUserId).toBeNull();

    // Verify assignment row closed
    const assignment = await prisma.assetAssignment.findFirst({
      where: { itemId: testAssetId, userId: empId },
      orderBy: { assignedAt: 'desc' },
    });
    expect(assignment?.returnedAt).toBeDefined();
    expect(assignment?.condition).toBe('Excellent, no scratches');
  });

  it('Inventory Manager creates STOCK consumable item', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        kind: 'STOCK',
        name: 'USB-C to HDMI 4K Cable',
        category: 'Peripherals',
        currentQuantity: 50,
        minQuantity: 10,
        location: 'Bin C-12',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.kind).toBe('STOCK');
    expect(res.body.data.currentQuantity).toBe(50);
    testStockId = res.body.data.id;
  });

  it('Stock OUT deduction succeeds in 1 transaction with movement row', async () => {
    // Deduct 20 cables
    const res = await request(app)
      .post(`/api/inventory/items/${testStockId}/movement`)
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        type: 'OUT',
        quantity: 20,
        reason: 'Distributed to new onboarding cohort',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.currentQuantity).toBe(30);

    const movement = await prisma.stockMovement.findFirst({
      where: { itemId: testStockId },
      orderBy: { createdAt: 'desc' },
    });
    expect(movement).toBeDefined();
    expect(movement?.previousQuantity).toBe(50);
    expect(movement?.newQuantity).toBe(30);
  });

  it('Stock quantity can NEVER go negative (422 STOCK_CANNOT_BE_NEGATIVE)', async () => {
    // Current stock is 30. Attempt to deduct 50
    const res = await request(app)
      .post(`/api/inventory/items/${testStockId}/movement`)
      .set('Cookie', [`access_token=${inventoryToken}`])
      .send({
        type: 'OUT',
        quantity: 50,
        reason: 'Over-deduction attempt',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('STOCK_CANNOT_BE_NEGATIVE');
  });

  it('Employee cannot manage inventory items (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/inventory/items')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        kind: 'STOCK',
        name: 'Desk Mat',
        category: 'Accessories',
      });

    expect(res.status).toBe(403);
  });
});
