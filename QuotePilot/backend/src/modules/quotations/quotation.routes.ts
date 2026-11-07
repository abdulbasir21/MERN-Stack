import { Router } from 'express';
import { QuotationController } from './quotation.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// GET /api/v1/quotations (role-scoped list)
router.get('/', authenticate, QuotationController.listQuotations);

// GET /api/v1/quotations/:id (quotation detail)
router.get('/:id', authenticate, QuotationController.getQuotationById);

// PUT /api/v1/quotations/:id (edit quotation slip)
router.put('/:id', authenticate, requireRole('company_admin'), QuotationController.updateQuotation);

// POST /api/v1/quotations/:id/accept (customer accept quotation)
router.post('/:id/accept', authenticate, requireRole('customer'), QuotationController.acceptQuotation);

// POST /api/v1/quotations/:id/reject (customer decline quotation)
router.post('/:id/reject', authenticate, requireRole('customer'), QuotationController.rejectQuotation);

export default router;
