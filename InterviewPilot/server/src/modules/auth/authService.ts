import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import type { User, UserProfile } from '@prisma/client';
import type {
  AuthUserDto,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@interviewpilot/shared';
import { prisma } from '../../db/prisma.js';
import {
  BCRYPT_COST,
  PASSWORD_RESET_EXPIRY_MINUTES,
  PASSWORD_RESET_TOKEN_BYTES,
} from '../../config/constants.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { signSessionToken } from '../../middleware/auth.js';
import { getEmailAdapter } from '../../services/email/emailAdapter.js';

type UserWithProfile = User & { profile: UserProfile | null };

export function toAuthUserDto(user: UserWithProfile): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    isDemo: user.isDemo,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    profile: user.profile
      ? {
          fullName: user.profile.fullName,
          statusType: user.profile.statusType,
          experienceLevel: user.profile.experienceLevel,
          targetRole: user.profile.targetRole,
          careerGoals: user.profile.careerGoals,
          preferredCategories: user.profile.preferredCategories,
          onboardingCompletedAt: user.profile.onboardingCompletedAt
            ? user.profile.onboardingCompletedAt.toISOString()
            : null,
        }
      : null,
  };
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export async function registerUser(
  input: RegisterInput
): Promise<{ user: AuthUserDto; sessionToken: string }> {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(
      'CONFLICT',
      'An account with this email address already exists.',
      409
    );
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // MASTER_PROMPT §9 item 1: Register user + profile in ONE transaction.
  // AUTH-1: role, status, isDemo, tokenVersion are server-assigned only.
  const created = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        email,
        passwordHash,
        role: 'USER',
        status: 'ACTIVE',
        isDemo: false,
        tokenVersion: 0,
        lastLoginAt: new Date(),
        profile: {
          create: {
            preferredCategories: [],
          },
        },
      },
      include: {
        profile: true,
      },
    });
  });

  const sessionToken = signSessionToken({
    userId: created.id,
    tokenVersion: created.tokenVersion,
  });

  return {
    user: toAuthUserDto(created),
    sessionToken,
  };
}

export async function loginUser(
  input: LoginInput
): Promise<{ user: AuthUserDto; sessionToken: string }> {
  const email = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('UNAUTHENTICATED', 'Invalid email or password', 401);
  }

  // AUTH-4: BLOCKED or DELETING cannot log in (403 ACCOUNT_BLOCKED)
  if (user.status === 'BLOCKED' || user.status === 'DELETING') {
    throw new AppError(
      'ACCOUNT_BLOCKED',
      'Your account is blocked or scheduled for deletion.',
      403
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    include: { profile: true },
  });

  const sessionToken = signSessionToken({
    userId: updated.id,
    tokenVersion: updated.tokenVersion,
  });

  return {
    user: toAuthUserDto(updated),
    sessionToken,
  };
}

export async function getCurrentUser(userId: string): Promise<AuthUserDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'User not found.', 401);
  }

  return toAuthUserDto(user);
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput
): Promise<{ sessionToken: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.passwordHash) {
    throw new AppError(
      'FORBIDDEN',
      'Password change is not available for this account.',
      403
    );
  }

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw new AppError('UNAUTHENTICATED', 'Current password is incorrect.', 401);
  }

  const newPasswordHash = await bcrypt.hash(input.newPassword, BCRYPT_COST);

  // AUTH-5: Increment tokenVersion to invalidate all older tokens
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newPasswordHash,
      tokenVersion: { increment: 1 },
    },
  });

  const sessionToken = signSessionToken({
    userId: updated.id,
    tokenVersion: updated.tokenVersion,
  });

  return { sessionToken };
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true, isDemo: true },
  });

  // AUTH-6: Identical external behavior whether or not user exists
  if (!user || user.isDemo || user.status !== 'ACTIVE') {
    return;
  }

  const rawToken = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${env.CLIENT_ORIGIN.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
  await getEmailAdapter().sendPasswordResetEmail(user.email, resetUrl, rawToken);
}

export async function resetPasswordWithToken(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashResetToken(input.token.trim());
  const now = new Date();

  const tokenRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !tokenRecord ||
    tokenRecord.usedAt !== null ||
    tokenRecord.expiresAt.getTime() <= now.getTime()
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Invalid or expired password reset token.',
      400
    );
  }

  if (tokenRecord.user.status !== 'ACTIVE') {
    throw new AppError(
      'ACCOUNT_BLOCKED',
      'Your account is blocked or scheduled for deletion.',
      403
    );
  }

  const newPasswordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // AUTH-5 & AUTH-6: Mark reset token used and increment tokenVersion in one transaction
  await prisma.$transaction(async (tx) => {
    const consumeResult = await tx.passwordResetToken.updateMany({
      where: {
        id: tokenRecord.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        usedAt: now,
      },
    });

    if (consumeResult.count !== 1) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Invalid or expired password reset token.',
        400
      );
    }

    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: {
        passwordHash: newPasswordHash,
        tokenVersion: { increment: 1 },
      },
    });
  });
}
