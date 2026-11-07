import { Request, Response } from 'express';
import { InquiryService } from './inquiry.service';
import { validateInquiryBriefSchema, createInquirySchema } from './inquiry.schema';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export class InquiryController {
  static validateBrief = asyncHandler(async (req: Request, res: Response) => {
    const validated = validateInquiryBriefSchema.parse(req.body);
    const result = await InquiryService.validateBrief(validated);
    return sendSuccess(res, result, 200);
  });

  static createInquiry = asyncHandler(async (req: Request, res: Response) => {
    const validated = createInquirySchema.parse(req.body);
    const result = await InquiryService.createInquiry(req.user!, validated);
    return sendSuccess(res, result, 201);
  });

  static listInquiries = asyncHandler(async (req: Request, res: Response) => {
    const { status, q, page, limit } = req.query;
    const result = await InquiryService.listInquiries(req.user!, {
      status: status ? String(status) : undefined,
      q: q ? String(q) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  });

  static getInquiryById = asyncHandler(async (req: Request, res: Response) => {
    const result = await InquiryService.getInquiryById(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static regenerateSummary = asyncHandler(async (req: Request, res: Response) => {
    const result = await InquiryService.generateSummary(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static getMessages = asyncHandler(async (req: Request, res: Response) => {
    const result = await InquiryService.getMessages(req.user!, req.params.id);
    return sendSuccess(res, result, 200);
  });

  static createMessage = asyncHandler(async (req: Request, res: Response) => {
    const { text } = req.body;
    const result = await InquiryService.createMessage(req.user!, req.params.id, text);

    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${req.params.id}`).emit('message:new', result.message);
    }

    return sendSuccess(res, result, 201);
  });

  static markMessagesAsRead = asyncHandler(async (req: Request, res: Response) => {
    const result = await InquiryService.markMessagesAsRead(req.user!, req.params.id);

    const io = req.app.get('io');
    if (io) {
      io.to(`inquiry:${req.params.id}`).emit('message:read', {
        inquiryId: req.params.id,
        readerRole: req.user!.role,
      });
    }

    return sendSuccess(res, result, 200);
  });

  static getDeskStats = asyncHandler(async (req: Request, res: Response) => {
    const result = await InquiryService.getDeskStats(req.user!);
    return sendSuccess(res, result, 200);
  });

  static updateProgress = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.body;
    const result = await InquiryService.updateProgress(req.user!, req.params.id, status);
    return sendSuccess(res, result, 200);
  });
}
