import { Request, Response } from 'express';
import { QuotationService } from './quotation.service';
import {
  createQuotationSchema,
  updateQuotationSchema,
  rejectQuotationSchema,
} from './quotation.schema';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export class QuotationController {
  static createQuotation = asyncHandler(async (req: Request, res: Response) => {
    const validated = createQuotationSchema.parse(req.body);
    const result = await QuotationService.createQuotation(req.user!, req.params.id, validated);

    // Broadcast via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${req.params.id}`).emit('quotation:new', result.quotation);
    }

    return sendSuccess(res, result, 201);
  });

  static updateQuotation = asyncHandler(async (req: Request, res: Response) => {
    const validated = updateQuotationSchema.parse(req.body);
    const result = await QuotationService.updateQuotation(req.user!, req.params.id, validated);

    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${req.params.id}`).emit('quotation:updated', result.quotation);
    }

    return sendSuccess(res, result, 200);
  });

  static getQuotationByInquiryId = asyncHandler(async (req: Request, res: Response) => {
    const result = await QuotationService.getQuotationByInquiryId(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static getQuotationById = asyncHandler(async (req: Request, res: Response) => {
    const result = await QuotationService.getQuotationById(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static listQuotations = asyncHandler(async (req: Request, res: Response) => {
    const result = await QuotationService.listQuotations(req.user!, {
      status: req.query.status as string,
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    return sendSuccess(res, result.quotations, 200, result.meta);
  });

  static acceptQuotation = asyncHandler(async (req: Request, res: Response) => {
    const result = await QuotationService.acceptQuotation(req.user!, req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${result.quotation.inquiryId}`).emit('quotation:accepted', result.quotation);
      io.to(`inquiry:${result.quotation.inquiryId}`).emit('inquiry:updated', {
        inquiryId: result.quotation.inquiryId,
        status: result.inquiryStatus,
      });
    }

    return sendSuccess(res, result, 200);
  });

  static rejectQuotation = asyncHandler(async (req: Request, res: Response) => {
    const validated = rejectQuotationSchema.parse(req.body);
    const result = await QuotationService.rejectQuotation(req.user!, req.params.id, validated.reason);

    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${result.quotation.inquiryId}`).emit('quotation:rejected', result.quotation);
    }

    return sendSuccess(res, result, 200);
  });
}
