import { Request, Response } from 'express';
import { ServiceService } from './service.service';
import {
  createServiceSchema,
  updateServiceSchema,
  createPortfolioItemSchema,
  updatePortfolioItemSchema
} from './service.schema';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

export class ServiceController {
  private static getCallerCompanyId(req: Request): string {
    const companyId = req.user?.companyId;
    if (!companyId) {
      throw AppError.forbidden('You do not belong to a registered company');
    }
    return companyId.toString();
  }

  // --- Services ---

  static listServices = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const services = await ServiceService.listCompanyServices(companyId);
    sendSuccess(res, { services });
  });

  static getService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const service = await ServiceService.getCompanyServiceById(companyId, req.params.id);
    sendSuccess(res, { service });
  });

  static createService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const validated = createServiceSchema.parse(req.body);
    const service = await ServiceService.createService(companyId, validated);
    sendSuccess(res, { service }, 201);
  });

  static updateService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const validated = updateServiceSchema.parse(req.body);
    const service = await ServiceService.updateService(companyId, req.params.id, validated);
    sendSuccess(res, { service });
  });

  static deleteService = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    await ServiceService.deleteService(companyId, req.params.id);
    sendSuccess(res, { message: 'Service deleted successfully' });
  });

  // --- Portfolio ---

  static addPortfolio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const validated = createPortfolioItemSchema.parse(req.body);
    const item = await ServiceService.addPortfolioItem(companyId, validated);
    sendSuccess(res, { item }, 201);
  });

  static updatePortfolio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    const validated = updatePortfolioItemSchema.parse(req.body);
    const item = await ServiceService.updatePortfolioItem(companyId, req.params.itemId, validated);
    sendSuccess(res, { item });
  });

  static deletePortfolio = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const companyId = ServiceController.getCallerCompanyId(req);
    await ServiceService.deletePortfolioItem(companyId, req.params.itemId);
    sendSuccess(res, { message: 'Portfolio item deleted successfully' });
  });
}
