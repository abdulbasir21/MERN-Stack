import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';
import { signAccessToken } from '../src/lib/token.js';
import { Prisma } from '@prisma/client';

describe('Phase 7: Finance (Expenses, Invoices, Payments, Profitability) Tests', () => {
  let ownerToken: string;
  let financeToken: string;
  let financeId: string;
  let empToken: string;

  let clientId: string;
  let projectId: string;
  let invoiceId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('TestPass123!', 10);
    const dept = await prisma.department.findFirst();

    // Owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER', isDemo: false } });
    ownerToken = signAccessToken({
      userId: owner!.id,
      email: owner!.email,
      role: 'OWNER',
      mustChangePassword: false,
    });

    // Finance Manager
    const finance = await prisma.user.upsert({
      where: { email: 'finance.tester@crewdesk.agency' },
      update: { role: 'FINANCE_MANAGER' },
      create: {
        name: 'Finance Tester',
        email: 'finance.tester@crewdesk.agency',
        passwordHash,
        role: 'FINANCE_MANAGER',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    financeId = finance.id;
    financeToken = signAccessToken({
      userId: finance.id,
      email: finance.email,
      role: 'FINANCE_MANAGER',
      mustChangePassword: false,
    });

    // Employee
    const emp = await prisma.user.upsert({
      where: { email: 'emp.finance@crewdesk.agency' },
      update: { role: 'EMPLOYEE' },
      create: {
        name: 'Regular Employee',
        email: 'emp.finance@crewdesk.agency',
        passwordHash,
        role: 'EMPLOYEE',
        departmentId: dept!.id,
        mustChangePassword: false,
      },
    });
    empToken = signAccessToken({
      userId: emp.id,
      email: emp.email,
      role: 'EMPLOYEE',
      mustChangePassword: false,
    });

    // Test Client
    const client = await prisma.client.upsert({
      where: { email: 'finance.client@acmecorp.com' },
      update: {},
      create: {
        name: 'Acme Finance Client',
        email: 'finance.client@acmecorp.com',
        company: 'Acme Corporation',
      },
    });
    clientId = client.id;

    // Test Project with Decimal budget: $10,000.00
    const project = await prisma.project.create({
      data: {
        name: 'Finance Test Project',
        clientId: client.id,
        managerId: owner!.id,
        startDate: new Date('2026-11-01'),
        deadline: new Date('2026-12-01'),
        budget: new Prisma.Decimal('10000.00'),
        status: 'ACTIVE',
      },
    });
    projectId = project.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.payment.deleteMany({ where: { invoice: { projectId } } });
    await prisma.invoice.deleteMany({ where: { projectId } });
    await prisma.expense.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
  });

  it('Finance Manager records an expense with Decimal precision and audit log', async () => {
    const res = await request(app)
      .post('/api/finance/expenses')
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        projectId,
        category: 'SOFTWARE',
        amount: '1250.50',
        description: 'Cloud hosting & API services',
        date: '2026-11-05',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.amount).toBe('1250.5');

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'expense:create', entityId: res.body.data.id },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(financeId);
  });

  it('Employee cannot create an expense (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/finance/expenses')
      .set('Cookie', [`access_token=${empToken}`])
      .send({
        projectId,
        category: 'OFFICE',
        amount: '50.00',
        description: 'Office supplies',
        date: '2026-11-05',
      });

    expect(res.status).toBe(403);
  });

  it('Finance Manager creates an invoice (stored DRAFT, derived DRAFT)', async () => {
    const uniqueInvNumber = `INV-TEST-${Date.now()}`;
    const res = await request(app)
      .post('/api/finance/invoices')
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        invoiceNumber: uniqueInvNumber,
        clientId,
        projectId,
        subtotal: '5000.00',
        tax: '500.00',
        total: '5500.00',
        issueDate: '2026-11-01',
        dueDate: '2026-11-30',
        notes: 'First milestone payment',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.derivedStatus).toBe('DRAFT');
    expect(parseFloat(res.body.data.outstanding)).toBe(5500);
    invoiceId = res.body.data.id;
  });

  it('Recording partial payment updates derived status to PARTIALLY_PAID in 1 transaction', async () => {
    // Record $2,000.00 payment against $5,500.00
    const res = await request(app)
      .post(`/api/finance/invoices/${invoiceId}/payments`)
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        amount: '2000.00',
        date: '2026-11-08',
        method: 'BANK_TRANSFER',
        reference: 'WIRE-12345',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.derivedStatus).toBe('PARTIALLY_PAID');
    expect(parseFloat(res.body.data.invoice.paidAmount)).toBe(2000);
    expect(parseFloat(res.body.data.invoice.outstanding)).toBe(3500);

    // Verify audit log exists
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'payment:record', entityId: res.body.data.payment.id },
    });
    expect(audit).toBeDefined();
    expect(audit?.actorId).toBe(financeId);
  });

  it('Payment exceeding outstanding balance is strictly blocked (422 PAYMENT_EXCEEDS_OUTSTANDING)', async () => {
    // Outstanding is $3,500.00. Attempting to record $4,000.00 must fail.
    const res = await request(app)
      .post(`/api/finance/invoices/${invoiceId}/payments`)
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        amount: '4000.00',
        date: '2026-11-08',
        method: 'CREDIT_CARD',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('PAYMENT_EXCEEDS_OUTSTANDING');
  });

  it('Final exact payment marks invoice derived status as PAID', async () => {
    // Pay exact remainder $3,500.00
    const res = await request(app)
      .post(`/api/finance/invoices/${invoiceId}/payments`)
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        amount: '3500.00',
        date: '2026-11-08',
        method: 'BANK_TRANSFER',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.derivedStatus).toBe('PAID');
    expect(parseFloat(res.body.data.invoice.outstanding)).toBe(0);
    expect(parseFloat(res.body.data.invoice.paidAmount)).toBe(5500);
  });

  it('Project profitability is derived accurately without storing derived floats', async () => {
    // Project budget: $10,000.00
    // Expenses so far: $1,250.50
    // Profitability against budget: $10,000.00 - $1,250.50 = $8,749.50
    const res = await request(app)
      .get(`/api/finance/reports/profitability/${projectId}`)
      .set('Cookie', [`access_token=${financeToken}`]);

    expect(res.status).toBe(200);
    expect(parseFloat(res.body.data.budget)).toBe(10000);
    expect(parseFloat(res.body.data.totalExpenses)).toBe(1250.5);
    expect(parseFloat(res.body.data.profitabilityAgainstBudget)).toBe(8749.5);
  });

  it('Cancelled invoice blocks payment recording', async () => {
    // Create new invoice and cancel it
    const invRes = await request(app)
      .post('/api/finance/invoices')
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        invoiceNumber: 'INV-CANCEL-TEST',
        clientId,
        projectId,
        subtotal: '1000.00',
        tax: '0.00',
        total: '1000.00',
        issueDate: '2026-11-01',
        dueDate: '2026-11-10',
      });

    const cId = invRes.body.data.id;

    // Mark CANCELLED
    await request(app)
      .patch(`/api/finance/invoices/${cId}/status`)
      .set('Cookie', [`access_token=${financeToken}`])
      .send({ status: 'CANCELLED' });

    // Attempt payment
    const payRes = await request(app)
      .post(`/api/finance/invoices/${cId}/payments`)
      .set('Cookie', [`access_token=${financeToken}`])
      .send({
        amount: '500.00',
        date: '2026-11-08',
        method: 'CASH',
      });

    expect(payRes.status).toBe(400);
    expect(payRes.body.error.code).toBe('INVOICE_CANCELLED');
  });
});
