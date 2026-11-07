import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../config/constants';
import { AppError } from './AppError';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  companyId?: string;
  email: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 11;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication token has expired. Please log in again.');
    }
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid authentication token.');
  }
};
