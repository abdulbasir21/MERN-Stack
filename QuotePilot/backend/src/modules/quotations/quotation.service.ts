import mongoose from 'mongoose';
import { Quotation, IQuotation, IMilestone } from '../../models/Quotation';
import { Inquiry } from '../../models/Inquiry';
import { Message } from '../../models/Message';
import { IUser } from '../../models/User';
import { AppError } from '../../utils/AppError';
import { NotificationService } from '../notifications/notification.service';
import { CreateQuotationInput, UpdateQuotationInput } from './quotation.schema';

export class QuotationService {
  /**
   * Dispatch initial quotation slip for an inquiry (BR-10 & BR-11)
   */
  static async createQuotation(user: IUser, inquiryId: string, input: CreateQuotationInput) {
    if (user.role !== 'company_admin' || !user.companyId) {
      throw AppError.forbidden('Only authorized service providers can issue formal quotation slips.');
    }

    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    // Tenant isolation: inquiry must belong to caller's company
    if (!inquiry.companyId.equals(user.companyId)) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    // BR-11: Single quotation per inquiry
    const existing = await Quotation.findOne({ inquiryId: inquiry._id });
    if (existing) {
      throw AppError.conflict(
        'A quotation slip already exists for this inquiry. Please edit the existing quotation slip instead of creating a duplicate (BR-11).'
      );
    }

    const referenceNumber = `${inquiry.referenceNumber}-Q1`;

    const mappedMilestones: IMilestone[] = input.milestones.map((m, idx) => ({
      title: m.title.trim(),
      amount: m.amount,
      deliverables: m.deliverables.map((d) => d.trim()),
      estimatedDeliveryDays: m.estimatedDeliveryDays,
      order: idx + 1,
      status: 'pending',
    }));

    const quotation = await Quotation.create({
      inquiryId: inquiry._id,
      companyId: inquiry.companyId,
      customerId: inquiry.customerId,
      referenceNumber,
      version: 1,
      totalAmount: input.totalAmount,
      currency: 'PKR',
      milestones: mappedMilestones,
      termsAndConditions: input.termsAndConditions?.trim(),
      validUntil: new Date(input.validUntil),
      status: 'pending',
      versionHistory: [],
    });

    // Update inquiry state
    inquiry.status = 'quoted';
    inquiry.quotationId = quotation._id as mongoose.Types.ObjectId;
    inquiry.lastMessageAt = new Date();
    inquiry.lastMessagePreview = `Formal quotation slip dispatched: PKR ${input.totalAmount.toLocaleString()}`;
    await inquiry.save();

    // Log message into bilateral discussion thread
    await Message.create({
      inquiryId: inquiry._id,
      senderId: user._id,
      senderRole: 'company_admin',
      type: 'text',
      text: `Formal Quotation Slip #${quotation.referenceNumber} (v1) has been dispatched for PKR ${input.totalAmount.toLocaleString()} across ${mappedMilestones.length} milestone deliverable(s). Valid until ${new Date(input.validUntil).toLocaleDateString()}.`,
    });

    // Notify customer
    NotificationService.notify({
      userId: inquiry.customerId,
      type: 'quotation_received',
      title: 'Formal Quotation Slip Dispatched',
      body: `Formal quotation slip #${quotation.referenceNumber} (v1) dispatched for PKR ${input.totalAmount.toLocaleString()}.`,
      link: `/inquiries/${inquiry._id}`,
      entity: { type: 'quotation', id: quotation._id.toString() },
    }).catch((err) => console.error('[Notification] Error creating quotation notification:', err));

    return { quotation };
  }

  /**
   * Edit and resend existing quotation slip (BR-11: single quotation per inquiry, version incremented)
   */
  static async updateQuotation(user: IUser, targetId: string, input: UpdateQuotationInput) {
    if (user.role !== 'company_admin' || !user.companyId) {
      throw AppError.forbidden('Only authorized service providers can revise quotation slips.');
    }

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw AppError.notFound('Inquiry or quotation docket not found.');
    }

    let inquiry = await Inquiry.findById(targetId);
    let quotation: IQuotation | null = null;

    if (inquiry) {
      quotation = await Quotation.findOne({ inquiryId: inquiry._id });
    } else {
      quotation = await Quotation.findById(targetId);
      if (quotation) {
        inquiry = await Inquiry.findById(quotation.inquiryId);
      }
    }

    if (!inquiry || !quotation) {
      throw AppError.notFound('No quotation slip found to revise.');
    }

