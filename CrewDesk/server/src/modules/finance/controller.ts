import { Request, Response, NextFunction } from 'express';
import { financeService } from './service.js';
import {
  createExpenseSchema,
  createInvoiceSchema,
  updateInvoiceStatusSchema,
  recordPaymentSchema,
} from './schemas.js';

export class FinanceController {
  // Expenses
  createExpense = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createExpenseSchema.parse(req.body);
      const expense = await financeService.createExpense(req.user!, input);
      res.status(201).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  };

  listExpenses = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.query.projectId as string | undefined;
      const expenses = await financeService.listExpenses(projectId);
      res.json({ success: true, data: expenses });
    } catch (err) {
      next(err);
    }
  };

  // Invoices
  createInvoice = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createInvoiceSchema.parse(req.body);
      const invoice = await financeService.createInvoice(req.user!, input);
      res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  };

  updateInvoiceStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateInvoiceStatusSchema.parse(req.body);
      const updated = await financeService.updateInvoiceStatus(req.user!, req.params.id, input);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  listInvoices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.query.clientId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const invoices = await financeService.listInvoices(clientId, projectId);
      res.json({ success: true, data: invoices });
    } catch (err) {
      next(err);
    }
  };

  // Payments
  recordPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = recordPaymentSchema.parse(req.body);
      const result = await financeService.recordPayment(req.user!, req.params.id, input);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  // Reports
  getProjectProfitability = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await financeService.getProjectProfitability(req.params.projectId);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  };

  getFinancialSummary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await financeService.getExecutiveFinancialSummary();
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  };
}

export const financeController = new FinanceController();
