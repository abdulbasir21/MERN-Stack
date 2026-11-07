import mongoose from 'mongoose';
import { Review, IReview } from '../../models/Review';
import { Inquiry } from '../../models/Inquiry';
import { Company } from '../../models/Company';
import { IUser } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { NotificationService } from '../notifications/notification.service';

export class ReviewService {
  /**
   * Customer submits review for an accepted inquiry (BR-14)
   */
  static async createReview(
    user: IUser,
    inquiryId: string,
    input: { rating: number; comment?: string }
  ) {
    if (user.role !== 'customer') {
      throw AppError.forbidden('Only customers can post reviews.');
    }

    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    // Tenant check: inquiry must belong to this customer
    if (!inquiry.customerId.equals(user._id)) {
      throw AppError.forbidden('You can only review services from your own inquiries.');
    }

    // BR-14: Review only permitted after quotation acceptance
    const allowedStatuses = ['accepted', 'in_progress', 'completed'];
    if (!allowedStatuses.includes(inquiry.status)) {
      throw AppError.forbidden(
        'Reviews are only permitted after a formal quotation slip has been accepted (BR-14).'
      );
    }

    // BR-14: Exactly one review per inquiry
    const existing = await Review.findOne({ inquiryId: inquiry._id });
    if (existing) {
      throw AppError.conflict('A review has already been submitted for this inquiry.');
    }

    // Format reviewer display name: First name + last initial (e.g. Zain M.)
    const nameParts = (user.name || 'Anonymous Client').trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? ` ${nameParts[nameParts.length - 1][0].toUpperCase()}.` : '';
    const reviewerDisplayName = `${firstName}${lastInitial}`;

    const review = await Review.create({
      companyId: inquiry.companyId,
      customerId: user._id,
      inquiryId: inquiry._id,
      rating: Math.round(input.rating),
      comment: input.comment?.trim(),
      reviewerDisplayName,
    });

    // Recompute company rating average and count
    const stats = await Review.aggregate([
      { $match: { companyId: inquiry.companyId } },
      {
        $group: {
          _id: '$companyId',
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      const avg = Math.round(stats[0].avgRating * 10) / 10;
      const count = stats[0].count;
      await Company.findByIdAndUpdate(inquiry.companyId, {
        ratingAverage: avg,
        ratingCount: count,
      });
    }

    // Notify company owner
    const company = await Company.findById(inquiry.companyId);
    if (company && company.ownerUserId) {
      NotificationService.notify({
        userId: company.ownerUserId,
        type: 'review_received',
        title: 'New Client Review Received',
        body: `${reviewerDisplayName} left a ${review.rating}-star review for inquiry #${inquiry.referenceNumber}.`,
        link: `/company/reviews`,
        entity: { type: 'company', id: inquiry.companyId.toString() },
      }).catch((err) => console.error('[ReviewService] Notification error:', err));
    }

    return { review };
  }

  /**
   * List reviews for a public company profile by slug
   */
  static async getPublicCompanyReviews(
    slug: string,
    query: { page?: string | number; limit?: string | number }
  ) {
    const company = await Company.findOne({ slug, status: 'approved' });
    if (!company) {
      throw AppError.notFound('Company not found or not currently approved.');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ companyId: company._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('rating comment reviewerDisplayName createdAt'),
      Review.countDocuments({ companyId: company._id }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * List reviews for authenticated company admin
   */
  static async getCompanyOwnReviews(
    user: IUser,
    query: { page?: string | number; limit?: string | number }
  ) {
    if (user.role !== 'company_admin' || !user.companyId) {
      throw AppError.forbidden('Only service providers can view their company reviews ledger.');
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ companyId: user.companyId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('inquiryId', 'referenceNumber serviceTitleSnapshot'),
      Review.countDocuments({ companyId: user.companyId }),
    ]);

    return {
      reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
