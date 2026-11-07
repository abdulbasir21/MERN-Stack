import mongoose from 'mongoose';
import { Inquiry, IInquiry } from '../../models/Inquiry';
import { Message } from '../../models/Message';
import { Service } from '../../models/Service';
import { Company } from '../../models/Company';
import { User, IUser } from '../../models/User';
import { Review } from '../../models/Review';
import { NotificationService } from '../notifications/notification.service';
import { getNextSequence } from '../../models/Counter';
import { GeminiService } from '../ai/gemini.service';
import { AppError } from '../../utils/AppError';
import { DEFAULT_CHECKLIST } from '../../config/constants';
import { ValidateInquiryBriefInput, CreateInquiryInput } from './inquiry.schema';

export class InquiryService {
  /**
   * AI Step 1: Customer brief audit against service requirements checklist (stateless)
   */
  static async validateBrief(input: ValidateInquiryBriefInput) {
    if (!mongoose.Types.ObjectId.isValid(input.serviceId)) {
      throw AppError.notFound('Service not found or is currently inactive.');
    }

    const service = await Service.findById(input.serviceId);
    if (!service || !service.isActive) {
      throw AppError.notFound('Service not found or is currently inactive.');
    }

    const checklist =
      service.requirementsChecklist && service.requirementsChecklist.length > 0
        ? service.requirementsChecklist.map((c) => c.item)
        : [...DEFAULT_CHECKLIST];

    const result = await GeminiService.validateBrief({
      serviceTitle: service.title,
      requirementsChecklist: checklist,
      description: input.description,
      budget: input.budget,
      deadline: input.deadline,
      round: input.round,
    });

    return result;
  }

  /**
   * Submit new inquiry + atomically create initial request message
   */
  static async createInquiry(user: IUser, input: CreateInquiryInput) {
    if (!mongoose.Types.ObjectId.isValid(input.serviceId)) {
      throw AppError.notFound('Service not found.');
    }

    const service = await Service.findById(input.serviceId);
    if (!service || !service.isActive) {
      throw AppError.notFound('Service not found or is currently inactive.');
    }

    const company = await Company.findById(service.companyId);
    if (!company || company.status !== 'approved') {
      throw AppError.forbidden('This company is not currently accepting quotation requests.');
    }

    // Check duplicate clientRequestId for 10-second idempotency window (DATA_MODEL §4)
    if (input.clientRequestId) {
      const existing = await Inquiry.findOne({
        customerId: user._id,
        clientRequestId: input.clientRequestId,
      });
      if (existing) {
        throw AppError.conflict('A duplicate request with this idempotency key has already been received.');
      }
    }

    // Enforce intake brief validation on backend (FR-AI-001, FR-AI-003)
    const checklist =
      service.requirementsChecklist && service.requirementsChecklist.length > 0
        ? service.requirementsChecklist.map((c) => c.item)
        : [...DEFAULT_CHECKLIST];

    let finalAiValidation = input.aiValidation || {
      rounds: 1,
      overridden: false,
      skipped: false,
    };

    if (input.aiValidation?.overridden) {
      // Overrides require at least 2 review rounds per FR-AI-003 & OQ-19
      if ((input.aiValidation.rounds || 0) < 2) {
        throw AppError.badRequest('Scope review check cannot be overridden before completing at least 2 validation rounds.');
      }
    } else {
      // If not already verified complete or skipped, execute the audit
      const needsAudit =
        !input.aiValidation?.lastResult?.isComplete && !input.aiValidation?.skipped;

      if (needsAudit) {
        const auditResult = await GeminiService.validateBrief({
          serviceTitle: service.title,
          requirementsChecklist: checklist,
          description: input.description,
          budget: input.budget,
          deadline: input.deadline,
          round: input.aiValidation?.rounds || 1,
        });

        if (!auditResult.isComplete && !auditResult.skipped) {
          throw new AppError(
            400,
            'INCOMPLETE_BRIEF',
            auditResult.message || 'The project brief does not satisfy the company intake requirements.',
            auditResult.missing.map((m) => ({ field: 'description', message: m }))
          );
        }

        finalAiValidation = {
          rounds: input.aiValidation?.rounds || 1,
          overridden: false,
          skipped: auditResult.skipped,
          lastResult: {
            isComplete: auditResult.isComplete,
            missing: auditResult.missing,
            message: auditResult.message,
          },
        };
      }
    }

    // Generate atomic sequence number: QP-###
    const referenceNumber = await getNextSequence('inquiry');

    const preview = input.description.length > 115
      ? `${input.description.slice(0, 115)}...`
      : input.description;

    const inquiry = await Inquiry.create({
      referenceNumber,
      customerId: user._id,
      companyId: company._id,
      serviceId: service._id,
      serviceTitleSnapshot: service.title,
      description: input.description.trim(),
      budget: input.budget,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      status: 'submitted',
      aiValidation: finalAiValidation,
      aiSummary: {
        status: 'pending',
      },
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
      clientRequestId: input.clientRequestId,
    });

    // Create the first message record (initial_request)
    await Message.create({
      inquiryId: inquiry._id,
      senderId: user._id,
      senderRole: 'customer',
      type: 'initial_request',
      text: input.description.trim(),
    });

    return { inquiry };
  }

