import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/requirePermission.js';
import { financeController } from './controller.js';

const router = Router();

// Expenses
router.post('/expenses', authenticate, requirePermission('expense:manage'), financeController.createExpense);
router.get('/expenses', authenticate, requirePermission('expense:manage'), financeController.listExpenses);

// Invoices
router.post('/invoices', authenticate, requirePermission('invoice:manage'), financeController.createInvoice);
router.get('/invoices', authenticate, requirePermission('invoice:manage'), financeController.listInvoices);
router.patch('/invoices/:id/status', authenticate, requirePermission('invoice:manage'), financeController.updateInvoiceStatus);

// Payments
router.post('/invoices/:id/payments', authenticate, requirePermission('payment:manage'), financeController.recordPayment);

// Reports & Profitability
router.get('/reports/profitability/:projectId', authenticate, requirePermission('finance:read-budget'), financeController.getProjectProfitability);
router.get('/reports/summary', authenticate, requirePermission('finance:report'), financeController.getFinancialSummary);

export default router;
