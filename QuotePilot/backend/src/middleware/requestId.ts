import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'];
  const id = typeof incomingId === 'string' ? incomingId : crypto.randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
};
