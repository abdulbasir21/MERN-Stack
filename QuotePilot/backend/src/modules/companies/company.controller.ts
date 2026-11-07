import { Request, Response } from 'express';
import { CompanyService } from './company.service';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export class CompanyController {
  // Public registration
  static registerCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.registerCompany(req.body);
    return sendSuccess(res, result, 201);
  });

  // Company Admin endpoints
  static getOwnCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.getOwnCompany(req.user!);
    return sendSuccess(res, result, 200);
  });

  static updateOwnCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.updateOwnCompany(req.user!, req.body);
    return sendSuccess(res, result, 200);
  });

  static resubmitOwnCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.resubmitOwnCompany(req.user!);
    return sendSuccess(res, result, 200);
  });

  // Platform Admin endpoints
  static listApplications = asyncHandler(async (req: Request, res: Response) => {
    const { status, q, page, limit } = req.query;
    const result = await CompanyService.listApplications({
      status: status ? String(status) : undefined,
      q: q ? String(q) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  });

  static getApplicationById = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.getApplicationById(req.params.id);
    return sendSuccess(res, result, 200);
  });

  static approveCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.approveCompany(req.params.id, req.user!._id.toString());
    return sendSuccess(res, result, 200);
  });

  static rejectCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.rejectCompany(req.params.id, req.user!._id.toString(), req.body);
    return sendSuccess(res, result, 200);
  });

  static blockCompany = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.blockCompany(req.params.id, req.user!._id.toString(), req.body);
    return sendSuccess(res, result, 200);
  });

  // Public Marketplace
  static searchCompanies = asyncHandler(async (req: Request, res: Response) => {
    const { q, category, city, minRating, maxPrice, sort, page, limit } = req.query;
    const result = await CompanyService.searchApprovedCompanies({
      q: q ? String(q) : undefined,
      category: category ? String(category) : undefined,
      city: city ? String(city) : undefined,
      minRating: minRating ? parseFloat(String(minRating)) : undefined,
      maxPrice: maxPrice ? parseFloat(String(maxPrice)) : undefined,
      sort: sort ? String(sort) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
    });
    return sendSuccess(res, result.items, 200, result.meta);
  });

  static getPublicCompanyProfile = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.getApprovedCompanyBySlug(req.params.slug);
    return sendSuccess(res, result, 200);
  });

  static getPublicCompanyServices = asyncHandler(async (req: Request, res: Response) => {
    const result = await CompanyService.getApprovedCompanyServices(req.params.slug);
    return sendSuccess(res, result, 200);
  });
}
