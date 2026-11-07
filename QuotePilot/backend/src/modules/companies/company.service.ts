import mongoose from 'mongoose';
import { Company, ICompany } from '../../models/Company';
import { User, IUser } from '../../models/User';
import { hashPassword, generateToken } from '../../utils/auth';
import { generateSlug } from '../../utils/slugify';
import { AppError } from '../../utils/AppError';
import {
  RegisterCompanyInput,
  UpdateCompanyProfileInput,
  RejectCompanyInput,
  BlockCompanyInput,
} from './company.schema';

export class CompanyService {
  static async registerCompany(input: RegisterCompanyInput) {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check if user email already exists across the platform (FR-COMP-009)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new AppError(
        409,
        'CONFLICT',
        'An account with this email address already exists.',
        [{ field: 'email', message: 'Email is already registered' }]
      );
    }

    // 2. Generate unique slug
    let baseSlug = generateSlug(input.companyName);
    if (!baseSlug) baseSlug = 'company';
    let slug = baseSlug;
    let counter = 1;

    while (await Company.findOne({ slug })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // 3. Hash password
    const passwordHash = await hashPassword(input.password);

    // 4. Create Company Admin User and Company atomically/sequentially
    const user = new User({
      name: input.ownerName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'company_admin',
      phone: input.phone.trim(),
      status: 'active',
      isSeedData: false,
    });

    const company = new Company({
      ownerUserId: user._id,
      name: input.companyName.trim(),
      slug,
      city: input.city.trim(),
      contactPhone: input.phone.trim(),
      contactEmail: normalizedEmail,
      mainCategory: input.mainCategory,
      status: 'pending',
      submittedAt: new Date(),
      searchText: `${input.companyName.toLowerCase()} ${input.mainCategory.toLowerCase()}`,
      isSeedData: false,
    });

    user.companyId = company._id as mongoose.Types.ObjectId;

    await user.save();
    await company.save();

    // 5. Generate token
    const token = generateToken({
      sub: user._id.toString(),
      role: 'company_admin',
      companyId: company._id.toString(),
      email: user.email,
    });

    return {
      company: {
        id: company._id.toString(),
        name: company.name,
        slug: company.slug,
        city: company.city,
        mainCategory: company.mainCategory,
        status: company.status,
        submittedAt: company.submittedAt,
      },
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: company._id.toString(),
      },
      token,
    };
  }

  static async getOwnCompany(user: IUser) {
    if (!user.companyId) {
      throw new AppError(404, 'NOT_FOUND', 'No company associated with this account.');
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found.');
    }

    return { company };
  }

  static async updateOwnCompany(user: IUser, input: UpdateCompanyProfileInput) {
    if (!user.companyId) {
      throw new AppError(404, 'NOT_FOUND', 'No company associated with this account.');
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found.');
    }

    // Permission rule: Cannot edit profile if pending or blocked (DATA_MODEL §2)
    if (company.status === 'pending' || company.status === 'blocked') {
      throw new AppError(
        403,
        'FORBIDDEN',
        `You cannot modify company profile details while status is ${company.status}.`
      );
    }

    if (input.name) company.name = input.name.trim();
    if (input.tagline !== undefined) company.tagline = input.tagline.trim();
    if (input.description !== undefined) company.description = input.description.trim();
    if (input.city) company.city = input.city.trim();
    if (input.contactPhone !== undefined) company.contactPhone = input.contactPhone.trim();
    if (input.contactEmail !== undefined) company.contactEmail = input.contactEmail.trim().toLowerCase();
    if (input.website !== undefined) company.website = input.website.trim();
    if (input.logo) company.logo = input.logo;

    company.searchText = `${company.name.toLowerCase()} ${company.mainCategory.toLowerCase()}`;
    await company.save();

    return { company };
  }

  static async resubmitOwnCompany(user: IUser) {
    if (!user.companyId) {
      throw new AppError(404, 'NOT_FOUND', 'No company associated with this account.');
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company not found.');
    }

    if (company.status !== 'rejected') {
      throw new AppError(
        409,
        'CONFLICT',
        `Only companies with rejected status can be resubmitted (current status: ${company.status}).`
      );
    }

    company.status = 'pending';
    company.rejectionReason = undefined;
    company.submittedAt = new Date();
    await company.save();

    return { company };
  }

  // --- Platform Admin Services ---

  static async listApplications(query: {
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.q) {
      filter.$or = [
        { name: { $regex: query.q, $options: 'i' } },
        { city: { $regex: query.q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Company.find(filter)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('ownerUserId', 'name email phone')
        .lean(),
      Company.countDocuments(filter),
    ]);

    const formattedItems = items.map((c: any) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      city: c.city,
      mainCategory: c.mainCategory,
      status: c.status,
      submittedAt: c.submittedAt,
      rejectionReason: c.rejectionReason,
      owner: c.ownerUserId
        ? {
            id: c.ownerUserId._id.toString(),
            name: c.ownerUserId.name,
            email: c.ownerUserId.email,
            phone: c.ownerUserId.phone,
          }
        : null,
    }));

    return {
      items: formattedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getApplicationById(companyId: string) {
    const company = await Company.findById(companyId)
      .populate('ownerUserId', 'name email phone status')
      .populate('reviewedBy', 'name email');

    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company application not found.');
    }

    return { company };
  }

  static async approveCompany(companyId: string, adminUserId: string) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company application not found.');
    }

    if (company.status !== 'pending') {
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot approve company with status '${company.status}'. Status must be 'pending'.`
      );
    }

    company.status = 'approved';
    company.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
    company.reviewedAt = new Date();
    company.rejectionReason = undefined;
    await company.save();

    console.log(`[Platform Admin] ✅ Approved company: ${company.name} (${company._id})`);

    return { company };
  }

  static async rejectCompany(companyId: string, adminUserId: string, input: RejectCompanyInput) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company application not found.');
    }

    if (company.status !== 'pending') {
      throw new AppError(
        409,
        'CONFLICT',
        `Cannot reject company with status '${company.status}'. Status must be 'pending'.`
      );
    }

    company.status = 'rejected';
    company.rejectionReason = input.reason.trim();
    company.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
    company.reviewedAt = new Date();
    await company.save();

    console.log(`[Platform Admin] ⚠️ Rejected company: ${company.name} (${company._id})`);

    return { company };
  }

  static async blockCompany(companyId: string, adminUserId: string, input: BlockCompanyInput) {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new AppError(404, 'NOT_FOUND', 'Company application not found.');
    }

    if (company.status === 'blocked') {
      throw new AppError(409, 'CONFLICT', 'Company is already permanently blocked.');
    }

    company.status = 'blocked';
    if (input.reason) company.rejectionReason = input.reason.trim();
    company.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
    company.reviewedAt = new Date();
    await company.save();

    // Block owner user account as well (FR-COMP-007, DATA_MODEL §11)
    await User.findByIdAndUpdate(company.ownerUserId, { status: 'blocked' });

    console.log(`[Platform Admin] ⛔ Blocked company and user: ${company.name} (${company._id})`);

    return { company };
  }

  // --- Public Marketplace Operations (Phase 4, FR-MKT-*) ---

  static async searchApprovedCompanies(query: {
    q?: string;
    category?: string;
    city?: string;
    minRating?: number;
    maxPrice?: number;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { status: 'approved' };

    if (query.category) {
      filter.mainCategory = query.category;
    }

    if (query.city) {
      filter.city = { $regex: new RegExp(`^${query.city.trim()}$`, 'i') };
    }

    if (query.minRating !== undefined && !isNaN(query.minRating)) {
      filter.ratingAverage = { $gte: query.minRating };
    }

    if (query.maxPrice !== undefined && !isNaN(query.maxPrice)) {
      filter.minStartingPrice = { $lte: query.maxPrice };
    }

    let sortOption: Record<string, any> = { createdAt: -1 };

    if (query.q && query.q.trim()) {
      filter.$text = { $search: query.q.trim() };
      if (query.sort === 'relevance' || !query.sort) {
        sortOption = { score: { $meta: 'textScore' } };
      }
    }

    if (query.sort === '-ratingAverage') {
      sortOption = { ratingAverage: -1, ratingCount: -1 };
    } else if (query.sort === '-createdAt') {
      sortOption = { createdAt: -1 };
    } else if (query.sort === 'priceAsc') {
      sortOption = { minStartingPrice: 1 };
    }

    const [total, items] = await Promise.all([
      Company.countDocuments(filter),
      Company.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .select('name slug tagline logo city mainCategory ratingAverage ratingCount minStartingPrice')
    ]);

    const formattedItems = items.map((co) => ({
      id: co._id.toString(),
      slug: co.slug,
      name: co.name,
      tagline: co.tagline,
      logo: co.logo,
      city: co.city,
      categories: [co.mainCategory],
      ratingAverage: co.ratingAverage,
      ratingCount: co.ratingCount,
      minStartingPrice: co.minStartingPrice
    }));

    return {
      items: formattedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async getApprovedCompanyBySlug(slug: string) {
    const company = await Company.findOne({ slug: slug.toLowerCase().trim(), status: 'approved' });
    if (!company) {
      throw AppError.notFound('Company not found or not currently active on the marketplace');
    }

    return {
      company: {
        id: company._id.toString(),
        slug: company.slug,
        name: company.name,
        tagline: company.tagline,
        description: company.description,
        logo: company.logo,
        city: company.city,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        website: company.website,
        mainCategory: company.mainCategory,
        portfolio: company.portfolio,
        ratingAverage: company.ratingAverage,
        ratingCount: company.ratingCount,
        verified: true
      }
    };
  }

  static async getApprovedCompanyServices(slug: string) {
    const company = await Company.findOne({ slug: slug.toLowerCase().trim(), status: 'approved' });
    if (!company) {
      throw AppError.notFound('Company not found or not currently active');
    }

    // Dynamic import / access of Service model
    const { Service } = await import('../../models/Service');
    const services = await Service.find({ companyId: company._id, isActive: true })
      .select('title category description startingPrice pricingUnit deliveryTimeEstimate createdAt')
      .sort({ createdAt: 1 });

    // Ensure requirementsChecklist is NEVER exposed publicly per API_CONTRACT §5
    const publicServices = services.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      category: s.category,
      description: s.description,
      startingPrice: s.startingPrice,
      pricingUnit: s.pricingUnit,
      deliveryTimeEstimate: s.deliveryTimeEstimate,
      createdAt: s.createdAt
    }));

    return { services: publicServices };
  }
}
