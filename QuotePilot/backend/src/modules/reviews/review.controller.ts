import { Request, Response } from 'express';
import { ReviewService } from './review.service';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { z } from 'zod';

const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be between 1 and 5').max(5),
  comment: z.string().max(1000, 'Comment cannot exceed 1000 characters').optional(),
});

export class ReviewController {
  static createReview = asyncHandler(async (req: Request, res: Response) => {
    const validated = createReviewSchema.parse(req.body);
    const result = await ReviewService.createReview(req.user!, req.params.id, validated);
    return sendSuccess(res, result, 201);
  });

  static getPublicCompanyReviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await ReviewService.getPublicCompanyReviews(req.params.slug, {
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    return sendSuccess(res, result.reviews, 200, result.meta);
  });

  static getCompanyOwnReviews = asyncHandler(async (req: Request, res: Response) => {
    const result = await ReviewService.getCompanyOwnReviews(req.user!, {
      page: req.query.page as string,
      limit: req.query.limit as string,
    });
    return sendSuccess(res, result.reviews, 200, result.meta);
  });
}
