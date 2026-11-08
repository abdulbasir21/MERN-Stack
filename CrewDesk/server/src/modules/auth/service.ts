import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from '../../lib/token.js';
import { logAudit } from '../../lib/audit.js';
import { LoginInput, ChangePasswordInput } from './schemas.js';

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { department: true },
    });

    if (!user) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    if (!user.isActive) {
      throw { status: 403, code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated.' };
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw { status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const accessToken = signAccessToken(payload);
    const { token: refreshToken, hash: tokenHash } = signRefreshToken(payload);

    // Store hashed refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    await logAudit(user.id, 'auth:login', 'User', user.id, null, { email: user.email });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        title: user.title,
        avatarUrl: user.avatarUrl,
        mustChangePassword: user.mustChangePassword,
        department: user.department?.name || null,
      },
    };
  }

  async refreshToken(rawRefreshToken: string) {
    try {
      verifyRefreshToken(rawRefreshToken);
      const tokenHash = hashToken(rawRefreshToken);

      const storedToken = await prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!storedToken || storedToken.expiresAt < new Date() || !storedToken.user.isActive) {
        if (storedToken) {
          await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        }
        throw { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Session expired or invalidated.' };
      }

      // Rotate tokens: delete old, create new
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });

      const newPayload = {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        mustChangePassword: storedToken.user.mustChangePassword,
      };

      const newAccessToken = signAccessToken(newPayload);
      const { token: newRefreshToken, hash: newHash } = signRefreshToken(newPayload);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.refreshToken.create({
        data: {
          tokenHash: newHash,
          userId: storedToken.user.id,
          expiresAt,
        },
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch {
      throw { status: 401, code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired session.' };
    }
  }

  async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    if (userId) {
      await logAudit(userId, 'auth:logout', 'User', userId);
    }
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    const passwordMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!passwordMatch) {
      throw { status: 400, code: 'INVALID_PASSWORD', message: 'Current password does not match.' };
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(input.newPassword, saltRounds);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
    });

    // Invalidate existing sessions except new one
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    await logAudit(userId, 'auth:change-password', 'User', userId);

    // Return new tokens so user doesn't have to re-login
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: false,
    };

    const accessToken = signAccessToken(payload);
    const { token: refreshToken, hash: tokenHash } = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
        phone: true,
        avatarUrl: true,
        mustChangePassword: true,
        department: { select: { id: true, name: true } },
      },
    });

    if (!user) {
      throw { status: 404, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      mustChangePassword: user.mustChangePassword,
      department: user.department?.name || null,
    };
  }
}

export const authService = new AuthService();