  /**
   * Scoped inquiry list: customer sees their own; company sees their company's inquiries.
   */
  static async listInquiries(
    user: IUser,
    query: { status?: string; q?: string; page?: number; limit?: number }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (user.role === 'customer') {
      filter.customerId = user._id;
    } else if (user.role === 'company_admin') {
      if (!user.companyId) {
        throw AppError.forbidden('User does not belong to a company.');
      }
      filter.companyId = user.companyId;
    } else {
      throw AppError.forbidden('Access denied.');
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.q && query.q.trim()) {
      filter.$or = [
        { referenceNumber: { $regex: query.q.trim(), $options: 'i' } },
        { serviceTitleSnapshot: { $regex: query.q.trim(), $options: 'i' } },
        { description: { $regex: query.q.trim(), $options: 'i' } },
      ];
    }

    const [total, inquiries] = await Promise.all([
      Inquiry.countDocuments(filter),
      Inquiry.find(filter)
        .populate('companyId', 'name slug logo')
        .populate('customerId', 'name email')
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    // Format list based on viewer role
    const items = await Promise.all(
      inquiries.map(async (inq) => {
        // Calculate unread count for current user
        const unreadRole = user.role === 'customer' ? 'company_admin' : 'customer';
        const unreadCount = await Message.countDocuments({
          inquiryId: inq._id,
          senderRole: unreadRole,
          readAt: { $exists: false },
        });

        const co = inq.companyId as any;
        const cust = inq.customerId as any;

        const base = {
          id: inq._id.toString(),
          referenceNumber: inq.referenceNumber,
          serviceTitle: inq.serviceTitleSnapshot,
          status: inq.status,
          lastMessagePreview: inq.lastMessagePreview,
          lastMessageAt: inq.lastMessageAt,
          unreadCount,
          hasQuotation: Boolean(inq.quotationId),
          createdAt: inq.createdAt,
        };

        if (user.role === 'company_admin') {
          return {
            ...base,
            customer: {
              id: cust?._id?.toString(),
              name: cust?.name,
              email: cust?.email,
            },
            aiSummary: inq.aiSummary, // Visible only to company
          };
        } else {
          return {
            ...base,
            company: {
              id: co?._id?.toString(),
              name: co?.name,
              slug: co?.slug,
              logo: co?.logo,
            },
          };
        }
      })
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Detail view of a single inquiry with tenant authorization
   */
  static async getInquiryById(user: IUser, inquiryId: string) {
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId)
      .populate('companyId', 'name slug logo city mainCategory')
      .populate('customerId', 'name email phone');

    if (!inquiry) {
      throw AppError.notFound('Inquiry not found.');
    }

    // Verify tenant authorization: must be customer owner or caller's company
    const isCustomer = user.role === 'customer' && inquiry.customerId._id.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      inquiry.companyId._id.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Inquiry not found.');
    }

    // Mark viewed for company admin
    if (isCompanyAdmin && !inquiry.companyFirstViewedAt) {
      inquiry.companyFirstViewedAt = new Date();
      await inquiry.save();
    }

    const co = inquiry.companyId as any;
    const cust = inquiry.customerId as any;

    const result: Record<string, any> = {
      id: inquiry._id.toString(),
      referenceNumber: inquiry.referenceNumber,
      status: inquiry.status,
      serviceTitle: inquiry.serviceTitleSnapshot,
      description: inquiry.description,
      budget: inquiry.budget,
      deadline: inquiry.deadline,
      company: {
        id: co?._id?.toString(),
        name: co?.name,
        slug: co?.slug,
        logo: co?.logo,
        city: co?.city,
        mainCategory: co?.mainCategory,
      },
      customer: {
        name: cust?.name,
        email: isCompanyAdmin ? cust?.email : undefined,
        phone: isCompanyAdmin ? cust?.phone : undefined,
      },
      quotationId: inquiry.quotationId?.toString(),
      createdAt: inquiry.createdAt,
      lastMessageAt: inquiry.lastMessageAt,
    };

    // Include review if already posted for this inquiry
    const existingReview = await Review.findOne({ inquiryId: inquiry._id }).select(
      'rating comment reviewerDisplayName createdAt'
    );
    if (existingReview) {
      result.review = {
        id: existingReview._id.toString(),
        rating: existingReview.rating,
        comment: existingReview.comment,
        reviewerDisplayName: existingReview.reviewerDisplayName,
        createdAt: existingReview.createdAt,
      };
    }

    // Customer NEVER receives aiSummary (SRS FR-INQ-012)
    if (isCompanyAdmin || user.role === 'platform_admin') {
      result.aiSummary = inquiry.aiSummary;
      result.aiValidation = inquiry.aiValidation;
    }

    return { inquiry: result };
  }

  /**
   * Regenerate or generate on-demand AI Step 2 Brief Summary (Company Provider Desk only)
   * BR-09: Never sets prices. Customer never sees aiSummary.
   */
  static async generateSummary(user: IUser, inquiryId: string) {
    if (user.role !== 'company_admin' && user.role !== 'platform_admin') {
      throw AppError.forbidden('Only service providers can generate or view AI brief summaries.');
    }

    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry not found.');
    }

    if (user.role === 'company_admin' && (!user.companyId || !inquiry.companyId.equals(user.companyId))) {
      throw AppError.notFound('Inquiry not found.');
    }

    // Fetch service requirements checklist if available
    const service = await Service.findById(inquiry.serviceId);
    const checklist = service?.requirementsChecklist?.map((r) => r.item) || [];

    const summaryResult = await GeminiService.summarizeBrief({
      serviceTitle: inquiry.serviceTitleSnapshot,
      description: inquiry.description,
      budget: inquiry.budget,
      deadline: inquiry.deadline?.toISOString(),
      requirementsChecklist: checklist,
    });

    inquiry.aiSummary = {
      status: 'ready',
      summary: summaryResult.summaryText,
      requirements: summaryResult.keyDeliverables,
      suggestedNextSteps: summaryResult.suggestedNextSteps,
      model: summaryResult.modelUsed,
      generatedAt: new Date(),
    };

    await inquiry.save();

    return {
      aiSummary: inquiry.aiSummary,
    };
  }

  /**
   * Get all chronological messages for an inquiry thread with unread marking
   */
  static async getMessages(user: IUser, inquiryId: string) {
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry not found.');
    }

    const isCustomer = user.role === 'customer' && inquiry.customerId.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      inquiry.companyId.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Inquiry not found.');
    }

