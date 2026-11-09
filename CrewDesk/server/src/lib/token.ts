import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      jwtid: crypto.randomUUID(),
    }
  );
}

export function signRefreshToken(payload: TokenPayload): { token: string; hash: string } {
  const token = jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      mustChangePassword: payload.mustChangePassword,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'],
      jwtid: crypto.randomUUID(),
    }
  );
  const hash = hashToken(token);
  return { token, hash };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
