import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta
) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
};
