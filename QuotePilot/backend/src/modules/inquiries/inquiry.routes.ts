import { Router } from 'express';
import { InquiryController } from './inquiry.controller';
import { QuotationController } from '../quotations/quotation.controller';
import { ReviewController } from '../reviews/review.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/requireRole';

const router = Router();

// POST /api/v1/inquiries/validate (AI intake validation, no persistence)
router.post('/validate', authenticate, InquiryController.validateBrief);

// POST /api/v1/inquiries (create inquiry)
router.post('/', authenticate, requireRole('customer'), InquiryController.createInquiry);

// GET /api/v1/inquiries/desk/stats (Provider Desk operational stats)
router.get(
  '/desk/stats',
  authenticate,
  requireRole('company_admin'),
  InquiryController.getDeskStats
);

// GET /api/v1/inquiries (role-scoped inquiry list)
router.get('/', authenticate, InquiryController.listInquiries);

// GET /api/v1/inquiries/:id (participant inquiry detail)
router.get('/:id', authenticate, InquiryController.getInquiryById);

// POST /api/v1/inquiries/:id/summary/regenerate (AI Step 2 Brief Summary)
router.post(
  '/:id/summary/regenerate',
  authenticate,
  requireRole('company_admin', 'platform_admin'),
  InquiryController.regenerateSummary
);

// Quotation endpoints on inquiry docket
router.post(
  '/:id/quote',
  authenticate,
  requireRole('company_admin'),
  QuotationController.createQuotation
);
router.post(
  '/:id/quotation',
  authenticate,
  requireRole('company_admin'),
  QuotationController.createQuotation
);
router.put(
  '/:id/quote',
  authenticate,
  requireRole('company_admin'),
  QuotationController.updateQuotation
);
router.get('/:id/quote', authenticate, QuotationController.getQuotationByInquiryId);
router.get('/:id/quotation', authenticate, QuotationController.getQuotationByInquiryId);

// GET /api/v1/inquiries/:id/messages (inquiry thread messages)
router.get('/:id/messages', authenticate, InquiryController.getMessages);

// POST /api/v1/inquiries/:id/messages (post message in inquiry thread)
router.post('/:id/messages', authenticate, InquiryController.createMessage);

// POST /api/v1/inquiries/:id/messages/read (mark thread messages read)
router.post('/:id/messages/read', authenticate, InquiryController.markMessagesAsRead);

// PATCH /api/v1/inquiries/:id/progress (Phase 11: post-acceptance status advancement)
router.patch(
  '/:id/progress',
  authenticate,
  requireRole('company_admin'),
  InquiryController.updateProgress
);

// POST /api/v1/inquiries/:id/review (customer review after accepted quotation, BR-14)
router.post('/:id/review', authenticate, requireRole('customer'), ReviewController.createReview);

export default router;
