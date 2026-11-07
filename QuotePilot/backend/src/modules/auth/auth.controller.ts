import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

export class AuthController {
  static registerCustomer = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.registerCustomer(req.body);
    return sendSuccess(res, result, 201);
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);
    return sendSuccess(res, result, 200);
  });

  static getMe = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.getMe(req.user!);
    return sendSuccess(res, result, 200);
  });

  static updateMe = asyncHandler(async (req: Request, res: Response) => {
    const result = await AuthService.updateMe(req.user!._id.toString(), req.body);
    return sendSuccess(res, result, 200);
  });
}
