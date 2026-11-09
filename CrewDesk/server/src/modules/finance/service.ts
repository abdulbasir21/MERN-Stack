import { prisma } from '../../lib/prisma.js';
import { logAudit } from '../../lib/audit.js';
import { notify } from '../../lib/notify.js';
import { AuthenticatedUser } from '../../middleware/auth.js';
import {
  assertSameDemoScope,
  verifyScopedClient,
  verifyScopedProject,
} from '../../lib/demoScope.js';
import {
  createExpenseSchema,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  recordPaymentSchema,
} from './schemas.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export type DerivedInvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export class FinanceService {
  /**
   * Business rule: Derived, never stored:
   * invoice PARTIALLY_PAID / PAID / OVERDUE, outstanding balance.
   * Stored invoice statuses: DRAFT, SENT, CANCELLED only.
   */
  deriveInvoiceStatus(
    storedStatus: 'DRAFT' | 'SENT' | 'CANCELLED',
    dueDate: Date,
    total: Prisma.Decimal,
    paidAmount: Prisma.Decimal
  ): { derivedStatus: DerivedInvoiceStatus; outstanding: Prisma.Decimal } {
    const outstanding = Prisma.Decimal.max(0, total.sub(paidAmount));

    if (storedStatus === 'CANCELLED') {
      return { derivedStatus: 'CANCELLED', outstanding };
    }

    if (paidAmount.gte(total)) {
      return { derivedStatus: 'PAID', outstanding: new Prisma.Decimal(0) };
    }

    if (paidAmount.gt(0) && paidAmount.lt(total)) {
      return { derivedStatus: 'PARTIALLY_PAID', outstanding };
    }

    // paidAmount is 0
    const now = new Date();
    if (now > dueDate) {
      return { derivedStatus: 'OVERDUE', outstanding };
    }

    return { derivedStatus: storedStatus, outstanding };
  }

  // --- EXPENSES ---
  async createExpense(actor: AuthenticatedUser, input: z.infer<typeof createExpenseSchema>) {
    const isDemo = Boolean(actor.isDemo);
    if (input.projectId) {
      await verifyScopedProject(input.projectId, isDemo);
    }

    const amount = new Prisma.Decimal(input.amount);
    if (amount.lte(0)) {
      throw { status: 400, code: 'INVALID_AMOUNT', message: 'Expense amount must be greater than zero.' };
    }

    const expense = await prisma.expense.create({
      data: {
        projectId: input.projectId || null,
        category: input.category,
        amount,
        description: input.description,
        date: new Date(`${input.date}T00:00:00.000Z`),
        receiptUrl: input.receiptUrl || null,
        recordedById: actor.userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });

    await logAudit(actor.userId, 'expense:create', 'Expense', expense.id, null, {
      amount: expense.amount.toString(),
      category: expense.category,
      projectId: expense.projectId,
    });

    return expense;
  }

  async listExpenses(projectId?: string, isDemo = false) {
    const where: Prisma.ExpenseWhereInput = {
      recordedBy: { isDemo: Boolean(isDemo) },
    };
    if (projectId) where.projectId = projectId;

    return prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
    });
  }

  // --- INVOICES ---
  async createInvoice(actor: AuthenticatedUser, input: z.infer<typeof createInvoiceSchema>) {
    const isDemo = Boolean(actor.isDemo);
    await verifyScopedClient(input.clientId, isDemo);
    if (input.projectId) {
      await verifyScopedProject(input.projectId, isDemo);
    }

    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber: input.invoiceNumber },
    });

    if (existing) {
      throw { status: 409, code: 'INVOICE_NUMBER_EXISTS', message: 'Invoice number already exists.' };
    }

    const subtotal = new Prisma.Decimal(input.subtotal);
    const tax = new Prisma.Decimal(input.tax);
    const total = new Prisma.Decimal(input.total);

    if (total.lte(0)) {
      throw { status: 400, code: 'INVALID_AMOUNT', message: 'Invoice total must be greater than zero.' };
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: input.invoiceNumber,
        clientId: input.clientId,
        projectId: input.projectId || null,
        subtotal,
        tax,
        total,
        status: 'DRAFT',
        issueDate: new Date(`${input.issueDate}T00:00:00.000Z`),
        dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
        notes: input.notes || null,
        createdById: actor.userId,
      },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        payments: true,
      },
    });

    await logAudit(actor.userId, 'invoice:create', 'Invoice', invoice.id, null, {
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total.toString(),
      clientId: invoice.clientId,
    });

    const { derivedStatus, outstanding } = this.deriveInvoiceStatus(invoice.status, invoice.dueDate, invoice.total, new Prisma.Decimal(0));

    return {
      ...invoice,
      paidAmount: new Prisma.Decimal(0),
      outstanding,
      derivedStatus,
    };
  }

  async updateInvoiceStatus(actor: AuthenticatedUser, invoiceId: string, input: z.infer<typeof updateInvoiceStatusSchema>) {
    const isDemo = Boolean(actor.isDemo);
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, client: { select: { isDemo: true } } },
    });

    if (!invoice) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Invoice not found.' };
    }
    assertSameDemoScope(isDemo, invoice.client.isDemo, 'Invoice');

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: input.status },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        payments: true,
      },
    });

    await logAudit(actor.userId, 'invoice:update-status', 'Invoice', invoiceId, { status: invoice.status }, { status: input.status });

    const paidTotal = updated.payments.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const { derivedStatus, outstanding } = this.deriveInvoiceStatus(updated.status, updated.dueDate, updated.total, paidTotal);

    return {
      ...updated,
      paidAmount: paidTotal,
      outstanding,
      derivedStatus,
    };
  }

  async listInvoices(clientId?: string, projectId?: string, isDemo = false) {
    const where: Prisma.InvoiceWhereInput = {
      client: { isDemo: Boolean(isDemo) },
    };
    if (clientId) where.clientId = clientId;
    if (projectId) where.projectId = projectId;

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true, email: true, company: true } },
        project: { select: { id: true, name: true } },
        payments: { select: { id: true, amount: true, date: true, method: true, reference: true } },
      },
    });

    return invoices.map((inv) => {
      const paidTotal = inv.payments.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
      const { derivedStatus, outstanding } = this.deriveInvoiceStatus(inv.status, inv.dueDate, inv.total, paidTotal);
      return {
        ...inv,
        paidAmount: paidTotal,
        outstanding,
        derivedStatus,
      };
    });
  }

  // --- PAYMENTS ---
  async recordPayment(actor: AuthenticatedUser, invoiceId: string, input: z.infer<typeof recordPaymentSchema>) {
    const isDemo = Boolean(actor.isDemo);
    const paymentAmount = new Prisma.Decimal(input.amount);
    if (paymentAmount.lte(0)) {
      throw { status: 400, code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than zero.' };
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, client: true },
    });

    if (!invoice) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Invoice not found.' };
    }
    assertSameDemoScope(isDemo, invoice.client.isDemo, 'Invoice');

    if (invoice.status === 'CANCELLED') {
      throw { status: 400, code: 'INVOICE_CANCELLED', message: 'Cannot record payments on a cancelled invoice.' };
    }

    // Business rule: Outstanding = invoice total minus sum of payments. A payment cannot exceed it.
    const currentPaid = invoice.payments.reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const currentOutstanding = invoice.total.sub(currentPaid);

    if (paymentAmount.gt(currentOutstanding)) {
      throw {
        status: 422,
        code: 'PAYMENT_EXCEEDS_OUTSTANDING',
        message: `Payment amount (${paymentAmount.toString()}) exceeds outstanding balance (${currentOutstanding.toString()}).`,
      };
    }

    // Business rule: Recording a payment runs in ONE transaction together with its audit log.
    const { payment } = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          invoiceId,
          amount: paymentAmount,
          date: new Date(`${input.date}T00:00:00.000Z`),
          method: input.method,
          reference: input.reference || null,
          notes: input.notes || null,
          recordedById: actor.userId,
        },
      });

      const audit = await tx.auditLog.create({
        data: {
          actorId: actor.userId,
          action: 'payment:record',
          entityType: 'Payment',
          entityId: p.id,
          oldValues: { outstanding: currentOutstanding.toString() },
          newValues: {
            paymentAmount: paymentAmount.toString(),
            newOutstanding: currentOutstanding.sub(paymentAmount).toString(),
            invoiceNumber: invoice.invoiceNumber,
          },
        },
      });

      return { payment: p, auditLog: audit };
    });

    const newPaidTotal = currentPaid.add(paymentAmount);
    const { derivedStatus, outstanding: finalOutstanding } = this.deriveInvoiceStatus(invoice.status, invoice.dueDate, invoice.total, newPaidTotal);

    // If fully paid, notify
    if (derivedStatus === 'PAID') {
      await notify(
        invoice.createdById,
        'FINANCE',
        `Invoice ${invoice.invoiceNumber} has been fully PAID ($${invoice.total.toString()}).`,
        '/finance'
      );
    }

    return {
      payment,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paidAmount: newPaidTotal,
        outstanding: finalOutstanding,
        derivedStatus,
      },
    };
  }

  // --- PROFITABILITY & FINANCIAL REPORTS ---
  async getProjectProfitability(projectId: string, isDemo = false) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        expenses: true,
        invoices: {
          include: { payments: true },
        },
      },
    });

    if (!project) {
      throw { status: 404, code: 'NOT_FOUND', message: 'Project not found.' };
    }
    assertSameDemoScope(Boolean(isDemo), project.isDemo, 'Project');

    const totalExpenses = project.expenses.reduce((acc, exp) => acc.add(exp.amount), new Prisma.Decimal(0));
    const totalInvoiced = project.invoices
      .filter((inv) => inv.status !== 'CANCELLED')
      .reduce((acc, inv) => acc.add(inv.total), new Prisma.Decimal(0));
    const totalPaid = project.invoices
      .flatMap((inv) => inv.payments)
      .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));

    // Profitability derived from budget vs actual expenses
    const budgetProfit = project.budget.sub(totalExpenses);
    const invoicedProfit = totalInvoiced.sub(totalExpenses);

    return {
      projectId: project.id,
      projectName: project.name,
      budget: project.budget,
      totalExpenses,
      totalInvoiced,
      totalPaid,
      profitabilityAgainstBudget: budgetProfit,
      profitabilityAgainstInvoiced: invoicedProfit,
      marginPercent: project.budget.gt(0) ? budgetProfit.div(project.budget).mul(100).toNumber().toFixed(1) : '0.0',
    };
  }

  async getExecutiveFinancialSummary(isDemo = false) {
    const scope = Boolean(isDemo);
    const expenses = await prisma.expense.findMany({
      where: { recordedBy: { isDemo: scope } },
    });
    const invoices = await prisma.invoice.findMany({
      where: { client: { isDemo: scope } },
      include: { payments: true },
    });

    const totalExpenses = expenses.reduce((acc, exp) => acc.add(exp.amount), new Prisma.Decimal(0));
    const validInvoices = invoices.filter((i) => i.status !== 'CANCELLED');
    const totalInvoiced = validInvoices.reduce((acc, inv) => acc.add(inv.total), new Prisma.Decimal(0));
    const totalCollected = validInvoices
      .flatMap((i) => i.payments)
      .reduce((acc, p) => acc.add(p.amount), new Prisma.Decimal(0));
    const totalOutstanding = totalInvoiced.sub(totalCollected);

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalExpenses,
      netRevenue: totalCollected.sub(totalExpenses),
    };
  }
}

export const financeService = new FinanceService();