    if (!inquiry.companyId.equals(user.companyId)) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    if (quotation.status === 'accepted') {
      throw AppError.badRequest('Cannot revise a quotation slip that has already been accepted and funded.');
    }

    // Save previous snapshot in version history
    quotation.versionHistory.push({
      version: quotation.version,
      totalAmount: quotation.totalAmount,
      milestones: quotation.milestones,
      changedAt: new Date(),
      reason: input.changeReason?.trim() || 'Terms revision requested in thread discussion',
    });

    quotation.version += 1;
    quotation.totalAmount = input.totalAmount;
    quotation.validUntil = new Date(input.validUntil);
    quotation.termsAndConditions = input.termsAndConditions?.trim();
    quotation.status = 'pending'; // Reset to pending for buyer review
    quotation.milestones = input.milestones.map((m, idx) => ({
      title: m.title.trim(),
      amount: m.amount,
      deliverables: m.deliverables.map((d) => d.trim()),
      estimatedDeliveryDays: m.estimatedDeliveryDays,
      order: idx + 1,
      status: 'pending',
    }));

    await quotation.save();

    // Update inquiry state
    inquiry.status = 'quoted';
    inquiry.lastMessageAt = new Date();
    inquiry.lastMessagePreview = `Revised quotation slip (v${quotation.version}) dispatched: PKR ${input.totalAmount.toLocaleString()}`;
    await inquiry.save();

    // Log message into thread
    await Message.create({
      inquiryId: inquiry._id,
      senderId: user._id,
      senderRole: 'company_admin',
      type: 'text',
      text: `Revised Quotation Slip #${quotation.referenceNumber} (v${quotation.version}) has been dispatched for PKR ${input.totalAmount.toLocaleString()}. Reason: ${input.changeReason || 'Milestone and scope adjustments.'}`,
    });

