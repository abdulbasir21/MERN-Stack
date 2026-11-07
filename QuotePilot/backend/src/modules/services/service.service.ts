import mongoose from 'mongoose';
import { Service, IService, IChecklistItem } from '../../models/Service';
import { Company, IPortfolioItem } from '../../models/Company';
import { AppError } from '../../utils/AppError';
import { DEFAULT_CHECKLIST, LIMITS } from '../../config/constants';
import {
  CreateServiceInput,
  UpdateServiceInput,
  CreatePortfolioItemInput,
  UpdatePortfolioItemInput
} from './service.schema';

export class ServiceService {
  /**
   * Helper to verify company exists and is approved for catalog operations
   */
  private static async getApprovedCompany(companyId: string) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw AppError.notFound('Company not found');
    }
    if (company.status !== 'approved') {
      throw AppError.forbidden('Only approved companies can manage services and portfolio');
    }
    return company;
  }

  /**
   * Helper to recalculate minStartingPrice and searchText on company
   */
  private static async syncCompanyMetadata(companyId: string | mongoose.Types.ObjectId): Promise<void> {
    const services = await Service.find({ companyId, isActive: true });
    const prices = services
      .map((s) => s.startingPrice)
      .filter((p): p is number => typeof p === 'number' && p >= 0);

    const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
    const serviceTitles = services.map((s) => s.title).join(' ');

    const company = await Company.findById(companyId);
    if (company) {
      company.minStartingPrice = minPrice;
      company.searchText = `${company.name} ${company.mainCategory} ${company.city} ${serviceTitles}`.toLowerCase();
      await company.save();
    }
  }

  /**
   * Helper to normalize checklist items into uniform objects
   */
  private static normalizeChecklist(
    items?: Array<string | { item: string; helpText?: string; required?: boolean; order?: number }>
  ): IChecklistItem[] {
    if (!items || items.length === 0) {
      return DEFAULT_CHECKLIST.map((text, idx) => ({
        item: text,
        required: true,
        order: idx
      }));
    }

    return items.map((entry, idx) => {
      if (typeof entry === 'string') {
        return {
          item: entry.trim(),
          required: true,
          order: idx
        };
      }
      return {
        item: entry.item.trim(),
        helpText: entry.helpText?.trim(),
        required: entry.required !== false,
        order: entry.order ?? idx
      };
    });
  }

  /**
   * List all services for the caller's company
   */
  static async listCompanyServices(companyId: string): Promise<IService[]> {
    return Service.find({ companyId }).sort({ createdAt: -1 });
  }

  /**
   * Get a single service by ID (enforcing company ownership)
   */
  static async getCompanyServiceById(companyId: string, serviceId: string): Promise<IService> {
    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw AppError.notFound('Service not found');
    }
    const service = await Service.findOne({ _id: serviceId, companyId });
    if (!service) {
      throw AppError.notFound('Service not found');
    }
    return service;
  }

  /**
   * Create a new service
   */
  static async createService(companyId: string, input: CreateServiceInput): Promise<IService> {
    await this.getApprovedCompany(companyId);

    // Check duplicate title under this company
    const existing = await Service.findOne({
      companyId,
      title: { $regex: new RegExp(`^${input.title.trim()}$`, 'i') }
    });
    if (existing) {
      throw AppError.conflict('A service with this title already exists in your catalog');
    }

    const checklist = this.normalizeChecklist(input.requirementsChecklist);

    const service = await Service.create({
      companyId,
      title: input.title.trim(),
      category: input.category,
      description: input.description?.trim(),
      startingPrice: input.startingPrice,
      pricingUnit: input.pricingUnit || 'starting_at',
      deliveryTimeEstimate: input.deliveryTimeEstimate?.trim(),
      requirementsChecklist: checklist,
      isActive: true
    });

    await this.syncCompanyMetadata(companyId);

    return service;
  }

  /**
   * Update an existing service
   */
  static async updateService(
    companyId: string,
    serviceId: string,
    input: UpdateServiceInput
  ): Promise<IService> {
    await this.getApprovedCompany(companyId);

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw AppError.notFound('Service not found');
    }

    const service = await Service.findOne({ _id: serviceId, companyId });
    if (!service) {
      throw AppError.notFound('Service not found');
    }

    // Check duplicate title if changed
    if (input.title && input.title.trim().toLowerCase() !== service.title.toLowerCase()) {
      const duplicate = await Service.findOne({
        companyId,
        _id: { $ne: serviceId },
        title: { $regex: new RegExp(`^${input.title.trim()}$`, 'i') }
      });
      if (duplicate) {
        throw AppError.conflict('A service with this title already exists in your catalog');
      }
      service.title = input.title.trim();
    }

    if (input.category) service.category = input.category;
    if (input.description !== undefined) service.description = input.description.trim();
    if (input.startingPrice !== undefined) service.startingPrice = input.startingPrice;
    if (input.pricingUnit !== undefined) service.pricingUnit = input.pricingUnit;
    if (input.deliveryTimeEstimate !== undefined) service.deliveryTimeEstimate = input.deliveryTimeEstimate.trim();
    if (input.isActive !== undefined) service.isActive = input.isActive;

    if (input.requirementsChecklist) {
      service.requirementsChecklist = this.normalizeChecklist(input.requirementsChecklist);
    }

    await service.save();
    await this.syncCompanyMetadata(companyId);

    return service;
  }

  /**
   * Delete a service (rejects if inquiries exist)
   */
  static async deleteService(companyId: string, serviceId: string): Promise<void> {
    await this.getApprovedCompany(companyId);

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
      throw AppError.notFound('Service not found');
    }

    const service = await Service.findOne({ _id: serviceId, companyId });
    if (!service) {
      throw AppError.notFound('Service not found');
    }

    // Check inquiries if model exists
    if (mongoose.models.Inquiry) {
      const inquiryCount = await mongoose.models.Inquiry.countDocuments({ serviceId });
      if (inquiryCount > 0) {
        throw AppError.conflict('Cannot delete service with existing inquiries. Please deactivate it instead.');
      }
    }

    await Service.deleteOne({ _id: serviceId, companyId });
    await this.syncCompanyMetadata(companyId);
  }

  /**
   * Add a portfolio item to company
   */
  static async addPortfolioItem(
    companyId: string,
    input: CreatePortfolioItemInput
  ): Promise<IPortfolioItem> {
    const company = await this.getApprovedCompany(companyId);

    if (company.portfolio.length >= LIMITS.MAX_PORTFOLIO_ITEMS) {
      throw AppError.badRequest(`Cannot exceed maximum of ${LIMITS.MAX_PORTFOLIO_ITEMS} portfolio items`);
    }

    const newItem = {
      title: input.title.trim(),
      description: input.description?.trim(),
      image: {
        url: input.image.url,
        fileId: input.image.fileId
      }
    };

    company.portfolio.push(newItem as IPortfolioItem);
    await company.save();

    return company.portfolio[company.portfolio.length - 1];
  }

  /**
   * Update a portfolio item
   */
  static async updatePortfolioItem(
    companyId: string,
    itemId: string,
    input: UpdatePortfolioItemInput
  ): Promise<IPortfolioItem> {
    const company = await this.getApprovedCompany(companyId);

    const item = company.portfolio.find((p) => p._id?.toString() === itemId);
    if (!item) {
      throw AppError.notFound('Portfolio item not found');
    }

    if (input.title) item.title = input.title.trim();
    if (input.description !== undefined) item.description = input.description.trim();
    if (input.image) {
      item.image = {
        url: input.image.url,
        fileId: input.image.fileId
      };
    }

    await company.save();
    return item;
  }

  /**
   * Delete a portfolio item
   */
  static async deletePortfolioItem(companyId: string, itemId: string): Promise<void> {
    const company = await this.getApprovedCompany(companyId);

    const itemIndex = company.portfolio.findIndex((p) => p._id?.toString() === itemId);
    if (itemIndex === -1) {
      throw AppError.notFound('Portfolio item not found');
    }

    company.portfolio.splice(itemIndex, 1);
    await company.save();
  }
}