    // Mark unread messages sent by the other party as read
    const unreadRole = isCustomer ? 'company_admin' : 'customer';
    await Message.updateMany(
      {
        inquiryId: inquiry._id,
        senderRole: unreadRole,
        readAt: { $exists: false },
      },
      {
        $set: { readAt: new Date() },
      }
    );

    const messages = await Message.find({ inquiryId: inquiry._id })
      .populate('senderId', 'name role')
      .sort({ createdAt: 1 });

    return {
      messages: messages.map((m) => {
        const sender = m.senderId as any;
        return {
          id: m._id.toString(),
          inquiryId: m.inquiryId.toString(),
          sender: {
            id: sender?._id?.toString() || m.senderId?.toString(),
            name: sender?.name || (m.senderRole === 'customer' ? 'Client' : 'Provider Desk'),
            role: m.senderRole,
          },
          senderRole: m.senderRole,
          type: m.type,
          text: m.text,
          readAt: m.readAt,
          createdAt: m.createdAt,
        };
      }),
    };
  }

  /**
   * Post a new message into an inquiry thread (BR-12: Chat exists only inside an inquiry)
   * Automatically transitions status from 'submitted' to 'in_discussion'
   */
  static async createMessage(user: IUser, inquiryId: string, text: string) {
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    if (!text || text.trim().length === 0) {
      throw AppError.badRequest('Message text cannot be empty.');
    }

    if (text.length > 2000) {
      throw AppError.badRequest('Message cannot exceed 2000 characters.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry not found.');
    }

    const isCustomer = user.role === 'customer' && inquiry.customerId.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      inquiry.companyId.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Inquiry not found.');
    }

    const senderRole = user.role === 'customer' ? 'customer' : 'company_admin';

    const message = await Message.create({
      inquiryId: inquiry._id,
      senderId: user._id,
      senderRole,
      type: 'text',
      text: text.trim(),
    });

    // Update inquiry last message preview & transition status
    inquiry.lastMessageAt = new Date();
    inquiry.lastMessagePreview =
      text.trim().length > 100 ? `${text.trim().slice(0, 100)}...` : text.trim();

    if (inquiry.status === 'submitted') {
      inquiry.status = 'in_discussion';
    }

    await inquiry.save();

    return {
      message: {
        id: message._id.toString(),
        inquiryId: message.inquiryId.toString(),
        sender: {
          id: user._id.toString(),
          name: user.name,
          role: senderRole,
        },
        senderRole,
        type: message.type,
        text: message.text,
        createdAt: message.createdAt,
      },
    };
  }

  /**
   * Mark all received messages in an inquiry thread as read
   */
  static async markMessagesAsRead(user: IUser, inquiryId: string) {
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry not found.');
    }

    const isCustomer = user.role === 'customer' && inquiry.customerId.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      inquiry.companyId.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Inquiry not found.');
    }

    const targetSenderRole = user.role === 'customer' ? 'company_admin' : 'customer';
    const result = await Message.updateMany(
      {
        inquiryId: inquiry._id,
        senderRole: targetSenderRole,
        $or: [{ readAt: { $exists: false } }, { readAt: null }],
      },
      { $set: { readAt: new Date() } }
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Provider Desk Operational Statistics
   */
  static async getDeskStats(user: IUser) {
    if (user.role !== 'company_admin' || !user.companyId) {
      throw AppError.forbidden('Only company administrators can access desk metrics.');
    }

    const companyId = user.companyId;

    const [total, submitted, inDiscussion, quoted, accepted, rejected] = await Promise.all([
      Inquiry.countDocuments({ companyId }),
      Inquiry.countDocuments({ companyId, status: 'submitted' }),
      Inquiry.countDocuments({ companyId, status: 'in_discussion' }),
      Inquiry.countDocuments({ companyId, status: 'quoted' }),
      Inquiry.countDocuments({ companyId, status: 'accepted' }),
      Inquiry.countDocuments({ companyId, status: 'rejected' }),
    ]);

    return {
      stats: {
        total,
        actionRequired: submitted,
        inDiscussion,
        quoted,
        accepted,
        rejected,
      },
    };
  }

  /**
   * Phase 11: Post-acceptance progress advancement (accepted -> in_progress -> completed)
   */
  static async updateProgress(user: IUser, inquiryId: string, targetStatus: string) {
    if (user.role !== 'company_admin' || !user.companyId) {
      throw AppError.forbidden('Only the assigned service company can update delivery progress.');
    }

    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry || !inquiry.companyId.equals(user.companyId)) {
      throw AppError.notFound('Inquiry not found.');
    }

    if (targetStatus === 'in_progress') {
      if (inquiry.status !== 'accepted') {
        throw AppError.badRequest('Inquiry can only transition to in_progress from accepted status.');
      }
    } else if (targetStatus === 'completed') {
      if (inquiry.status !== 'in_progress' && inquiry.status !== 'accepted') {
        throw AppError.badRequest('Inquiry can only transition to completed from in_progress or accepted status.');
      }
    } else {
      throw AppError.badRequest('Invalid progress status. Allowed: in_progress, completed.');
    }

    inquiry.status = targetStatus as any;
    await inquiry.save();

    // Notify customer
    NotificationService.notify({
      userId: inquiry.customerId,
      type: 'inquiry_updated',
      title: `Project Progress: ${targetStatus.replace('_', ' ').toUpperCase()}`,
      body: `Delivery progress for inquiry #${inquiry.referenceNumber} is now marked as ${targetStatus.replace('_', ' ')}.`,
      link: `/inquiries/${inquiry._id}`,
      entity: { type: 'inquiry', id: inquiry._id.toString() },
    }).catch((err) => console.error('[InquiryService] updateProgress notification error:', err));

    return {
      inquiry: {
        id: inquiry._id.toString(),
        referenceNumber: inquiry.referenceNumber,
        status: inquiry.status,
      },
    };
  }
}