    return { quotation };
  }

  /**
   * Fetch quotation slip for an inquiry with tenant access check
   */
  static async getQuotationByInquiryId(user: IUser, inquiryId: string) {
    if (!mongoose.Types.ObjectId.isValid(inquiryId)) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    const inquiry = await Inquiry.findById(inquiryId);
    if (!inquiry) {
      throw AppError.notFound('Inquiry docket not found.');
    }

    // Tenant check
    const isCustomer = user.role === 'customer' && inquiry.customerId.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      inquiry.companyId.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Inquiry docket not found.');
    }

    const quotation = await Quotation.findOne({ inquiryId: inquiry._id })
      .populate('companyId', 'name slug logo city mainCategory')
      .populate('customerId', 'name email phone');

    if (!quotation) {
      throw AppError.notFound('No formal quotation slip has been issued for this inquiry yet.');
    }

    return { quotation };
  }

  /**
   * Fetch quotation slip by direct quotation ID with tenant check
   */
  static async getQuotationById(user: IUser, quotationId: string) {
    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      throw AppError.notFound('Quotation slip not found.');
    }

    const quotation = await Quotation.findById(quotationId)
      .populate('companyId', 'name slug logo city mainCategory')
      .populate('customerId', 'name email phone');

    if (!quotation) {
      throw AppError.notFound('Quotation slip not found.');
    }

    const companyId = (quotation.companyId as any)?._id || quotation.companyId;
    const customerId = (quotation.customerId as any)?._id || quotation.customerId;

    const isCustomer = user.role === 'customer' && customerId.equals(user._id);
    const isCompanyAdmin =
      user.role === 'company_admin' &&
      user.companyId &&
      companyId.equals(user.companyId);

    if (!isCustomer && !isCompanyAdmin && user.role !== 'platform_admin') {
      throw AppError.notFound('Quotation slip not found.');
    }

    return { quotation };
  }

  /**
   * List quotations role-scoped (API Contract §8)
   */
  static async listQuotations(
    user: IUser,
    query: { status?: string; page?: string | number; limit?: string | number }
  ) {
    const filter: Record<string, any> = {};

    if (user.role === 'customer') {
      filter.customerId = user._id;
    } else if (user.role === 'company_admin') {
      if (!user.companyId) {
        throw AppError.forbidden('No company associated with this admin account.');
      }
      filter.companyId = user.companyId;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [quotations, total] = await Promise.all([
      Quotation.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('companyId', 'name slug logo city')
        .populate('customerId', 'name email'),
      Quotation.countDocuments(filter),
    ]);

    return {
      quotations,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Customer accepts a quotation slip (API Contract §8)
   */
  static async acceptQuotation(user: IUser, targetId: string) {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw AppError.notFound('Quotation slip not found.');
    }

    let quotation = await Quotation.findById(targetId);
    if (!quotation) {
      quotation = await Quotation.findOne({ inquiryId: targetId });
    }
    if (!quotation) {
      throw AppError.notFound('Quotation slip not found.');
    }

    if (user.role !== 'customer' || !quotation.customerId.equals(user._id)) {
      throw AppError.forbidden('Only the recipient customer can accept this quotation slip.');
    }

    if (quotation.status === 'accepted') {
      throw AppError.conflict('Quotation slip has already been accepted.');
    }

    if (quotation.status === 'rejected') {
      throw AppError.conflict('Cannot accept a declined quotation slip.');
    }

    if (new Date(quotation.validUntil) < new Date()) {
      quotation.status = 'expired';
      await quotation.save();
      throw AppError.badRequest('This quotation slip has expired. Please request a refreshed quote in the thread.');
    }

    quotation.status = 'accepted';
    quotation.acceptedAt = new Date();
    await quotation.save();

    const inquiry = await Inquiry.findById(quotation.inquiryId);
    if (inquiry) {
      inquiry.status = 'accepted';
      inquiry.lastMessageAt = new Date();
      inquiry.lastMessagePreview = 'Client accepted quotation slip.';
      await inquiry.save();

      await Message.create({
        inquiryId: inquiry._id,
        senderId: user._id,
        senderRole: 'customer',
        type: 'text',
        text: `Customer accepted Quotation Slip #${quotation.referenceNumber}. Scope and milestone deliverables confirmed.`,
      });

      // Notify company admin
      const company = await mongoose.model('Company').findById(quotation.companyId);
      if (company && company.ownerUserId) {
        NotificationService.notify({
          userId: company.ownerUserId,
          type: 'quotation_accepted',
          title: 'Quotation Accepted by Client',
          body: `Client accepted quotation slip #${quotation.referenceNumber} for PKR ${quotation.totalAmount.toLocaleString()}.`,
          link: `/company/inquiries/${quotation.inquiryId}`,
          entity: { type: 'quotation', id: quotation._id.toString() },
        }).catch((err) => console.error('[Notification] Error creating quotation accepted notification:', err));
      }
    }

    return { quotation, inquiryStatus: 'accepted' };
  }

  /**
   * Customer declines a quotation slip with optional reason
   */
  static async rejectQuotation(user: IUser, targetId: string, reason?: string) {
    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      throw AppError.notFound('Quotation slip not found.');
    }

    let quotation = await Quotation.findById(targetId);
    if (!quotation) {
      quotation = await Quotation.findOne({ inquiryId: targetId });
    }
    if (!quotation) {
      throw AppError.notFound('Quotation slip not found.');
    }

    if (user.role !== 'customer' || !quotation.customerId.equals(user._id)) {
      throw AppError.forbidden('Only the recipient customer can decline this quotation slip.');
    }

    if (quotation.status === 'accepted') {
      throw AppError.badRequest('Cannot decline an already accepted quotation slip.');
    }

    quotation.status = 'rejected';
    quotation.rejectedAt = new Date();
    quotation.rejectionReason = reason?.trim();
    await quotation.save();

    const inquiry = await Inquiry.findById(quotation.inquiryId);
    if (inquiry) {
      inquiry.status = 'rejected';
      inquiry.lastMessageAt = new Date();
      inquiry.lastMessagePreview = 'Client declined quotation slip.';
      await inquiry.save();

      await Message.create({
        inquiryId: inquiry._id,
        senderId: user._id,
        senderRole: 'customer',
        type: 'text',
        text: `Customer declined Quotation Slip #${quotation.referenceNumber}.${reason ? ` Reason: ${reason}` : ''}`,
      });

      // Notify company admin
      const company = await mongoose.model('Company').findById(quotation.companyId);
      if (company && company.ownerUserId) {
        NotificationService.notify({
          userId: company.ownerUserId,
          type: 'quotation_rejected',
          title: 'Quotation Declined by Client',
          body: `Client declined quotation slip #${quotation.referenceNumber}.${reason ? ` Reason: ${reason}` : ''}`,
          link: `/company/inquiries/${quotation.inquiryId}`,
          entity: { type: 'quotation', id: quotation._id.toString() },
        }).catch((err) => console.error('[Notification] Error creating quotation declined notification:', err));
      }
    }

    return { quotation };
  }
}
